import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

initializeApp();

const ALLOWED_DOMAIN = 'orono.k12.mn.us';
const REGION = 'us-central1';

export const healthcheck = onRequest({ region: REGION, invoker: 'public' }, (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export const enforceDomain = beforeUserCreated((event) => {
  const email = event.data?.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError(
      'permission-denied',
      `Sign-in is restricted to @${ALLOWED_DOMAIN} accounts.`,
    );
  }
});

const TASK_KEYS = [
  'drivePersonal',
  'driveTeam',
  'groupsOwnership',
  'outOfOffice',
  'calendarTransfer',
  'gmailForwarding',
  'sitesOwnership',
  'contactsExport',
  'deviceReturn',
  'knowledgeTransfer',
  'sharedCredentials',
] as const;

function initialTasks() {
  return Object.fromEntries(TASK_KEYS.map((k) => [k, { status: 'not_started', help: null }]));
}

function requireAuthedDomainUser(request: { auth?: { uid: string; token: { email?: string } } }) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  const email = request.auth.token.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError('permission-denied', `Restricted to @${ALLOWED_DOMAIN} accounts.`);
  }
  return { uid: request.auth.uid, email };
}

export const startOffboarding = onCall({ region: REGION }, async (request) => {
  const { uid, email } = requireAuthedDomainUser(request);
  const displayName = request.auth!.token.name ?? email;

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);

  const created = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, {
      uid,
      email,
      displayName,
      department: null,
      supervisor: null,
      successorEmail: null,
      lastDay: null,
      status: 'in_progress',
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      tasks: initialTasks(),
    });
    return true;
  });

  return { offboardingId: uid, created };
});

type SetSupervisorPayload = {
  email?: string;
  displayName?: string;
};

export const setSupervisor = onCall<SetSupervisorPayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);

  const supervisorEmail = request.data?.email?.trim().toLowerCase();
  const supervisorName = request.data?.displayName?.trim() || null;

  if (!supervisorEmail || !supervisorEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError(
      'invalid-argument',
      `Supervisor email must be a valid @${ALLOWED_DOMAIN} address.`,
    );
  }
  if (supervisorEmail === request.auth!.token.email) {
    throw new HttpsError('invalid-argument', 'You cannot pick yourself as your supervisor.');
  }

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const before = snap.get('supervisor') ?? null;

    tx.update(ref, {
      supervisor: supervisorEmail,
      supervisorName,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_supervisor',
      target: supervisorEmail,
      before,
      after: supervisorEmail,
      success: true,
      errorMsg: null,
    });
  });

  return { supervisorEmail, supervisorName };
});

type SetOutOfOfficePayload = {
  message?: string;
  subject?: string;
  startDate?: string | null;
  endDate?: string | null;
  googleAccessToken?: string;
};

function dateToMillis(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;
  const ms = Date.parse(dateStr);
  if (Number.isNaN(ms)) return undefined;
  return ms;
}

export const setOutOfOffice = onCall<SetOutOfOfficePayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);

  const message = request.data?.message?.trim();
  const subject = request.data?.subject?.trim() || 'I am no longer with Orono Public Schools';
  const startDate = request.data?.startDate ?? null;
  const endDate = request.data?.endDate ?? null;
  const googleAccessToken = request.data?.googleAccessToken;

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
    const before = snap.get('tasks.outOfOffice') ?? null;
    tx.update(ref, {
      'tasks.outOfOffice': {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        message,
        subject,
        startDate,
        endDate,
        help: snap.get('tasks.outOfOffice.help') ?? null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_out_of_office',
      target: 'tasks.outOfOffice',
      before,
      after: { message, subject, startDate, endDate },
      success: true,
      errorMsg: null,
    });
  });

  return { success: true };
});
