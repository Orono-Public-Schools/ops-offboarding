import { Navigate, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { useIsHR } from '../../lib/auth';
import { useAllSubmissions } from '../../lib/forms';
import {
  useEmployees,
  useHrRecords,
  type EmployeeDoc,
  type HrRecordDoc,
  type ListState,
} from '../../lib/hr';
import { DayHeader } from '../../ds/components/navigation/DayHeader';
import { TabBar, type TabEntry } from '../../ds/components/navigation/TabBar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type HrOutletCtx = {
  employees: ListState<EmployeeDoc>;
  processes: ListState<HrRecordDoc>;
  leaves: ListState<HrRecordDoc>;
  changes: ListState<HrRecordDoc>;
  submissions: ReturnType<typeof useAllSubmissions>;
};

export function useHrCtx(): HrOutletCtx {
  return useOutletContext<HrOutletCtx>();
}

type HrTab = 'inbox' | 'employees' | 'onboarding' | 'offboarding' | 'leaves' | 'changes';

const TAB_PATHS: Record<HrTab, string> = {
  inbox: '/hr',
  employees: '/hr/employees',
  onboarding: '/hr/onboarding',
  offboarding: '/hr/offboarding',
  leaves: '/hr/leaves',
  changes: '/hr/changes',
};

function activeTab(pathname: string): HrTab {
  if (pathname.startsWith('/hr/employees')) return 'employees';
  if (pathname.startsWith('/hr/onboarding')) return 'onboarding';
  if (pathname.startsWith('/hr/offboarding')) return 'offboarding';
  if (pathname.startsWith('/hr/leaves')) return 'leaves';
  if (pathname.startsWith('/hr/changes')) return 'changes';
  return 'inbox';
}

/** DayHeader shows on the six tab roots; drill-ins keep their PageTitle. */
function isTabRoot(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, '');
  return Object.values(TAB_PATHS).includes(trimmed || '/hr');
}

function headline(tab: HrTab, ctx: HrOutletCtx): { title: string; subtitle: string } {
  const n = {
    employees: ctx.employees.items?.length ?? 0,
    processes: ctx.processes.items ?? [],
    leaves: ctx.leaves.items?.length ?? 0,
    changes: ctx.changes.items?.length ?? 0,
  };
  switch (tab) {
    case 'employees':
      return n.employees === 0
        ? {
            title: 'The employee database is empty',
            subtitle: 'Run the sheet import below, or add someone by hand.',
          }
        : {
            title: `${n.employees} people on file`,
            subtitle: 'The registry HR used to keep in the master sheet.',
          };
    case 'onboarding': {
      const open = n.processes.filter(
        (p) => (p.type === 'new_hire' || p.type === 'ce_onboarding') && p.status === 'open',
      ).length;
      return {
        title:
          open === 0
            ? 'No onboarding checklists are open'
            : open === 1
              ? 'One onboarding checklist is open'
              : `${open} onboarding checklists are open`,
        subtitle: 'New hires and CE / sub / coaching, one checklist each.',
      };
    }
    case 'offboarding': {
      const open = n.processes.filter(
        (p) => p.type === 'termination' && p.status === 'open',
      ).length;
      return {
        title:
          open === 0
            ? 'No terminations are in motion'
            : open === 1
              ? 'One termination is in motion'
              : `${open} terminations are in motion`,
        subtitle: 'The HR side: board action, notices, access, and collections.',
      };
    }
    case 'leaves':
      return {
        title:
          n.leaves === 0
            ? 'No leaves on file'
            : n.leaves === 1
              ? 'One leave on file'
              : `${n.leaves} leaves on file`,
        subtitle: 'Leave records track dates and status — never medical detail.',
      };
    case 'changes':
      return {
        title:
          n.changes === 0
            ? 'No changes recorded'
            : n.changes === 1
              ? 'One change recorded'
              : `${n.changes} changes recorded`,
        subtitle: 'Building, position, name, and address changes.',
      };
    default: {
      const all = ctx.submissions.submissions ?? [];
      const open = all.filter((s) => s.status === 'submitted' || s.status === 'processing').length;
      return {
        title:
          open === 0
            ? 'The inbox is clear'
            : open === 1
              ? 'One request is waiting on you'
              : `${open} requests are waiting on you`,
        subtitle: 'Open one to see the details and make the call.',
      };
    }
  }
}

export function HRModule() {
  const isHR = useIsHR();
  const location = useLocation();
  const navigate = useNavigate();

  const employees = useEmployees(isHR);
  const processes = useHrRecords('processes', isHR);
  const leaves = useHrRecords('leaves', isHR);
  const changes = useHrRecords('changes', isHR);
  const submissions = useAllSubmissions(isHR);

  if (!isHR) return <Navigate to="/" replace />;

  const ctx: HrOutletCtx = { employees, processes, leaves, changes, submissions };
  const tab = activeTab(location.pathname);
  const openInbox = (submissions.submissions ?? []).filter(
    (s) => s.status === 'submitted' || s.status === 'processing',
  ).length;

  const tabs: TabEntry[] = [
    { id: 'inbox', label: 'Inbox', icon: 'inbox', count: openInbox || undefined },
    { id: 'employees', label: 'Employees', icon: 'users' },
    { id: 'onboarding', label: 'Onboarding', icon: 'plus' },
    { id: 'offboarding', label: 'Offboarding', icon: 'logOut' },
    { id: 'leaves', label: 'Leaves', icon: 'clock' },
    { id: 'changes', label: 'Changes', icon: 'fileText' },
  ];

  const now = new Date();
  const monthPct = Math.round((now.getDate() / 31) * 100);
  const head = headline(tab, ctx);

  return (
    <>
      {isTabRoot(location.pathname) && (
        <DayHeader
          weekday={WEEKDAYS[now.getDay()]}
          day={now.getDate()}
          month={MONTHS[now.getMonth()]}
          title={head.title}
          subtitle={head.subtitle}
          railPct={monthPct}
          railLeft={`${MONTHS[now.getMonth()]}`}
          railRight={`${employees.items?.length ?? 0} people on file`}
        />
      )}
      <TabBar
        tone="inverse"
        tabs={tabs}
        active={tab}
        onSelect={(id) => navigate(TAB_PATHS[id as HrTab] ?? '/hr')}
      />
      <Outlet context={ctx} />
    </>
  );
}
