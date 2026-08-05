import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useHrCtx } from './HRModule';
import {
  prettyDate,
  taskProgress,
  CHANGE_SPECS,
  LEAVE_STATUS_BADGE,
  PROCESS_SPECS,
  type ChangeType,
  type HrRecordDoc,
  type LeaveStatus,
  type ProcessType,
} from '../../lib/hr';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { RowList } from '../../ds/components/forms/RowList';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { InboxRow } from '../../ds/components/records/InboxRow';
import { PersonPlate } from '../../ds/components/records/PersonPlate';

export type RecordListKind = 'onboarding' | 'offboarding' | 'leaves' | 'changes';

type Chip = { key: string; label: string; test: (r: HrRecordDoc) => boolean };

const CHIPS: Record<RecordListKind, Chip[]> = {
  onboarding: [
    {
      key: 'open',
      label: 'Open',
      test: (r) => (r.type === 'new_hire' || r.type === 'ce_onboarding') && r.status === 'open',
    },
    { key: 'new_hire', label: 'New hires', test: (r) => r.type === 'new_hire' },
    { key: 'ce', label: 'CE / Sub / Coaching', test: (r) => r.type === 'ce_onboarding' },
    {
      key: 'all',
      label: 'All',
      test: (r) => r.type === 'new_hire' || r.type === 'ce_onboarding',
    },
  ],
  offboarding: [
    { key: 'open', label: 'Open', test: (r) => r.type === 'termination' && r.status === 'open' },
    { key: 'all', label: 'All', test: (r) => r.type === 'termination' },
  ],
  leaves: [
    { key: 'current', label: 'Current', test: (r) => r.status !== 'ended' },
    { key: 'ended', label: 'Ended', test: (r) => r.status === 'ended' },
    { key: 'all', label: 'All', test: () => true },
  ],
  changes: [
    { key: 'all', label: 'All', test: () => true },
    { key: 'building', label: 'Building', test: (r) => r.type === 'building' },
    { key: 'position', label: 'Position', test: (r) => r.type === 'position' },
    { key: 'name', label: 'Name', test: (r) => r.type === 'name' },
    { key: 'address', label: 'Address', test: (r) => r.type === 'address' },
  ],
};

const HEADINGS: Record<RecordListKind, { eyebrow: string; heading: string }> = {
  onboarding: { eyebrow: 'Onboarding', heading: 'New hires and CE / Sub / Coaching' },
  offboarding: { eyebrow: 'Offboarding', heading: 'Terminations, the HR side' },
  leaves: { eyebrow: 'Leaves', heading: 'Leaves of absence' },
  changes: { eyebrow: 'Changes', heading: 'Building, position, name, and address' },
};

function rowTitle(r: HrRecordDoc, kind: RecordListKind): string {
  if (kind === 'leaves') return r.reason || 'Leave of absence';
  if (kind === 'changes') return CHANGE_SPECS[r.type as ChangeType]?.label ?? 'Change';
  return PROCESS_SPECS[r.type as ProcessType]?.label ?? 'Checklist';
}

function rowMeta(r: HrRecordDoc): string {
  const d = r.details ?? {};
  const date =
    d.effectiveDate || d.startDate || d.termDate || d.anticipatedStart || d.boardDate || '';
  const parts = [r.fiscalYear, prettyDate(date)].filter(Boolean);
  const { done, total } = taskProgress(r);
  if (total > 0) parts.push(`${done}/${total} done`);
  return parts.join(' · ');
}

function rowBadge(r: HrRecordDoc, kind: RecordListKind) {
  if (kind === 'leaves') {
    const b = LEAVE_STATUS_BADGE[r.status as LeaveStatus] ?? LEAVE_STATUS_BADGE.in_process;
    return <StatusBadge size="sm" state={b.state} label={b.label} />;
  }
  const { done, total } = taskProgress(r);
  const complete = kind === 'changes' ? total > 0 && done >= total : r.status === 'complete';
  return complete ? (
    <StatusBadge size="sm" state="completed" />
  ) : (
    <StatusBadge size="sm" state="processing" label="Open" />
  );
}

export function HrRecordList({ kind }: { kind: RecordListKind }) {
  const navigate = useNavigate();
  const ctx = useHrCtx();
  const chips = CHIPS[kind];
  const [chip, setChip] = useState(chips[0].key);

  const state = kind === 'leaves' ? ctx.leaves : kind === 'changes' ? ctx.changes : ctx.processes;
  const active = chips.find((c) => c.key === chip) ?? chips[0];
  const items = (state.items ?? []).filter(active.test);

  return (
    <Card
      eyebrow={HEADINGS[kind].eyebrow}
      heading={HEADINGS[kind].heading}
      headingRight={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <Button
              key={c.key}
              size="sm"
              variant={chip === c.key ? 'primary' : 'ghost'}
              onClick={() => setChip(c.key)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      }
      pad={16}
    >
      {state.loading ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Loading…
        </p>
      ) : state.error ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
          {state.error}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          on="card"
          icon="fileText"
          line="Nothing here"
          note="Records are added from an employee's page, or by the sheet import."
        />
      ) : (
        <RowList>
          {items.map((r) => (
            <InboxRow
              key={r.id}
              person={
                <PersonPlate
                  size="sm"
                  name={r.employeeName}
                  role={[r.position, r.building].filter(Boolean).join(' · ')}
                />
              }
              request={rowTitle(r, kind)}
              kind={rowMeta(r)}
              status={rowBadge(r, kind)}
              onClick={() => navigate(`/hr/records/${r.collection}/${r.id}`)}
            />
          ))}
        </RowList>
      )}
    </Card>
  );
}
