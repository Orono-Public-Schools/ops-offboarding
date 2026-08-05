import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useHrCtx } from './HRModule';
import { ImportCard } from './ImportCard';
import {
  createHrRecord,
  displayName,
  isIsoDate,
  prettyDate,
  setHrTask,
  taskProgress,
  PROCESS_SPECS,
  type EmployeeDoc,
  type HrRecordDoc,
  type ProcessType,
} from '../../lib/hr';
import { useStaff, type StaffRecord } from '../../lib/staff';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { Icon } from '../../ds/components/core/Icon';
import { ProgressBar } from '../../ds/components/core/ProgressBar';
import { QuietLink } from '../../ds/components/core/QuietLink';
import { CheckMark } from '../../ds/components/forms/CheckMark';
import { Field } from '../../ds/components/forms/Field';
import { EmptyState } from '../../ds/components/records/EmptyState';

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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        padding: '3px 0',
      }}
    >
      <span
        style={{
          font: 'var(--type-field-label)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: 'var(--type-body-sm)',
          color: 'var(--dark)',
          fontWeight: 500,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** The nightly staff-roster sync mirrors the Google directory export — if a
 *  new hire appears there, their school account exists. Matched by email,
 *  then EE#, then name. */
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

function EmployeeRow({
  employee,
  process,
  kind,
  googleAccount,
}: {
  employee: EmployeeDoc;
  process: HrRecordDoc | null;
  kind: ProcessType;
  googleAccount: StaffRecord | null;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spec = PROCESS_SPECS[kind];
  const progress = process ? taskProgress(process) : null;
  const start = employee.startDate ?? process?.details?.startDate ?? null;

  const toggle = async (taskKey: string, done: boolean) => {
    if (!process) return;
    setPending(taskKey);
    setError(null);
    try {
      await setHrTask({ collection: 'processes', id: process.id, taskKey, done });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the task.');
    } finally {
      setPending(null);
    }
  };

  const startChecklist = async () => {
    setStarting(true);
    setError(null);
    try {
      await createHrRecord({ collection: 'processes', type: kind, employeeRef: employee.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the checklist.');
      setStarting(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          cursor: 'pointer',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <p
            style={{
              font: 'var(--type-body)',
              fontWeight: 600,
              color: 'var(--dark)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName(employee)}
            {employee.employeeId && (
              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                {' '}
                · {employee.employeeId}
              </span>
            )}
          </p>
          <p
            style={{
              font: 'var(--type-caption)',
              fontSize: 11.5,
              color: 'var(--text-muted)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {[employee.position ?? employee.description, employee.building]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>

        <div style={{ flex: '0 0 auto', width: 92 }}>
          <p
            style={{
              font: 'var(--type-field-label)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Starts
          </p>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--dark)', margin: 0 }}>
            {prettyDate(start) || '—'}
          </p>
        </div>

        <div style={{ flex: '0 0 auto', width: 140 }}>
          {progress ? (
            <ProgressBar total={progress.total} done={progress.done} showCount height={5} />
          ) : (
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              No checklist
            </span>
          )}
        </div>

        <div style={{ flex: '0 0 auto', width: 92 }} title={googleAccount?.email ?? undefined}>
          <p
            style={{
              font: 'var(--type-field-label)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Google
          </p>
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: googleAccount ? 'var(--dark)' : 'var(--text-muted)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {googleAccount ? (
              <>
                <Icon name="check" size={13} /> Created
              </>
            ) : (
              'Not yet'
            )}
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--dur-med, 200ms) ease',
          }}
        >
          <Icon name="chevronDown" size={16} />
        </span>
      </div>

      {open && (
        <div style={{ padding: '12px 0 2px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
            }}
          >
            <div>
              <Fact label="EE#" value={employee.employeeId ? String(employee.employeeId) : '—'} />
              <Fact label="Start date" value={prettyDate(start) || '—'} />
              {process?.details?.boardDate && (
                <Fact label="Board date" value={prettyDate(process.details.boardDate)} />
              )}
              <Fact label="Reports to" value={employee.reportsTo ?? process?.reportsTo ?? '—'} />
              {process?.details?.replacing && (
                <Fact label="Replacing" value={process.details.replacing} />
              )}
              {process?.details?.lunchPin && (
                <Fact label="Lunch PIN" value={process.details.lunchPin} />
              )}
              <Fact
                label="Google account"
                value={googleAccount?.email ?? employee.email ?? 'Not created yet'}
              />
              {(process?.notes || employee.notes) && (
                <p
                  style={{
                    font: 'var(--type-body-sm)',
                    color: 'var(--text-muted)',
                    margin: '6px 0 0',
                  }}
                >
                  {process?.notes ?? employee.notes}
                </p>
              )}
            </div>

            <div style={{ gridColumn: 'span 1' }}>
              {process ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '2px 14px',
                  }}
                >
                  {spec.tasks.map((t) => {
                    const ts = process.tasks?.[t.key];
                    const done = ts?.done ?? false;
                    return (
                      <button
                        key={t.key}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggle(t.key, !done);
                        }}
                        disabled={pending !== null}
                        title={
                          done && ts?.doneBy
                            ? `${ts.doneBy}${ts.doneAt ? ` · ${ts.doneAt.toDate().toLocaleDateString()}` : ''}`
                            : undefined
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 2px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          font: 'var(--type-body-sm)',
                          color: done ? 'var(--text-muted)' : 'var(--dark)',
                          opacity: pending === t.key ? 0.5 : 1,
                        }}
                      >
                        <CheckMark checked={done} size={16} />
                        <span style={{ minWidth: 0 }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                    No {spec.label.toLowerCase()} checklist yet.
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={starting}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      startChecklist();
                    }}
                  >
                    {starting ? 'Starting…' : 'Start checklist'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: '8px 0 0' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
            <QuietLink
              icon="arrowRight"
              onClick={(ev) => {
                ev.stopPropagation();
                navigate(`/hr/employees/${employee.id}`);
              }}
            >
              Full employee record
            </QuietLink>
            {process && (
              <QuietLink
                icon="fileText"
                onClick={(ev) => {
                  ev.stopPropagation();
                  navigate(`/hr/records/processes/${process.id}`);
                }}
              >
                Checklist page
              </QuietLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The New employees and CE/Sub/Coaching tabs — the workbook's segmentation,
 *  one expandable row per person so details and the checklist are one click
 *  away at most. */
export function EmployeesList({ kind }: { kind: ProcessType }) {
  const navigate = useNavigate();
  const ctx = useHrCtx();
  const staffState = useStaff();
  const [search, setSearch] = useState('');

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
        pad={16}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field
            icon="search"
            placeholder="Search name, EE#, building, position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {ctx.employees.loading ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Loading…
            </p>
          ) : ctx.employees.error ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
              {ctx.employees.error}
            </p>
          ) : filtered.length === 0 ? (
            <EmptyState
              on="card"
              icon="users"
              line={people.length === 0 ? 'Nobody on file yet' : 'Nobody matches that'}
              note={
                people.length === 0
                  ? isCe
                    ? 'CE, sub, and coaching hires land here from the import or by hand.'
                    : 'Import the master sheet below, or add someone by hand.'
                  : 'Try fewer words.'
              }
            />
          ) : (
            <div>
              {filtered.map((e, i) => (
                <div
                  key={e.id}
                  style={{
                    padding: i === 0 ? '0 0 10px' : '10px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                  }}
                >
                  <EmployeeRow
                    employee={e}
                    process={processByRef.get(e.id) ?? null}
                    kind={kind}
                    googleAccount={findGoogleAccount(e, staff)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {!isCe && <ImportCard defaultOpen={!ctx.employees.loading && people.length === 0} />}
    </>
  );
}
