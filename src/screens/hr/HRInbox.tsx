import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useIsHR } from '../../lib/auth';
import { useAllSubmissions, type SubmissionStatus } from '../../lib/forms';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { Button } from '../../ds/components/core/Button';
import { DayHeader } from '../../ds/components/navigation/DayHeader';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { InboxRow } from '../../ds/components/records/InboxRow';
import { PersonPlate } from '../../ds/components/records/PersonPlate';
import { RowList } from '../../ds/components/forms/RowList';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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
  const isHR = useIsHR();
  const state = useAllSubmissions(isHR);
  const [filter, setFilter] = useState<FilterKey>('open');

  if (!isHR) return <Navigate to="/" replace />;

  const all = state.submissions ?? [];
  const isOpen = (s: { status: SubmissionStatus }) =>
    s.status === 'submitted' || s.status === 'processing';
  const openCount = all.filter(isOpen).length;
  const filtered = all.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'open') return isOpen(s);
    return s.status === filter;
  });

  const now = new Date();
  const monthPct = Math.round((now.getDate() / 31) * 100);

  return (
    <>
      <DayHeader
        weekday={WEEKDAYS[now.getDay()]}
        day={now.getDate()}
        month={MONTHS[now.getMonth()]}
        title={
          openCount === 0
            ? 'The inbox is clear'
            : openCount === 1
              ? 'One request is waiting on you'
              : `${openCount} requests are waiting on you`
        }
        subtitle="Open one to see the details and make the call."
        railPct={monthPct}
        railLeft={`${MONTHS[now.getMonth()]} queue`}
        railRight={`${all.length} filed all-time`}
      />

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
              filter === 'open'
                ? 'New submissions land here the moment staff file them.'
                : undefined
            }
          />
        ) : (
          <RowList>
            {filtered.map((s) => (
              <InboxRow
                key={s.id}
                person={<PersonPlate size="sm" name={s.submitterName} role={s.submitterEmail} />}
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
    </>
  );
}
