import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

import { ALLOWED_DOMAIN, REGION, hrLevel, requireAuthedDomainUser } from './shared';

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

export type RoleName = 'it_admin' | 'hr_admin' | 'hr_staff';

type RoleHolder = {
  uid: string;
  email: string;
  displayName: string | null;
  itAdmin: boolean;
  /** hr claim level; legacy `hr: true` reads as 'admin'. */
  hrRole: 'admin' | 'staff' | null;
};

/** Everyone holding any role. Callable by IT admins and HR admins. */
export const listRoleHolders = onCall<void, Promise<{ holders: RoleHolder[] }>>(
  { region: REGION, timeoutSeconds: 120 },
  async (request) => {
    requireAuthedDomainUser(request);
    if (hrLevel(request.auth?.token ?? {}) !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }
    const auth = getAuth();
    const holders: RoleHolder[] = [];
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const user of page.users) {
        const claims = user.customClaims ?? {};
        const itAdmin = claims.it_admin === true;
        const hrRole =
          claims.hr === true || claims.hr === 'admin'
            ? ('admin' as const)
            : claims.hr === 'staff'
              ? ('staff' as const)
              : null;
        if (!itAdmin && !hrRole) continue;
        holders.push({
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? null,
          itAdmin,
          hrRole,
        });
      }
      pageToken = page.pageToken;
    } while (pageToken);
    holders.sort((a, b) => a.email.localeCompare(b.email));
    return { holders };
  },
);

type SetUserRolePayload = { email?: string; role?: RoleName; grant?: boolean };

/**
 * Grants or revokes one role. IT-admin changes need an IT admin; HR role
 * changes need admin level (IT admin or HR admin). Granting hr_admin over
 * hr_staff (or vice versa) simply replaces the hr claim.
 */
export const setUserRole = onCall<SetUserRolePayload>({ region: REGION }, async (request) => {
  const { uid: callerUid } = requireAuthedDomainUser(request);
  const callerToken = (request.auth?.token ?? {}) as Record<string, unknown>;
  const role = request.data?.role;
  const grant = request.data?.grant === true;
  const email = request.data?.email?.trim().toLowerCase();

  if (role !== 'it_admin' && role !== 'hr_admin' && role !== 'hr_staff') {
    throw new HttpsError('invalid-argument', 'Unknown role.');
  }
  if (role === 'it_admin') {
    if (callerToken.it_admin !== true) {
      throw new HttpsError('permission-denied', 'IT admin only.');
    }
  } else if (hrLevel(callerToken) !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
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
    // claim is already present. The domain check above keeps this safe even
    // though manual createUser bypasses enforceDomain.
    const staffSnap = await getFirestore().collection('staff').doc(email).get();
    const displayName = (staffSnap.get('displayName') as string | undefined) ?? undefined;
    user = await auth.createUser({ email, displayName });
    preCreated = true;
  }

  // Lockout guards: nobody revokes the access that lets them stand here.
  if (!grant && user.uid === callerUid) {
    if (role === 'it_admin') {
      throw new HttpsError(
        'failed-precondition',
        'You can’t revoke your own admin access. Ask another admin to do it.',
      );
    }
    if (role === 'hr_admin' && callerToken.it_admin !== true) {
      throw new HttpsError(
        'failed-precondition',
        'You can’t revoke your own HR admin access. Ask another admin to do it.',
      );
    }
  }

  const next: Record<string, unknown> = { ...(user.customClaims ?? {}) };
  if (role === 'it_admin') {
    if (grant) next.it_admin = true;
    else delete next.it_admin;
  } else {
    if (grant) next.hr = role === 'hr_admin' ? 'admin' : 'staff';
    else delete next.hr;
  }
  await auth.setCustomUserClaims(user.uid, next);

  await getFirestore()
    .collection('adminAudit')
    .add({
      ts: FieldValue.serverTimestamp(),
      actor: callerUid,
      action: `${grant ? 'grant' : 'revoke'}_${role}`,
      target: user.uid,
      targetEmail: email,
      preCreated,
      success: true,
    });

  return {
    success: true,
    uid: user.uid,
    email,
    role,
    grant,
    displayName: user.displayName ?? null,
    preCreated,
  };
});
