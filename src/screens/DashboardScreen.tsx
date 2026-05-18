import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { AllDoneCard } from '../components/AllDoneCard';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { LastDayBanner } from '../components/LastDayBanner';
import { SupervisorBanner } from '../components/SupervisorBanner';
import { useAuth } from '../lib/auth';
import {
  BUILDING_CHECKLISTS,
  IMPLEMENTED_TASKS,
  TASK_CATALOGUE,
  taskKeysForDoc,
  type TaskKey,
  type TaskStatus,
} from '../lib/offboarding';
import type { OutletCtx } from '../App';

const TASK_LOOKUP: Map<TaskKey, (typeof TASK_CATALOGUE)[number]> = new Map(
  TASK_CATALOGUE.map((t) => [t.key, t]),
);

type DashboardView = 'cards' | 'list';
const VIEW_STORAGE_KEY = 'ops-dashboard-view';

function readStoredView(): DashboardView {
  if (typeof window === 'undefined') return 'cards';
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
}

const STATUS_STYLES: Record<TaskStatus, { label: string; cardBg: string; cardGlow: string }> = {
  not_started: {
    label: 'Not started',
    cardBg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    cardGlow: 'rgba(100,116,139,0.2)',
  },
  in_progress: {
    label: 'In progress',
    cardBg: 'linear-gradient(135deg, #4356a9 0%, #5a6fbf 100%)',
    cardGlow: 'rgba(67,86,169,0.3)',
  },
  completed: {
    label: 'Completed',
    cardBg: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
    cardGlow: 'rgba(29,42,93,0.3)',
  },
  skipped: {
    label: 'Skipped',
    cardBg: 'linear-gradient(135deg, #334155 0%, #475569 100%)',
    cardGlow: 'rgba(51,65,85,0.3)',
  },
};

export function DashboardScreen() {
  const { doc } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0];
  const [view, setView] = useState<DashboardView>(readStoredView);

  const handleViewChange = (next: DashboardView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // localStorage may be disabled (private mode); state still applies for the session
    }
  };

  const isLeaving = doc.type === 'leaving';
  const buildingLabel = useMemo(() => {
    if (!doc.buildingChecklist) return null;
    return BUILDING_CHECKLISTS.find((b) => b.key === doc.buildingChecklist)?.label ?? null;
  }, [doc.buildingChecklist]);

  const { activeTasks, doneTasks } = useMemo(() => {
    const visible = taskKeysForDoc(doc)
      .map((key) => TASK_LOOKUP.get(key))
      .filter((t): t is (typeof TASK_CATALOGUE)[number] => Boolean(t));
    const active: typeof visible = [];
    const done: typeof visible = [];
    for (const task of visible) {
      const status = doc.tasks[task.key]?.status ?? 'not_started';
      if (status === 'completed' || status === 'skipped') done.push(task);
      else active.push(task);
    }
    return { activeTasks: active, doneTasks: done };
  }, [doc]);

  const renderTile = (task: (typeof TASK_CATALOGUE)[number]) => {
    const state = doc.tasks[task.key as TaskKey];
    const status = state?.status ?? 'not_started';
    const statusStyle = STATUS_STYLES[status];
    const isImplemented = IMPLEMENTED_TASKS.has(task.key);

    const inner = (
      <>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{task.label}</h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
          >
            {isImplemented ? statusStyle.label : 'Coming soon'}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-white/80">{task.description}</p>
      </>
    );

    const baseClasses = 'flex flex-col rounded-xl p-4 transition-all duration-200 sm:p-5';
    const style = {
      background: statusStyle.cardBg,
      boxShadow: `0 2px 12px ${statusStyle.cardGlow}`,
    };

    if (!isImplemented) {
      return (
        <div
          key={task.key}
          className={`${baseClasses} cursor-not-allowed opacity-70`}
          style={style}
        >
          {inner}
        </div>
      );
    }

    return (
      <Link
        key={task.key}
        to={`/tasks/${task.key}`}
        className={`${baseClasses} cursor-pointer hover:-translate-y-0.5`}
        style={style}
      >
        {inner}
      </Link>
    );
  };

  const renderRow = (task: (typeof TASK_CATALOGUE)[number]) => {
    const state = doc.tasks[task.key as TaskKey];
    const status = state?.status ?? 'not_started';
    const statusStyle = STATUS_STYLES[status];
    const isImplemented = IMPLEMENTED_TASKS.has(task.key);

    const inner = (
      <>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">{task.label}</h3>
          <p className="mt-0.5 truncate text-xs leading-relaxed text-white/75">
            {task.description}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
        >
          {isImplemented ? statusStyle.label : 'Coming soon'}
        </span>
      </>
    );

    const baseClasses = 'flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200';
    const style = {
      background: statusStyle.cardBg,
      boxShadow: `0 2px 12px ${statusStyle.cardGlow}`,
    };

    if (!isImplemented) {
      return (
        <div
          key={task.key}
          className={`${baseClasses} cursor-not-allowed opacity-70`}
          style={style}
        >
          {inner}
        </div>
      );
    }

    return (
      <Link
        key={task.key}
        to={`/tasks/${task.key}`}
        className={`${baseClasses} cursor-pointer hover:-translate-y-px`}
        style={style}
      >
        {inner}
      </Link>
    );
  };

  const cardGridClasses = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';
  const listClasses = 'flex flex-col gap-2';
  const containerClasses = view === 'list' ? listClasses : cardGridClasses;
  const renderTask = view === 'list' ? renderRow : renderTile;
  const hasAnyTasks = activeTasks.length > 0 || doneTasks.length > 0;

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {isLeaving
            ? 'Work through your offboarding tasks at your own pace. Progress is saved automatically.'
            : `End-of-year checklist${buildingLabel ? ` for ${buildingLabel}` : ''}. Work through it at your own pace — progress is saved automatically.`}
        </p>
      </div>

      {isLeaving && (
        <>
          <LastDayBanner lastDay={doc.lastDay} />
          <SupervisorBanner supervisorEmail={doc.supervisor} supervisorName={doc.supervisorName} />
        </>
      )}

      {hasAnyTasks && (
        <div className="mb-3 flex justify-end">
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => handleViewChange('cards')}
              aria-pressed={view === 'cards'}
              aria-label="Card view"
              className="flex h-7 w-7 items-center justify-center rounded-md transition"
              style={{
                background: view === 'cards' ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: view === 'cards' ? '#ffffff' : 'rgba(255,255,255,0.55)',
              }}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              aria-pressed={view === 'list'}
              aria-label="List view"
              className="flex h-7 w-7 items-center justify-center rounded-md transition"
              style={{
                background: view === 'list' ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: view === 'list' ? '#ffffff' : 'rgba(255,255,255,0.55)',
              }}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-3.5 w-3.5"
              >
                <line x1="3" y1="4" x2="13" y2="4" />
                <line x1="3" y1="8" x2="13" y2="8" />
                <line x1="3" y1="12" x2="13" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {activeTasks.length > 0 && (
        <div className={containerClasses}>{activeTasks.map(renderTask)}</div>
      )}

      {activeTasks.length === 0 && doneTasks.length > 0 && (
        <AllDoneCard
          flow={isLeaving ? 'leaving' : 'returning'}
          lastDay={doc.lastDay}
          buildingLabel={buildingLabel}
        />
      )}

      {doneTasks.length > 0 && (
        <div className="mt-6">
          <CollapsibleSection label={`Completed (${doneTasks.length})`}>
            <div className={containerClasses}>{doneTasks.map(renderTask)}</div>
          </CollapsibleSection>
        </div>
      )}

      {activeTasks.length === 0 && doneTasks.length === 0 && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          No tasks to show yet.
        </p>
      )}
    </div>
  );
}
