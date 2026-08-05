import { useMemo } from 'react';
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
  /** The New employees tab: people with a new-hire checklist, plus regular
   *  staff added by hand with no records yet. People who exist only through a
   *  leave, change, or termination live under those tabs instead. */
  newHires: EmployeeDoc[];
  /** The CE/Sub/Coaching tab — the workbook's own segmentation. */
  ceSubs: EmployeeDoc[];
  processes: ListState<HrRecordDoc>;
  leaves: ListState<HrRecordDoc>;
  changes: ListState<HrRecordDoc>;
  submissions: ReturnType<typeof useAllSubmissions>;
};

export function useHrCtx(): HrOutletCtx {
  return useOutletContext<HrOutletCtx>();
}

type HrTab = 'inbox' | 'employees' | 'cesub' | 'offboarding' | 'leaves' | 'changes';

const TAB_PATHS: Record<HrTab, string> = {
  inbox: '/hr',
  employees: '/hr/employees',
  cesub: '/hr/ce',
  offboarding: '/hr/offboarding',
  leaves: '/hr/leaves',
  changes: '/hr/changes',
};

function activeTab(pathname: string): HrTab {
  if (pathname.startsWith('/hr/employees')) return 'employees';
  if (pathname.startsWith('/hr/ce')) return 'cesub';
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
    case 'employees': {
      const count = ctx.newHires.length;
      return count === 0
        ? {
            title: 'No new employees on file yet',
            subtitle: 'Run the sheet import below, or add someone by hand.',
          }
        : {
            title: count === 1 ? 'One new employee on file' : `${count} new employees on file`,
            subtitle:
              'Open a row for the details and checklist. Leaves, changes, and terminations live under their own tabs.',
          };
    }
    case 'cesub': {
      const count = ctx.ceSubs.length;
      return {
        title:
          count === 0
            ? 'No CE, sub, or coaching hires on file'
            : count === 1
              ? 'One CE / sub / coaching hire on file'
              : `${count} CE / sub / coaching hires on file`,
        subtitle: 'Background check through EF+, one row each.',
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

  const { newHires, ceSubs } = useMemo(() => {
    const procs = processes.items ?? [];
    const withNewHire = new Set(
      procs.filter((p) => p.type === 'new_hire').map((p) => p.employeeRef),
    );
    const withCe = new Set(
      procs.filter((p) => p.type === 'ce_onboarding').map((p) => p.employeeRef),
    );
    const withAnyRecord = new Set([
      ...procs.map((p) => p.employeeRef),
      ...(leaves.items ?? []).map((l) => l.employeeRef),
      ...(changes.items ?? []).map((c) => c.employeeRef),
    ]);
    const all = employees.items ?? [];
    // Recordless people (hand-added, or ID-assignment-only) sort by kind.
    return {
      newHires: all.filter(
        (e) => withNewHire.has(e.id) || (!withAnyRecord.has(e.id) && e.kind !== 'ce_sub_coach'),
      ),
      ceSubs: all.filter(
        (e) => withCe.has(e.id) || (!withAnyRecord.has(e.id) && e.kind === 'ce_sub_coach'),
      ),
    };
  }, [employees.items, processes.items, leaves.items, changes.items]);

  if (!isHR) return <Navigate to="/" replace />;

  const ctx: HrOutletCtx = { employees, newHires, ceSubs, processes, leaves, changes, submissions };
  const tab = activeTab(location.pathname);
  const openInbox = (submissions.submissions ?? []).filter(
    (s) => s.status === 'submitted' || s.status === 'processing',
  ).length;

  const tabs: TabEntry[] = [
    { id: 'inbox', label: 'Inbox', icon: 'inbox', count: openInbox || undefined },
    { id: 'employees', label: 'New employees', icon: 'users' },
    { id: 'cesub', label: 'CE/Sub/Coaching', icon: 'plus' },
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
          railRight={`${newHires.length} new employees this year`}
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
