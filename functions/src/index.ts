import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export const healthcheck = onRequest(
  { region: 'us-central1', invoker: 'public' },
  (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  }
);
