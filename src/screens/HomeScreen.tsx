import { Link } from 'react-router';
import { computeProgress } from '../lib/admin';
import { useAuth, useIsHR } from '../lib/auth';
import { useOffboarding } from '../lib/offboarding';

function OffboardingStatus() {
  const { user } = useAuth();
  const state = useOffboarding(user?.uid ?? null);

  if (state.loading || 'error' in state) {
    return null;
  }
  if (!state.exists) {
    return (
      <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--color-ink-faint)' }}>
        Not started
      </p>
    );
  }

  const { done, total, percent } = computeProgress(state.data);
  const allDone = total > 0 && done >= total;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
        {allDone ? 'Completed' : `${done} of ${total} tasks complete`}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#eaecf5' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: 'var(--grad-primary)' }}
        />
      </div>
    </div>
  );
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px dashed rgba(255,255,255,0.15)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-widest text-white uppercase">{title}</h2>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
        >
          Coming soon
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {description}
      </p>
    </div>
  );
}

export function HomeScreen() {
  const { user } = useAuth();
  const isHR = useIsHR();
  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div>
      <h1 className="text-xl font-bold text-white sm:text-2xl">
        Welcome{firstName ? `, ${firstName}` : ''}.
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
        The HR portal for Orono Public Schools staff.
      </p>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5">
        <Link
          to="/offboarding"
          className="block rounded-xl p-4 transition hover:-translate-y-px sm:p-5"
          style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: 'var(--color-ops-navy)' }}
            >
              Offboarding
            </h2>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-ops-blue)' }}>
              Open →
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            Leaving the district? Work through your offboarding checklist — Drive handoff, group
            ownership, out-of-office, device return, and more.
          </p>
          <OffboardingStatus />
        </Link>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <Link
            to="/forms"
            className="block rounded-xl p-4 transition hover:-translate-y-px sm:p-5"
            style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-ops-navy)' }}
              >
                HR Forms
              </h2>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-ops-blue)' }}>
                Open →
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              Submit a change of address and other HR forms, and track their status.
            </p>
          </Link>
          <ComingSoonCard
            title="Onboarding"
            description="Your first-days checklist: policies, payroll setup, and getting your accounts in order."
          />
        </div>

        {isHR && (
          <Link
            to="/hr"
            className="block rounded-xl p-4 transition hover:-translate-y-px sm:p-5"
            style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-ops-navy)' }}
              >
                HR Inbox
              </h2>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-ops-blue)' }}>
                Open →
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              Review and process staff form submissions.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
