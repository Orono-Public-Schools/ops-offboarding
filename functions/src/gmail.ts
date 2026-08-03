import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { REGION, requireAuthedDomainUser } from './shared';

type SetOutOfOfficePayload = {
  message?: string;
  subject?: string;
  startDate?: string | null;
  endDate?: string | null;
  googleAccessToken?: string;
  taskKey?: 'outOfOffice' | 'eoyVacationResponder';
};

const VALID_OOO_TASK_KEYS = new Set<string>(['outOfOffice', 'eoyVacationResponder']);

function dateToMillis(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;
  const ms = Date.parse(dateStr);
  if (Number.isNaN(ms)) return undefined;
  return ms;
}

export const setOutOfOffice = onCall<SetOutOfOfficePayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);

  const message = request.data?.message?.trim();
  const subject = request.data?.subject?.trim() || 'Out of office';
  const startDate = request.data?.startDate ?? null;
  const endDate = request.data?.endDate ?? null;
  const googleAccessToken = request.data?.googleAccessToken;
  const taskKey =
    request.data?.taskKey && VALID_OOO_TASK_KEYS.has(request.data.taskKey)
      ? request.data.taskKey
      : 'outOfOffice';

  if (!message) {
    throw new HttpsError('invalid-argument', 'Message is required.');
  }
  if (!googleAccessToken) {
    throw new HttpsError(
      'failed-precondition',
      'Missing Google access token. Please sign out and sign in again.',
    );
  }

  const gmailBody: Record<string, unknown> = {
    enableAutoReply: true,
    responseSubject: subject,
    responseBodyPlainText: message,
    restrictToContacts: false,
    restrictToDomain: false,
  };
  const startMs = dateToMillis(startDate);
  const endMs = dateToMillis(endDate);
  if (startMs !== undefined) gmailBody.startTime = startMs;
  if (endMs !== undefined) gmailBody.endTime = endMs;

  const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/vacation', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gmailBody),
  });

  if (!gmailRes.ok) {
    const bodyText = await gmailRes.text();
    if (gmailRes.status === 401 || gmailRes.status === 403) {
      throw new HttpsError(
        'permission-denied',
        'Google rejected the request. Please sign out and sign in again to refresh permissions.',
      );
    }
    throw new HttpsError('internal', `Gmail API error (${gmailRes.status}): ${bodyText}`);
  }

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const taskPath = `tasks.${taskKey}`;
    const before = snap.get(taskPath) ?? null;
    tx.update(ref, {
      [taskPath]: {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        message,
        subject,
        startDate,
        endDate,
        help: snap.get(`${taskPath}.help`) ?? null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_out_of_office',
      target: taskPath,
      before,
      after: { message, subject, startDate, endDate },
      success: true,
      errorMsg: null,
    });
  });

  return { success: true };
});

type RequestGmailForwardingPayload = {
  forwardTo?: string;
  note?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const requestGmailForwarding = onCall<RequestGmailForwardingPayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);

    const forwardTo = request.data?.forwardTo?.trim().toLowerCase() ?? '';
    const note = request.data?.note?.trim() || null;

    if (!forwardTo || !EMAIL_RE.test(forwardTo)) {
      throw new HttpsError('invalid-argument', 'A valid forwarding email address is required.');
    }

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);
    const auditRef = ref.collection('auditLog').doc();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError('failed-precondition', 'Offboarding record not found.');
      }
      const before = snap.get('tasks.gmailForwarding') ?? null;
      tx.update(ref, {
        'tasks.gmailForwarding': {
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          forwardTo,
          note,
          help: snap.get('tasks.gmailForwarding.help') ?? null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(auditRef, {
        ts: FieldValue.serverTimestamp(),
        actor: uid,
        action: 'request_gmail_forwarding',
        target: 'tasks.gmailForwarding',
        before,
        after: { forwardTo, note },
        success: true,
        errorMsg: null,
      });
    });

    return { success: true, forwardTo };
  },
);
