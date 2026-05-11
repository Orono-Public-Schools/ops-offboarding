import { NextTaskButton } from '../../components/NextTaskButton';
import { TASK_CATALOGUE, type TaskKey } from '../../lib/offboarding';

export function ComingSoonTask({ taskKey }: { taskKey: TaskKey }) {
  const task = TASK_CATALOGUE.find((t) => t.key === taskKey);

  return (
    <div>
      <div
        className="rounded-xl p-6 text-center sm:p-10"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px dashed rgba(255,255,255,0.15)',
        }}
      >
        <h2
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Coming soon
        </h2>
        <p className="mt-3 text-lg font-semibold" style={{ color: '#ffffff' }}>
          {task?.label ?? taskKey}
        </p>
        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {task?.description ?? 'This task will be ready in a future release.'}
        </p>
        <div className="mt-6 flex justify-center">
          <NextTaskButton currentKey={taskKey} />
        </div>
      </div>
    </div>
  );
}
