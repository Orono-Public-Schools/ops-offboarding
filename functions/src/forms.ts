import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { REGION, requireAuthedDomainUser } from './shared';
import { getFormDefinition } from './shared-gen/forms/definitions';
import { buildSummary, validateForm } from './shared-gen/forms/validate';
import type { FormData, SubmissionStatus } from './shared-gen/forms/types';

type SubmitFormPayload = {
  formId?: string;
  data?: FormData;
};

type UpdateSubmissionStatusPayload = {
  id?: string;
  status?: SubmissionStatus;
  note?: string | null;
};

function isHrRequest(request: { auth?: { token: Record<string, unknown> } }): boolean {
  const token = request.auth?.token ?? {};
  return token.hr === true || token.it_admin === true;
}

function newReqId(): string {
  return `REQ-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
}

export const submitForm = onCall<SubmitFormPayload>({ region: REGION }, async (request) => {
  const { uid, email } = requireAuthedDomainUser(request);

  const formId = request.data?.formId;
  const def = formId ? getFormDefinition(formId) : null;
  if (!def) {
    throw new HttpsError('invalid-argument', 'Unknown form.');
  }
  const raw = request.data?.data;
  if (!raw || typeof raw !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing form data.');
  }

  const result = validateForm(def, raw);
  if (!result.ok) {
    throw new HttpsError('invalid-argument', 'Please fix the highlighted fields.', {
      fieldErrors: result.errors,
    });
  }

  const db = getFirestore();
  const submitterName =
    typeof request.auth?.token?.name === 'string' ? request.auth.token.name : email;

  // Random 5-digit ids; create() fails if taken, so retry a few times.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newReqId();
    const ref = db.collection('submissions').doc(id);
    try {
      await ref.create({
        id,
        formId: def.id,
        formVersion: def.version,
        formTitle: def.title,
        status: 'submitted',
        submitterUid: uid,
        submitterEmail: email,
        submitterName,
        data: result.cleaned,
        summary: buildSummary(def, result.cleaned),
        activityLog: [
          {
            ts: Timestamp.now(),
            actor: uid,
            actorEmail: email,
            action: 'submitted',
            note: null,
          },
        ],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
      });
      return { id };
    } catch (err) {
      const code = (err as { code?: number | string })?.code;
      // 6 = ALREADY_EXISTS
      if (code === 6 || code === 'already-exists') continue;
      throw err;
    }
  }
  throw new HttpsError('internal', 'Could not allocate a submission id. Please try again.');
});

const HR_SETTABLE_STATUSES = new Set<SubmissionStatus>(['processing', 'completed', 'denied']);

export const updateSubmissionStatus = onCall<UpdateSubmissionStatusPayload>(
  { region: REGION },
  async (request) => {
    const { uid, email } = requireAuthedDomainUser(request);
    if (!isHrRequest(request)) {
      throw new HttpsError('permission-denied', 'HR access required.');
    }

    const id = request.data?.id;
    const status = request.data?.status;
    const note = request.data?.note?.trim() || null;
    if (!id || typeof id !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing submission id.');
    }
    if (!status || !HR_SETTABLE_STATUSES.has(status)) {
      throw new HttpsError('invalid-argument', 'Invalid status.');
    }
    if (note && note.length > 2000) {
      throw new HttpsError('invalid-argument', 'Note is too long.');
    }

    const db = getFirestore();
    const ref = db.collection('submissions').doc(id);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Submission not found.');
      }
      const current = snap.get('status') as SubmissionStatus;
      if (current === status && !note) {
        throw new HttpsError('failed-precondition', `Already ${status}.`);
      }
      tx.update(ref, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: status === 'completed' ? FieldValue.serverTimestamp() : null,
        activityLog: FieldValue.arrayUnion({
          ts: Timestamp.now(),
          actor: uid,
          actorEmail: email,
          action: `status_${status}`,
          note,
        }),
      });
    });

    return { success: true };
  },
);
