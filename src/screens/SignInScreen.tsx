import { useState } from 'react';
import { signInWithGoogle } from '../lib/auth';

export function SignInScreen() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(null);
      } else if (code === 'auth/admin-restricted-operation' || code === 'auth/internal-error') {
        setError('Sign-in is restricted to @orono.k12.mn.us accounts.');
      } else {
        setError('Something went wrong signing in. Please try again.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
      <div
        className="w-full max-w-md rounded-xl p-6 sm:p-8"
        style={{
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <img src="/orono-offboarding-blue.png" alt="" className="mx-auto mb-3 h-16 w-16" />
        <h1 className="text-center text-2xl font-bold tracking-tight" style={{ color: '#1d2a5d' }}>
          OPS Offboarding
        </h1>
        <p className="mt-2 text-center text-sm" style={{ color: '#64748b' }}>
          Sign in with your Orono Public Schools Google account to begin.
        </p>

        <button
          onClick={handleSignIn}
          disabled={pending}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
            boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
          }}
        >
          <GoogleIcon />
          {pending ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-center text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: '#94a3b8' }}>
          Only @orono.k12.mn.us accounts can sign in.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#ffffff"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#ffffff"
        fillOpacity="0.85"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path
        fill="#ffffff"
        fillOpacity="0.7"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#ffffff"
        fillOpacity="0.9"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
    </svg>
  );
}
