import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Button } from '../ds/components/core/Button';
import { requestHelp, resolveHelp } from '../lib/functions';
import type { HelpRequest, TaskKey } from '../lib/offboarding';
import type { OutletCtx } from '../App';
import { StepError, StepTextarea } from './TaskStep';

type Props = { currentKey: TaskKey; className?: string };

function formatRequestedAt(ts: HelpRequest['requestedAt'] | null | undefined): string | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Quiet "stuck?" affordance for the task cards. Idle it's a ghost button; open
 * it becomes a small inset panel on the white card.
 */
export function HelpFlagSection({ currentKey, className = '' }: Props) {
  const { doc } = useOutletContext<OutletCtx>();
  const help = doc.tasks[currentKey]?.help as HelpRequest | null | undefined;
  const isPending = Boolean(help && !help.resolvedAt);

  const [composing, setComposing] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startComposing = () => {
    setReason('');
    setError(null);
    setComposing(true);
  };

  const cancelComposing = () => {
    setComposing(false);
    setReason('');
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please describe what you need help with.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestHelp({ taskKey: currentKey, reason: trimmed });
      setComposing(false);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await resolveHelp({ taskKey: currentKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending && help) {
    const when = formatRequestedAt(help.requestedAt);
    return (
      <div
        className={`w-full p-4 ${className}`.trim()}
        style={{ background: 'var(--surface-inset)', borderRadius: 8 }}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>
              Help requested{when ? ` on ${when}` : ''} — IT will follow up.
            </p>
            <p
              className="mt-1 leading-relaxed"
              style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
            >
              "{help.reason}"
            </p>
            {error && <StepError>{error}</StepError>}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancelRequest}
            disabled={submitting}
            className="shrink-0"
          >
            {submitting ? 'Cancelling…' : 'Cancel request'}
          </Button>
        </div>
      </div>
    );
  }

  if (composing) {
    return (
      <div
        className={`w-full p-4 ${className}`.trim()}
        style={{ background: 'var(--surface-inset)', borderRadius: 8 }}
      >
        <p className="mb-2" style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>
          What's the snag? IT will follow up with you.
        </p>
        <StepTextarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="e.g. I can't find the destination folder, my account doesn't have access, etc."
        />
        {error && <StepError>{error}</StepError>}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={cancelComposing} disabled={submitting}>
            Never mind
          </Button>
          <Button
            variant="secondary"
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? 'Sending…' : 'Send help request'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="ghost" onClick={startComposing} className={className}>
      Stuck? Flag this for IT
    </Button>
  );
}
