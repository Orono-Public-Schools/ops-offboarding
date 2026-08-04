import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

import { ALLOWED_DOMAIN, REGION, requireAuthedDomainUser } from './shared';

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

type ListAdminsResponse = {
  admins: Array<{ uid: string; email: string; displayName: string | null }>;
};

export const listAdmins = onCall<void, Promise<ListAdminsResponse>>(
  { region: REGION, timeoutSeconds: 120 },
  async (request) => {
    requireAuthedDomainUser(request);
    if (request.auth?.token.it_admin !== true) {
      throw new HttpsError('permission-denied', 'IT admin only.');
    }
    const auth = getAuth();
    const admins: ListAdminsResponse['admins'] = [];
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const user of page.users) {
        if (user.customClaims?.it_admin === true) {
          admins.push({
            uid: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? null,
          });
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
    admins.sort((a, b) => (a.email > b.email ? 1 : a.email < b.email ? -1 : 0));
    return { admins };
  },
);

type SetAdminClaimPayload = { email?: string; grant?: boolean };

export const setAdminClaim = onCall<SetAdminClaimPayload>({ region: REGION }, async (request) => {
  const { uid: callerUid } = requireAuthedDomainUser(request);
  if (request.auth?.token.it_admin !== true) {
    throw new HttpsError('permission-denied', 'IT admin only.');
  }
  const email = request.data?.email?.trim().toLowerCase();
  const grant = request.data?.grant === true;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError('invalid-argument', `Email must be a valid @${ALLOWED_DOMAIN} address.`);
  }

  const auth = getAuth();
  let user;
  let preCreated = false;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;
    if (!grant) {
      throw new HttpsError(
        'failed-precondition',
        'No Firebase Auth account exists for that email — nothing to revoke.',
      );
    }
    // Pre-create the Auth record so the claim attaches now. When the user
    // later signs in via Google SSO, Firebase Auth links by email and the
    // claim is already present. setAdminClaim's domain check above keeps
    // this safe even though manual createUser bypasses enforceDomain.
    const staffSnap = await getFirestore().collection('staff').doc(email).get();
    const displayName = (staffSnap.get('displayName') as string | undefined) ?? undefined;
    user = await auth.createUser({ email, displayName });
    preCreated = true;
  }

  if (!grant && user.uid === callerUid) {
    throw new HttpsError(
      'failed-precondition',
      'You can’t revoke your own admin access. Ask another admin to do it.',
    );
  }

  const existing = user.customClaims ?? {};
  const next: Record<string, unknown> = { ...existing };
  if (grant) {
    next.it_admin = true;
  } else {
    delete next.it_admin;
  }
  await auth.setCustomUserClaims(user.uid, next);

  const db = getFirestore();
  await db.collection('adminAudit').add({
    ts: FieldValue.serverTimestamp(),
    actor: callerUid,
    action: grant ? 'grant_admin' : 'revoke_admin',
    target: user.uid,
    targetEmail: email,
    preCreated,
    success: true,
  });

  return {
    success: true,
    uid: user.uid,
    email,
    grant,
    displayName: user.displayName ?? null,
    preCreated,
  };
});
