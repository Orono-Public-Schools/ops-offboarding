import { Outlet } from 'react-router';
import { computeProgress } from '../lib/admin';
import { useAuth } from '../lib/auth';
import { useOffboarding, type OffboardingDoc } from '../lib/offboarding';
import { WelcomeScreen } from './WelcomeScreen';

function ProgressBar({ doc }: { doc: OffboardingDoc }) {
  const { done, total, percent } = computeProgress(doc);
  const allDone = total > 0 && done >= total;
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <span
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {allDone ? 'All done' : 'Offboarding progress'}
        </span>
        <span className="text-xs font-semibold text-white/85">
          {done} of {total} · {percent}%
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            background: 'var(--grad-progress)',
            boxShadow: '0 0 12px rgba(67,86,169,0.45)',
          }}
        />
      </div>
    </div>
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
      <ProgressBar doc={state.data} />
      <Outlet context={{ doc: state.data }} />
    </>
  );
}
