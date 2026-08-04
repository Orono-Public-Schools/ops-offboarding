import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { AllDoneCard } from '../components/AllDoneCard';
import { LastDayBanner } from '../components/LastDayBanner';
import { SupervisorBanner } from '../components/SupervisorBanner';
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

    const go = () => navigate(`/offboarding/tasks/${task.key}`);
    return (
      <ChecklistItem
        key={task.key}
        state={rowState}
        title={task.label}
        description={task.description}
        owner={owner}
        due={due}
        role="link"
        tabIndex={0}
        onClick={go}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            go();
          }
        }}
        style={{ cursor: 'pointer' }}
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
          <RowList>{visibleTasks.map(renderRow)}</RowList>
        </Card>
      ) : (
        <EmptyState on="dark" line="No tasks to show yet." />
      )}
    </>
  );
}
