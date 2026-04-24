import {
  TASK_CATALOGUE,
  type OffboardingDoc,
  type TaskKey,
  type TaskStatus,
} from '../lib/offboarding';

const STATUS_STYLES: Record<TaskStatus, { label: string; bg: string; fg: string }> = {
  not_started: { label: 'Not started', bg: '#f1f5f9', fg: '#64748b' },
  in_progress: { label: 'In progress', bg: 'rgba(29,42,93,0.08)', fg: '#1d2a5d' },
  completed: { label: 'Completed', bg: 'rgba(22,101,52,0.1)', fg: '#166534' },
  skipped: { label: 'Skipped', bg: '#f1f5f9', fg: '#94a3b8' },
  blocked: { label: 'Blocked', bg: 'rgba(173,33,34,0.08)', fg: '#ad2122' },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function DashboardScreen({ doc }: { doc: OffboardingDoc }) {
  return (
    <div>
      <div
        className="mb-4 rounded-xl p-4 sm:p-5"
        style={{
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: '#1d2a5d' }}
        >
          Your offboarding
        </h2>
        <p className="mt-2 text-sm" style={{ color: '#334155' }}>
          Work through the tasks below at your own pace. Your progress is saved automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TASK_CATALOGUE.map((task) => {
          const state = doc.tasks[task.key as TaskKey];
          const status = state?.status ?? 'not_started';
          return (
            <div
              key={task.key}
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold" style={{ color: '#1d2a5d' }}>
                  {task.label}
                </h3>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                {task.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
