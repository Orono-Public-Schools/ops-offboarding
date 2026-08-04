import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { AllDoneCard } from '../components/AllDoneCard';
import { LastDayBanner } from '../components/LastDayBanner';
import { SupervisorBanner } from '../components/SupervisorBanner';
import { markTaskComplete } from '../lib/functions';
import { Button } from '../ds/components/core/Button';
import { Card } from '../ds/components/core/Card';
import { RowList } from '../ds/components/forms/RowList';
import { ChecklistItem } from '../ds/components/records/ChecklistItem';
import { EmptyState } from '../ds/components/records/EmptyState';
import {
  BUILDING_CHECKLISTS,
  IMPLEMENTED_TASKS,
  TASK_CATALOGUE,
  taskKeysForDoc,
  type TaskKey,
} from '../lib/offboarding';
import type { OutletCtx } from '../App';

const TASK_LOOKUP: Map<TaskKey, (typeof TASK_CATALOGUE)[number]> = new Map(
  TASK_CATALOGUE.map((t) => [t.key, t]),
);

type RowState = 'todo' | 'waiting' | 'done';

export function DashboardScreen() {
  const { doc } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const [toggling, setToggling] = useState<TaskKey | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const toggleTask = async (key: TaskKey, currentlyDone: boolean) => {
    if (toggling) return;
    setToggleError(null);
    setToggling(key);
    try {
      await markTaskComplete({ taskKey: key, status: currentlyDone ? 'not_started' : 'completed' });
    } catch (err) {
      console.error(err);
      setToggleError('Could not update that task. Please try again.');
    } finally {
      setToggling(null);
    }
  };

  const isLeaving = doc.type === 'leaving';
  const buildingLabel = useMemo(() => {
    if (!doc.buildingChecklist) return null;
    return BUILDING_CHECKLISTS.find((b) => b.key === doc.buildingChecklist)?.label ?? null;
  }, [doc.buildingChecklist]);

  const visibleTasks = useMemo(
    () =>
      taskKeysForDoc(doc)
        .map((key) => TASK_LOOKUP.get(key))
        .filter((t): t is (typeof TASK_CATALOGUE)[number] => Boolean(t)),
    [doc],
  );

  const doneCount = visibleTasks.filter((task) => {
    const status = doc.tasks[task.key]?.status ?? 'not_started';
    return status === 'completed' || status === 'skipped';
  }).length;
  const allDone = visibleTasks.length > 0 && doneCount === visibleTasks.length;

  const renderRow = (task: (typeof TASK_CATALOGUE)[number]) => {
    const state = doc.tasks[task.key];
    const status = state?.status ?? 'not_started';
    const isImplemented = IMPLEMENTED_TASKS.has(task.key);
    const helpOpen = Boolean(state?.help && !state.help.resolvedAt);
    // The Gmail-forwarding request is done on the user's side but sits with IT
    // until the account is deactivated — show it as waiting, not crossed off.
    const withIT =
      task.key === 'gmailForwarding' && status === 'completed' && Boolean(state?.forwardTo);

    let rowState: RowState = 'todo';
    let owner: string | undefined;
    if (withIT || (helpOpen && status !== 'completed' && status !== 'skipped')) {
      rowState = 'waiting';
      owner = 'With IT';
    } else if (status === 'completed' || status === 'skipped') {
      rowState = 'done';
    }

    const due = !isImplemented
      ? 'Coming soon'
      : status === 'skipped'
        ? 'Skipped'
        : rowState === 'done'
          ? 'Done'
          : status === 'in_progress'
            ? 'In progress'
            : undefined;

    if (!isImplemented) {
      return (
        <ChecklistItem
          key={task.key}
          state={rowState}
          title={task.label}
          description={task.description}
          owner={owner}
          due={due}
          aria-disabled
        />
      );
    }

    // The box toggles done/undone in place; tasks sitting with IT stay
    // untoggleable so nobody un-files a request that's already in motion.
    const canToggle = rowState !== 'waiting' && toggling === null;
    return (
      <ChecklistItem
        key={task.key}
        state={rowState}
        title={task.label}
        description={task.description}
        owner={owner}
        due={toggling === task.key ? 'Saving…' : due}
        onToggle={canToggle ? () => toggleTask(task.key, rowState === 'done') : undefined}
        action={
          <Button
            variant="secondary"
            size="sm"
            iconRight="arrowRight"
            onClick={() => navigate(`/offboarding/tasks/${task.key}`)}
          >
            Open
          </Button>
        }
      />
    );
  };

  return (
    <>
      {isLeaving && (
        <Card eyebrow="Your details" heading="Two things that shape the timing" pad={16}>
          <RowList>
            <LastDayBanner lastDay={doc.lastDay} />
            <SupervisorBanner
              supervisorEmail={doc.supervisor}
              supervisorName={doc.supervisorName}
            />
          </RowList>
        </Card>
      )}

      {allDone && (
        <AllDoneCard
          flow={isLeaving ? 'leaving' : 'returning'}
          lastDay={doc.lastDay}
          buildingLabel={buildingLabel}
        />
      )}

      {visibleTasks.length > 0 ? (
        <Card
          eyebrow="Checklist"
          heading="Yours to work in any order"
          headingRight={
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              {doneCount} of {visibleTasks.length} done
            </span>
          }
          pad={16}
        >
          {toggleError && (
            <p
              className="mb-3 px-3 py-2"
              style={{
                font: 'var(--type-caption)',
                color: 'var(--accent)',
                background: 'rgba(var(--accent-rgb), 0.08)',
                borderRadius: 8,
              }}
            >
              {toggleError}
            </p>
          )}
          <RowList>{visibleTasks.map(renderRow)}</RowList>
        </Card>
      ) : (
        <EmptyState on="dark" line="No tasks to show yet." />
      )}
    </>
  );
}
