import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { HelpFlagSection } from '../../components/HelpFlagSection';
import { NextTaskButton } from '../../components/NextTaskButton';
import {
  InsetPanel,
  StepCard,
  StepError,
  StepHeader,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { Button } from '../../ds/components/core/Button';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { markTaskComplete } from '../../lib/functions';
import type { TaskKey } from '../../lib/offboarding';
import type { OutletCtx } from '../../App';

export type GuidedTaskConfig = {
  title: string;
  description: string;
  primaryLink?: { label: string; url: string };
  tips: Array<{ title: string; body: string; link?: { label: string; url: string } }>;
  doneCopy?: string;
  notesPlaceholder?: string;
};

type Props = { taskKey: TaskKey; config: GuidedTaskConfig };

const OUTLINE_LINK_STYLE: React.CSSProperties = {
  font: 'var(--type-button)',
  color: 'var(--secondary)',
  background: 'rgba(var(--secondary-rgb), 0.1)',
  border: '1px solid rgba(var(--secondary-rgb), 0.3)',
  borderRadius: 'var(--radius-button)',
};

export function GuidedTask({ taskKey, config }: Props) {
  const { doc } = useOutletContext<OutletCtx>();
  const taskState = (doc.tasks[taskKey] ?? { status: 'not_started' }) as {
    status: string;
    completedAt?: { toDate: () => Date } | null;
    notes?: string | null;
  };
  const isComplete = taskState.status === 'completed';
  const isSkipped = taskState.status === 'skipped';

  const [notes, setNotes] = useState<string>(taskState.notes ?? '');
  const [pending, setPending] = useState<'complete' | 'skip' | 'reopen' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (status: 'completed' | 'skipped' | 'in_progress') => {
    setError(null);
    setPending(status === 'completed' ? 'complete' : status === 'skipped' ? 'skip' : 'reopen');
    try {
      await markTaskComplete({
        taskKey,
        status,
        notes: status === 'in_progress' ? null : notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <PageTitle title={config.title} subtitle={config.description} className="mb-5 sm:mb-8" />

      <div className="space-y-4">
        <StepCard>
          <StepHeader
            step="Step 1"
            title="What to do"
            description={config.doneCopy ?? 'Read through the tips, then take the action.'}
          />
          {config.primaryLink && (
            <a
              href={config.primaryLink.url}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-flex h-10 items-center gap-2 px-4 transition hover:-translate-y-px"
              style={OUTLINE_LINK_STYLE}
            >
              {config.primaryLink.label} ↗
            </a>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {config.tips.map((tip) => (
              <InsetPanel key={tip.title}>
                <p style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>{tip.title}</p>
                <p
                  className="mt-1 leading-relaxed"
                  style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
                >
                  {tip.body}
                </p>
                {tip.link && (
                  <a
                    href={tip.link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 underline underline-offset-2"
                    style={{
                      font: 'var(--type-caption)',
                      fontWeight: 600,
                      color: 'var(--secondary)',
                    }}
                  >
                    {tip.link.label} ↗
                  </a>
                )}
              </InsetPanel>
            ))}
          </div>
        </StepCard>

        <StepCard>
          <StepHeader
            step="Step 2"
            title="When you're done"
            description={
              isComplete
                ? "You've marked this complete."
                : isSkipped
                  ? "You've skipped this."
                  : "Mark this complete when it's handled. Skip if it doesn't apply to you."
            }
            status={
              isComplete
                ? { label: 'Completed', tone: 'done' }
                : isSkipped
                  ? { label: 'Skipped', tone: 'done' }
                  : { label: 'Not yet' }
            }
          />

          {(isComplete || isSkipped) && (
            <div className="mb-4 space-y-2">
              {taskState.notes && (
                <InsetPanel>
                  <StepLabel>Your note</StepLabel>
                  <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
                    {taskState.notes}
                  </p>
                </InsetPanel>
              )}
              {taskState.completedAt && isComplete && (
                <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  Marked complete{' '}
                  {taskState.completedAt
                    .toDate()
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {!isComplete && !isSkipped && (
            <>
              <StepLabel>Optional note for IT</StepLabel>
              <StepTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={config.notesPlaceholder ?? 'Anything IT should know'}
                className="mb-3"
              />
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {isComplete || isSkipped ? (
              <Button
                variant="ghost"
                onClick={() => handle('in_progress')}
                disabled={pending !== null}
              >
                {pending === 'reopen' ? 'Saving…' : 'Reopen'}
              </Button>
            ) : (
              <>
                <Button
                  variant="submit"
                  icon="check"
                  onClick={() => handle('completed')}
                  disabled={pending !== null}
                >
                  {pending === 'complete' ? 'Saving…' : "I'm done — mark complete"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handle('skipped')}
                  disabled={pending !== null}
                >
                  {pending === 'skip' ? 'Saving…' : "Doesn't apply — skip"}
                </Button>
              </>
            )}
            <NextTaskButton currentKey={taskKey} />
            <HelpFlagSection currentKey={taskKey} />
          </div>

          {error && <StepError>{error}</StepError>}
        </StepCard>
      </div>
    </div>
  );
}
