import { Outlet, useMatch } from 'react-router';
import type { Timestamp } from 'firebase/firestore';
import { computeProgress } from '../lib/admin';
import { useAuth } from '../lib/auth';
import { BUILDING_CHECKLISTS, useOffboarding, type OffboardingDoc } from '../lib/offboarding';
import { WelcomeScreen } from './WelcomeScreen';
import { Card } from '../ds/components/core/Card';
import { DayHeader } from '../ds/components/navigation/DayHeader';

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

const DAY_MS = 86_400_000;

/** Weekdays after today, up to and including the last day (UTC-dated). */
function workingDaysLeft(lastDay: Timestamp, now: Date): number {
  const end = lastDay.toDate();
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  let cursor = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let count = 0;
  // Safety cap: nobody's last day is more than ten years out.
  let guard = 3660;
  while (cursor < endUtc && guard-- > 0) {
    cursor += DAY_MS;
    const dow = new Date(cursor).getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

function formatLastDay(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function OffboardingDayHeader({ doc }: { doc: OffboardingDoc }) {
  const { done, total } = computeProgress(doc);
  const allDone = total > 0 && done >= total;
  const returning = doc.type === 'returning';
  const now = new Date();

  const buildingLabel = doc.buildingChecklist
    ? (BUILDING_CHECKLISTS.find((b) => b.key === doc.buildingChecklist)?.label ?? null)
    : null;

  const title = returning
    ? allDone
      ? 'Everything is wrapped up'
      : done > 0
        ? `${done} of ${total} wrapped up`
        : 'Your end-of-year wrap-up'
    : allDone
      ? 'Everything is handed back'
      : done > 0
        ? `${done} of ${total} handed back`
        : 'Your last weeks, in order';

  const subtitle = returning
    ? `The end-of-year checklist${buildingLabel ? ` for ${buildingLabel}` : ''} — work at your own pace, progress saves as you go.`
    : 'Work at your own pace — progress saves as you go.';

  let railPct: number | undefined;
  let railLeft: string | undefined;
  let railRight: string | undefined;
  if (doc.lastDay) {
    const startMs = doc.startedAt.toMillis();
    const endMs = doc.lastDay.toMillis();
    const span = endMs - startMs;
    const pct = span > 0 ? ((now.getTime() - startMs) / span) * 100 : 100;
    railPct = Math.max(0, Math.min(100, pct));
    const left = workingDaysLeft(doc.lastDay, now);
    railLeft = `${left} working day${left === 1 ? '' : 's'} left`;
    railRight = `Last day ${formatLastDay(doc.lastDay)}`;
  }

  return (
    <DayHeader
      weekday={WEEKDAYS[now.getDay()]}
      day={now.getDate()}
      month={MONTHS[now.getMonth()]}
      title={title}
      subtitle={subtitle}
      railPct={railPct}
      railLeft={railLeft}
      railRight={railRight}
    />
  );
}

/**
 * Layout for the offboarding module: loads the user's offboarding record,
 * shows the welcome/start screen when none exists, and provides the doc to
 * child routes via outlet context.
 */
export function OffboardingModule() {
  const { user } = useAuth();
  const state = useOffboarding(user?.uid ?? null);
  // Only the index route opens with the module DayHeader — task pages carry
  // their own titles.
  const onIndex = useMatch('/offboarding') !== null;

  if (state.loading) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: 'var(--on-dark-faint)' }}>
        Loading…
      </div>
    );
  }
  if ('error' in state) {
    return (
      <Card eyebrow="Offboarding" heading="We couldn't load your record" pad={16}>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)', margin: 0 }}>
          Please refresh, or contact IT if the problem continues.
        </p>
      </Card>
    );
  }
  if (!state.exists) return <WelcomeScreen />;

  return (
    <>
      {onIndex && <OffboardingDayHeader doc={state.data} />}
      <Outlet context={{ doc: state.data }} />
    </>
  );
}
