import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './lib/auth';
import { useOffboarding, type OffboardingDoc } from './lib/offboarding';
import { AuthedShell } from './screens/AuthenticatedShell';
import { DashboardScreen } from './screens/DashboardScreen';
import { SignInScreen } from './screens/SignInScreen';
import { TaskRoute } from './screens/tasks/TaskRoute';
import { WelcomeScreen } from './screens/WelcomeScreen';

export type OutletCtx = { doc: OffboardingDoc };

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    </main>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const state = useOffboarding(user?.uid ?? null);

  if (loading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;
  if (state.loading) return <LoadingScreen />;
  if ('error' in state) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div
          className="max-w-md rounded-xl p-6 text-sm"
          style={{ background: '#ffffff', color: '#334155' }}
        >
          Couldn't load your offboarding record. Please refresh, or contact IT if the problem
          continues.
        </div>
      </main>
    );
  }
  if (!state.exists) return <WelcomeScreen />;

  return <AuthedShell doc={state.data} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/tasks/:taskKey" element={<TaskRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
