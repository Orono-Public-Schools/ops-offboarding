/**
 * HR data model shared between the web app and Cloud Functions.
 *
 * Mirrors HR's master workbook ("New EE Checklist"): employees are the
 * authoritative registry; processes/leaves/changes are the per-event records
 * that used to live one row per tab. Catalogues in ./catalog.ts define each
 * record type's checklist tasks and detail fields — the server validates
 * against them and the UI renders from them, so they can never disagree.
 *
 * This folder is the source of truth. The functions build copies it to
 * functions/src/shared-gen/ (see functions/copy-shared.mjs); never edit the
 * copy.
 */

export type EmployeeStatus = 'prospective' | 'active' | 'on_leave' | 'terminated' | 'inactive';

export const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  'prospective',
  'active',
  'on_leave',
  'terminated',
  'inactive',
];

/** Regular contracted staff vs. community-ed / substitute / coaching hires. */
export type EmployeeKind = 'regular' | 'ce_sub_coach';

export type ProcessType = 'new_hire' | 'termination' | 'ce_onboarding';
export type ProcessStatus = 'open' | 'complete';

export type ChangeType = 'building' | 'position' | 'name' | 'address';

export type LeaveStatus = 'expected' | 'in_process' | 'ready_for_approval' | 'active' | 'ended';

export const LEAVE_STATUSES: LeaveStatus[] = [
  'expected',
  'in_process',
  'ready_for_approval',
  'active',
  'ended',
];

export type HrRecordCollection = 'processes' | 'leaves' | 'changes';

export const HR_RECORD_COLLECTIONS: HrRecordCollection[] = ['processes', 'leaves', 'changes'];

/** One checklist entry on a record. */
export type TaskState = {
  done: boolean;
  /** Marked "doesn't apply" — excluded from progress counts. */
  na?: boolean;
  /** Server timestamp when marked done; null while open. */
  doneAt: unknown;
  /** Who marked it — an email, or "roster-sync" for automatic checks. */
  doneBy: string | null;
  /** Free note, e.g. the raw sheet value ("Signed") the import preserved. */
  note: string | null;
};

export type TaskMap = Record<string, TaskState>;

/**
 * Detail field values, keyed by catalogue key. Everything is a string —
 * date-kind fields hold ISO (YYYY-MM-DD) when clean and the raw sheet text
 * ("TBD", "Winter 2026") when not, which the sheet data proves is common.
 */
export type DetailMap = Record<string, string>;

/** Fields every HR record shares regardless of collection. */
export type HrRecordBase = {
  /** employees/{id} doc id. */
  employeeRef: string;
  /** Denormalized for list views. */
  employeeName: string;
  employeeIdNum: number | null;
  building: string | null;
  position: string | null;
  details: DetailMap;
  tasks: TaskMap;
  notes: string | null;
  source: 'import' | 'manual';
  importBatchId: string | null;
};

export type ProcessRecord = HrRecordBase & {
  type: ProcessType;
  /** July 1 boundary label, e.g. "2026-27". */
  fiscalYear: string;
  status: ProcessStatus;
  reportsTo: string | null;
};

export type LeaveRecord = HrRecordBase & {
  status: LeaveStatus;
  /** The sheet's original wording ("Ready for Aproval") for fidelity. */
  statusRaw: string | null;
  /** Category only ("Maternity", "Medical") — never medical detail. */
  reason: string | null;
};

export type ChangeRecord = HrRecordBase & {
  type: ChangeType;
  /** Set when a Phase-3 form submission created this record. */
  submissionId: string | null;
};

export type Employee = {
  /** EE# — sparse in real data, so optional and indexed rather than the key. */
  employeeId: number | null;
  firstName: string;
  lastName: string;
  /** Name exactly as imported/entered, for fidelity when parsing was unsure. */
  nameRaw: string;
  email: string | null;
  status: EmployeeStatus;
  kind: EmployeeKind;
  building: string | null;
  position: string | null;
  reportsTo: string | null;
  /** ISO when clean, raw text ("TBD") when not. */
  startDate: string | null;
  endDate: string | null;
  /** From ID Assignments, e.g. "Head Girls Hockey Coach". */
  description: string | null;
  notes: string | null;
  source: 'import' | 'manual';
  importBatchId: string | null;
};

export function displayName(e: Pick<Employee, 'firstName' | 'lastName' | 'nameRaw'>): string {
  const name = [e.firstName, e.lastName].filter(Boolean).join(' ');
  return name || e.nameRaw;
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  prospective: 'Prospective',
  active: 'Active',
  on_leave: 'On leave',
  terminated: 'Terminated',
  inactive: 'Inactive',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  expected: 'Expected',
  in_process: 'In process',
  ready_for_approval: 'Ready for approval',
  active: 'Active',
  ended: 'Ended',
};
