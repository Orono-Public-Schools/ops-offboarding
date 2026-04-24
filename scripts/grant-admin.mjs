#!/usr/bin/env node
/**
 * Grant (or revoke) the `it_admin` custom claim on a Firebase Auth user.
 *
 * Usage:
 *   npm run grant-admin -- user@orono.k12.mn.us           # grant
 *   npm run grant-admin -- user@orono.k12.mn.us --revoke  # revoke
 *
 * Auth: Application Default Credentials. Run once:
 *   gcloud auth application-default login
 * Or set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'ops-offboarding';
const ALLOWED_DOMAIN = 'orono.k12.mn.us';

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const email = args.find((a) => !a.startsWith('--'));

if (!email) {
  fail('missing email. Usage: npm run grant-admin -- user@orono.k12.mn.us [--revoke]');
}
if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
  fail(`email must be @${ALLOWED_DOMAIN}`);
}

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });

try {
  const user = await getAuth().getUserByEmail(email);
  const existing = user.customClaims ?? {};
  const next = { ...existing };
  if (revoke) {
    delete next.it_admin;
  } else {
    next.it_admin = true;
  }
  await getAuth().setCustomUserClaims(user.uid, next);
  const action = revoke ? 'Revoked' : 'Granted';
  console.log(`${action} it_admin for ${email} (uid: ${user.uid})`);
  console.log('Claims now:', next);
  console.log(
    'The user must sign out and sign back in for the new claim to appear in their ID token.',
  );
} catch (err) {
  if (err?.code === 'auth/user-not-found') {
    fail(
      `no Firebase Auth user with email ${email}. They must sign in once before you can grant admin.`,
    );
  }
  fail(err?.message ?? String(err));
}
