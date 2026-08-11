import { useState } from 'react';
import { useNavigate } from 'react-router';
import { type SubmissionStatus } from '../../lib/forms';
import { useHrCtx } from './HRModule';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { Button } from '../../ds/components/core/Button';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { InboxRow } from '../../ds/components/records/InboxRow';
import { PersonPlate } from '../../ds/components/records/PersonPlate';
import { RowList } from '../../ds/components/forms/RowList';

type FilterKey = 'open' | 'all' | 'completed' | 'denied';
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'denied', label: 'Denied' },
];

function ago(ms: number | undefined): string {
  if (!ms) return '';
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

export function HRInbox() {
  const navigate = useNavigate();
  const state = useHrCtx().submissions;
  const [filter, setFilter] = useState<FilterKey>('open');

  const all = state.submissions ?? [];
  const isOpen = (s: { status: SubmissionStatus }) =>
    s.status === 'submitted' || s.status === 'processing';
  const filtered = all.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'open') return isOpen(s);
    return s.status === filter;
  });

  return (
    <Card
      eyebrow="Inbox"
      heading={filter === 'open' ? 'Waiting on a decision' : `Showing ${filter}`}
      headingRight={
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'primary' : 'ghost'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
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
      ) : filtered.length === 0 ? (
        <EmptyState
          on="card"
          icon="inbox"
          line={filter === 'open' ? 'Nothing needs you' : 'Nothing here'}
          note={
            filter === 'open' ? 'New submissions land here the moment staff file them.' : undefined
          }
        />
      ) : (
        <RowList>
          {filtered.map((s) => (
            <InboxRow
              key={s.id}
              person={
                <PersonPlate
                  size="sm"
                  photoSlot={false}
                  name={s.submitterName}
                  role={s.submitterEmail}
                />
              }
              request={s.formTitle}
              kind={`${s.id} · ${s.summary}`}
              status={<StatusBadge state={s.status} />}
              time={ago(s.createdAt?.toMillis())}
              unread={s.status === 'submitted'}
              onClick={() => navigate(`/forms/submissions/${s.id}`)}
            />
          ))}
        </RowList>
      )}
    </Card>
  );
}
