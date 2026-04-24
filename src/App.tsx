import { AuthProvider, useAuth } from './lib/auth';
import { AuthenticatedShell } from './screens/AuthenticatedShell';
import { SignInScreen } from './screens/SignInScreen';

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    </main>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <AuthenticatedShell /> : <SignInScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
