import { Link, Outlet } from 'react-router';
import { signOut, useAuth, useIsAdmin } from '../lib/auth';
import type { OffboardingDoc } from '../lib/offboarding';

export function AuthedShell({ doc }: { doc: OffboardingDoc }) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-4 sm:px-4 sm:py-6">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <img src="/orono-offboarding.png" alt="" className="h-8 w-8 sm:h-9 sm:w-9" />
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">OPS Year-End</h1>
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
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
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm"
              style={{
                background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
              }}
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4 sm:py-12">
        <Outlet context={{ doc }} />
      </main>
    </div>
  );
}
