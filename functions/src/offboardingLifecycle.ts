import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  ALLOWED_DOMAIN,
  REGION,
  TASK_KEY_SET,
  deleteSubcollection,
  initialTasks,
  requireAuthedDomainUser,
} from './shared';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type SetEoySettingsPayload = { returnDate?: string | null };

export const setEoySettings = onCall<SetEoySettingsPayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);
  if (request.auth?.token.it_admin !== true) {
    throw new HttpsError('permission-denied', 'IT admin only.');
  }
  const returnDate = request.data?.returnDate ?? null;
  if (returnDate !== null && (typeof returnDate !== 'string' || !ISO_DATE_RE.test(returnDate))) {
    throw new HttpsError('invalid-argument', 'returnDate must be YYYY-MM-DD or null.');
  }

  const db = getFirestore();
  await db.collection('appSettings').doc('eoyVacationResponder').set(
    {
      returnDate,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );
  return { returnDate };
});

type ResetUserPayload = { uid?: string };

export const resetUserChecklist = onCall<ResetUserPayload>(
  { region: REGION, timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    const { uid: callerUid } = requireAuthedDomainUser(request);
    const targetUid = request.data?.uid;
    if (!targetUid || typeof targetUid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    const isAdmin = request.auth?.token.it_admin === true;
    const isSelf = callerUid === targetUid;
    if (!isAdmin && !isSelf) {
      throw new HttpsError(
        'permission-denied',
        'You can only reset your own checklist unless you are an IT admin.',
      );
    }

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(targetUid);

    const auditDeleted = await deleteSubcollection(ref.collection('auditLog'));
    const fileScanDeleted = await deleteSubcollection(ref.collection('fileScan'));

    await ref.delete();

    return { success: true, uid: targetUid, auditDeleted, fileScanDeleted };
  },
);

type StartOffboardingPayload = {
  type?: 'returning' | 'leaving';
  buildingChecklist?: 'schumann' | 'intermediate' | 'secondary' | 'nonInstructional' | null;
};

const VALID_FLOW_TYPES = new Set(['returning', 'leaving']);
const VALID_BUILDING_CHECKLISTS = new Set([
  'schumann',
  'intermediate',
  'secondary',
  'nonInstructional',
]);

export const startOffboarding = onCall<StartOffboardingPayload>(
  { region: REGION },
  async (request) => {
    const { uid, email } = requireAuthedDomainUser(request);
    const displayName = request.auth!.token.name ?? email;

    const reqType = request.data?.type;
    const reqBuilding = request.data?.buildingChecklist ?? null;
    const type = reqType && VALID_FLOW_TYPES.has(reqType) ? reqType : 'leaving';
    const buildingChecklist =
      type === 'returning' && reqBuilding && VALID_BUILDING_CHECKLISTS.has(reqBuilding)
        ? reqBuilding
        : null;

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);

    const created = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        // If the doc already exists but doesn't have type/building yet (older
        // record), fill them in once based on this start request.
        const existingType = snap.get('type');
        if (!existingType) {
          tx.update(ref, {
            type,
            buildingChecklist,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return false;
      }
      tx.set(ref, {
        uid,
        email,
        displayName,
        department: null,
        supervisor: null,
        successorEmail: null,
        lastDay: null,
        type,
        buildingChecklist,
        status: 'in_progress',
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
        tasks: initialTasks(),
      });
      return true;
    });

    return { offboardingId: uid, created, type, buildingChecklist };
  },
);

type SetLastDayPayload = { lastDay?: string | null };

export const setLastDay = onCall<SetLastDayPayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);
  const lastDay = request.data?.lastDay ?? null;
  if (lastDay !== null && (typeof lastDay !== 'string' || !ISO_DATE_RE.test(lastDay))) {
    throw new HttpsError('invalid-argument', 'lastDay must be YYYY-MM-DD or null.');
  }

  const ms = lastDay ? Date.parse(lastDay) : null;
  if (lastDay !== null && (ms === null || Number.isNaN(ms))) {
    throw new HttpsError('invalid-argument', 'lastDay could not be parsed as a date.');
  }
  const timestamp = ms !== null ? new Date(ms) : null;

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const before = snap.get('lastDay') ?? null;
    tx.update(ref, {
      lastDay: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_last_day',
      target: 'lastDay',
      before,
      after: lastDay,
      success: true,
      errorMsg: null,
    });
  });

  return { lastDay };
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

type MarkTaskCompletePayload = {
  taskKey?: string;
  status?: 'completed' | 'skipped' | 'in_progress' | 'not_started';
  notes?: string | null;
};

export const markTaskComplete = onCall<MarkTaskCompletePayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const taskKey = request.data?.taskKey;
    const status = request.data?.status ?? 'completed';
    const notes = request.data?.notes ?? null;

    if (!taskKey || !TASK_KEY_SET.has(taskKey)) {
      throw new HttpsError('invalid-argument', `Unknown taskKey: ${taskKey}`);
    }

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);
    const auditRef = ref.collection('auditLog').doc();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError('failed-precondition', 'Offboarding record not found.');
      }
      const before = snap.get(`tasks.${taskKey}.status`) ?? null;
      const updates: Record<string, unknown> = {
        [`tasks.${taskKey}.status`]: status,
        [`tasks.${taskKey}.completedAt`]:
          status === 'completed' ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (notes !== null) {
        updates[`tasks.${taskKey}.notes`] = notes;
      }
      tx.update(ref, updates);
      tx.set(auditRef, {
        ts: FieldValue.serverTimestamp(),
        actor: uid,
        action: 'mark_task_complete',
        target: `tasks.${taskKey}`,
        before,
        after: { status, notes },
        success: true,
        errorMsg: null,
      });
    });

    return { taskKey, status };
  },
);

type RequestHelpPayload = { taskKey?: string; reason?: string };

export const requestHelp = onCall<RequestHelpPayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);
  const taskKey = request.data?.taskKey;
  const reason = request.data?.reason?.trim();

  if (!taskKey || !TASK_KEY_SET.has(taskKey)) {
    throw new HttpsError('invalid-argument', `Unknown taskKey: ${taskKey}`);
  }
  if (!reason) {
    throw new HttpsError('invalid-argument', 'A reason for the help request is required.');
  }
  if (reason.length > 2000) {
    throw new HttpsError('invalid-argument', 'Reason is too long (max 2000 characters).');
  }

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const before = snap.get(`tasks.${taskKey}.help`) ?? null;
    tx.update(ref, {
      [`tasks.${taskKey}.help`]: {
        reason,
        requestedAt: FieldValue.serverTimestamp(),
        resolvedAt: null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'request_help',
      target: `tasks.${taskKey}.help`,
      before,
      after: { reason },
      success: true,
      errorMsg: null,
    });
  });

  return { taskKey, success: true };
});

type ResolveHelpPayload = { taskKey?: string; uid?: string };

export const resolveHelp = onCall<ResolveHelpPayload>({ region: REGION }, async (request) => {
  const { uid: callerUid } = requireAuthedDomainUser(request);
  const taskKey = request.data?.taskKey;
  const targetUid = request.data?.uid ?? callerUid;

  if (!taskKey || !TASK_KEY_SET.has(taskKey)) {
    throw new HttpsError('invalid-argument', `Unknown taskKey: ${taskKey}`);
  }
  if (typeof targetUid !== 'string' || !targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }

  const isAdmin = request.auth?.token.it_admin === true;
  const isSelf = callerUid === targetUid;
  if (!isAdmin && !isSelf) {
    throw new HttpsError(
      'permission-denied',
      'You can only resolve your own help requests unless you are an IT admin.',
    );
  }

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(targetUid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const before = snap.get(`tasks.${taskKey}.help`);
    if (!before) {
      throw new HttpsError('failed-precondition', 'No help request exists for this task.');
    }
    tx.update(ref, {
      [`tasks.${taskKey}.help.resolvedAt`]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: callerUid,
      action: 'resolve_help',
      target: `tasks.${taskKey}.help`,
      before,
      after: { resolved: true, byAdmin: isAdmin && !isSelf },
      success: true,
      errorMsg: null,
    });
  });

  return { taskKey, uid: targetUid, success: true };
});
