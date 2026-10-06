import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { REGION, hrLevel, requireAuthedDomainUser } from './shared';
import { FORM_DEFINITIONS } from './shared-gen/forms/definitions';

const APP_URL = 'https://oronohr.web.app';

/**
 * Email notification settings, layered loosest to tightest:
 * 1. Master switches + a default recipient (appSettings/notifications).
 * 2. Per-form recipient lists and submit-toggle overrides (same doc).
 * 3. Personal always/never overrides (notificationPrefs/{uid}) — a person's
 *    "never" beats any admin list for their own inbox; "always" adds them.
 * Submitter status emails are deliberately NOT per-form: one behavior
 * everywhere, controlled only by the master switch.
 */
export type NotificationSettings = {
  /** Fallback for forms with no recipients of their own. Null = silent. */
  defaultRecipient: string | null;
  /** Master switch: staff emails when a submission lands. */
  notifySubmit: boolean;
  /** Master switch: submitter emails on status changes. */
  notifyStatus: boolean;
  perForm: Record<string, { recipients?: string[]; notifySubmit?: boolean }>;
};

const SETTINGS_DOC = 'notifications';

const DEFAULT_SETTINGS: NotificationSettings = {
  defaultRecipient: null,
  notifySubmit: true,
  notifyStatus: true,
  perForm: {},
};

async function loadSettings(db: Firestore): Promise<NotificationSettings> {
  const snap = await db.collection('appSettings').doc(SETTINGS_DOC).get();
  if (!snap.exists) return DEFAULT_SETTINGS;
  const data = snap.data() as Partial<NotificationSettings>;
  return {
    defaultRecipient: data.defaultRecipient ?? null,
    notifySubmit: data.notifySubmit !== false,
    notifyStatus: data.notifyStatus !== false,
    perForm: data.perForm ?? {},
  };
}

// ---------------------------------------------------------------------------
// Template — "Letterhead": near-plain text under one navy rule, so it reads
// like a note from HR and renders the same in every mail client. Tables and
// inline styles only; the wordmark is live text, so nothing depends on an
// image loading.

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const HR_ADDRESS = 'hr@orono.k12.mn.us';

/** "Oct 5, 2026", in the district's timezone. */
function today(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

function emailHtml({
  heading,
  body,
  note,
  facts = [],
  link,
  linkLabel = 'Open in OronoHR',
}: {
  heading: string;
  /** One paragraph of trusted HTML — escape anything user-typed first. */
  body: string;
  /** Plain text from HR; escaped here. */
  note?: string | null;
  /** Label/value rows, plain text; escaped here. */
  facts?: Array<[string, string]>;
  link: string;
  linkLabel?: string;
}): string {
  const rule = 'padding-bottom: 14px; border-bottom: 2px solid #1d2a5d;';
  const noteBlock = note
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
          <tr>
            <td style="border-left: 3px solid #4356a9; padding: 2px 0 2px 14px; font-size: 15px; line-height: 1.6; color: #334155;">
              <strong style="display: block; font-size: 13px; color: #4356a9;">Note from HR</strong>
              ${escapeHtml(note)}
            </td>
          </tr>
        </table>`
    : '';
  const factRows = facts
    .map(
      ([label, value]) => `
          <tr>
            <td style="padding: 8px 18px 8px 0; border-top: 1px solid #e2e5ea; font-size: 13px; color: #64748b; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td>
            <td width="100%" style="padding: 8px 0; border-top: 1px solid #e2e5ea; font-size: 13px; font-weight: 600; color: #1d2a5d;">${escapeHtml(value)}</td>
          </tr>`,
    )
    .join('');
  const factsBlock = factRows
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 18px;">${factRows}
        </table>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; font-family: ${FONT}; color: #334155; text-align: left;">
            <tr>
              <td style="padding: 28px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="${rule} font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: #1d2a5d;">Orono<span style="color: #4356a9;">HR</span></td>
                    <td align="right" style="${rule} font-size: 12px; color: #64748b;">${today()}</td>
                  </tr>
                </table>
                <h1 style="margin: 22px 0 0; font-size: 20px; line-height: 1.25; font-weight: 700; letter-spacing: -0.01em; color: #1d2a5d;">${heading}</h1>
                <p style="margin: 14px 0 0; font-size: 15px; line-height: 1.6; color: #334155;">${body}</p>${noteBlock}${factsBlock}
                <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.6;">
                  <a href="${link}" style="color: #2d3f89; font-weight: 600; text-decoration: underline;">${linkLabel}</a>
                </p>
                <p style="margin: 22px 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                  Human Resources, Orono Public Schools<br />
                  This mailbox is not read. Reach HR at <a href="mailto:${HR_ADDRESS}" style="color: #64748b;">${HR_ADDRESS}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/** "REQ-35091" (legacy) and "35091" both read "#35091". */
function displayId(id: string): string {
  return `#${id.replace(/^REQ-/, '')}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Queues a doc sendQueuedMail (./mailer) sends. No-op on an empty list. */
async function queueMail(db: Firestore, to: string[], subject: string, html: string) {
  if (to.length === 0) return;
  logger.info(`queueMail to=${to.join(',')} subject=${subject}`);
  await db.collection('mail').add({
    to,
    message: { subject, html },
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Events — called from the forms callables, never allowed to fail them.

type SubmissionFacts = {
  id: string;
  formId: string;
  formTitle: string;
  submitterName: string;
  submitterEmail: string;
  summary: string;
};

/** The label/value rows under a submission email. */
function factRows(sub: SubmissionFacts, withSubmitter = false): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (withSubmitter) rows.push(['From', sub.submitterName]);
  rows.push(['Form', sub.formTitle], ['Request', displayId(sub.id)]);
  if (sub.summary) rows.push(['Details', sub.summary]);
  return rows;
}

/** Queues the submitter's filing receipt and the staff alert. */
export async function notifySubmitted(sub: SubmissionFacts): Promise<void> {
  try {
    const db = getFirestore();
    const settings = await loadSettings(db);

    // Receipt to the submitter — rides the same switch as status emails,
    // since both are the submitter's side of the conversation.
    if (settings.notifyStatus) {
      await queueMail(
        db,
        [sub.submitterEmail],
        `[OronoHR] Filed — ${sub.formTitle} ${displayId(sub.id)}`,
        emailHtml({
          heading: 'Your request is in',
          body: `Your ${escapeHtml(sub.formTitle)} request has been filed with Human Resources. You&rsquo;ll get an email when it moves.`,
          facts: factRows(sub),
          link: `${APP_URL}/forms/submissions/${sub.id}`,
          linkLabel: 'Follow your request',
        }),
      );
    }

    const pf = settings.perForm[sub.formId] ?? {};
    if (!(pf.notifySubmit ?? settings.notifySubmit)) return;

    const base =
      pf.recipients && pf.recipients.length > 0
        ? pf.recipients
        : settings.defaultRecipient
          ? [settings.defaultRecipient]
          : [];
    const recipients = new Set(base.map((e) => e.toLowerCase()));
    // Nobody is alerted about their own filing — unless they explicitly say
    // "always" below. Personal choices beat this heuristic in BOTH
    // directions, matching "never wins even if you're on the list".
    recipients.delete(sub.submitterEmail.toLowerCase());

    // Personal overrides — the prefs collection only ever holds role holders,
    // so reading it whole stays cheap.
    const prefs = await db.collection('notificationPrefs').get();
    for (const doc of prefs.docs) {
      const email = (doc.get('email') as string | undefined)?.toLowerCase();
      if (!email) continue;
      const choice = (doc.get('forms') as Record<string, string> | undefined)?.[sub.formId];
      if (choice === 'always') recipients.add(email);
      if (choice === 'never') recipients.delete(email);
    }
    if (recipients.size === 0) return;

    await queueMail(
      db,
      [...recipients],
      `[OronoHR] ${sub.formTitle} from ${sub.submitterName} — ${displayId(sub.id)}`,
      emailHtml({
        heading: `New ${escapeHtml(sub.formTitle)} submission`,
        body: `<strong>${escapeHtml(sub.submitterName)}</strong> filed a ${escapeHtml(sub.formTitle)} request. It is waiting in the HR inbox.`,
        facts: factRows(sub, true),
        link: `${APP_URL}/forms/submissions/${sub.id}`,
        linkLabel: 'Open the request',
      }),
    );
  } catch (err) {
    logger.error('notifySubmitted failed', { submission: sub.id, err });
  }
}

const STATUS_COPY: Record<string, { subject: string; heading: string; body: string }> = {
  processing: {
    subject: 'Picked up',
    heading: 'HR picked up your request',
    body: 'is in HR&rsquo;s hands and being worked on',
  },
  completed: {
    subject: 'Completed',
    heading: 'Your request is complete',
    body: 'has been completed',
  },
  denied: {
    subject: 'Came back',
    heading: 'Your request came back',
    body: 'was returned without being approved',
  },
};

/** Tells the submitter their request moved. One behavior for every form. */
export async function notifyStatusChanged(
  sub: SubmissionFacts,
  status: string,
  note: string | null,
  actorEmail: string,
): Promise<void> {
  try {
    const copy = STATUS_COPY[status];
    if (!copy) return;
    // People don't need email about their own clicks.
    if (actorEmail.toLowerCase() === sub.submitterEmail.toLowerCase()) return;

    const db = getFirestore();
    const settings = await loadSettings(db);
    if (!settings.notifyStatus) return;

    await queueMail(
      db,
      [sub.submitterEmail],
      `[OronoHR] ${copy.subject} — ${sub.formTitle} ${displayId(sub.id)}`,
      emailHtml({
        heading: copy.heading,
        body: `Your ${escapeHtml(sub.formTitle)} request ${copy.body}.`,
        note,
        facts: factRows(sub),
        link: `${APP_URL}/forms/submissions/${sub.id}`,
        linkLabel: 'View your request',
      }),
    );
  } catch (err) {
    logger.error('notifyStatusChanged failed', { submission: sub.id, err });
  }
}

// ---------------------------------------------------------------------------
// Callables

function isEmailish(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
}

/** Admin knobs: master switches, default recipient, per-form lists. */
export const setNotificationSettings = onCall({ region: REGION }, async (request) => {
  requireAuthedDomainUser(request);
  if (hrLevel(request.auth?.token ?? {}) !== 'admin') {
    throw new HttpsError('permission-denied', 'HR admin access required.');
  }
  const raw = (request.data ?? {}) as Record<string, unknown>;

  const defaultRecipient = raw.defaultRecipient ?? null;
  if (defaultRecipient !== null && !isEmailish(defaultRecipient)) {
    throw new HttpsError('invalid-argument', 'Default recipient must be an email address.');
  }
  if (typeof raw.notifySubmit !== 'boolean' || typeof raw.notifyStatus !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Missing notification switches.');
  }

  const perForm: NotificationSettings['perForm'] = {};
  const rawPerForm = (raw.perForm ?? {}) as Record<string, unknown>;
  if (typeof rawPerForm !== 'object' || Array.isArray(rawPerForm)) {
    throw new HttpsError('invalid-argument', 'perForm must be an object.');
  }
  for (const [formId, value] of Object.entries(rawPerForm)) {
    if (!FORM_DEFINITIONS[formId]) {
      throw new HttpsError('invalid-argument', `Unknown form: ${formId}`);
    }
    const v = (value ?? {}) as Record<string, unknown>;
    const entry: { recipients?: string[]; notifySubmit?: boolean } = {};
    if (v.recipients !== undefined) {
      if (
        !Array.isArray(v.recipients) ||
        v.recipients.length > 20 ||
        !v.recipients.every(isEmailish)
      ) {
        throw new HttpsError(
          'invalid-argument',
          `Recipients for ${formId} must be up to 20 emails.`,
        );
      }
      if (v.recipients.length > 0) entry.recipients = v.recipients.map((e) => e.toLowerCase());
    }
    if (v.notifySubmit !== undefined) {
      if (typeof v.notifySubmit !== 'boolean') {
        throw new HttpsError('invalid-argument', `notifySubmit for ${formId} must be a boolean.`);
      }
      entry.notifySubmit = v.notifySubmit;
    }
    if (Object.keys(entry).length > 0) perForm[formId] = entry;
  }

  await getFirestore()
    .collection('appSettings')
    .doc(SETTINGS_DOC)
    .set({
      defaultRecipient,
      notifySubmit: raw.notifySubmit,
      notifyStatus: raw.notifyStatus,
      perForm,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.token?.email ?? null,
    });
  return { success: true };
});

/**
 * Queues a test message to the caller's own address and waits for
 * sendQueuedMail to stamp the result, so the admin card can show the real
 * delivery outcome instead of "queued". Only ever mails the caller.
 */
export const sendTestEmail = onCall({ region: REGION }, async (request) => {
  const { email } = requireAuthedDomainUser(request);
  if (hrLevel(request.auth?.token ?? {}) !== 'admin') {
    throw new HttpsError('permission-denied', 'HR admin access required.');
  }

  const db = getFirestore();
  logger.info(`sendTestEmail to=${email}`);
  const ref = await db.collection('mail').add({
    to: [email],
    message: {
      subject: '[OronoHR] Test email',
      html: emailHtml({
        heading: 'Email is working',
        body: `This is a test message sent from the OronoHR admin panel. If you can read it, notifications are being delivered.`,
        facts: [['Sent by', email]],
        link: `${APP_URL}/admin`,
        linkLabel: 'Back to OronoHR',
      }),
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  // The mailer is a separate trigger; give it room for a cold start.
  for (let i = 0; i < 25; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const delivery = (await ref.get()).get('delivery') as
      | { state?: string; error?: string | null }
      | undefined;
    if (delivery?.state === 'SUCCESS') return { state: 'sent' as const, to: email, error: null };
    if (delivery?.state === 'ERROR') {
      return { state: 'error' as const, to: email, error: delivery.error ?? 'Unknown error.' };
    }
  }
  return { state: 'pending' as const, to: email, error: null };
});

/** A role holder's own always/never overrides, keyed by form id. */
export const setNotificationPrefs = onCall({ region: REGION }, async (request) => {
  const { uid, email } = requireAuthedDomainUser(request);
  if (hrLevel(request.auth?.token ?? {}) === null) {
    throw new HttpsError('permission-denied', 'HR access required.');
  }
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const rawForms = (raw.forms ?? {}) as Record<string, unknown>;
  if (typeof rawForms !== 'object' || Array.isArray(rawForms)) {
    throw new HttpsError('invalid-argument', 'forms must be an object.');
  }
  const forms: Record<string, 'always' | 'never'> = {};
  for (const [formId, choice] of Object.entries(rawForms)) {
    if (!FORM_DEFINITIONS[formId]) {
      throw new HttpsError('invalid-argument', `Unknown form: ${formId}`);
    }
    if (choice === null) continue; // back to default — just omit the key
    if (choice !== 'always' && choice !== 'never') {
      throw new HttpsError('invalid-argument', 'Choices are "always", "never", or null.');
    }
    forms[formId] = choice;
  }

  await getFirestore().collection('notificationPrefs').doc(uid).set({
    email,
    forms,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
});
