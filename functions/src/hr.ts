import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { REGION, requireAuthedDomainUser } from './shared';
import {
  EMPLOYEE_STATUSES,
  LEAVE_STATUSES,
  HR_RECORD_COLLECTIONS,
  displayName,
  type EmployeeKind,
  type EmployeeStatus,
  type HrRecordCollection,
  type LeaveStatus,
  type TaskMap,
} from './shared-gen/hr/types';
import { specFor, taskKeys, detailKeys, type HrRecordSpec } from './shared-gen/hr/catalog';
import { currentFiscalYearLabel, fiscalYearLabel } from './shared-gen/hr/util';

export const EMPLOYEE_ID_COUNTER_DOC = 'hrEmployeeIds';

function requireHr(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  const authed = requireAuthedDomainUser(
    request as { auth?: { uid: string; token: { email?: string } } },
  );
  const token = request.auth?.token ?? {};
  if (token.hr !== true && token.it_admin !== true) {
    throw new HttpsError('permission-denied', 'HR access required.');
  }
  return authed;
}

function optString(value: unknown, field: string, max = 500): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new HttpsError('invalid-argument', `${field} is too long.`);
  }
  return trimmed || null;
}

/** The employee fields a callable may set, validated. */
function cleanEmployeeFields(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const stringKeys = [
    'firstName',
    'lastName',
    'email',
    'building',
    'position',
    'reportsTo',
    'startDate',
    'endDate',
    'description',
  ];
  for (const key of stringKeys) {
    if (key in raw) out[key] = optString(raw[key], key);
  }
  if ('notes' in raw) out.notes = optString(raw.notes, 'notes', 5000);
  if ('status' in raw) {
    if (!EMPLOYEE_STATUSES.includes(raw.status as EmployeeStatus)) {
      throw new HttpsError('invalid-argument', 'Invalid status.');
    }
    out.status = raw.status;
  }
  if ('kind' in raw) {
    if (raw.kind !== 'regular' && raw.kind !== 'ce_sub_coach') {
      throw new HttpsError('invalid-argument', 'Invalid kind.');
    }
    out.kind = raw.kind as EmployeeKind;
  }
  if ('employeeId' in raw && raw.employeeId !== null && raw.employeeId !== undefined) {
    const n = Number(raw.employeeId);
    if (!Number.isInteger(n) || n <= 0 || n > 10_000_000) {
      throw new HttpsError('invalid-argument', 'Invalid employee ID.');
    }
    out.employeeId = n;
  }
  return out;
}

function historyEntry(
  actor: { uid: string; email: string },
  action: string,
  changes: Array<{ field: string; from: unknown; to: unknown }> = [],
) {
  return {
    ts: FieldValue.serverTimestamp(),
    actor: actor.uid,
    actorEmail: actor.email,
    action,
    changes,
  };
}

/** Allocate the next EE# from the counter doc, transactionally. */
async function allocateEmployeeId(tx: FirebaseFirestore.Transaction): Promise<number> {
  const db = getFirestore();
  const ref = db.collection('appSettings').doc(EMPLOYEE_ID_COUNTER_DOC);
  const snap = await tx.get(ref);
  const nextId = snap.exists ? Number(snap.get('nextId')) : NaN;
  if (!Number.isInteger(nextId) || nextId <= 0) {
    throw new HttpsError(
      'failed-precondition',
      'Employee ID counter is not seeded. Run the sheet import, or set an ID manually.',
    );
  }
  tx.set(ref, { nextId: nextId + 1 }, { merge: true });
  return nextId;
}

export const createEmployee = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const fields = cleanEmployeeFields(raw);
  const firstName = (fields.firstName as string | null) ?? '';
  const lastName = (fields.lastName as string | null) ?? '';
  if (!firstName && !lastName) {
    throw new HttpsError('invalid-argument', 'A name is required.');
  }

  const db = getFirestore();
  const ref = db.collection('employees').doc();

  const employeeId = await db.runTransaction(async (tx) => {
    let id = (fields.employeeId as number | undefined) ?? null;
    if (id === null && raw.assignId === true) {
      id = await allocateEmployeeId(tx);
    }
    tx.set(ref, {
      employeeId: id,
      firstName,
      lastName,
      nameRaw: [lastName, firstName].filter(Boolean).join(', '),
      email: fields.email ?? null,
      status: fields.status ?? 'active',
      kind: fields.kind ?? 'regular',
      building: fields.building ?? null,
      position: fields.position ?? null,
      reportsTo: fields.reportsTo ?? null,
      startDate: fields.startDate ?? null,
      endDate: fields.endDate ?? null,
      description: fields.description ?? null,
      notes: fields.notes ?? null,
      source: 'manual',
      importBatchId: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.email,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.email,
    });
    tx.set(ref.collection('history').doc(), historyEntry(actor, 'created'));
    return id;
  });

  return { id: ref.id, employeeId };
});

export const updateEmployee = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const id = raw.id;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing employee id.');
  }
  const fields = cleanEmployeeFields((raw.fields ?? {}) as Record<string, unknown>);
  if (Object.keys(fields).length === 0) {
    throw new HttpsError('invalid-argument', 'Nothing to update.');
  }

  const db = getFirestore();
  const ref = db.collection('employees').doc(id);

  const changed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Employee not found.');
    const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      const current = snap.get(key) ?? null;
      if (current !== value) {
        changes.push({ field: key, from: current, to: value });
        updates[key] = value;
      }
    }
    if (changes.length === 0) return 0;
    updates.updatedAt = FieldValue.serverTimestamp();
    updates.updatedBy = actor.email;
    tx.update(ref, updates);
    tx.set(ref.collection('history').doc(), historyEntry(actor, 'updated', changes));
    return changes.length;
  });

  return { changed };
});

export const assignEmployeeId = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const id = (request.data as { id?: string } | undefined)?.id;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing employee id.');
  }

  const db = getFirestore();
  const ref = db.collection('employees').doc(id);
  const employeeId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Employee not found.');
    const existing = snap.get('employeeId');
    if (existing) {
      throw new HttpsError('failed-precondition', `Already has EE# ${existing}.`);
    }
    const allocated = await allocateEmployeeId(tx);
    tx.update(ref, {
      employeeId: allocated,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.email,
    });
    tx.set(
      ref.collection('history').doc(),
      historyEntry(actor, 'updated', [{ field: 'employeeId', from: null, to: allocated }]),
    );
    return allocated;
  });

  return { employeeId };
});

function parseCollection(value: unknown): HrRecordCollection {
  if (!HR_RECORD_COLLECTIONS.includes(value as HrRecordCollection)) {
    throw new HttpsError('invalid-argument', 'Invalid record collection.');
  }
  return value as HrRecordCollection;
}

function requireSpec(collection: HrRecordCollection, type: string | null): HrRecordSpec {
  const spec = specFor(collection, type);
  if (!spec) throw new HttpsError('invalid-argument', 'Invalid record type.');
  return spec;
}

function cleanDetails(raw: unknown, spec: HrRecordSpec): Record<string, string> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object') {
    throw new HttpsError('invalid-argument', 'details must be an object.');
  }
  const allowed = detailKeys(spec);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      throw new HttpsError('invalid-argument', `Unknown detail field: ${key}`);
    }
    const cleaned = optString(value, key, 2000);
    out[key] = cleaned ?? '';
  }
  return out;
}

function emptyTasks(spec: HrRecordSpec): TaskMap {
  return Object.fromEntries(
    spec.tasks.map((t) => [t.key, { done: false, doneAt: null, doneBy: null, note: null }]),
  );
}

function parseLeaveStatus(value: unknown): LeaveStatus {
  if (!LEAVE_STATUSES.includes(value as LeaveStatus)) {
    throw new HttpsError('invalid-argument', 'Invalid leave status.');
  }
  return value as LeaveStatus;
}

export const createHrRecord = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const collection = parseCollection(raw.collection);
  const type = collection === 'leaves' ? null : (optString(raw.type, 'type', 50) ?? null);
  const spec = requireSpec(collection, type);
  const employeeRef = raw.employeeRef;
  if (!employeeRef || typeof employeeRef !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing employeeRef.');
  }

  const db = getFirestore();
  const empSnap = await db.collection('employees').doc(employeeRef).get();
  if (!empSnap.exists) throw new HttpsError('not-found', 'Employee not found.');
  const emp = empSnap.data() as Record<string, unknown>;

  const details = cleanDetails(raw.details, spec);
  const doc: Record<string, unknown> = {
    employeeRef,
    employeeName: displayName({
      firstName: (emp.firstName as string) ?? '',
      lastName: (emp.lastName as string) ?? '',
      nameRaw: (emp.nameRaw as string) ?? '',
    }),
    employeeIdNum: (emp.employeeId as number | null) ?? null,
    building: optString(raw.building, 'building') ?? (emp.building as string | null) ?? null,
    position: optString(raw.position, 'position') ?? (emp.position as string | null) ?? null,
    details,
    tasks: emptyTasks(spec),
    notes: optString(raw.notes, 'notes', 5000),
    source: 'manual',
    importBatchId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.email,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.email,
  };

  if (collection === 'processes') {
    doc.type = type;
    doc.status = 'open';
    doc.reportsTo = optString(raw.reportsTo, 'reportsTo') ?? (emp.reportsTo as string | null);
    const basis = details.startDate || details.termDate || details.boardDate || null;
    doc.fiscalYear = fiscalYearLabel(basis) ?? currentFiscalYearLabel(new Date());
  } else if (collection === 'leaves') {
    doc.status = raw.status === undefined ? 'in_process' : parseLeaveStatus(raw.status);
    doc.statusRaw = null;
    doc.reason = optString(raw.reason, 'reason', 200);
  } else {
    doc.type = type;
    doc.submissionId = null;
  }

  const ref = await db.collection(collection).add(doc);
  return { id: ref.id };
});

export const updateHrRecord = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const collection = parseCollection(raw.collection);
  const id = raw.id;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing record id.');
  }

  const db = getFirestore();
  const ref = db.collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Record not found.');
  const type = (snap.get('type') as string | undefined) ?? null;
  const spec = requireSpec(collection, type);

  const updates: Record<string, unknown> = {};
  if (raw.details !== undefined) {
    const details = cleanDetails(raw.details, spec);
    for (const [key, value] of Object.entries(details)) {
      updates[`details.${key}`] = value;
    }
  }
  if (raw.notes !== undefined) updates.notes = optString(raw.notes, 'notes', 5000);
  if (raw.building !== undefined) updates.building = optString(raw.building, 'building');
  if (raw.position !== undefined) updates.position = optString(raw.position, 'position');
  if (raw.status !== undefined) {
    if (collection === 'processes') {
      if (raw.status !== 'open' && raw.status !== 'complete') {
        throw new HttpsError('invalid-argument', 'Invalid process status.');
      }
      updates.status = raw.status;
    } else if (collection === 'leaves') {
      updates.status = parseLeaveStatus(raw.status);
    } else {
      throw new HttpsError('invalid-argument', 'Changes have no status.');
    }
  }
  if (collection === 'leaves' && raw.reason !== undefined) {
    updates.reason = optString(raw.reason, 'reason', 200);
  }
  if (collection === 'processes' && raw.reportsTo !== undefined) {
    updates.reportsTo = optString(raw.reportsTo, 'reportsTo');
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpsError('invalid-argument', 'Nothing to update.');
  }

  updates.updatedAt = FieldValue.serverTimestamp();
  updates.updatedBy = actor.email;
  await ref.update(updates);
  return { success: true };
});

export const setHrTask = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const collection = parseCollection(raw.collection);
  const id = raw.id;
  const taskKey = raw.taskKey;
  const done = raw.done;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing record id.');
  }
  if (!taskKey || typeof taskKey !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing task key.');
  }
  if (typeof done !== 'boolean') {
    throw new HttpsError('invalid-argument', 'done must be a boolean.');
  }
  const note = optString(raw.note, 'note', 500);

  const db = getFirestore();
  const ref = db.collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Record not found.');
  const type = (snap.get('type') as string | undefined) ?? null;
  const spec = requireSpec(collection, type);
  if (!taskKeys(spec).has(taskKey)) {
    throw new HttpsError('invalid-argument', `Unknown task: ${taskKey}`);
  }

  await ref.update({
    [`tasks.${taskKey}`]: {
      done,
      doneAt: done ? FieldValue.serverTimestamp() : null,
      doneBy: done ? actor.email : null,
      note,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.email,
  });
  return { success: true };
});

export const deleteHrRecord = onCall({ region: REGION }, async (request) => {
  requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const collection = parseCollection(raw.collection);
  const id = raw.id;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing record id.');
  }
  const db = getFirestore();
  const ref = db.collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Record not found.');
  await ref.delete();
  return { success: true };
});
