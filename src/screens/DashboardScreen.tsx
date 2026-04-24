import { useAuth } from '../lib/auth';
import {
  TASK_CATALOGUE,
  type OffboardingDoc,
  type TaskKey,
  type TaskStatus,
} from '../lib/offboarding';

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
    cardBg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    cardGlow: 'rgba(100,116,139,0.2)',
  },
};

export function DashboardScreen({ doc }: { doc: OffboardingDoc }) {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Work through your offboarding tasks at your own pace. Progress is saved automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TASK_CATALOGUE.map((task) => {
          const state = doc.tasks[task.key as TaskKey];
          const status = state?.status ?? 'not_started';
          const statusStyle = STATUS_STYLES[status];
          return (
            <div
              key={task.key}
              className="flex flex-col rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 sm:p-5"
              style={{
                background: statusStyle.cardBg,
                boxShadow: `0 2px 12px ${statusStyle.cardGlow}`,
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{task.label}</h3>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
                >
                  {statusStyle.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/80">{task.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
