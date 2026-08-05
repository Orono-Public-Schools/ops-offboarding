import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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

  // Optimistic checkmarks: flip locally the instant a box is clicked, let the
  // callable catch up, and drop the override once the live snapshot lands
  // (or revert it if the call fails).
  const [overrides, setOverrides] = useState<Record<string, HrTaskState>>({});
  const processStamp = process?.updatedAt ? process.updatedAt.toMillis() : 0;
  useEffect(() => {
    setOverrides({});
  }, [process?.id, processStamp]);

  const spec = PROCESS_SPECS[kind];
  const groups = TASK_GROUPS[kind] ?? [{ label: 'Checklist', keys: spec.tasks.map((t) => t.key) }];
  const start = employee.startDate ?? process?.details?.startDate ?? null;
  const effectiveProcess = process
    ? { ...process, tasks: { ...process.tasks, ...overrides } }
    : null;
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
    setValues(employeeToFormValues(employee));
    setProcDraft({
      boardDate: isoToMdy(process?.details?.boardDate ?? ''),
      replacing: process?.details?.replacing ?? '',
      lunchPin: process?.details?.lunchPin ?? '',
    });
    setEditing(true);
    setError(null);
  };

  const save = async () => {
    if (!values) return;
    setSaving(true);
    setError(null);
    try {
      await updateEmployee({ id: employee.id, fields: employeeFormFields(values) });
      if (process && kind === 'new_hire') {
        await updateHrRecord({
          collection: 'processes',
          id: process.id,
          details: {
            boardDate: normalizeDateInput(procDraft.boardDate),
            replacing: procDraft.replacing.trim(),
          },
        });
      } else if (process && kind === 'ce_onboarding') {
        await updateHrRecord({
          collection: 'processes',
          id: process.id,
          details: { lunchPin: procDraft.lunchPin.trim() },
        });
      }
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
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
    ...(process?.details?.boardDate
      ? ([['Board date', prettyDate(process.details.boardDate)]] as Array<[string, string]>)
      : []),
    ...(process?.details?.contractSentDate
      ? ([['Contract sent', prettyDate(process.details.contractSentDate)]] as Array<
          [string, string]
        >)
      : []),
    ['Reports to', employee.reportsTo ?? process?.reportsTo ?? '—'],
    ...(kind === 'new_hire'
      ? ([['Replacing', process?.details?.replacing || '—']] as Array<[string, string]>)
      : []),
    ...(process?.details?.lunchPin
      ? ([['Lunch PIN', process.details.lunchPin]] as Array<[string, string]>)
      : []),
    ['Google account', google?.email ?? employee.email ?? 'Not created yet'],
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
          {displayName(employee)}
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
        {[employee.position ?? employee.description, employee.building].filter(Boolean).join(' · ')}
        {employee.employeeId ? ` · EE# ${employee.employeeId}` : ' · No EE# yet'}
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
              {saving ? 'Saving…' : 'Save changes'}
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

      {!editing && (process?.notes || employee.notes) && (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          {process?.notes ?? employee.notes}
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

  // Chronological like the sheet: earliest start first; undated rows last.
  const startKey = (e: EmployeeDoc): string => {
    const p = processByRef.get(e.id);
    const d = [e.startDate, p?.details?.startDate, p?.details?.boardDate].find((v) =>
      isIsoDate(v ?? null),
    );
    return d ?? '9999-99-99';
  };
  const filtered = people
    .filter((e) => matches(e, search.trim()))
    .sort(
      (a, b) =>
        startKey(a).localeCompare(startKey(b)) ||
        (a.lastName || a.nameRaw).localeCompare(b.lastName || b.nameRaw),
    );

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
                flex: '1 1 250px',
                maxWidth: 320,
                minWidth: 230,
                borderRight: '1px solid var(--divider)',
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
                role="listbox"
                aria-label={isCe ? 'CE, sub, and coaching hires' : 'New employees'}
                tabIndex={0}
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
                {filtered.length === 0 && (
                  <p
                    style={{
                      font: 'var(--type-body-sm)',
                      color: 'var(--text-muted)',
                      padding: '8px 14px',
                    }}
                  >
                    Nobody matches that.
                  </p>
                )}
                {filtered.map((e) => {
                  const p = processByRef.get(e.id);
                  const prog = p ? taskProgress(p) : null;
                  const isSel = selected?.id === e.id;
                  const d = [e.startDate, p?.details?.startDate].find((v) => isIsoDate(v ?? null));
                  return (
                    <button
                      key={e.id}
                      role="option"
                      aria-selected={isSel}
                      onClick={() => setSelectedId(e.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '3px 10px',
                        width: '100%',
                        padding: '10px 14px',
                        border: 'none',
                        borderLeft: `3px solid ${isSel ? 'var(--primary)' : 'transparent'}`,
                        borderBottom: '1px solid var(--divider)',
                        background: isSel ? 'var(--tint)' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          font: '600 13px/1.35 var(--font-sans)',
                          color: 'var(--dark)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {displayName(e)}
                      </span>
                      <span
                        style={{
                          font: '500 11.5px/1.5 var(--font-sans)',
                          color: 'var(--text-muted)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {d ? prettyDate(d).slice(0, 5) : '—'}
                      </span>
                      <span
                        style={{
                          gridColumn: '1 / -1',
                          height: 4,
                          borderRadius: 2,
                          background: 'var(--tint)',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            height: '100%',
                            width:
                              prog && prog.total > 0 ? `${(prog.done / prog.total) * 100}%` : 0,
                            background: 'linear-gradient(90deg, #1d2a5d, #4356a9)',
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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
