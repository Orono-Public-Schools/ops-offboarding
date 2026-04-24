import { signOut, useAuth } from '../lib/auth';

export function AuthenticatedShell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-4 sm:px-4 sm:py-6">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">OPS Offboarding</h1>
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
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: '#1d2a5d' }}
          >
            Welcome
          </h2>
          <p className="text-sm" style={{ color: '#334155' }}>
            Signed in as <strong>{user?.displayName ?? user?.email}</strong>. The guided offboarding
            flow will appear here next.
          </p>
        </div>
      </main>
    </div>
  );
}
