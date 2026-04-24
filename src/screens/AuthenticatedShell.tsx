import { signOut, useAuth } from '../lib/auth';
import { useOffboarding } from '../lib/offboarding';
import { DashboardScreen } from './DashboardScreen';
import { WelcomeScreen } from './WelcomeScreen';

export function AuthenticatedShell() {
  const { user } = useAuth();
  const state = useOffboarding(user?.uid ?? null);

  if (state.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Loading…
        </div>
      </main>
    );
  }

  if ('error' in state) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div
          className="max-w-md rounded-xl p-6 text-sm"
          style={{ background: '#ffffff', color: '#334155' }}
        >
          Couldn't load your offboarding record. Please refresh, or contact IT if the problem
          continues.
          <button
            onClick={() => signOut()}
            className="mt-4 block w-full rounded-xl border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (!state.exists) {
    return <WelcomeScreen />;
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/orono-offboarding.png" alt="" className="h-8 w-8 sm:h-9 sm:w-9" />
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            OPS Offboarding
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {user?.email}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4 sm:py-12">
        <DashboardScreen doc={state.data} />
      </main>
    </div>
  );
}
