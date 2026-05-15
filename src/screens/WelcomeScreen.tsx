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
      await startOffboarding({ type: 'leaving', buildingChecklist: null });
    } catch (err) {
      setError('Could not start your checklist. Please try again or contact IT.');
      console.error(err);
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
      <div
        className="w-full max-w-xl rounded-xl p-6 sm:p-8"
        style={{
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <img src="/orono-offboarding-blue.png" alt="" className="mb-3 h-14 w-14" />

        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1d2a5d' }}>
          Welcome, {user?.displayName?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#334155' }}>
          Let's get you offboarded smoothly. We'll walk you through transferring your Drive files,
          handing off group ownership, setting an out-of-office reply, returning your devices, and
          the rest. Progress saves automatically — come back any time to pick up where you left off.
        </p>

        <button
          onClick={handleStart}
          disabled={pending}
          className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
            boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
          }}
        >
          {pending ? 'Starting…' : 'Start my offboarding checklist'}
        </button>

        {error && (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-center text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {error}
          </p>
        )}

        <div
          className="mt-6 flex items-center justify-between text-xs"
          style={{ color: '#94a3b8' }}
        >
          <span>Signed in as {user?.email}</span>
          <button
            onClick={() => signOut()}
            disabled={pending}
            className="font-semibold disabled:opacity-60"
            style={{ color: '#475569' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
