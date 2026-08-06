import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { FORM_DEFINITIONS, useMySubmissions } from '../../lib/forms';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { DayHeader } from '../../ds/components/navigation/DayHeader';
import { ModuleCard } from '../../ds/components/records/ModuleCard';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { RowList } from '../../ds/components/forms/RowList';
import { InboxRow } from '../../ds/components/records/InboxRow';

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

function ago(ms: number | undefined): string {
  if (!ms) return '';
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function FormsHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const subs = useMySubmissions(user?.uid ?? null);
  const forms = Object.values(FORM_DEFINITIONS);
  const mine = subs.submissions ?? [];

  const open = mine.filter((s) => s.status === 'submitted' || s.status === 'processing');
  const now = new Date();
  const headline =
    open.length === 1
      ? 'One of your requests is moving'
      : open.length > 1
        ? `${open.length} of your requests are moving`
        : mine.length > 0
          ? 'Everything you filed is settled'
          : 'Nothing on file yet';

  return (
    <>
      <DayHeader
        weekday={WEEKDAYS[now.getDay()]}
        day={now.getDate()}
        month={MONTHS[now.getMonth()]}
        title={headline}
        subtitle="Forms go to HR with a paper trail — drafts save as you type, and you can watch every request move."
      />

      <Card eyebrow="Forms" heading="What you can file today" pad={16}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 16,
          }}
        >
          {forms.map((f) => (
            <ModuleCard
              key={f.id}
              icon={f.id === 'leaveOfAbsence' ? 'calendar' : 'home'}
              title={f.title}
              description={f.description}
              meta={f.id === 'leaveOfAbsence' ? '5 min' : '4 min'}
              onClick={() => navigate(`/forms/${f.id}`)}
            />
          ))}
          <ModuleCard
            icon="fileText"
            title="Lane change"
            description="Move a lane once your transcript is on file. Coming soon."
            meta="Soon"
            disabled
          />
        </div>
      </Card>

      <Card eyebrow="Your submissions" heading="What you've sent us" pad={16}>
        {subs.loading ? (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Loading…
          </p>
        ) : mine.length === 0 ? (
          <EmptyState
            on="card"
            icon="fileText"
            line="Nothing filed yet"
            note="When you send a form, you can follow it here."
          />
        ) : (
          <RowList>
            {mine.map((s) => (
              <InboxRow
                key={s.id}
                request={s.formTitle}
                kind={`${s.id} · ${ago(s.createdAt?.toMillis())}`}
                status={<StatusBadge state={s.status} />}
                onClick={() => navigate(`/forms/submissions/${s.id}`)}
              />
            ))}
          </RowList>
        )}
      </Card>
    </>
  );
}
