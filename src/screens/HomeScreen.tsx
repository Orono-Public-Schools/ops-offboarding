import { useNavigate } from 'react-router';
import { computeProgress } from '../lib/admin';
import { useAuth, useIsHR, useIsTech } from '../lib/auth';
import { useOffboarding } from '../lib/offboarding';
import { displayId, useMySubmissions, type Submission } from '../lib/forms';
import { Card } from '../ds/components/core/Card';
import { QuietLink } from '../ds/components/core/QuietLink';
import { StatusBadge } from '../ds/components/core/StatusBadge';
import { DayHeader } from '../ds/components/navigation/DayHeader';
import { ModuleCard } from '../ds/components/records/ModuleCard';
import { RequestRow } from '../ds/components/records/RequestRow';
import { StatusTrack } from '../ds/components/records/StatusTrack';
import { RowList } from '../ds/components/forms/RowList';

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

/** School-year rail: Sep 1 – Jun 10. Returns null over the summer. */
function schoolYearRail(now: Date): { pct: number; left: string; right: string } | null {
  const y = now.getFullYear();
  const start = now.getMonth() >= 8 ? new Date(y, 8, 1) : new Date(y - 1, 8, 1);
  const end = now.getMonth() >= 8 ? new Date(y + 1, 5, 10) : new Date(y, 5, 10);
  if (now > end || now < start) return null;
  const day = Math.ceil((now.getTime() - start.getTime()) / 86_400_000);
  const total = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  return {
    pct: Math.round((day / total) * 100),
    left: `Day ${day} of the school year`,
    right: `${total - day} days to June 10`,
  };
}

const STAGES = ['Filed', 'Received', 'Processing', 'Complete'];
const STAGE_FOR_STATUS: Record<string, number> = { submitted: 1, processing: 2, completed: 3 };

function filedAgo(s: Submission): string {
  const ms = s.createdAt ? Date.now() - s.createdAt.toMillis() : 0;
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return 'filed today';
  if (days === 1) return 'filed yesterday';
  return `filed ${days} days ago`;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHR = useIsHR();
  const isAdmin = useIsTech();
  const offb = useOffboarding(user?.uid ?? null);
  const subs = useMySubmissions(user?.uid ?? null);

  const now = new Date();
  const rail = schoolYearRail(now);

  const open = (subs.submissions ?? []).filter(
    (s) => s.status === 'submitted' || s.status === 'processing',
  );
  const offbStarted = !offb.loading && !('error' in offb) && offb.exists;
  const offbProgress = offbStarted ? computeProgress(offb.data) : null;
  // A record with zero tasks done is likely exploratory — don't let it
  // dominate the portal until the person actually works the checklist.
  const offbUnderway = offbProgress !== null && offbProgress.done > 0;

  const title =
    open.length === 1
      ? 'One of your requests is moving'
      : open.length > 1
        ? `${['Two', 'Three', 'Four', 'Five'][open.length - 2] ?? open.length} of your requests are moving`
        : offbUnderway && offbProgress.done < offbProgress.total
          ? `Your offboarding is ${offbProgress.done} of ${offbProgress.total} done`
          : 'Your record is quiet today';

  return (
    <>
      <DayHeader
        weekday={WEEKDAYS[now.getDay()]}
        day={now.getDate()}
        month={MONTHS[now.getMonth()]}
        title={title}
        subtitle="Nothing here needs you until you start something."
        railPct={rail?.pct}
        railLeft={rail?.left}
        railRight={rail?.right}
      />

      {open.length > 0 && (
        <Card
          eyebrow="Requests"
          heading={open.length === 1 ? open[0].formTitle : 'Where your requests sit'}
          headingRight={
            <StatusBadge state="submitted" label={`${open.length} open`} icon={false} />
          }
          pad={16}
        >
          <RowList>
            {open.map((s) => (
              <RequestRow
                key={s.id}
                title={s.formTitle}
                kind={`${displayId(s.id)} · ${filedAgo(s)}`}
                status={<StatusBadge variant="dot" state={s.status} />}
                track={<StatusTrack stages={STAGES} current={STAGE_FOR_STATUS[s.status] ?? 1} />}
                onClick={() => navigate(`/forms/submissions/${s.id}`)}
              />
            ))}
          </RowList>
        </Card>
      )}

      <Card
        eyebrow="Modules"
        heading="What you can do here"
        footer={
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}
          >
            <QuietLink icon="mail" href="mailto:hr@orono.k12.mn.us">
              Ask HR a question
            </QuietLink>
            <QuietLink
              icon="fileText"
              href="/docs/onboarding-details.pdf"
              target="_blank"
              rel="noreferrer"
            >
              New to Orono? What you need to know
            </QuietLink>
          </div>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 16,
          }}
        >
          <ModuleCard
            icon="fileText"
            title="HR forms"
            description="Change of address today; leave, lane changes, and more on the way."
            meta="4 min"
            onClick={() => navigate('/forms')}
          />
          <ModuleCard
            icon="users"
            title="Onboarding"
            description="A first-days checklist for new hires. Not open yet."
            meta="Soon"
            disabled
          />
          {offbUnderway ? (
            <ModuleCard
              icon="logOut"
              title="Your offboarding"
              description="Hand back what needs handing back, in the order it comes due."
              total={offbProgress.total}
              done={offbProgress.done}
              onClick={() => navigate('/offboarding')}
            />
          ) : (
            <ModuleCard
              icon="logOut"
              title="Offboarding"
              description="Leaving the district? We walk every handoff with you."
              onClick={() => navigate('/offboarding')}
            />
          )}
          {isHR && (
            <ModuleCard
              icon="inbox"
              title="HR inbox"
              description="Submissions from staff, waiting on a decision."
              onClick={() => navigate('/hr')}
            />
          )}
          {isAdmin && (
            <ModuleCard
              icon="key"
              title="IT admin"
              description="Offboarding dashboard, staff sync, roles, and settings."
              onClick={() => navigate('/admin')}
            />
          )}
        </div>
      </Card>
    </>
  );
}
