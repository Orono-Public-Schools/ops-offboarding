import { Outlet } from 'react-router';
import { computeProgress } from '../lib/admin';
import { useAuth } from '../lib/auth';
import { useOffboarding, type OffboardingDoc } from '../lib/offboarding';
import { WelcomeScreen } from './WelcomeScreen';
import { Card } from '../ds/components/core/Card';
import { ProgressBar } from '../ds/components/core/ProgressBar';

function OffboardingProgress({ doc }: { doc: OffboardingDoc }) {
  const { done, total } = computeProgress(doc);
  const allDone = total > 0 && done >= total;
  return (
    <Card
      eyebrow="Offboarding"
      heading={allDone ? 'Everything is handed back' : 'Your last weeks, in order'}
      pad={16}
    >
      <ProgressBar total={total} done={done} />
    </Card>
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

  if (state.loading) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    );
  }
  if ('error' in state) {
    return (
      <div className="flex justify-center px-4 py-16">
        <div
          className="max-w-md rounded-xl p-6 text-sm"
          style={{ background: '#ffffff', color: 'var(--color-ink)' }}
        >
          Couldn't load your offboarding record. Please refresh, or contact IT if the problem
          continues.
        </div>
      </div>
    );
  }
  if (!state.exists) return <WelcomeScreen />;

  return (
    <>
      <OffboardingProgress doc={state.data} />
      <Outlet context={{ doc: state.data }} />
    </>
  );
}
