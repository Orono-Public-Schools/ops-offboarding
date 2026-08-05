import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from './firebase';
import type {
  ChangeType,
  Employee,
  EmployeeStatus,
  HrRecordCollection,
  LeaveStatus,
  ProcessStatus,
  ProcessType,
} from '../../shared/hr/types';

export type {
  ChangeType,
  Employee,
  EmployeeKind,
  EmployeeStatus,
  HrRecordCollection,
  LeaveStatus,
  ProcessStatus,
  ProcessType,
} from '../../shared/hr/types';
export {
  displayName,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUSES,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUSES,
} from '../../shared/hr/types';
export {
  CHANGE_SPECS,
  LEAVE_REASON_OPTIONS,
  LEAVE_SPEC,
  PROCESS_SPECS,
  specFor,
} from '../../shared/hr/catalog';
export type { HrDetailSpec, HrRecordSpec, HrTaskSpec } from '../../shared/hr/catalog';
export { isIsoDate } from '../../shared/hr/util';

const functions = getFunctions(app, 'us-central1');

// ---------------------------------------------------------------------------
// Callables

export const createEmployee = httpsCallable<
  Partial<Employee> & { assignId?: boolean },
  { id: string; employeeId: number | null }
>(functions, 'createEmployee');

export const updateEmployee = httpsCallable<
  { id: string; fields: Partial<Employee> },
  { changed: number }
>(functions, 'updateEmployee');

export const assignEmployeeId = httpsCallable<{ id: string }, { employeeId: number }>(
  functions,
  'assignEmployeeId',
);

export const createHrRecord = httpsCallable<
  {
    collection: HrRecordCollection;
    type?: ProcessType | ChangeType;
    employeeRef: string;
    details?: Record<string, string>;
    notes?: string | null;
    status?: LeaveStatus;
    reason?: string | null;
    building?: string | null;
    position?: string | null;
    reportsTo?: string | null;
  },
  { id: string }
>(functions, 'createHrRecord');

export const updateHrRecord = httpsCallable<
  {
    collection: HrRecordCollection;
    id: string;
    details?: Record<string, string>;
    notes?: string | null;
    status?: ProcessStatus | LeaveStatus;
    reason?: string | null;
    building?: string | null;
    position?: string | null;
    reportsTo?: string | null;
  },
  { success: boolean }
>(functions, 'updateHrRecord');

export const setHrTask = httpsCallable<
  {
    collection: HrRecordCollection;
    id: string;
    taskKey: string;
    done?: boolean;
    /** true marks the task "doesn't apply"; pass done with na: false to clear. */
    na?: boolean;
    note?: string | null;
  },
  { success: boolean }
>(functions, 'setHrTask');

export const deleteHrRecord = httpsCallable<
  { collection: HrRecordCollection; id: string },
  { success: boolean }
>(functions, 'deleteHrRecord');

export type ImportReport = {
  mode: 'dryRun' | 'commit';
  batchId?: string;
  tabsFound: string[];
  tabsMissing: string[];
  counts: {
    employees: number;
    processes: number;
    leaves: number;
    changes: number;
    byTab: Record<string, number>;
  };
  deleted?: { employees: number; processes: number; leaves: number; changes: number };
  employeesPreview: Array<{
    name: string;
    employeeId: number | null;
    status: string;
    kind: string;
    records: number;
  }>;
  warnings: string[];
  maxEmployeeId: number;
};

export const importHrMasterSheet = httpsCallable<{ mode: 'dryRun' | 'commit' }, ImportReport>(
  functions,
  'importHrMasterSheet',
);

// ---------------------------------------------------------------------------
// Documents

export type EmployeeDoc = Employee & {
  id: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  updatedBy: string | null;
};

export type HrTaskState = {
  done: boolean;
  na?: boolean;
  doneAt: Timestamp | null;
  doneBy: string | null;
  note: string | null;
};

/** A process, leave, or change document — superset shape. */
export type HrRecordDoc = {
  id: string;
  collection: HrRecordCollection;
  type?: ProcessType | ChangeType;
  status?: ProcessStatus | LeaveStatus;
  statusRaw?: string | null;
  reason?: string | null;
  fiscalYear?: string;
  reportsTo?: string | null;
  submissionId?: string | null;
  employeeRef: string;
  employeeName: string;
  employeeIdNum: number | null;
  building: string | null;
  position: string | null;
  details: Record<string, string>;
  tasks: Record<string, HrTaskState>;
  notes: string | null;
  source: 'import' | 'manual';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  updatedBy: string | null;
};

export type HistoryEntry = {
  id: string;
  ts: Timestamp | null;
  actorEmail: string;
  action: string;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
};

function toEmployee(id: string, data: DocumentData): EmployeeDoc {
  return { ...(data as EmployeeDoc), id };
}

function toRecord(id: string, coll: HrRecordCollection, data: DocumentData): HrRecordDoc {
  return { ...(data as HrRecordDoc), id, collection: coll };
}

// ---------------------------------------------------------------------------
// Hooks — whole-collection listeners with client-side sort/filter; the HR
// dataset is a few hundred docs, and this avoids composite indexes.

export type ListState<T> =
  | { loading: true; items: null; error: null }
  | { loading: false; items: T[]; error: null }
  | { loading: false; items: null; error: string };

function useCollectionList<T>(
  enabled: boolean,
  build: () => Query<DocumentData> | null,
  map: (id: string, data: DocumentData) => T,
  sort: (a: T, b: T) => number,
  deps: unknown[],
): ListState<T> {
  const [state, setState] = useState<ListState<T>>({ loading: true, items: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    const q = build();
    if (!q) return;
    setState({ loading: true, items: null, error: null });
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => map(d.id, d.data())).sort(sort);
        setState({ loading: false, items, error: null });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, items: null, error: 'Could not load this list.' });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
}

const byName = (a: EmployeeDoc, b: EmployeeDoc) =>
  (a.lastName || a.nameRaw).localeCompare(b.lastName || b.nameRaw) ||
  (a.firstName ?? '').localeCompare(b.firstName ?? '');

const byNewest = (a: HrRecordDoc, b: HrRecordDoc) =>
  (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);

export function useEmployees(enabled: boolean): ListState<EmployeeDoc> {
  return useCollectionList(
    enabled,
    () => query(collection(db, 'employees')),
    toEmployee,
    byName,
    [],
  );
}

export function useHrRecords(
  coll: HrRecordCollection,
  enabled: boolean,
  employeeRef?: string,
): ListState<HrRecordDoc> {
  return useCollectionList(
    enabled,
    () =>
      employeeRef
        ? query(collection(db, coll), where('employeeRef', '==', employeeRef))
        : query(collection(db, coll)),
    (id, data) => toRecord(id, coll, data),
    byNewest,
    [coll, employeeRef],
  );
}

type DocState<T> =
  | { loading: true; item: null; error: null }
  | { loading: false; item: T; error: null }
  | { loading: false; item: null; error: string };

export function useEmployee(id: string | null): DocState<EmployeeDoc> {
  const [state, setState] = useState<DocState<EmployeeDoc>>({
    loading: true,
    item: null,
    error: null,
  });

  useEffect(() => {
    if (!id) return;
    setState({ loading: true, item: null, error: null });
    return onSnapshot(
      doc(db, 'employees', id),
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, item: null, error: 'Employee not found.' });
        } else {
          setState({ loading: false, item: toEmployee(snap.id, snap.data()), error: null });
        }
      },
      (err) => {
        console.error(err);
        setState({ loading: false, item: null, error: 'Could not load this employee.' });
      },
    );
  }, [id]);

  return state;
}

export function useHrRecord(
  coll: HrRecordCollection | null,
  id: string | null,
): DocState<HrRecordDoc> {
  const [state, setState] = useState<DocState<HrRecordDoc>>({
    loading: true,
    item: null,
    error: null,
  });

  useEffect(() => {
    if (!coll || !id) return;
    setState({ loading: true, item: null, error: null });
    return onSnapshot(
      doc(db, coll, id),
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, item: null, error: 'Record not found.' });
        } else {
          setState({ loading: false, item: toRecord(snap.id, coll, snap.data()), error: null });
        }
      },
      (err) => {
        console.error(err);
        setState({ loading: false, item: null, error: 'Could not load this record.' });
      },
    );
  }, [coll, id]);

  return state;
}

export function useEmployeeHistory(id: string | null): ListState<HistoryEntry> {
  return useCollectionList(
    !!id,
    () => (id ? query(collection(db, 'employees', id, 'history'), orderBy('ts', 'desc')) : null),
    (entryId, data) => ({ ...(data as Omit<HistoryEntry, 'id'>), id: entryId }),
    () => 0,
    [id],
  );
}

export type HrImportStatus = {
  lastRunAt: Timestamp | null;
  batchId: string;
  by: string;
  counts?: ImportReport['counts'];
};

export function useHrImportStatus(): HrImportStatus | null {
  const [status, setStatus] = useState<HrImportStatus | null>(null);
  useEffect(() => {
    return onSnapshot(doc(db, 'appSettings', 'hrImport'), (snap) => {
      setStatus(snap.exists() ? (snap.data() as HrImportStatus) : null);
    });
  }, []);
  return status;
}

// ---------------------------------------------------------------------------
// Presentation helpers

export const EMPLOYEE_STATUS_BADGE: Record<
  EmployeeStatus,
  { state: 'draft' | 'submitted' | 'processing' | 'completed' | 'denied'; label: string }
> = {
  prospective: { state: 'submitted', label: 'Prospective' },
  active: { state: 'completed', label: 'Active' },
  on_leave: { state: 'processing', label: 'On leave' },
  terminated: { state: 'draft', label: 'Terminated' },
  inactive: { state: 'draft', label: 'Inactive' },
};

export const LEAVE_STATUS_BADGE: Record<
  LeaveStatus,
  { state: 'draft' | 'submitted' | 'processing' | 'completed' | 'denied'; label: string }
> = {
  expected: { state: 'submitted', label: 'Expected' },
  in_process: { state: 'processing', label: 'In process' },
  ready_for_approval: { state: 'processing', label: 'Ready for approval' },
  active: { state: 'completed', label: 'Active' },
  ended: { state: 'draft', label: 'Ended' },
};

/** N/A tasks don't count toward either side of the fraction. */
export function taskProgress(record: HrRecordDoc): { done: number; total: number } {
  const tasks = Object.values(record.tasks ?? {}).filter((t) => t.na !== true);
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}

/** "2026-08-19" → "Aug 19, 2026"; anything non-ISO ("TBD") passes through. */
export function prettyDate(value: string | null | undefined): string {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(`${value}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
