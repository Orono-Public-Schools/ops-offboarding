import type { Timestamp } from 'firebase/firestore';

type Props = {
  flow: 'leaving' | 'returning';
  lastDay?: Timestamp | null;
  buildingLabel?: string | null;
};

function formatLastDay(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function AllDoneCard({ flow, lastDay, buildingLabel }: Props) {
  const headline = flow === 'leaving' ? "You're all set." : "You're ready for summer.";

  const body =
    flow === 'leaving' ? (
      <>
        <p>
          Your checklist is complete. Thanks for taking the time to wrap things up cleanly
          {lastDay ? ` before ${formatLastDay(lastDay)}` : ''}.
        </p>
        <p className="mt-2">
          Your account stays active through your last day. After that, sign-in is disabled and any
          forwarding you set up takes over.
        </p>
      </>
    ) : (
      <p>
        {buildingLabel ? `${buildingLabel} checklist complete. ` : 'Checklist complete. '}
        Have a great break — we'll see you in the fall.
      </p>
    );

  return (
    <div
      className="rounded-r-xl p-6 sm:p-8"
      style={{ background: '#ffffff', borderLeft: '4px solid #4356a9' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
          style={{ background: '#4356a9' }}
          aria-hidden
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold sm:text-2xl" style={{ color: '#1d2a5d' }}>
            {headline}
          </h2>
          <div
            className="mt-3 text-sm leading-relaxed font-medium sm:text-base"
            style={{ color: '#475569' }}
          >
            {body}
          </div>
          <p className="mt-4 text-sm font-medium" style={{ color: '#475569' }}>
            If something changes or you have follow-up questions, email{' '}
            <a
              href="mailto:support@orono.k12.mn.us"
              className="font-semibold underline underline-offset-2"
              style={{ color: '#4356a9' }}
            >
              support@orono.k12.mn.us
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
