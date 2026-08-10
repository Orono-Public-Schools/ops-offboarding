import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { REGION, deleteSubcollection, hrLevel, requireAuthedDomainUser } from './shared';
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
import {
  PROCESS_SPECS,
  specFor,
  taskKeys,
  detailKeys,
  type HrRecordSpec,
} from './shared-gen/hr/catalog';
import { currentFiscalYearLabel, fiscalYearLabel } from './shared-gen/hr/util';

export const EMPLOYEE_ID_COUNTER_DOC = 'hrEmployeeIds';

function requireHr(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  const authed = requireAuthedDomainUser(
    request as { auth?: { uid: string; token: { email?: string } } },
  );
  if (hrLevel(request.auth?.token ?? {}) === null) {
    throw new HttpsError('permission-denied', 'HR access required.');
  }
  return authed;
}

/** Destructive/administrative HR actions: HR admins and IT admins only. */
function requireHrAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  const authed = requireAuthedDomainUser(
    request as { auth?: { uid: string; token: { email?: string } } },
  );
  if (hrLevel(request.auth?.token ?? {}) !== 'admin') {
    throw new HttpsError('permission-denied', 'HR admin access required.');
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
    doc.submissionId = null;
  } else {
    doc.type = type;
    doc.submissionId = null;
  }

  const ref = await db.collection(collection).add(doc);
  return { id: ref.id };
});

// The LOA form's machine values, translated to the wording HR uses on leave
// records. Reason stays a category — the MGDPA stance carries through.
const LOA_REASON_LABELS: Record<string, string> = {
  own_health: 'Medical',
  family_health: "Family member's health",
  bonding: 'Bonding',
  military: 'Military family leave',
  safety: 'Safety leave',
  extended_unpaid: 'Unpaid',
};

const LOA_TYPE_LABELS: Record<string, string> = {
  pfml: 'Minnesota PFML',
  fmla: 'FMLA',
  extended_unpaid: 'Extended unpaid',
  unsure: 'Undecided — employee needs more information',
};

const LOA_CATEGORY_LABELS: Record<string, string> = {
  esst: 'ESST',
  personal: 'Personal leave',
  vacation: 'Vacation',
  floating_holiday: 'Floating holiday',
  unpaid: 'Unpaid',
  other: 'Other',
};

/**
 * Turns a Leave of Absence submission into a `leaves` record — the bridge
 * between the forms inbox and HR's leave tracking. HR picks the employee in
 * the UI (matching is a suggestion there, the choice is explicit here). The
 * submission gets a `leaveId` back-link, which also guards against doubles.
 */
export const createLeaveFromSubmission = onCall({ region: REGION }, async (request) => {
  const actor = requireHr(request);
  const raw = (request.data ?? {}) as Record<string, unknown>;
  const submissionId = raw.submissionId;
  const employeeRef = raw.employeeRef;
  if (!submissionId || typeof submissionId !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing submission id.');
  }
  if (!employeeRef || typeof employeeRef !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing employeeRef.');
  }

  const db = getFirestore();
  const subRef = db.collection('submissions').doc(submissionId);
  const empRef = db.collection('employees').doc(employeeRef);
  const leaveRef = db.collection('leaves').doc();

  await db.runTransaction(async (tx) => {
    const [subSnap, empSnap] = await Promise.all([tx.get(subRef), tx.get(empRef)]);
    if (!subSnap.exists) throw new HttpsError('not-found', 'Submission not found.');
    if (!empSnap.exists) throw new HttpsError('not-found', 'Employee not found.');
    const sub = subSnap.data() as Record<string, unknown>;
    if (sub.formId !== 'leaveOfAbsence') {
      throw new HttpsError(
        'failed-precondition',
        'Only Leave of Absence submissions can become leave records.',
      );
    }
    const priorId = sub.leaveId;
    if (typeof priorId === 'string' && priorId) {
      const prior = await tx.get(db.collection('leaves').doc(priorId));
      if (prior.exists) {
        throw new HttpsError('already-exists', 'This submission already has a leave record.');
      }
      // The linked record was deleted — fall through and let HR recreate it.
    }

    const emp = empSnap.data() as Record<string, unknown>;
    const data = (sub.data ?? {}) as Record<string, unknown>;
    const str = (key: string) => (typeof data[key] === 'string' ? (data[key] as string).trim() : '');

    const details: Record<string, string> = {};
    if (str('anticipatedStart')) details.anticipatedStart = str('anticipatedStart');
    if (str('anticipatedEnd')) details.anticipatedEnd = str('anticipatedEnd');

    // Everything the leave sheet has no column for lands in the notes, so
    // nothing the employee told HR gets lost between the two views.
    const lines = [`Created from submission ${submissionId} (${sub.submitterEmail}).`];
    if (str('leaveType')) {
      lines.push(`Leave type: ${LOA_TYPE_LABELS[str('leaveType')] ?? str('leaveType')}.`);
    }
    const categories = Array.isArray(data.leaveCategories) ? (data.leaveCategories as string[]) : [];
    if (categories.length > 0) {
      const labels = categories.map((c) =>
        c === 'other' && str('leaveCategoriesOther')
          ? `Other (${str('leaveCategoriesOther')})`
          : (LOA_CATEGORY_LABELS[c] ?? c),
      );
      lines.push(`Pay categories: ${labels.join(', ')}.`);
    }
    if (str('meetingRequested') === 'yes') lines.push('The employee asked for an HR meeting.');
    const formEeNum = Number(str('employeeId'));
    const empEeNum = (emp.employeeId as number | null) ?? null;
    if (Number.isFinite(formEeNum) && formEeNum > 0 && empEeNum !== null && formEeNum !== empEeNum) {
      lines.push(`Note: the form lists EE# ${formEeNum}, but this employee record has EE# ${empEeNum}.`);
    }

    const sites = Array.isArray(data.sites) ? (data.sites as string[]) : [];
    tx.set(leaveRef, {
      employeeRef,
      employeeName: displayName({
        firstName: (emp.firstName as string) ?? '',
        lastName: (emp.lastName as string) ?? '',
        nameRaw: (emp.nameRaw as string) ?? '',
      }),
      employeeIdNum: empEeNum,
      building: (emp.building as string | null) ?? (sites.join(', ') || null),
      position: str('jobTitle') || (emp.position as string | null) || null,
      details,
      tasks: {},
      notes: lines.join('\n'),
      source: 'manual',
      importBatchId: null,
      status: 'in_process',
      statusRaw: null,
      reason: LOA_REASON_LABELS[str('reason')] ?? null,
      submissionId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.email,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.email,
    });
    tx.update(subRef, {
      leaveId: leaveRef.id,
      updatedAt: FieldValue.serverTimestamp(),
      activityLog: FieldValue.arrayUnion({
        ts: Timestamp.now(),
        actor: actor.uid,
        actorEmail: actor.email,
        action: 'leave_created',
        note: null,
      }),
    });
  });

  return { id: leaveRef.id };
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
  const na = raw.na;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing record id.');
  }
  if (!taskKey || typeof taskKey !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing task key.');
  }
  if (na !== undefined && typeof na !== 'boolean') {
    throw new HttpsError('invalid-argument', 'na must be a boolean.');
  }
  if (na !== true && typeof done !== 'boolean') {
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

  const state =
    na === true
      ? { done: false, na: true, doneAt: null, doneBy: actor.email, note }
      : {
          done,
          na: false,
          doneAt: done ? FieldValue.serverTimestamp() : null,
          doneBy: done ? actor.email : null,
          note,
        };

  await ref.update({
    [`tasks.${taskKey}`]: state,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.email,
  });

  // A person can be on both onboarding tabs (a teacher who also coaches).
  // Shared items — background check, I-9, Frontline… — are facts about the
  // person, not the checklist, so mirror the state onto their sibling
  // onboarding checklist when it carries the same task.
  if (collection === 'processes' && (type === 'new_hire' || type === 'ce_onboarding')) {
    const siblingType = type === 'new_hire' ? 'ce_onboarding' : 'new_hire';
    if (taskKeys(PROCESS_SPECS[siblingType]).has(taskKey)) {
      const employeeRef = snap.get('employeeRef') as string | undefined;
      if (employeeRef) {
        const sibs = await db
          .collection('processes')
          .where('employeeRef', '==', employeeRef)
          .where('type', '==', siblingType)
          .get();
        for (const sib of sibs.docs) {
          await sib.ref.update({
            [`tasks.${taskKey}`]: state,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: actor.email,
          });
        }
      }
    }
  }
  return { success: true };
});

/**
 * Match employees against the synced staff directory (the nightly mirror of
 * the Google environment). A match fills a missing employee email and checks
 * the "School Gmail account" task on their new-hire checklist — the account
 * exists, so nobody should have to tick it by hand. Runs after each roster
 * sync and each sheet import.
 */
export async function reconcileGoogleAccounts(): Promise<{
  matched: number;
  gmailChecked: number;
}> {
  const db = getFirestore();
  const [staffSnap, empSnap, procSnap] = await Promise.all([
    db.collection('staff').get(),
    db.collection('employees').get(),
    db.collection('processes').where('type', '==', 'new_hire').get(),
  ]);

  type StaffDoc = {
    email: string;
    givenName?: string;
    familyName?: string;
    employeeId?: string;
  };
  const byEmail = new Map<string, StaffDoc>();
  const byEe = new Map<string, StaffDoc>();
  const byName = new Map<string, StaffDoc>();
  for (const doc of staffSnap.docs) {
    const s = doc.data() as StaffDoc;
    if (!s.email) continue;
    byEmail.set(s.email.toLowerCase(), s);
    if (s.employeeId?.trim()) byEe.set(s.employeeId.trim(), s);
    const name = `${s.givenName ?? ''} ${s.familyName ?? ''}`.trim().toLowerCase();
    if (name) byName.set(name, s);
  }

  const writer = db.bulkWriter();
  const emailByRef = new Map<string, string>();
  let matched = 0;
  for (const doc of empSnap.docs) {
    const e = doc.data() as {
      email?: string | null;
      employeeId?: number | null;
      firstName?: string;
      lastName?: string;
    };
    const name = `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim().toLowerCase();
    const hit =
      (e.email ? byEmail.get(e.email.toLowerCase()) : undefined) ??
      (e.employeeId ? byEe.get(String(e.employeeId)) : undefined) ??
      (name ? byName.get(name) : undefined);
    if (!hit) continue;
    matched++;
    emailByRef.set(doc.id, hit.email);
    if (!e.email) {
      writer.update(doc.ref, {
        email: hit.email,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'roster-sync',
      });
    }
  }

  let gmailChecked = 0;
  for (const doc of procSnap.docs) {
    const p = doc.data() as {
      employeeRef?: string;
      tasks?: Record<string, { done?: boolean; na?: boolean }>;
    };
    const email = p.employeeRef ? emailByRef.get(p.employeeRef) : undefined;
    if (!email) continue;
    const t = p.tasks?.gmailAccount;
    if (t && t.done !== true && t.na !== true) {
      writer.update(doc.ref, {
        'tasks.gmailAccount': {
          done: true,
          na: false,
          doneAt: FieldValue.serverTimestamp(),
          doneBy: 'roster-sync',
          note: email,
        },
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'roster-sync',
      });
      gmailChecked++;
    }
  }
  await writer.close();
  return { matched, gmailChecked };
}

export const deleteEmployee = onCall({ region: REGION }, async (request) => {
  requireHrAdmin(request);
  const id = (request.data as { id?: string } | undefined)?.id;
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing employee id.');
  }
  const db = getFirestore();
  const ref = db.collection('employees').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Employee not found.');

  // Their records go with them — an orphaned checklist helps nobody.
  const writer = db.bulkWriter();
  let removedRecords = 0;
  for (const coll of HR_RECORD_COLLECTIONS) {
    const rs = await db.collection(coll).where('employeeRef', '==', id).get();
    for (const doc of rs.docs) {
      writer.delete(doc.ref);
      removedRecords++;
    }
  }
  await writer.close();
  await deleteSubcollection(ref.collection('history'));
  await ref.delete();
  return { success: true, removedRecords };
});

export const deleteHrRecord = onCall({ region: REGION }, async (request) => {
  requireHrAdmin(request);
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
