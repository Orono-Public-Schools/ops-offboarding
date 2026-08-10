#!/usr/bin/env node
/**
 * Grant (or revoke) a role custom claim on a Firebase Auth user.
 * Roles: it_admin (default), hr_admin, hr_staff. (The admin dashboard's
 * Access card is the everyday way to do this — the script is the backstop.)
 *
 * Usage:
 *   npm run grant-role -- user@orono.k12.mn.us                     # grant it_admin
 *   npm run grant-role -- user@orono.k12.mn.us --role hr_admin
 *   npm run grant-role -- user@orono.k12.mn.us --role hr_staff
 *   npm run grant-role -- user@orono.k12.mn.us --revoke            # revoke it_admin
 *   npm run grant-role -- user@orono.k12.mn.us --role hr_admin --revoke
 *
 * Auth: Application Default Credentials. Run once:
 *   gcloud auth application-default login
 * Or set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'ops-offboarding';
const ALLOWED_DOMAIN = 'orono.k12.mn.us';
const ROLES = ['it_admin', 'it_support', 'hr_admin', 'hr_staff'];

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const roleFlagIdx = args.indexOf('--role');
const role = roleFlagIdx === -1 ? 'it_admin' : args[roleFlagIdx + 1];
const email = args.find((a, i) => !a.startsWith('--') && i !== roleFlagIdx + 1);

if (!email) {
  fail('missing email. Usage: npm run grant-admin -- user@orono.k12.mn.us [--role hr] [--revoke]');
}
if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
  fail(`email must be @${ALLOWED_DOMAIN}`);
}
if (!ROLES.includes(role)) {
  fail(`unknown role "${role}". Roles: ${ROLES.join(', ')}`);
}

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });

try {
  const user = await getAuth().getUserByEmail(email);
  const existing = user.customClaims ?? {};
  const next = { ...existing };
  // hr_admin / hr_staff share the single `hr` claim: 'admin' | 'staff'.
  const claimKey =
    role === 'it_admin' ? 'it_admin' : role === 'it_support' ? 'it_support' : 'hr';
  if (revoke) {
    delete next[claimKey];
  } else {
    // One role per person — a grant replaces whatever they held.
    delete next.it_admin;
    delete next.it_support;
    delete next.hr;
    next[claimKey] = role === 'hr_admin' ? 'admin' : role === 'hr_staff' ? 'staff' : true;
  }
  await getAuth().setCustomUserClaims(user.uid, next);
  const action = revoke ? 'Revoked' : 'Granted';
  console.log(`${action} ${role} for ${email} (uid: ${user.uid})`);
  console.log('Claims now:', next);
  console.log(
    'The user must sign out and sign back in for the new claim to appear in their ID token.',
  );
} catch (err) {
  if (err?.code === 'auth/user-not-found') {
    fail(
      `no Firebase Auth user with email ${email}. They must sign in once before you can grant a role.`,
    );
  }
  fail(err?.message ?? String(err));
}
