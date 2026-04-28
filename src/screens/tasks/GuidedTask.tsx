import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import {
  StepCard,
  StepError,
  StepHeader,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { markTaskComplete } from '../../lib/functions';
import type { TaskKey } from '../../lib/offboarding';
import type { OutletCtx } from '../../App';

export type GuidedTaskConfig = {
  title: string;
  description: string;
  primaryLink?: { label: string; url: string };
  tips: Array<{ title: string; body: string }>;
  doneCopy?: string;
  notesPlaceholder?: string;
};

type Props = { taskKey: TaskKey; config: GuidedTaskConfig };

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
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to dashboard
      </Link>

      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          {config.title}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {config.description}
        </p>
      </div>

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
              className="mb-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.4)' }}
            >
              {config.primaryLink.label} ↗
            </a>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {config.tips.map((tip) => (
              <div
                key={tip.title}
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <p className="text-sm font-semibold text-white">{tip.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/75">{tip.body}</p>
              </div>
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
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                    Your note
                  </p>
                  <p className="mt-1 text-sm text-white/85">{taskState.notes}</p>
                </div>
              )}
              {taskState.completedAt && isComplete && (
                <p className="text-xs text-white/60">
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

          <div className="flex flex-wrap gap-2">
            {isComplete || isSkipped ? (
              <button
                onClick={() => handle('in_progress')}
                disabled={pending !== null}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              >
                {pending === 'reopen' ? 'Saving…' : 'Reopen'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handle('completed')}
                  disabled={pending !== null}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                    boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                  }}
                >
                  {pending === 'complete' ? 'Saving…' : "I'm done — mark complete"}
                </button>
                <button
                  onClick={() => handle('skipped')}
                  disabled={pending !== null}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  style={{ borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  {pending === 'skip' ? 'Saving…' : "Doesn't apply — skip"}
                </button>
              </>
            )}
          </div>

          {error && <StepError>{error}</StepError>}
        </StepCard>
      </div>
    </div>
  );
}
