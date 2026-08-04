import { useState } from 'react';
import { signInWithGoogle } from '../lib/auth';

export function SignInScreen() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [hot, setHot] = useState(false);

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
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <img src="/OronoIcon.png" alt="" style={{ width: 72, height: 72, margin: '0 auto 18px' }} />
        <h1
          style={{
            margin: 0,
            font: 'var(--type-page-display)',
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--on-dark)',
          }}
        >
          Orono<span style={{ color: '#e98b8b' }}>HR</span>
        </h1>
        <p
          style={{
            margin: '10px 0 0',
            font: 'var(--type-page-sub)',
            color: 'var(--on-dark-muted)',
          }}
        >
          Forms, checklists, and where your requests sit.
        </p>

        <button
          onClick={handleSignIn}
          disabled={pending}
          onMouseEnter={() => setHot(true)}
          onMouseLeave={() => setHot(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            maxWidth: 280,
            margin: '28px auto 0',
            padding: '13px 16px',
            borderRadius: 'var(--radius-button)',
            border: 'none',
            background: 'var(--surface-card)',
            color: 'var(--dark)',
            font: 'var(--type-button)',
            boxShadow:
              hot && !pending ? '0 4px 18px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.25)',
            transform: hot && !pending ? 'translateY(-1px)' : 'none',
            opacity: pending ? 0.6 : 1,
            cursor: pending ? 'default' : 'pointer',
            transition: 'var(--transition-control)',
          }}
        >
          <img src="/google-g.png" alt="" style={{ width: 18, height: 18 }} />
          {pending ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && (
          <p
            style={{
              margin: '16px auto 0',
              maxWidth: 300,
              font: 'var(--type-caption)',
              color: '#fecaca',
              background: 'rgba(173, 33, 34, 0.25)',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            {error}
          </p>
        )}

        <p
          style={{ margin: '24px 0 0', font: 'var(--type-caption)', color: 'var(--on-dark-faint)' }}
        >
          Orono Public Schools · only @orono.k12.mn.us accounts can sign in.
        </p>
      </div>
    </main>
  );
}
