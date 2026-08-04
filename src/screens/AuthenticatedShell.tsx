import { Outlet, useLocation, useNavigate } from 'react-router';
import { signOut, useAuth, useIsAdmin, useIsHR } from '../lib/auth';
import { AppShell } from '../ds/components/navigation/AppShell';
import { AppBar } from '../ds/components/navigation/AppBar';
import { TabBar, type TabEntry } from '../ds/components/navigation/TabBar';

const TAB_ROUTES: Record<string, string> = {
  home: '/',
  forms: '/forms',
  offboarding: '/offboarding',
  inbox: '/hr',
  admin: '/admin',
};

function activeTab(pathname: string): string {
  if (pathname.startsWith('/forms')) return 'forms';
  if (pathname.startsWith('/offboarding') || pathname.startsWith('/tasks')) return 'offboarding';
  if (pathname.startsWith('/hr')) return 'inbox';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
}

export function AuthedShell() {
  const { user } = useAuth();
  const isHR = useIsHR();
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs: TabEntry[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'forms', label: 'Forms', icon: 'fileText' },
    { id: 'offboarding', label: 'Offboarding', icon: 'logOut' },
  ];
  if (isHR) tabs.push({ id: 'inbox', label: 'HR Inbox', icon: 'inbox' });
  if (isAdmin) tabs.push({ id: 'admin', label: 'Admin', icon: 'users' });

  return (
    <AppShell>
      <AppBar
        person={{ name: user?.displayName ?? 'Staff member', role: user?.email ?? '' }}
        onSignOut={() => signOut()}
      />
      <TabBar
        tabs={tabs}
        active={activeTab(location.pathname)}
        onSelect={(id) => navigate(TAB_ROUTES[id] ?? '/')}
      />
      <Outlet />
    </AppShell>
  );
}
