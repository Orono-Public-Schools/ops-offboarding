import type { Timestamp } from 'firebase/firestore';
import { Card } from '../ds/components/core/Card';
import { Icon } from '../ds/components/core/Icon';
import { QuietLink } from '../ds/components/core/QuietLink';

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
        <p style={{ margin: 0 }}>
          Your checklist is complete. Thanks for taking the time to wrap things up cleanly
          {lastDay ? ` before ${formatLastDay(lastDay)}` : ''}.
        </p>
        <p style={{ margin: '8px 0 0' }}>
          Your account stays active through your last day. After that, sign-in is disabled and any
          forwarding you set up takes over.
        </p>
      </>
    ) : (
      <p style={{ margin: 0 }}>
        {buildingLabel ? `${buildingLabel} checklist complete. ` : 'Checklist complete. '}
        Have a great break — we'll see you in the fall.
      </p>
    );

  return (
    <Card
      eyebrow="All done"
      heading={headline}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          {flow === 'leaving' && (
            <QuietLink
              icon="fileText"
              href="/docs/termination-details.pdf"
              target="_blank"
              rel="noreferrer"
            >
              What happens next — insurance, pension, and access after your last day
            </QuietLink>
          )}
          <QuietLink icon="mail" href="mailto:support@orono.k12.mn.us">
            If something changes or you have follow-up questions, email us
          </QuietLink>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--tint)', color: 'var(--primary)' }}
        >
          <Icon name="check" size={18} />
        </span>
        <div
          className="min-w-0 flex-1"
          style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}
        >
          {body}
        </div>
      </div>
    </Card>
  );
}
