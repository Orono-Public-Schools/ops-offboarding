import { Navigate, useParams } from 'react-router';
import { TaskPageHeader } from '../../components/TaskPageHeader';
import { IMPLEMENTED_TASKS, TASK_CATALOGUE, type TaskKey } from '../../lib/offboarding';
import { CalendarTransferTask } from './CalendarTransferTask';
import { ComingSoonTask } from './ComingSoonTask';
import { DrivePersonalTask } from './DrivePersonalTask';
import { GmailForwardingTask } from './GmailForwardingTask';
import { GroupsOwnershipTask } from './GroupsOwnershipTask';
import { GuidedTask } from './GuidedTask';
import { GUIDED_TASK_CONFIGS } from './guidedConfigs';
import { KnowledgeTransferTask } from './KnowledgeTransferTask';
import { OutOfOfficeTask } from './OutOfOfficeTask';
import { SummerVacationResponderTask } from './SummerVacationResponderTask';

const TASK_SCREENS: Partial<Record<TaskKey, () => React.ReactElement>> = {
  outOfOffice: OutOfOfficeTask,
  drivePersonal: DrivePersonalTask,
  knowledgeTransfer: KnowledgeTransferTask,
  calendarTransfer: CalendarTransferTask,
  groupsOwnership: GroupsOwnershipTask,
  gmailForwarding: GmailForwardingTask,
  eoyVacationResponder: SummerVacationResponderTask,
};

const VALID_KEYS = new Set<string>(TASK_CATALOGUE.map((t) => t.key));

export function TaskRoute() {
  const { taskKey } = useParams();
  if (!taskKey || !VALID_KEYS.has(taskKey)) {
    return <Navigate to="/" replace />;
  }

  const key = taskKey as TaskKey;

  let screen: React.ReactElement;
  if (!IMPLEMENTED_TASKS.has(key)) {
    screen = <ComingSoonTask taskKey={key} />;
  } else {
    const Screen = TASK_SCREENS[key];
    if (Screen) {
      screen = <Screen />;
    } else {
      const guidedConfig = GUIDED_TASK_CONFIGS[key];
      screen = guidedConfig ? (
        <GuidedTask taskKey={key} config={guidedConfig} />
      ) : (
        <ComingSoonTask taskKey={key} />
      );
    }
  }

  return (
    <>
      <TaskPageHeader />
      {screen}
    </>
  );
}
