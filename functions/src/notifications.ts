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
// Template — PaperPal's branded wrapper, rebadged for OronoHR.

function emailHtml({
  heading,
  body,
  link,
  linkLabel = 'Open in OronoHR',
}: {
  heading: string;
  body: string;
  link: string;
  linkLabel?: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="vertical-align: middle; width: 40px;">
              <img src="${APP_URL}/OronoIcon.png" alt="OronoHR" width="36" height="36" style="display: block; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: 0.5px;">OronoHR</h1>
              <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 2px 0 0; letter-spacing: 0.3px;">Orono Public Schools</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="background: #ffffff; padding: 28px 32px; border: 1px solid #e2e5ea; border-top: none;">
        <h2 style="color: #1d2a5d; font-size: 16px; margin: 0 0 16px; font-weight: 700;">${heading}</h2>
        <div style="color: #334155; font-size: 14px; line-height: 1.7;">${body}</div>
        <div style="margin-top: 28px;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); color: white; text-decoration: none; padding: 11px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">${linkLabel}</a>
        </div>
      </div>
      <div style="background: #f8f9fb; padding: 16px 32px; border: 1px solid #e2e5ea; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Orono Public Schools &middot; OronoHR &middot; Staff forms &amp; HR
        </p>
      </div>
    </div>
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

/** Queues a doc the Trigger Email extension sends. No-op on an empty list. */
async function queueMail(db: Firestore, to: string[], subject: string, html: string) {
  if (to.length === 0) return;
  logger.info('queueMail', { to, subject });
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

/** Resolves who hears about a new submission and queues the email. */
export async function notifySubmitted(sub: SubmissionFacts): Promise<void> {
  try {
    const db = getFirestore();
    const settings = await loadSettings(db);
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

    const summary = sub.summary ? `${escapeHtml(sub.summary)} &middot; ` : '';
    await queueMail(
      db,
      [...recipients],
      `[OronoHR] ${sub.formTitle} from ${sub.submitterName} — ${displayId(sub.id)}`,
      emailHtml({
        heading: `New ${sub.formTitle} submission`,
        body: `
          <p><strong>${escapeHtml(sub.submitterName)}</strong> filed a ${escapeHtml(sub.formTitle)} request.</p>
          <p style="color: #64748b; font-size: 13px;">${summary}${displayId(sub.id)}</p>
        `,
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

    const noteBlock = note
      ? `
        <div style="background: #eaecf5; border-left: 3px solid #4356a9; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="color: #4356a9; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Note from HR</p>
          <p style="color: #334155; margin: 0;">${escapeHtml(note)}</p>
        </div>
      `
      : '';
    await queueMail(
      db,
      [sub.submitterEmail],
      `[OronoHR] ${copy.subject} — ${sub.formTitle} ${displayId(sub.id)}`,
      emailHtml({
        heading: copy.heading,
        body: `
          <p>Your ${escapeHtml(sub.formTitle)} request ${copy.body}.</p>
          ${noteBlock}
          <p style="color: #64748b; font-size: 13px;">${displayId(sub.id)}</p>
        `,
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
      if (!Array.isArray(v.recipients) || v.recipients.length > 20 || !v.recipients.every(isEmailish)) {
        throw new HttpsError('invalid-argument', `Recipients for ${formId} must be up to 20 emails.`);
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
