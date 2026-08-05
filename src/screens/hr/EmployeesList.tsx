import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { useHrCtx } from './HRModule';
import { ImportCard } from './ImportCard';
import {
  EmployeeForm,
  employeeFormFields,
  employeeToFormValues,
  type EmployeeFormValues,
} from './EmployeeForm';
import {
  createHrRecord,
  deleteEmployee,
  displayName,
  isIsoDate,
  isoToMdy,
  normalizeDateInput,
  prettyDate,
  setHrTask,
  taskProgress,
  updateEmployee,
  updateHrRecord,
  PROCESS_SPECS,
  type EmployeeDoc,
  type HrRecordDoc,
  type HrTaskState,
  type ProcessType,
} from '../../lib/hr';
import { useStaff, type StaffRecord } from '../../lib/staff';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { QuietLink } from '../../ds/components/core/QuietLink';
import { CheckMark } from '../../ds/components/forms/CheckMark';
import { Field } from '../../ds/components/forms/Field';
import { EmptyState } from '../../ds/components/records/EmptyState';

/** UI-only grouping of the catalogue's flat task list into the three real
 *  phases of onboarding. Keys not listed fall into the last group. */
const TASK_GROUPS: Partial<Record<ProcessType, Array<{ label: string; keys: string[] }>>> = {
  new_hire: [
    {
      label: 'Paperwork',
      keys: ['payrollChangeForm', 'backgroundCheck', 'paperwork', 'i9'],
    },
    {
      label: 'Systems & people',
      keys: ['frontline', 'efPlus', 'vector', 'synergy', 'notifyUnion'],
    },
    {
      label: 'Optional',
      keys: ['healthSafety', 'key', 'lunchPin'],
    },
  ],
};

/** Compact labels for the grouped panel — the group heading carries the
 *  context the catalogue's longer labels repeat. */
const SHORT_LABELS: Record<string, string> = {
  backgroundCheck: 'Background check',
  paperwork: 'Paperwork',
  i9: 'I-9',
  newTeacherFormSent: 'New teacher form',
  frontline: 'Frontline',
  efPlus: 'EF+',
  vector: 'Vector',
  synergy: 'Synergy',
  gmailAccount: 'School Gmail',
  phoneAssigned: 'Phone',
  notifyUnion: 'Union notified',
  healthSafety: 'Health & Safety',
  key: 'Key',
  lunchPin: 'Lunch PIN',
  ntoLetterSent: 'NTO letter',
};

/** The roster/dossier split is draggable; the width sticks per browser. */
const RAIL_MIN = 280;
const RAIL_MAX = 640;
const RAIL_DEFAULT = 540;
const RAIL_WIDTH_KEY = 'hrRailWidth';

function savedRailWidth(): number {
  try {
    const w = Number(localStorage.getItem(RAIL_WIDTH_KEY));
    if (w >= RAIL_MIN && w <= RAIL_MAX) return w;
  } catch {
    // Storage unavailable — fall through to the default.
  }
  return RAIL_DEFAULT;
}

type SortKey = 'name' | 'position' | 'building' | 'start' | 'progress';

const DIRECTORY_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'position', label: 'Position' },
  { key: 'building', label: 'Bldg' },
  { key: 'start', label: 'Starts' },
  { key: 'progress', label: 'Done' },
];

function matches(e: EmployeeDoc, needle: string): boolean {
  if (!needle) return true;
  const hay = [
    e.nameRaw,
    e.firstName,
    e.lastName,
    e.email,
    e.position,
    e.building,
    e.description,
    e.reportsTo,
    e.employeeId ? String(e.employeeId) : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term));
}

/** The nightly staff-roster sync mirrors the Google directory — if a new hire
 *  appears there, their school account exists. Matched by email, EE#, name. */
function findGoogleAccount(e: EmployeeDoc, staff: StaffRecord[]): StaffRecord | null {
  const email = e.email?.toLowerCase();
  const name = `${e.firstName} ${e.lastName}`.trim().toLowerCase();
  for (const s of staff) {
    if (email && s.email.toLowerCase() === email) return s;
    if (e.employeeId && s.employeeId && String(e.employeeId) === s.employeeId.trim()) return s;
    if (name && `${s.givenName} ${s.familyName}`.trim().toLowerCase() === name) return s;
  }
  return null;
}

const LABEL: CSSProperties = {
  font: 'var(--type-field-label)',
  letterSpacing: 'var(--tracking-wider)',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

function TaskButton({
  taskKey,
  label,
  state,
  onToggle,
  onNa,
}: {
  taskKey: string;
  label: string;
  state: HrTaskState | undefined;
  onToggle: () => void;
  onNa: () => void;
}) {
  const done = state?.done ?? false;
  const na = state?.na === true;
  const title =
    done && state?.doneBy
      ? `${state.doneBy === 'roster-sync' ? 'Checked automatically' : state.doneBy}${
          state.doneAt ? ` · ${state.doneAt.toDate().toLocaleDateString()}` : ''
        }${state.note ? ` · ${state.note}` : ''}`
      : na
        ? 'Marked N/A — click to restore'
        : undefined;
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', minWidth: 0 }}
      data-task={taskKey}
    >
      <button
        onClick={onToggle}
        title={title}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          font: '400 13px/1.4 var(--font-sans)',
          color: na || done ? 'var(--text-muted)' : 'var(--dark)',
        }}
      >
        <span style={{ opacity: na ? 0.35 : 1, display: 'inline-flex', marginTop: 1 }}>
          <CheckMark checked={done && !na} size={16} />
        </span>
        <span
          style={{
            minWidth: 0,
            textDecoration: na ? 'line-through' : 'none',
          }}
        >
          {label}
        </span>
      </button>
      <button
        onClick={onNa}
        title={na ? 'Restore — this applies after all' : "Doesn't apply to this person"}
        style={{
          border: 'none',
          background: na ? 'var(--surface-inset)' : 'transparent',
          borderRadius: 999,
          padding: '1px 5px',
          cursor: 'pointer',
          font: '600 9px/1.3 var(--font-sans)',
          letterSpacing: '0.05em',
          color: 'var(--text-placeholder)',
          opacity: na ? 1 : 0.55,
          flex: '0 0 auto',
        }}
      >
        N/A
      </button>
    </div>
  );
}

function DossierPanel({
  employee,
  process,
  kind,
  google,
}: {
  employee: EmployeeDoc;
  process: HrRecordDoc | null;
  kind: ProcessType;
  google: StaffRecord | null;
}) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<EmployeeFormValues | null>(null);
  const [procDraft, setProcDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Optimistic writes: apply locally the instant something is saved, let the
  // callable catch up, and drop the override once the live snapshot lands
  // (or revert it if the call fails). Covers checkmarks, edited profile
  // fields, and edited process details alike.
  const [overrides, setOverrides] = useState<Record<string, HrTaskState>>({});
  const [detailsOverride, setDetailsOverride] = useState<Record<string, string> | null>(null);
  const processStamp = process?.updatedAt ? process.updatedAt.toMillis() : 0;
  useEffect(() => {
    setOverrides({});
    setDetailsOverride(null);
  }, [process?.id, processStamp]);

  const [empOverride, setEmpOverride] = useState<Partial<EmployeeDoc> | null>(null);
  const empStamp = employee.updatedAt ? employee.updatedAt.toMillis() : 0;
  useEffect(() => {
    setEmpOverride(null);
  }, [employee.id, empStamp]);

  const emp = empOverride ? { ...employee, ...empOverride } : employee;
  const spec = PROCESS_SPECS[kind];
  const groups = TASK_GROUPS[kind] ?? [{ label: 'Checklist', keys: spec.tasks.map((t) => t.key) }];
  const effectiveProcess = process
    ? {
        ...process,
        details: detailsOverride ? { ...process.details, ...detailsOverride } : process.details,
        tasks: { ...process.tasks, ...overrides },
      }
    : null;
  const start = emp.startDate ?? effectiveProcess?.details?.startDate ?? null;
  const progress = effectiveProcess ? taskProgress(effectiveProcess) : null;

  const stateOf = (taskKey: string): HrTaskState | undefined =>
    overrides[taskKey] ?? process?.tasks?.[taskKey];

  const push = (taskKey: string, local: HrTaskState, payload: { done?: boolean; na?: boolean }) => {
    if (!process) return;
    setOverrides((o) => ({ ...o, [taskKey]: local }));
    setError(null);
    setHrTask({ collection: 'processes', id: process.id, taskKey, ...payload }).catch((err) => {
      setOverrides((o) => {
        const next = { ...o };
        delete next[taskKey];
        return next;
      });
      setError(err instanceof Error ? err.message : 'Could not save that.');
    });
  };

  const toggle = (taskKey: string) => {
    const cur = stateOf(taskKey);
    const done = cur?.na === true ? false : !(cur?.done ?? false);
    push(
      taskKey,
      { done, na: false, doneAt: null, doneBy: null, note: cur?.note ?? null },
      { done, na: false },
    );
  };

  const markNa = (taskKey: string) => {
    const cur = stateOf(taskKey);
    if (cur?.na === true) {
      push(
        taskKey,
        { done: false, na: false, doneAt: null, doneBy: null, note: cur?.note ?? null },
        { done: false, na: false },
      );
    } else {
      push(
        taskKey,
        { done: false, na: true, doneAt: null, doneBy: null, note: cur?.note ?? null },
        { na: true },
      );
    }
  };

  const startEdit = () => {
    setValues(employeeToFormValues(emp));
    setProcDraft({
      boardDate: isoToMdy(effectiveProcess?.details?.boardDate ?? ''),
      replacing: effectiveProcess?.details?.replacing ?? '',
      lunchPin: effectiveProcess?.details?.lunchPin ?? '',
    });
    setEditing(true);
    setError(null);
  };

  const save = () => {
    if (!values) return;
    const fields = employeeFormFields(values);
    const details: Record<string, string> =
      kind === 'new_hire'
        ? {
            boardDate: normalizeDateInput(procDraft.boardDate),
            replacing: procDraft.replacing.trim(),
          }
        : { lunchPin: procDraft.lunchPin.trim() };
    setEmpOverride(fields as Partial<EmployeeDoc>);
    if (process) setDetailsOverride(details);
    setEditing(false);
    setError(null);
    const calls: Array<Promise<unknown>> = [updateEmployee({ id: employee.id, fields })];
    if (process) {
      calls.push(updateHrRecord({ collection: 'processes', id: process.id, details }));
    }
    Promise.all(calls).catch((err) => {
      // Give the draft back so nothing typed is lost.
      setEmpOverride(null);
      setDetailsOverride(null);
      setEditing(true);
      setError(err instanceof Error ? err.message : 'Could not save.');
    });
  };

  const remove = async () => {
    if (
      !window.confirm(
        `Remove ${displayName(employee)} and all their records? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteEmployee({ id: employee.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove them.');
      setSaving(false);
    }
  };

  const facts: Array<[string, string]> = [
    ['Starts', prettyDate(start) || '—'],
    ...(effectiveProcess?.details?.boardDate
      ? ([['Board date', prettyDate(effectiveProcess.details.boardDate)]] as Array<
          [string, string]
        >)
      : []),
    ...(effectiveProcess?.details?.contractSentDate
      ? ([['Contract sent', prettyDate(effectiveProcess.details.contractSentDate)]] as Array<
          [string, string]
        >)
      : []),
    ['Reports to', emp.reportsTo ?? effectiveProcess?.reportsTo ?? '—'],
    ...(kind === 'new_hire'
      ? ([['Replacing', effectiveProcess?.details?.replacing || '—']] as Array<[string, string]>)
      : []),
    ...(effectiveProcess?.details?.lunchPin
      ? ([['Lunch PIN', effectiveProcess.details.lunchPin]] as Array<[string, string]>)
      : []),
    ['Google account', google?.email ?? emp.email ?? 'Not created yet'],
  ];

  return (
    <div style={{ padding: '16px 20px', minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'baseline',
        }}
      >
        <h3
          style={{
            font: '700 19px/1.25 var(--font-sans)',
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--dark)',
            margin: 0,
          }}
        >
          {displayName(emp)}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {progress && !editing && (
            <span
              style={{
                font: 'var(--type-body-sm)',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {progress.done} of {progress.total} done
            </span>
          )}
          {!editing && (
            <Button size="sm" variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          )}
        </div>
      </div>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '2px 0 12px' }}>
        {[emp.position ?? emp.description, emp.building].filter(Boolean).join(' · ')}
        {emp.employeeId ? ` · EE# ${emp.employeeId}` : ' · No EE# yet'}
      </p>

      {editing && values ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 6 }}>
          <EmployeeForm
            values={values}
            onChange={(p) => setValues((v) => (v ? { ...v, ...p } : v))}
          />
          {process && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {kind === 'new_hire' ? (
                <>
                  <Field
                    label="Board date"
                    optional
                    value={procDraft.boardDate}
                    onChange={(ev) => setProcDraft((d) => ({ ...d, boardDate: ev.target.value }))}
                    placeholder="MM-DD-YYYY"
                  />
                  <Field
                    label="Replacing / student teacher"
                    optional
                    value={procDraft.replacing}
                    onChange={(ev) => setProcDraft((d) => ({ ...d, replacing: ev.target.value }))}
                  />
                </>
              ) : (
                <Field
                  label="Lunch PIN"
                  optional
                  value={procDraft.lunchPin}
                  onChange={(ev) => setProcDraft((d) => ({ ...d, lunchPin: ev.target.value }))}
                />
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="submit" icon="save" disabled={saving} onClick={save}>
              Save changes
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="destructive" disabled={saving} onClick={remove}>
              Remove employee
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: '10px 26px',
              flexWrap: 'wrap',
              padding: '10px 0 14px',
              borderBottom: '1px solid var(--divider)',
              marginBottom: 12,
            }}
          >
            {facts.map(([l, v]) => (
              <div key={l}>
                <span style={LABEL}>{l}</span>
                <p
                  style={{
                    font: '600 13px/1.4 var(--font-sans)',
                    color: 'var(--dark)',
                    margin: '2px 0 0',
                  }}
                >
                  {v}
                </p>
              </div>
            ))}
          </div>

          {process ? (
            groups.map((g) => (
              <div key={g.label} style={{ marginBottom: 10 }}>
                <span
                  style={{
                    ...LABEL,
                    color: 'var(--secondary)',
                    display: 'block',
                    paddingBottom: 4,
                  }}
                >
                  {g.label}
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
                    gap: '2px 16px',
                  }}
                >
                  {g.keys
                    .map((k) => spec.tasks.find((t) => t.key === k))
                    .filter((t): t is { key: string; label: string } => !!t)
                    .map((t) => (
                      <TaskButton
                        key={t.key}
                        taskKey={t.key}
                        label={SHORT_LABELS[t.key] ?? t.label}
                        state={stateOf(t.key)}
                        onToggle={() => toggle(t.key)}
                        onNa={() => markNa(t.key)}
                      />
                    ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 8px' }}>
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                No {spec.label.toLowerCase()} checklist yet.
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={starting}
                onClick={async () => {
                  setStarting(true);
                  setError(null);
                  try {
                    await createHrRecord({
                      collection: 'processes',
                      type: kind,
                      employeeRef: employee.id,
                    });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not start the checklist.');
                  } finally {
                    setStarting(false);
                  }
                }}
              >
                {starting ? 'Starting…' : 'Start checklist'}
              </Button>
            </div>
          )}
        </>
      )}

      {!editing && (process?.notes || emp.notes) && (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          {process?.notes ?? emp.notes}
        </p>
      )}
      {error && (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: '8px 0 0' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
        <QuietLink icon="arrowRight" onClick={() => navigate(`/hr/employees/${employee.id}`)}>
          Full employee record
        </QuietLink>
        {process && (
          <QuietLink
            icon="fileText"
            onClick={() => navigate(`/hr/records/processes/${process.id}`)}
          >
            Checklist page
          </QuietLink>
        )}
      </div>
    </div>
  );
}

/** The New employees / CE-Sub-Coaching tabs: a roster on the left, the
 *  selected person's full file always open on the right. Arrow keys move
 *  through the roster. */
export function EmployeesList({ kind }: { kind: ProcessType }) {
  const navigate = useNavigate();
  const ctx = useHrCtx();
  const staffState = useStaff();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [railWidth, setRailWidth] = useState(savedRailWidth);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef<{ x: number; width: number } | null>(null);
  const clampWidth = (w: number) => Math.min(RAIL_MAX, Math.max(RAIL_MIN, Math.round(w)));
  const persistWidth = (w: number) => {
    const clamped = clampWidth(w);
    setRailWidth(clamped);
    try {
      localStorage.setItem(RAIL_WIDTH_KEY, String(clamped));
    } catch {
      // Storage unavailable — the width still applies for this visit.
    }
  };

  const people = kind === 'new_hire' ? ctx.newHires : ctx.ceSubs;
  const isCe = kind === 'ce_onboarding';
  const staff = 'staff' in staffState ? staffState.staff : [];

  const processByRef = useMemo(() => {
    const map = new Map<string, HrRecordDoc>();
    for (const p of ctx.processes.items ?? []) {
      if (p.type === kind) map.set(p.employeeRef, p);
    }
    return map;
  }, [ctx.processes.items, kind]);

  // The directory rail sorts by any column; the default stays the sheet's own
  // order — chronological by start, undated rows last.
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'start', dir: 1 });

  const startKey = (e: EmployeeDoc): string => {
    const p = processByRef.get(e.id);
    const d = [e.startDate, p?.details?.startDate, p?.details?.boardDate].find((v) =>
      isIsoDate(v ?? null),
    );
    return d ?? '9999-99-99';
  };
  const sortValue = (e: EmployeeDoc): string | number => {
    switch (sort.key) {
      case 'name':
        return (e.lastName || e.nameRaw).toLowerCase();
      case 'position':
        return (e.position ?? e.description ?? '').toLowerCase() || '￿';
      case 'building':
        return (e.building ?? '').toLowerCase() || '￿';
      case 'progress': {
        const p = processByRef.get(e.id);
        if (!p) return 2;
        const pr = taskProgress(p);
        return pr.total > 0 ? pr.done / pr.total : 0;
      }
      default:
        return startKey(e);
    }
  };
  const filtered = people
    .filter((e) => matches(e, search.trim()))
    .sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * sort.dir || (a.lastName || a.nameRaw).localeCompare(b.lastName || b.nameRaw);
    });

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const moveSelection = (delta: number) => {
    if (!selected) return;
    const i = filtered.findIndex((e) => e.id === selected.id);
    const next = filtered[Math.min(filtered.length - 1, Math.max(0, i + delta))];
    if (next) setSelectedId(next.id);
  };

  return (
    <>
      <Card
        eyebrow={isCe ? 'CE / Sub / Coaching' : 'New employees'}
        heading={isCe ? 'Community ed, subs, and coaches' : "This year's new employees"}
        headingRight={
          <Button
            size="sm"
            variant="primary"
            icon="plus"
            onClick={() => navigate('/hr/employees/new')}
          >
            New employee
          </Button>
        }
        bodyStyle={{ padding: 0 }}
      >
        {ctx.employees.loading ? (
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: 'var(--text-muted)',
              margin: 0,
              padding: 16,
            }}
          >
            Loading…
          </p>
        ) : ctx.employees.error ? (
          <p
            style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0, padding: 16 }}
          >
            {ctx.employees.error}
          </p>
        ) : people.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              on="card"
              icon="users"
              line="Nobody on file yet"
              note={
                isCe
                  ? 'CE, sub, and coaching hires land here from the import or by hand.'
                  : 'Import the master sheet below, or add someone by hand.'
              }
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div
              style={{
                flex: '0 1 auto',
                width: railWidth,
                minWidth: RAIL_MIN,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '12px 12px 8px' }}>
                <Field
                  icon="search"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div
                tabIndex={0}
                aria-label={isCe ? 'CE, sub, and coaching hires' : 'New employees'}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveSelection(1);
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveSelection(-1);
                  }
                }}
                style={{ overflowY: 'auto', maxHeight: 520, outline: 'none' }}
              >
                {filtered.length === 0 ? (
                  <p
                    style={{
                      font: 'var(--type-body-sm)',
                      color: 'var(--text-muted)',
                      padding: '8px 14px',
                    }}
                  >
                    Nobody matches that.
                  </p>
                ) : (
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        {DIRECTORY_COLUMNS.map((c) => (
                          <th
                            key={c.key}
                            onClick={() =>
                              setSort((s) => ({
                                key: c.key,
                                dir: s.key === c.key ? (-s.dir as 1 | -1) : 1,
                              }))
                            }
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 1,
                              background: 'var(--surface-card)',
                              textAlign: 'left',
                              padding: '6px 8px',
                              font: '600 9.5px/1.3 var(--font-sans)',
                              letterSpacing: 'var(--tracking-wider)',
                              textTransform: 'uppercase',
                              color: sort.key === c.key ? 'var(--primary)' : 'var(--text-muted)',
                              borderBottom: '1px solid var(--border-input)',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            {c.label}
                            {sort.key === c.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e) => {
                        const p = processByRef.get(e.id);
                        const prog = p ? taskProgress(p) : null;
                        const isSel = selected?.id === e.id;
                        const d = [e.startDate, p?.details?.startDate].find((v) =>
                          isIsoDate(v ?? null),
                        );
                        const cell: CSSProperties = {
                          padding: '8px 8px',
                          borderBottom: '1px solid var(--divider)',
                          font: '400 12.5px/1.4 var(--font-sans)',
                          color: 'var(--dark)',
                          background: isSel ? 'var(--tint)' : undefined,
                          // Truncation eases as the rail grows past its snuggest
                          // useful width; anchored at 340, not the default, so
                          // the default ratio keeps full position titles.
                          maxWidth: 140 + Math.max(0, railWidth - 340),
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        };
                        return (
                          <tr
                            key={e.id}
                            aria-selected={isSel}
                            onClick={() => setSelectedId(e.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td
                              style={{
                                ...cell,
                                fontWeight: 600,
                                borderLeft: `3px solid ${isSel ? 'var(--primary)' : 'transparent'}`,
                              }}
                              title={displayName(e)}
                            >
                              {displayName(e)}
                            </td>
                            <td
                              style={{ ...cell, color: 'var(--text-muted)' }}
                              title={e.position ?? e.description ?? undefined}
                            >
                              {e.position ?? e.description ?? '—'}
                            </td>
                            <td style={{ ...cell, color: 'var(--text-muted)' }}>
                              {e.building ?? '—'}
                            </td>
                            <td
                              style={{
                                ...cell,
                                color: 'var(--text-muted)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {d ? prettyDate(d).slice(0, 5) : '—'}
                            </td>
                            <td
                              style={{
                                ...cell,
                                color: 'var(--text-muted)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {prog ? `${prog.done}/${prog.total}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the roster"
              tabIndex={0}
              title="Drag to resize · double-click to reset"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                dragStart.current = { x: e.clientX, width: railWidth };
                setResizing(true);
              }}
              onPointerMove={(e) => {
                if (!dragStart.current) return;
                setRailWidth(clampWidth(dragStart.current.width + e.clientX - dragStart.current.x));
              }}
              onPointerUp={() => {
                dragStart.current = null;
                setResizing(false);
                persistWidth(railWidth);
              }}
              onDoubleClick={() => persistWidth(RAIL_DEFAULT)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') persistWidth(railWidth - 24);
                if (e.key === 'ArrowRight') persistWidth(railWidth + 24);
              }}
              style={{
                flex: '0 0 7px',
                cursor: 'col-resize',
                touchAction: 'none',
                alignSelf: 'stretch',
                borderLeft: `1px solid ${resizing ? 'var(--primary)' : 'var(--divider)'}`,
                background: resizing ? 'var(--tint)' : 'transparent',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--tint)';
              }}
              onMouseLeave={(e) => {
                if (!dragStart.current) e.currentTarget.style.background = 'transparent';
              }}
            />

            <div style={{ flex: '99 1 340px', minWidth: 0 }}>
              {selected ? (
                <DossierPanel
                  key={selected.id}
                  employee={selected}
                  process={processByRef.get(selected.id) ?? null}
                  kind={kind}
                  google={findGoogleAccount(selected, staff)}
                />
              ) : (
                <div style={{ padding: 16 }}>
                  <EmptyState on="card" icon="users" line="Select someone on the left" />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {!isCe && <ImportCard defaultOpen={!ctx.employees.loading && people.length === 0} />}
    </>
  );
}
