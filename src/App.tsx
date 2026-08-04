import { Navigate, Outlet, Route, Routes, useParams } from 'react-router';
import { AuthProvider, useAuth, useIsAdmin } from './lib/auth';
import { type OffboardingDoc } from './lib/offboarding';
import { AdminDashboard } from './screens/admin/AdminDashboard';
import { AdminOffboardingDetail } from './screens/admin/AdminOffboardingDetail';
import { AuthedShell } from './screens/AuthenticatedShell';
import { DashboardScreen } from './screens/DashboardScreen';
import { FormFillScreen } from './screens/forms/FormFillScreen';
import { FormsHome } from './screens/forms/FormsHome';
import { SubmissionDetail } from './screens/forms/SubmissionDetail';
import { HomeScreen } from './screens/HomeScreen';
import { HRInbox } from './screens/hr/HRInbox';
import { OffboardingModule } from './screens/OffboardingModule';
import { SignInScreen } from './screens/SignInScreen';
import { TaskRoute } from './screens/tasks/TaskRoute';

export type OutletCtx = { doc: OffboardingDoc };

export function LoadingScreen() {
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

  if (loading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;
  return <AuthedShell />;
}

function AdminGate() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function LegacyTaskRedirect() {
  const { taskKey } = useParams();
  return <Navigate to={`/offboarding/tasks/${taskKey}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/offboarding" element={<OffboardingModule />}>
            <Route index element={<DashboardScreen />} />
            <Route path="tasks/:taskKey" element={<TaskRoute />} />
          </Route>
          <Route path="/forms" element={<FormsHome />} />
          <Route path="/forms/submissions/:id" element={<SubmissionDetail />} />
          <Route path="/forms/:formId" element={<FormFillScreen />} />
          <Route path="/hr" element={<HRInbox />} />
          <Route element={<AdminGate />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/offboardings/:uid" element={<AdminOffboardingDetail />} />
          </Route>
          {/* Pre-portal URLs from old emails/bookmarks */}
          <Route path="/tasks/:taskKey" element={<LegacyTaskRedirect />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
