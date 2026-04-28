import { Navigate, useParams } from 'react-router';
import { IMPLEMENTED_TASKS, TASK_CATALOGUE, type TaskKey } from '../../lib/offboarding';
import { CalendarTransferTask } from './CalendarTransferTask';
import { ComingSoonTask } from './ComingSoonTask';
import { DrivePersonalTask } from './DrivePersonalTask';
import { GuidedTask } from './GuidedTask';
import { GUIDED_TASK_CONFIGS } from './guidedConfigs';
import { KnowledgeTransferTask } from './KnowledgeTransferTask';
import { OutOfOfficeTask } from './OutOfOfficeTask';

const TASK_SCREENS: Partial<Record<TaskKey, () => React.ReactElement>> = {
  outOfOffice: OutOfOfficeTask,
  drivePersonal: DrivePersonalTask,
  knowledgeTransfer: KnowledgeTransferTask,
  calendarTransfer: CalendarTransferTask,
};

const VALID_KEYS = new Set<string>(TASK_CATALOGUE.map((t) => t.key));

export function TaskRoute() {
  const { taskKey } = useParams();
  if (!taskKey || !VALID_KEYS.has(taskKey)) {
    return <Navigate to="/" replace />;
  }

  const key = taskKey as TaskKey;

  if (!IMPLEMENTED_TASKS.has(key)) {
    return <ComingSoonTask taskKey={key} />;
  }

  const Screen = TASK_SCREENS[key];
  if (Screen) return <Screen />;

  const guidedConfig = GUIDED_TASK_CONFIGS[key];
  if (guidedConfig) return <GuidedTask taskKey={key} config={guidedConfig} />;

  return <ComingSoonTask taskKey={key} />;
}
