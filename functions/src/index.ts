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

export const startOffboarding = onCall({ region: REGION }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  const email = auth.token.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError('permission-denied', `Restricted to @${ALLOWED_DOMAIN} accounts.`);
  }

  const uid = auth.uid;
  const displayName = auth.token.name ?? email;

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
