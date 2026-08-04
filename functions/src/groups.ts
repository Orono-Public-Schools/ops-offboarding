import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ALLOWED_DOMAIN, REGION, requireAuthedDomainUser } from './shared';

type PromoteGroupOwnerPayload = {
  groupId?: string;
  newOwnerEmail?: string;
  googleAccessToken?: string;
};

export const promoteGroupOwner = onCall<PromoteGroupOwnerPayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const { groupId, newOwnerEmail, googleAccessToken } = request.data ?? {};
    if (!groupId || !newOwnerEmail || !googleAccessToken) {
      throw new HttpsError('invalid-argument', 'groupId, newOwnerEmail, and token are required.');
    }
    const targetEmail = newOwnerEmail.trim().toLowerCase();
    if (!targetEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      throw new HttpsError(
        'invalid-argument',
        `New owner email must be a @${ALLOWED_DOMAIN} address.`,
      );
    }

    const baseUrl = `https://www.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(
      groupId,
    )}/members`;
    const memberUrl = `${baseUrl}/${encodeURIComponent(targetEmail)}`;

    const headers = {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    };

    // Determine whether the person is already a member.
    const getRes = await fetch(memberUrl, { headers });
    if (getRes.status === 401 || getRes.status === 403) {
      throw new HttpsError(
        'permission-denied',
        'Google rejected the request. You may not have permission to promote owners on this group.',
      );
    }

    let action: 'inserted' | 'updated';
    if (getRes.status === 404) {
      const insertRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: targetEmail, role: 'OWNER' }),
      });
      if (!insertRes.ok) {
        const txt = await insertRes.text();
        if (insertRes.status === 401 || insertRes.status === 403) {
          throw new HttpsError(
            'permission-denied',
            'Google rejected the add. You may need to be an Owner of the group to promote others.',
          );
        }
        throw new HttpsError('internal', `Add member failed (${insertRes.status}): ${txt}`);
      }
      action = 'inserted';
    } else if (getRes.ok) {
      const patchRes = await fetch(memberUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ email: targetEmail, role: 'OWNER' }),
      });
      if (!patchRes.ok) {
        const txt = await patchRes.text();
        if (patchRes.status === 401 || patchRes.status === 403) {
          throw new HttpsError(
            'permission-denied',
            'Google rejected the update. You may need to be an Owner of the group to change roles.',
          );
        }
        throw new HttpsError('internal', `Promote failed (${patchRes.status}): ${txt}`);
      }
      action = 'updated';
    } else {
      const txt = await getRes.text();
      throw new HttpsError('internal', `Member lookup failed (${getRes.status}): ${txt}`);
    }

    const db = getFirestore();
    const offboardingRef = db.collection('offboardings').doc(uid);
    const auditRef = offboardingRef.collection('auditLog').doc();
    await auditRef.set({
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'promote_group_owner',
      target: groupId,
      before: null,
      after: { groupId, newOwnerEmail: targetEmail, action },
      success: true,
      errorMsg: null,
    });
    await offboardingRef.update({ updatedAt: FieldValue.serverTimestamp() });

    return { success: true, action };
  },
);
