import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EmployeeForm, type EmployeeFormValues, employeeFormFields } from './EmployeeForm';
import {
  assignEmployeeId,
  createHrRecord,
  displayName,
  EMPLOYEE_STATUS_BADGE,
  prettyDate,
  taskProgress,
  updateEmployee,
  useEmployee,
  useEmployeeHistory,
  useHrRecords,
  type ChangeType,
  type EmployeeDoc,
  type HrRecordCollection,
  type HrRecordDoc,
  type LeaveStatus,
  type ProcessType,
  CHANGE_SPECS,
  LEAVE_STATUS_BADGE,
  PROCESS_SPECS,
} from '../../lib/hr';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { Field } from '../../ds/components/forms/Field';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { RequestRow } from '../../ds/components/records/RequestRow';

const NEW_RECORD_OPTIONS: Array<{
  value: string;
  label: string;
  collection: HrRecordCollection;
  type?: ProcessType | ChangeType;
}> = [
  { value: 'new_hire', label: 'New hire checklist', collection: 'processes', type: 'new_hire' },
  {
    value: 'termination',
    label: 'Termination checklist',
    collection: 'processes',
    type: 'termination',
  },
  {
    value: 'ce_onboarding',
    label: 'CE / Sub / Coaching checklist',
    collection: 'processes',
    type: 'ce_onboarding',
  },
  { value: 'leave', label: 'Leave of absence', collection: 'leaves' },
  { value: 'building', label: 'Building change', collection: 'changes', type: 'building' },
  {
    value: 'position',
    label: 'Position / contract change',
    collection: 'changes',
    type: 'position',
  },
  { value: 'name', label: 'Name change', collection: 'changes', type: 'name' },
  { value: 'address', label: 'Address change', collection: 'changes', type: 'address' },
];

function formValuesFrom(e: EmployeeDoc): EmployeeFormValues {
  return {
    firstName: e.firstName ?? '',
    lastName: e.lastName ?? '',
    email: e.email ?? '',
    employeeId: e.employeeId ? String(e.employeeId) : '',
    kind: e.kind ?? 'regular',
    status: e.status ?? 'active',
    building: e.building ?? '',
    position: e.position ?? '',
    reportsTo: e.reportsTo ?? '',
    startDate: e.startDate ?? '',
    endDate: e.endDate ?? '',
    description: e.description ?? '',
    notes: e.notes ?? '',
  };
}

function recordTitle(r: HrRecordDoc): string {
  if (r.collection === 'leaves') return `Leave of absence${r.reason ? ` — ${r.reason}` : ''}`;
  if (r.collection === 'processes') {
    return PROCESS_SPECS[r.type as ProcessType]?.label ?? 'Checklist';
  }
  return CHANGE_SPECS[r.type as ChangeType]?.label ?? 'Change';
}

function recordMeta(r: HrRecordDoc): string {
  const d = r.details ?? {};
  const date =
    d.effectiveDate || d.startDate || d.termDate || d.anticipatedStart || d.boardDate || '';
  const parts = [r.fiscalYear, prettyDate(date)].filter(Boolean);
  const { done, total } = taskProgress(r);
  if (total > 0) parts.push(`${done}/${total} done`);
  return parts.join(' · ');
}

function recordBadge(r: HrRecordDoc) {
  if (r.collection === 'leaves') {
    const b = LEAVE_STATUS_BADGE[r.status as LeaveStatus] ?? LEAVE_STATUS_BADGE.in_process;
    return <StatusBadge size="sm" state={b.state} label={b.label} />;
  }
  if (r.collection === 'processes') {
    return r.status === 'complete' ? (
      <StatusBadge size="sm" state="completed" />
    ) : (
      <StatusBadge size="sm" state="processing" label="Open" />
    );
  }
  const { done, total } = taskProgress(r);
  return done >= total && total > 0 ? (
    <StatusBadge size="sm" state="completed" />
  ) : (
    <StatusBadge size="sm" state="processing" label="Open" />
  );
}

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useEmployee(id ?? null);
  const processes = useHrRecords('processes', !!id, id);
  const leaves = useHrRecords('leaves', !!id, id);
  const changes = useHrRecords('changes', !!id, id);
  const history = useEmployeeHistory(id ?? null);

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<EmployeeFormValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState('');
  const [creating, setCreating] = useState(false);

  const records = useMemo(
    () => [...(processes.items ?? []), ...(leaves.items ?? []), ...(changes.items ?? [])],
    [processes.items, leaves.items, changes.items],
  );

  if (state.loading) {
    return <p style={{ font: 'var(--type-body-sm)', color: 'rgba(255,255,255,0.6)' }}>Loading…</p>;
  }
  if (state.error || !state.item) {
    return (
      <EmptyState
        icon="users"
        line={state.error ?? 'Employee not found.'}
        action={
          <Button variant="secondary" onClick={() => navigate('/hr/employees')}>
            Back to employees
          </Button>
        }
      />
    );
  }

  const e = state.item;
  const badge = EMPLOYEE_STATUS_BADGE[e.status] ?? EMPLOYEE_STATUS_BADGE.active;

  const startEdit = () => {
    setValues(formValuesFrom(e));
    setEditing(true);
    setError(null);
  };

  const save = async () => {
    if (!values) return;
    setBusy(true);
    setError(null);
    try {
      await updateEmployee({ id: e.id, fields: employeeFormFields(values) });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const assignId = async () => {
    setBusy(true);
    setError(null);
    try {
      await assignEmployeeId({ id: e.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign an EE#.');
    } finally {
      setBusy(false);
    }
  };

  const addRecord = async () => {
    const opt = NEW_RECORD_OPTIONS.find((o) => o.value === newRecord);
    if (!opt) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createHrRecord({
        collection: opt.collection,
        type: opt.type,
        employeeRef: e.id,
      });
      navigate(`/hr/records/${opt.collection}/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the record.');
      setCreating(false);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="Employee"
        title={displayName(e)}
        subtitle={[e.employeeId ? `EE# ${e.employeeId}` : 'No EE# yet', e.position, e.building]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge state={badge.state} label={badge.label} />
            {!e.employeeId && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={assignId}>
                Assign next EE#
              </Button>
            )}
          </div>
        }
      />

      <Card
        eyebrow="Profile"
        heading={editing ? 'Editing' : 'On file'}
        headingRight={
          editing ? undefined : (
            <Button size="sm" variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          )
        }
      >
        {editing && values ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <EmployeeForm
              values={values}
              onChange={(p) => setValues((v) => (v ? { ...v, ...p } : v))}
            />
            {error && (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="submit" icon="save" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <RowList>
            <DetailRow label="EE#" value={e.employeeId ? String(e.employeeId) : '—'} />
            <DetailRow label="Email" value={e.email ?? '—'} />
            <DetailRow
              label="Type"
              value={e.kind === 'ce_sub_coach' ? 'CE / Sub / Coaching' : 'Regular staff'}
            />
            <DetailRow label="Building" value={e.building ?? '—'} />
            <DetailRow label="Position" value={e.position ?? '—'} />
            <DetailRow label="Reports to" value={e.reportsTo ?? '—'} />
            <DetailRow label="Start date" value={prettyDate(e.startDate) || '—'} />
            {e.endDate && <DetailRow label="End date" value={prettyDate(e.endDate)} />}
            {e.description && <DetailRow label="Description" value={e.description} />}
            {e.notes && <DetailRow label="Notes" value={e.notes} />}
            <DetailRow
              label="Source"
              value={e.source === 'import' ? 'Sheet import' : `Added by ${e.updatedBy ?? 'HR'}`}
            />
          </RowList>
        )}
      </Card>

      <Card
        eyebrow="Records"
        heading="Checklists, leaves, and changes"
        headingRight={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Field
              as="select"
              value={newRecord}
              onChange={(ev) => setNewRecord(ev.target.value)}
              options={[
                { value: '', label: 'Add a record…' },
                ...NEW_RECORD_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ]}
            />
            <Button
              size="sm"
              variant="primary"
              icon="plus"
              disabled={!newRecord || creating}
              onClick={addRecord}
            >
              {creating ? 'Creating…' : 'Add'}
            </Button>
          </div>
        }
        pad={16}
      >
        {records.length === 0 ? (
          <EmptyState
            on="card"
            icon="fileText"
            line="Nothing on file yet"
            note="Start a checklist, leave, or change with the picker above."
          />
        ) : (
          <RowList>
            {records.map((r) => (
              <RequestRow
                key={`${r.collection}-${r.id}`}
                title={recordTitle(r)}
                kind={recordMeta(r)}
                status={recordBadge(r)}
                onClick={() => navigate(`/hr/records/${r.collection}/${r.id}`)}
              />
            ))}
          </RowList>
        )}
      </Card>

      <Card eyebrow="History" heading="Every change, logged" collapsible pad={16}>
        {(history.items ?? []).length === 0 ? (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            No history yet.
          </p>
        ) : (
          <RowList>
            {(history.items ?? []).map((h) => (
              <DetailRow
                key={h.id}
                label={h.ts ? h.ts.toDate().toLocaleDateString() : '—'}
                value={
                  h.changes.length === 0
                    ? `${h.action} by ${h.actorEmail}`
                    : `${h.actorEmail}: ${h.changes
                        .map((c) => `${c.field} → ${String(c.to ?? '—')}`)
                        .join(', ')}`
                }
              />
            ))}
          </RowList>
        )}
      </Card>
    </>
  );
}
