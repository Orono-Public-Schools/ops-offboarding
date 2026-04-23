import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

initializeApp();

const ALLOWED_DOMAIN = 'orono.k12.mn.us';

export const healthcheck = onRequest({ region: 'us-central1', invoker: 'public' }, (_req, res) => {
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
