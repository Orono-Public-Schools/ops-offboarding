import { NextTaskButton } from '../../components/NextTaskButton';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { TASK_CATALOGUE, type TaskKey } from '../../lib/offboarding';

export function ComingSoonTask({ taskKey }: { taskKey: TaskKey }) {
  const task = TASK_CATALOGUE.find((t) => t.key === taskKey);

  return (
    <EmptyState
      on="dark"
      icon="clock"
      line={`${task?.label ?? 'This step'} isn't open yet`}
      note={task?.description ?? "We're still building this one — it'll be ready soon."}
      action={<NextTaskButton currentKey={taskKey} />}
    />
  );
}
