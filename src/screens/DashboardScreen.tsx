import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
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

  const isLeaving = doc.type === 'leaving';
  const buildingLabel = useMemo(() => {
    if (!doc.buildingChecklist) return null;
    return BUILDING_CHECKLISTS.find((b) => b.key === doc.buildingChecklist)?.label ?? null;
  }, [doc.buildingChecklist]);

  const visibleTasks = useMemo(() => {
    return taskKeysForDoc(doc)
      .map((key) => TASK_LOOKUP.get(key))
      .filter((t): t is (typeof TASK_CATALOGUE)[number] => Boolean(t));
  }, [doc]);

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
        <SupervisorBanner supervisorEmail={doc.supervisor} supervisorName={doc.supervisorName} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTasks.map((task) => {
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
        })}
      </div>
    </div>
  );
}
