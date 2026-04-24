import { useState } from 'react';
import { signOut, useAuth } from '../lib/auth';
import { startOffboarding } from '../lib/functions';

export function WelcomeScreen() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setPending(true);
    try {
      await startOffboarding();
    } catch (err) {
      setError('Could not start your offboarding. Please try again or contact IT.');
      console.error(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
      <div
        className="w-full max-w-lg rounded-xl p-6 sm:p-8"
        style={{
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1d2a5d' }}>
          Starting your offboarding
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#334155' }}>
          Hi {user?.displayName?.split(' ')[0] ?? 'there'} — this tool walks you through
          transferring your Drive files, Google Groups, calendars, and out-of-office responder
          before your last day. Your IT team sees your progress on a dashboard so they know what
          still needs to happen.
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#334155' }}>
          Only continue if you're leaving Orono Public Schools. Nothing happens until you click
          below — no files move, no groups change, nothing is sent.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleStart}
            disabled={pending}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
            }}
          >
            {pending ? 'Starting…' : "Yes, I'm leaving — start my offboarding"}
          </button>
          <button
            onClick={() => signOut()}
            disabled={pending}
            className="rounded-xl border px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
            style={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Not me — sign out
          </button>
        </div>

        {error && (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-center text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {error}
          </p>
        )}

        <p className="mt-6 text-xs" style={{ color: '#94a3b8' }}>
          Signed in as {user?.email}.
        </p>
      </div>
    </main>
  );
}
