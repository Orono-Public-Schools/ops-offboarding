import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../lib/auth';
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
    <div className="flex justify-center px-0 py-4 sm:py-8">
      <div
        className="w-full max-w-xl rounded-xl p-6 sm:p-8"
        style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
      >
        <img src="/orono-offboarding-blue.png" alt="" className="mb-3 h-14 w-14" />

        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-ops-navy)' }}
        >
          Welcome, {user?.displayName?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          Let's get you offboarded smoothly. We'll walk you through transferring your Drive files,
          handing off group ownership, setting an out-of-office reply, returning your devices, and
          the rest. Progress saves automatically — come back any time to pick up where you left off.
        </p>

        <button
          onClick={handleStart}
          disabled={pending}
          className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'var(--grad-primary)',
            boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
          }}
        >
          {pending ? 'Starting…' : 'Start my offboarding checklist'}
        </button>

        {error && (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-center text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: 'var(--color-ops-red)' }}
          >
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          Not leaving the district?{' '}
          <Link to="/" className="font-semibold" style={{ color: 'var(--color-ops-blue)' }}>
            Back to the portal home
          </Link>
        </p>
      </div>
    </div>
  );
}
