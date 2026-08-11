import { Navigate, Outlet, Route, Routes, useParams } from 'react-router';
import { AuthProvider, useAuth, useIsTech } from './lib/auth';
import { type OffboardingDoc } from './lib/offboarding';
import { AdminDashboard } from './screens/admin/AdminDashboard';
import { AdminOffboardingDetail } from './screens/admin/AdminOffboardingDetail';
import { AuthedShell } from './screens/AuthenticatedShell';
import { DashboardScreen } from './screens/DashboardScreen';
import { FormFillScreen } from './screens/forms/FormFillScreen';
import { FormsHome } from './screens/forms/FormsHome';
import { SubmissionDetail } from './screens/forms/SubmissionDetail';
import { AccountScreen } from './screens/AccountScreen';
import { HomeScreen } from './screens/HomeScreen';
import { EmployeeDetail } from './screens/hr/EmployeeDetail';
import { EmployeeNew } from './screens/hr/EmployeeNew';
import { EmployeesList } from './screens/hr/EmployeesList';
import { HRInbox } from './screens/hr/HRInbox';
import { HRModule } from './screens/hr/HRModule';
import { HrRecordDetail } from './screens/hr/HrRecordDetail';
import { HrRecordList } from './screens/hr/HrRecordList';
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
  // IT support shares the admin area; the dashboard itself trims what
  // they see (no roles, no settings, no forms/onboarding tabs).
  const isTech = useIsTech();
  if (!isTech) return <Navigate to="/" replace />;
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
          <Route path="/account" element={<AccountScreen />} />
          <Route path="/offboarding" element={<OffboardingModule />}>
            <Route index element={<DashboardScreen />} />
            <Route path="tasks/:taskKey" element={<TaskRoute />} />
          </Route>
          <Route path="/forms" element={<FormsHome />} />
          <Route path="/forms/submissions/:id" element={<SubmissionDetail />} />
          <Route path="/forms/:formId" element={<FormFillScreen />} />
          <Route path="/hr" element={<HRModule />}>
            <Route index element={<HRInbox />} />
            <Route path="employees" element={<EmployeesList kind="new_hire" />} />
            <Route path="employees/new" element={<EmployeeNew />} />
            <Route path="employees/:id" element={<EmployeeDetail />} />
            <Route path="ce" element={<EmployeesList kind="ce_onboarding" />} />
            <Route path="onboarding" element={<Navigate to="/hr/employees" replace />} />
            <Route path="offboarding" element={<HrRecordList kind="offboarding" />} />
            <Route path="leaves" element={<HrRecordList kind="leaves" />} />
            <Route path="changes" element={<HrRecordList kind="changes" />} />
            <Route path="records/:coll/:id" element={<HrRecordDetail />} />
          </Route>
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
