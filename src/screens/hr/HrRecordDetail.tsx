import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  deleteHrRecord,
  isIsoDate,
  isoToMdy,
  normalizeDateInput,
  prettyDate,
  setHrTask,
  specFor,
  taskProgress,
  updateHrRecord,
  useHrRecord,
  LEAVE_REASON_OPTIONS,
  LEAVE_STATUS_BADGE,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUSES,
  type HrRecordCollection,
  type HrRecordDoc,
  type HrTaskState,
  type LeaveStatus,
} from '../../lib/hr';
import { useIsHrAdmin } from '../../lib/auth';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { QuietLink } from '../../ds/components/core/QuietLink';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { Field } from '../../ds/components/forms/Field';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { ChecklistItem } from '../../ds/components/records/ChecklistItem';
import { EmptyState } from '../../ds/components/records/EmptyState';

function isCollection(v: string | undefined): v is HrRecordCollection {
  return v === 'processes' || v === 'leaves' || v === 'changes';
}

function badgeFor(r: HrRecordDoc) {
  if (r.collection === 'leaves') {
    const b = LEAVE_STATUS_BADGE[r.status as LeaveStatus] ?? LEAVE_STATUS_BADGE.in_process;
    return <StatusBadge state={b.state} label={b.label} />;
  }
  const { done, total } = taskProgress(r);
  const complete =
    r.collection === 'changes' ? total > 0 && done >= total : r.status === 'complete';
  return complete ? (
    <StatusBadge state="completed" />
  ) : (
    <StatusBadge state="processing" label="Open" />
  );
}

export function HrRecordDetail() {
  const { coll, id } = useParams();
  const navigate = useNavigate();
  const isHrAdmin = useIsHrAdmin();
  const collection = isCollection(coll) ? coll : null;
  const state = useHrRecord(collection, id ?? null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState('');
  const [draftReason, setDraftReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic writes: task ticks, edited details, and status changes show
  // immediately; overrides drop once the live snapshot lands, or revert if
  // the callable fails.
  const [taskOverrides, setTaskOverrides] = useState<Record<string, HrTaskState>>({});
  const [recOverride, setRecOverride] = useState<Partial<HrRecordDoc> | null>(null);
  const stamp = state.item?.updatedAt ? state.item.updatedAt.toMillis() : 0;
  useEffect(() => {
    setTaskOverrides({});
    setRecOverride(null);
  }, [id, stamp]);

  if (!collection) return <EmptyState icon="fileText" line="That record type doesn't exist." />;
  if (state.loading) {
    return <p style={{ font: 'var(--type-body-sm)', color: 'rgba(255,255,255,0.6)' }}>Loading…</p>;
  }
  if (state.error || !state.item) {
    return (
      <EmptyState
        icon="fileText"
        line={state.error ?? 'Record not found.'}
        action={
          <Button variant="secondary" onClick={() => navigate('/hr/employees')}>
            Back to employees
          </Button>
        }
      />
    );
  }

  const base = state.item;
  const r: HrRecordDoc = {
    ...base,
    ...(recOverride ?? {}),
    details: { ...base.details, ...(recOverride?.details ?? {}) },
    tasks: { ...base.tasks, ...taskOverrides },
  };
  const spec = specFor(collection, (r.type as string) ?? null);
  if (!spec) return <EmptyState icon="fileText" line="This record has an unknown type." />;

  const startEdit = () => {
    const d: Record<string, string> = {};
    for (const f of spec.details) {
      const raw = r.details?.[f.key] ?? '';
      d[f.key] = f.kind === 'date' ? isoToMdy(raw) : raw;
    }
    setDraft(d);
    setDraftNotes(r.notes ?? '');
    setDraftReason(r.reason ?? '');
    setEditing(true);
    setError(null);
  };

  const save = () => {
    const details = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => {
        const kind = spec.details.find((f) => f.key === k)?.kind;
        return [k, kind === 'date' ? normalizeDateInput(v) : v];
      }),
    );
    const patch = {
      details,
      notes: draftNotes.trim() || null,
      ...(collection === 'leaves' ? { reason: draftReason.trim() || null } : {}),
    };
    setRecOverride((o) => ({ ...(o ?? {}), ...patch }));
    setEditing(false);
    setError(null);
    updateHrRecord({ collection, id: r.id, ...patch }).catch((err) => {
      // Give the draft back so nothing typed is lost.
      setRecOverride(null);
      setEditing(true);
      setError(err instanceof Error ? err.message : 'Could not save.');
    });
  };

  const setStatus = (status: string) => {
    setRecOverride((o) => ({ ...(o ?? {}), status: status as HrRecordDoc['status'] }));
    setError(null);
    updateHrRecord({ collection, id: r.id, status: status as never }).catch((err) => {
      setRecOverride((o) => {
        if (!o) return o;
        const next = { ...o };
        delete next.status;
        return next;
      });
      setError(err instanceof Error ? err.message : 'Could not update the status.');
    });
  };

  const remove = async () => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    setBusy(true);
    try {
      await deleteHrRecord({ collection, id: r.id });
      navigate(`/hr/employees/${r.employeeRef}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the record.');
      setBusy(false);
    }
  };

  const callTask = (taskKey: string, payload: { done?: boolean; na?: boolean }) => {
    const local: HrTaskState = {
      done: payload.done ?? false,
      na: payload.na ?? false,
      doneAt: null,
      doneBy: null,
      note: r.tasks?.[taskKey]?.note ?? null,
    };
    setTaskOverrides((o) => ({ ...o, [taskKey]: local }));
    setError(null);
    setHrTask({ collection, id: r.id, taskKey, ...payload }).catch((err) => {
      setTaskOverrides((o) => {
        const next = { ...o };
        delete next[taskKey];
        return next;
      });
      setError(err instanceof Error ? err.message : 'Could not update the task.');
    });
  };

  const { done, total } = taskProgress(r);

  return (
    <>
      <PageTitle
        eyebrow={r.fiscalYear ? `${spec.label} · ${r.fiscalYear}` : spec.label}
        title={r.employeeName}
        subtitle={[
          r.employeeIdNum ? `EE# ${r.employeeIdNum}` : null,
          r.position,
          r.building,
          r.source === 'import' ? 'From the sheet import' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {badgeFor(r)}
            {collection === 'processes' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setStatus(r.status === 'complete' ? 'open' : 'complete')}
              >
                {r.status === 'complete' ? 'Reopen' : 'Mark complete'}
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <p style={{ font: 'var(--type-body-sm)', color: '#ffb4b4', margin: '0 0 12px' }}>{error}</p>
      )}

      <Card
        eyebrow="Details"
        heading={editing ? 'Editing' : 'On file'}
        headingRight={
          editing ? undefined : (
            <Button size="sm" variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          )
        }
      >
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {collection === 'leaves' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <Field
                  label="Status"
                  as="select"
                  value={(r.status as string) ?? 'in_process'}
                  onChange={(ev) => setStatus(ev.target.value)}
                  options={LEAVE_STATUSES.map((s) => ({
                    value: s,
                    label: LEAVE_STATUS_LABELS[s],
                  }))}
                />
                <Field
                  label="Reason"
                  value={draftReason}
                  onChange={(ev) => setDraftReason(ev.target.value)}
                  help={`Category only — e.g. ${LEAVE_REASON_OPTIONS.slice(0, 3).join(', ')}. Never medical detail.`}
                />
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {spec.details.map((f) =>
                f.kind === 'select' ? (
                  <Field
                    key={f.key}
                    label={f.label}
                    as="select"
                    value={draft[f.key] ?? ''}
                    onChange={(ev) => setDraft((d) => ({ ...d, [f.key]: ev.target.value }))}
                    options={[
                      { value: '', label: '—' },
                      ...(f.options ?? []).map((o) => ({ value: o, label: o })),
                    ]}
                  />
                ) : f.kind === 'textarea' ? (
                  <Field
                    key={f.key}
                    label={f.label}
                    as="textarea"
                    rows={2}
                    value={draft[f.key] ?? ''}
                    onChange={(ev) => setDraft((d) => ({ ...d, [f.key]: ev.target.value }))}
                  />
                ) : (
                  <Field
                    key={f.key}
                    label={f.label}
                    value={draft[f.key] ?? ''}
                    onChange={(ev) => setDraft((d) => ({ ...d, [f.key]: ev.target.value }))}
                    placeholder={f.kind === 'date' ? 'MM-DD-YYYY or TBD' : undefined}
                  />
                ),
              )}
            </div>
            <Field
              label="Notes"
              optional
              as="textarea"
              rows={3}
              value={draftNotes}
              onChange={(ev) => setDraftNotes(ev.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="submit" icon="save" disabled={busy} onClick={save}>
                Save changes
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <RowList>
            {collection === 'leaves' && <DetailRow label="Reason" value={r.reason ?? '—'} />}
            {spec.details.map((f) => {
              const v = r.details?.[f.key];
              if (!v) return null;
              return (
                <DetailRow
                  key={f.key}
                  label={f.label}
                  value={f.kind === 'date' && isIsoDate(v) ? prettyDate(v) : v}
                />
              );
            })}
            {r.notes && <DetailRow label="Notes" value={r.notes} />}
            {!r.notes && spec.details.every((f) => !r.details?.[f.key]) && (
              <DetailRow label="Details" value="Nothing recorded yet — use Edit." />
            )}
          </RowList>
        )}
      </Card>

      {spec.tasks.length > 0 && (
        <Card eyebrow="Checklist" heading={`${done} of ${total} done`} pad={16}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {spec.tasks.map((t) => {
              const ts = r.tasks?.[t.key];
              const na = ts?.na === true;
              const parts = na
                ? ["Doesn't apply"]
                : [
                    t.optional ? 'Optional' : null,
                    ts?.doneBy === 'roster-sync' ? 'checked automatically' : (ts?.doneBy ?? null),
                    ts?.doneAt ? ts.doneAt.toDate().toLocaleDateString() : null,
                    ts?.note ?? null,
                  ].filter(Boolean);
              return (
                <ChecklistItem
                  key={t.key}
                  state={!na && ts?.done ? 'done' : 'todo'}
                  title={t.label}
                  description={parts.join(' · ') || undefined}
                  onToggle={() =>
                    callTask(
                      t.key,
                      na ? { done: false, na: false } : { done: !(ts?.done ?? false), na: false },
                    )
                  }
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        callTask(t.key, na ? { done: false, na: false } : { na: true });
                      }}
                    >
                      {na ? 'Applies' : 'N/A'}
                    </Button>
                  }
                />
              );
            })}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <QuietLink onClick={() => navigate(`/hr/employees/${r.employeeRef}`)}>
          View {r.employeeName}'s full record
        </QuietLink>
        {isHrAdmin && (
          <Button size="sm" variant="destructive" disabled={busy} onClick={remove}>
            Delete record
          </Button>
        )}
      </div>
    </>
  );
}
