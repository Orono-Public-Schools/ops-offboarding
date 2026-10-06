/**
 * Pure parsing core for the master-sheet import: raw tab values in, an
 * import plan out. No Firebase or API dependencies, so it can be exercised
 * locally against a downloaded copy of the workbook. Values are expected in
 * Sheets API UNFORMATTED_VALUE form: checkboxes as booleans, dates as
 * serial numbers, text as strings.
 */

import type { ChangeType, EmployeeKind, LeaveStatus, ProcessType, TaskMap } from './types';
import { CHANGE_SPECS, PROCESS_SPECS, type HrRecordSpec } from './catalog';
import { isIsoDate, nameMatchKeys, normalizeSheetDate, parseName } from './util';

export type TabKey =
  | 'newEmployees'
  | 'terminated'
  | 'loa'
  | 'contractChanges'
  | 'nameChange'
  | 'idAssignments'
  | 'ceSub'
  | 'nto'
  | 'addressChange';

export const TAB_MATCHERS: Array<{ key: TabKey; match: (title: string) => boolean }> = [
  { key: 'newEmployees', match: (t) => /new employees/i.test(t) },
  { key: 'terminated', match: (t) => /terminated/i.test(t) },
  { key: 'loa', match: (t) => /^loa\b/i.test(t.trim()) },
  { key: 'contractChanges', match: (t) => /contract change/i.test(t) },
  { key: 'nameChange', match: (t) => /name change/i.test(t) },
  { key: 'idAssignments', match: (t) => /employee id assignment/i.test(t) },
  {
    key: 'ceSub',
    match: (t) =>
      t
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .includes('cesub'),
  },
  { key: 'nto', match: (t) => /^nto$/i.test(t.trim()) || /orientation/i.test(t) },
  { key: 'addressChange', match: (t) => /address change/i.test(t) },
];

type Row = unknown[];

function normHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cellStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s || null;
}

function cellBool(value: unknown): boolean {
  return value === true || value === 'TRUE';
}

function cellDate(value: unknown): string | null {
  return normalizeSheetDate(value);
}

function cellInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Legend notes share the name column with people ("* after replacing…"). */
function isNoteRow(name: string): boolean {
  return name.startsWith('*') || name.includes('=') || name.length > 60;
}

/** Header row = the row (among the first six) with the most string cells. */
function findHeaderRow(rows: Row[]): number {
  let best = -1;
  let idx = 0;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const n = rows[i].filter((c) => typeof c === 'string' && c.trim()).length;
    if (n > best) {
      best = n;
      idx = i;
    }
  }
  return idx;
}

class Table {
  headers: string[];
  rows: Row[];

  constructor(headers: string[], rows: Row[]) {
    this.headers = headers;
    this.rows = rows;
  }

  static from(rows: Row[]): Table {
    if (rows.length === 0) return new Table([], []);
    const h = findHeaderRow(rows);
    return new Table(rows[h].map(normHeader), rows.slice(h + 1));
  }

  /** Column index by normalized header — exact match first, then prefix. */
  col(name: string, nth = 0): number {
    const exact = this.headers.reduce<number[]>((acc, h, i) => {
      if (h === name) acc.push(i);
      return acc;
    }, []);
    if (exact.length > nth) return exact[nth];
    const prefixed = this.headers.reduce<number[]>((acc, h, i) => {
      if (h.startsWith(name)) acc.push(i);
      return acc;
    }, []);
    return prefixed.length > nth ? prefixed[nth] : -1;
  }

  get(row: Row, name: string, nth = 0): unknown {
    const i = this.col(name, nth);
    return i >= 0 ? row[i] : null;
  }
}

export type PendingProcess = {
  collection: 'processes';
  type: ProcessType;
  details: Record<string, string>;
  tasks: TaskMap;
  notes: string | null;
  reportsTo: string | null;
  building: string | null;
  position: string | null;
};

export type PendingLeave = {
  collection: 'leaves';
  status: LeaveStatus;
  statusRaw: string | null;
  reason: string | null;
  details: Record<string, string>;
  notes: string | null;
  building: string | null;
  position: string | null;
};

export type PendingChange = {
  collection: 'changes';
  type: ChangeType;
  details: Record<string, string>;
  tasks: TaskMap;
  notes: string | null;
  building: string | null;
  position: string | null;
};

export type PendingRecord = PendingProcess | PendingLeave | PendingChange;

export type PendingEmployee = {
  employeeId: number | null;
  firstName: string;
  lastName: string;
  nameRaw: string;
  email: string | null;
  kind: EmployeeKind;
  building: string | null;
  position: string | null;
  reportsTo: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  notes: string | null;
  terminated: boolean;
  onLeave: boolean;
  records: PendingRecord[];
};

class Registry {
  employees: PendingEmployee[] = [];
  private byKey = new Map<string, PendingEmployee>();
  warnings: string[] = [];

  warn(message: string) {
    if (this.warnings.length < 100) this.warnings.push(message);
  }

  findOrCreate(nameRaw: string, employeeId: number | null): PendingEmployee {
    if (employeeId !== null) {
      const byId = this.byKey.get(`ee:${employeeId}`);
      if (byId) {
        for (const k of nameMatchKeys(nameRaw)) {
          if (!this.byKey.has(`n:${k}`)) this.byKey.set(`n:${k}`, byId);
        }
        return byId;
      }
    }
    for (const k of nameMatchKeys(nameRaw)) {
      const byName = this.byKey.get(`n:${k}`);
      if (byName) {
        if (employeeId !== null) {
          if (byName.employeeId === null) {
            byName.employeeId = employeeId;
            this.byKey.set(`ee:${employeeId}`, byName);
          } else if (byName.employeeId !== employeeId) {
            this.warn(
              `EE# conflict for "${nameRaw}": ${byName.employeeId} vs ${employeeId} — kept ${byName.employeeId}.`,
            );
          }
        }
        return byName;
      }
    }
    const { firstName, lastName } = parseName(nameRaw);
    const emp: PendingEmployee = {
      employeeId,
      firstName,
      lastName,
      nameRaw,
      email: null,
      kind: 'regular',
      building: null,
      position: null,
      reportsTo: null,
      startDate: null,
      endDate: null,
      description: null,
      notes: null,
      terminated: false,
      onLeave: false,
      records: [],
    };
    this.employees.push(emp);
    if (employeeId !== null) this.byKey.set(`ee:${employeeId}`, emp);
    for (const k of nameMatchKeys(nameRaw)) this.byKey.set(`n:${k}`, emp);
    return emp;
  }
}

/** All catalogue tasks initialized, then overlaid with parsed states. */
function tasksFrom(
  spec: HrRecordSpec,
  states: Record<string, { done: boolean; note?: string | null }>,
): TaskMap {
  const map: TaskMap = Object.fromEntries(
    spec.tasks.map((t) => [t.key, { done: false, doneAt: null, doneBy: null, note: null }]),
  );
  for (const [key, s] of Object.entries(states)) {
    if (map[key]) map[key] = { done: s.done, doneAt: null, doneBy: null, note: s.note ?? null };
  }
  return map;
}

/** A date-valued completion cell: any real value marks it done, "?" doesn't. */
function doneFromDateCell(value: unknown): { done: boolean; note: string | null } {
  const raw = cellDate(value);
  if (!raw || /^\?+$/.test(raw)) return { done: false, note: raw };
  return { done: true, note: raw };
}

function details(entries: Record<string, string | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) {
    if (v !== null && v !== '') out[k] = v;
  }
  return out;
}

function fill(emp: PendingEmployee, field: keyof PendingEmployee, value: string | null) {
  if (value !== null && emp[field] === null) {
    (emp as unknown as Record<string, unknown>)[field] = value;
  }
}

function parseNewEmployees(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const name = cellStr(t.get(row, 'last name first name'));
    if (!name || isNoteRow(name)) continue;
    // Department section rows ("Human Resources", "Technology") sit in the
    // name column too: no comma, and none of a person's supporting data.
    const ee = cellInt(t.get(row, 'ee'));
    const support =
      ee !== null ||
      cellDate(t.get(row, 'board date')) !== null ||
      cellDate(t.get(row, 'start date')) !== null ||
      cellStr(t.get(row, 'position')) !== null ||
      cellDate(t.get(row, 'contract sent')) !== null;
    if (!name.includes(',') && !support) continue;
    count++;
    const emp = reg.findOrCreate(name, ee);
    fill(emp, 'building', cellStr(t.get(row, 'bldg')));
    fill(emp, 'position', cellStr(t.get(row, 'position')));
    fill(emp, 'reportsTo', cellStr(t.get(row, 'reports to')));
    fill(emp, 'startDate', cellDate(t.get(row, 'start date')));

    emp.records.push({
      collection: 'processes',
      type: 'new_hire',
      details: details({
        boardDate: cellDate(t.get(row, 'board date')),
        startDate: cellDate(t.get(row, 'start date')),
        ltsEndDate: cellDate(t.get(row, 'lts')),
        contractSentDate: cellDate(t.get(row, 'contract sent')),
        checkin30Due: cellDate(t.get(row, '30 day')),
        checkin90Due: cellDate(t.get(row, '90 day')),
        replacing: cellStr(t.get(row, 'replacing')),
      }),
      tasks: tasksFrom(PROCESS_SPECS.new_hire, {
        payrollChangeForm: { done: cellBool(t.get(row, 'payroll change form')) },
        backgroundCheck: { done: cellBool(t.get(row, 'background check')) },
        paperwork: { done: cellBool(t.get(row, 'paperwork')) },
        i9: { done: cellBool(t.get(row, 'i 9')) },
        frontline: { done: cellBool(t.get(row, 'frontline')) },
        efPlus: { done: cellBool(t.get(row, 'ef updated')) },
        vector: { done: cellBool(t.get(row, 'added to vector')) },
        notifyUnion: { done: cellBool(t.get(row, 'notify union')) },
        synergy: { done: cellBool(t.get(row, 'synergy')) },
        healthSafety: { done: cellBool(t.get(row, 'health')) },
        key: { done: cellBool(t.get(row, 'key')) },
        lunchPin: { done: cellBool(t.get(row, 'lunch pin')) },
      }),
      notes: cellStr(t.get(row, 'update')),
      reportsTo: cellStr(t.get(row, 'reports to')),
      building: cellStr(t.get(row, 'bldg')),
      position: cellStr(t.get(row, 'position')),
    });
  }
  return count;
}

function parseTerminated(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const name = cellStr(t.get(row, 'name'));
    if (!name || isNoteRow(name)) continue;
    const ee = cellInt(t.get(row, 'ee'));
    const termDate = cellDate(t.get(row, 'termination date'));
    const support =
      ee !== null ||
      termDate !== null ||
      cellDate(t.get(row, 'board')) !== null ||
      cellStr(t.get(row, 'position')) !== null ||
      cellStr(t.get(row, 'bldg')) !== null;
    if (!name.includes(',') && !support) continue;
    count++;
    const emp = reg.findOrCreate(name, ee);
    emp.terminated = true;
    fill(emp, 'endDate', termDate);
    fill(emp, 'building', cellStr(t.get(row, 'bldg')));
    fill(emp, 'position', cellStr(t.get(row, 'position')));
    fill(emp, 'reportsTo', cellStr(t.get(row, 'reports to')));

    emp.records.push({
      collection: 'processes',
      type: 'termination',
      details: details({
        boardDate: cellDate(t.get(row, 'board')),
        termDate,
        termType: cellStr(t.get(row, 'term type')),
      }),
      tasks: tasksFrom(PROCESS_SPECS.termination, {
        payrollChangeForm: { done: cellBool(t.get(row, 'payroll change form')) },
        termDetailsSent: { done: cellBool(t.get(row, 'termination details')) },
        exitInterviewSent: { done: cellBool(t.get(row, 'exit interview')) },
        unionNotified: { done: cellBool(t.get(row, 'union notified')) },
        s2Disabled: { done: cellBool(t.get(row, 's2 access disabled')) },
        frontline: { done: cellBool(t.get(row, 'frontline')) },
        efPlus: { done: cellBool(t.get(row, 'ef updated')) },
        keepCertified: { done: cellBool(t.get(row, 'keep certified')) },
        starReport: { done: cellBool(t.get(row, 'star report')) },
        posted: { done: cellBool(t.get(row, 'posted')) },
        filled: { done: cellBool(t.get(row, 'filled')) },
        smasgUpdate: { done: cellBool(t.get(row, 'smasg')) },
        edemgUpdate: { done: cellBool(t.get(row, 'edemg')) },
        applitrack: { done: cellBool(t.get(row, 'post to applitrack')) },
        elvetUpdate: { done: cellBool(t.get(row, 'elvet')) },
        collectKey: { done: cellBool(t.get(row, 'collect key')) },
        collectSecurityCard: { done: cellBool(t.get(row, 'collect security card')) },
        lunchAccount: { done: cellBool(t.get(row, 'lunch account')) },
        parkingPermit: { done: cellBool(t.get(row, 'parking permit')) },
        phoneRemoved: { done: cellBool(t.get(row, 'phone')) },
        collectDevices: { done: cellBool(t.get(row, 'collect technology')) },
        removeWebsiteProfile: { done: cellBool(t.get(row, 'remove website')) },
        removeGoogleProfile: { done: cellBool(t.get(row, 'remove google')) },
      }),
      notes: null,
      reportsTo: cellStr(t.get(row, 'reports to')),
      building: cellStr(t.get(row, 'bldg')),
      position: cellStr(t.get(row, 'position')),
    });
  }
  return count;
}

function normalizeLeaveStatus(raw: string | null): {
  status: LeaveStatus;
  statusRaw: string | null;
} {
  const s = (raw ?? '').toLowerCase();
  if (!s) return { status: 'in_process', statusRaw: raw };
  if (s.includes('expect')) return { status: 'expected', statusRaw: raw };
  if (s.includes('ready')) return { status: 'ready_for_approval', statusRaw: raw };
  if (s.includes('end') || s.includes('return') || s.includes('complete')) {
    return { status: 'ended', statusRaw: raw };
  }
  return { status: 'in_process', statusRaw: raw };
}

function leaveIsCurrent(d: Record<string, string>, status: LeaveStatus, todayIso: string): boolean {
  if (status === 'ended') return false;
  const start = d.actualStart || d.anticipatedStart;
  const end = d.actualEnd || d.anticipatedEnd;
  if (!isIsoDate(start) || start > todayIso) return false;
  if (isIsoDate(end) && end < todayIso) return false;
  return true;
}

function parseLoa(rows: Row[], reg: Registry, todayIso: string): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const name = cellStr(t.get(row, 'employee'));
    if (!name || isNoteRow(name)) continue;
    count++;
    const emp = reg.findOrCreate(name, cellInt(t.get(row, 'ee')));
    fill(emp, 'building', cellStr(t.get(row, 'bldg')));
    fill(emp, 'position', cellStr(t.get(row, 'position')));

    const { status, statusRaw } = normalizeLeaveStatus(cellStr(t.get(row, 'status')));
    const plan = cellStr(t.get(row, 'tra or pera'));
    const d = details({
      boardDate: cellDate(t.get(row, 'board date')),
      payrollChangeForm: cellDate(t.get(row, 'payroll change form created')),
      notifiedOEA: cellStr(t.get(row, 'notified oea')),
      anticipatedStart: cellDate(t.get(row, 'anticipated start')),
      anticipatedEnd: cellDate(t.get(row, 'anticipated end')),
      actualStart: cellDate(t.get(row, 'actual start')),
      actualEnd: cellDate(t.get(row, 'actual end')),
      unpaidPortion: cellStr(t.get(row, 'any part of loa unpaid')),
      // The sheet's placeholder text "TRA or PERA" means "not recorded".
      retirementPlan: plan && /^tra or pera$/i.test(plan) ? null : plan,
      loggedInTraPera: cellStr(t.get(row, 'logged in tra')),
      vacancyOrSub: cellStr(t.get(row, 'vacancy posted')),
      starReport: cellStr(t.get(row, 'star report')),
      subContractStatus: cellStr(t.get(row, 'sub contract status')),
      leader: cellStr(t.get(row, 'leader')),
      leaderEmail: cellStr(t.get(row, 'leader email')),
    });
    const notes = [cellStr(t.get(row, 'notes update')), cellStr(t.get(row, 'notes'))]
      .filter(Boolean)
      .join(' — ');

    if (leaveIsCurrent(d, status, todayIso)) emp.onLeave = true;
    emp.records.push({
      collection: 'leaves',
      status,
      statusRaw,
      reason: cellStr(t.get(row, 'reason')),
      details: d,
      notes: notes || null,
      building: cellStr(t.get(row, 'bldg')),
      position: cellStr(t.get(row, 'position')),
    });
  }
  return count;
}

function parseContractChanges(rows: Row[], reg: Registry): number {
  let section: 'building' | 'position' | null = null;
  let table: Table | null = null;
  let count = 0;

  for (const row of rows) {
    const marker = normHeader(row[0]);
    if (marker === 'building change') {
      section = 'building';
      table = null;
      continue;
    }
    if (marker.startsWith('position')) {
      section = 'position';
      table = null;
      continue;
    }
    const norm = row.map(normHeader);
    if (norm.includes('board date') && norm.includes('name')) {
      table = new Table(norm, []);
      continue;
    }
    if (!section || !table) continue;
    const name = cellStr(table.get(row, 'name'));
    if (!name || isNoteRow(name)) continue;
    count++;
    const emp = reg.findOrCreate(name, cellInt(table.get(row, 'ee')));

    if (section === 'building') {
      emp.records.push({
        collection: 'changes',
        type: 'building',
        details: details({
          boardDate: cellDate(table.get(row, 'board date')),
          effectiveDate: cellDate(table.get(row, 'effective date')),
          previousBuilding: cellStr(table.get(row, 'previous building')),
          newBuilding: cellStr(table.get(row, 'new building')),
        }),
        tasks: tasksFrom(CHANGE_SPECS.building, {
          changeForm: { done: cellBool(table.get(row, 'change form')) },
          efFrontline: { done: cellBool(table.get(row, 'ef')) },
          emailGroups: { done: cellBool(table.get(row, 'change email group')) },
        }),
        notes: cellStr(table.get(row, 'comments')),
        building: cellStr(table.get(row, 'new building')),
        position: null,
      });
    } else {
      emp.records.push({
        collection: 'changes',
        type: 'position',
        details: details({
          boardDate: cellDate(table.get(row, 'board date')),
          effectiveDate: cellDate(table.get(row, 'effective date')),
          previousBuilding: cellStr(table.get(row, 'bldg', 0)),
          previousPosition: cellStr(table.get(row, 'previous position')),
          newBuilding: cellStr(table.get(row, 'bldg', 1)),
          newPosition: cellStr(table.get(row, 'new position')),
          subReplacement: cellStr(table.get(row, 'sub replacement')),
        }),
        tasks: tasksFrom(CHANGE_SPECS.position, {
          changeForm: { done: cellBool(table.get(row, 'change form')) },
          efFrontline: { done: cellBool(table.get(row, 'ef')) },
        }),
        notes: cellStr(table.get(row, 'comments')),
        building: cellStr(table.get(row, 'bldg', 1)),
        position: cellStr(table.get(row, 'new position')),
      });
    }
  }
  return count;
}

function parseNameChange(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const prev = cellStr(t.get(row, 'previous name'));
    const next = cellStr(t.get(row, 'new name'));
    const name = next ?? prev;
    if (!name) continue;
    count++;
    const emp = reg.findOrCreate(name, cellInt(t.get(row, 'ee')));
    emp.records.push({
      collection: 'changes',
      type: 'name',
      details: details({
        effectiveDate: cellDate(t.get(row, 'effective date')),
        previousName: prev,
        newName: next,
        emailChangedTo: cellStr(t.get(row, 'email changed to')),
      }),
      tasks: tasksFrom(CHANGE_SPECS.name, {
        proofReceived: { done: cellBool(t.get(row, 'new social security')) },
        efFrontline: { done: cellBool(t.get(row, 'ef')) },
        keepCertified: { done: cellBool(t.get(row, 'keep certified')) },
        s2IdBadge: { done: cellBool(t.get(row, 's2')) },
      }),
      notes: cellStr(t.get(row, 'comments')),
      building: null,
      position: null,
    });
  }
  return count;
}

function parseIdAssignments(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const name = cellStr(t.get(row, 'name'));
    const id = cellInt(t.get(row, 'id'));
    if (!name || id === null || isNoteRow(name)) continue;
    count++;
    const emp = reg.findOrCreate(name, id);
    const description = cellStr(t.get(row, 'description'));
    fill(emp, 'description', description);
    fill(emp, 'startDate', cellDate(t.get(row, 'tentative start')));
    if (description && /coach|sub/i.test(description) && emp.records.length === 0) {
      emp.kind = 'ce_sub_coach';
    }
  }
  return count;
}

function parseCeSub(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const name = cellStr(t.get(row, 'name'));
    if (!name || isNoteRow(name)) continue;
    count++;
    const emp = reg.findOrCreate(name, cellInt(t.get(row, 'ee')));
    emp.kind = 'ce_sub_coach';
    const bldgPos = cellStr(t.get(row, 'bldg position'));
    const [bldg, ...posParts] = (bldgPos ?? '').split('/');
    const building = bldg?.trim() || null;
    const position = posParts.join('/').trim() || null;
    fill(emp, 'building', building);
    fill(emp, 'position', position);
    fill(emp, 'reportsTo', cellStr(t.get(row, 'reports to')));
    fill(emp, 'startDate', cellDate(t.get(row, 'start date')));

    emp.records.push({
      collection: 'processes',
      type: 'ce_onboarding',
      details: details({
        startDate: cellDate(t.get(row, 'start date')),
        lunchPin: cellStr(t.get(row, 'lunch pin')),
      }),
      tasks: tasksFrom(PROCESS_SPECS.ce_onboarding, {
        backgroundCheck: { done: cellBool(t.get(row, 'background check')) },
        paperwork: { done: cellBool(t.get(row, 'paperwork')) },
        i9: { done: cellBool(t.get(row, 'i 9')) },
        frontline: { done: cellBool(t.get(row, 'frontline')) },
        efPlus: { done: cellBool(t.get(row, 'ef updated')) },
      }),
      notes: null,
      reportsTo: cellStr(t.get(row, 'reports to')),
      building,
      position,
    });
  }
  return count;
}

function parseNto(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const name = cellStr(t.get(row, 'name'));
    if (!name || isNoteRow(name)) continue;
    count++;
    const emp = reg.findOrCreate(name, null);
    fill(emp, 'email', cellStr(t.get(row, 'email')));
    fill(emp, 'position', cellStr(t.get(row, 'title')));
    fill(emp, 'building', cellStr(t.get(row, 'building')));

    const proc = emp.records.find(
      (r): r is PendingProcess => r.collection === 'processes' && r.type === 'new_hire',
    );
    if (!proc) {
      reg.warn(
        `NTO row "${name}" has no matching new-hire row — orientation info kept on the employee only.`,
      );
      continue;
    }
    const orientationDate = cellDate(t.get(row, 'orientation date'));
    if (orientationDate) proc.details.orientationDate = orientationDate;
    const letter = doneFromDateCell(t.get(row, 'letter'));
    if (letter.done && proc.tasks.ntoLetterSent) {
      proc.tasks.ntoLetterSent = { done: true, doneAt: null, doneBy: null, note: letter.note };
    }
  }
  return count;
}

function parseAddressChange(rows: Row[], reg: Registry): number {
  const t = Table.from(rows);
  let count = 0;
  for (const row of t.rows) {
    const last = cellStr(t.get(row, 'name last'));
    const first = cellStr(t.get(row, 'name first'));
    if (!last && !first) continue;
    count++;
    const emp = reg.findOrCreate(
      [last, first].filter(Boolean).join(', '),
      cellInt(t.get(row, 'ee id')),
    );
    emp.records.push({
      collection: 'changes',
      type: 'address',
      details: details({
        effectiveDate: cellDate(t.get(row, 'effective date')),
        newAddress: cellStr(t.get(row, 'address change')),
      }),
      tasks: tasksFrom(CHANGE_SPECS.address, {
        efinanceUpdated: doneFromDateCell(t.get(row, 'updated in efinance')),
      }),
      notes: null,
      building: null,
      position: null,
    });
  }
  return count;
}

export function finalStatus(emp: PendingEmployee, todayIso: string): string {
  if (emp.terminated) return 'terminated';
  if (emp.onLeave) return 'on_leave';
  if (isIsoDate(emp.startDate) && emp.startDate! > todayIso) return 'prospective';
  return 'active';
}

export type ImportPlan = {
  employees: PendingEmployee[];
  warnings: string[];
  byTab: Record<string, number>;
  maxEmployeeId: number;
};

/**
 * Parse all matched tabs into an import plan. Order matters: identity-rich
 * tabs go first so later tabs merge into existing people instead of creating
 * duplicates.
 */
export function buildImportPlan(
  tabs: Partial<Record<TabKey, Row[]>>,
  todayIso: string,
): ImportPlan {
  const reg = new Registry();
  const byTab: Record<string, number> = {};

  if (tabs.newEmployees) byTab.newEmployees = parseNewEmployees(tabs.newEmployees, reg);
  if (tabs.idAssignments) byTab.idAssignments = parseIdAssignments(tabs.idAssignments, reg);
  if (tabs.ceSub) byTab.ceSub = parseCeSub(tabs.ceSub, reg);
  if (tabs.nto) byTab.nto = parseNto(tabs.nto, reg);
  if (tabs.terminated) byTab.terminated = parseTerminated(tabs.terminated, reg);
  if (tabs.loa) byTab.loa = parseLoa(tabs.loa, reg, todayIso);
  if (tabs.contractChanges) byTab.contractChanges = parseContractChanges(tabs.contractChanges, reg);
  if (tabs.nameChange) byTab.nameChange = parseNameChange(tabs.nameChange, reg);
  if (tabs.addressChange) byTab.addressChange = parseAddressChange(tabs.addressChange, reg);

  return {
    employees: reg.employees,
    warnings: reg.warnings,
    byTab,
    maxEmployeeId: reg.employees.reduce((m, e) => Math.max(m, e.employeeId ?? 0), 0),
  };
}
