import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { HelpFlagSection } from '../../components/HelpFlagSection';
import { NextTaskButton } from '../../components/NextTaskButton';
import {
  InsetPanel,
  StepCard,
  StepError,
  StepHeader,
  StepInput,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { Button } from '../../ds/components/core/Button';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { markTaskComplete, requestGmailForwarding } from '../../lib/functions';
import type { OutletCtx } from '../../App';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GmailForwardingTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const taskState = doc.tasks.gmailForwarding ?? { status: 'not_started' };
  const isComplete = taskState.status === 'completed';
  const isSkipped = taskState.status === 'skipped';

  const savedForwardTo = (taskState.forwardTo as string | undefined) ?? '';
  const savedNote = (taskState.note as string | null | undefined) ?? '';

  const [forwardTo, setForwardTo] = useState<string>(savedForwardTo || doc.successorEmail || '');
  const [note, setNote] = useState<string>(savedNote ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<'skip' | 'reopen' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = forwardTo.trim().toLowerCase();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await requestGmailForwarding({ forwardTo: trimmed, note: note.trim() || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (status: 'skipped' | 'in_progress') => {
    setError(null);
    setPending(status === 'skipped' ? 'skip' : 'reopen');
    try {
      await markTaskComplete({ taskKey: 'gmailForwarding', status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <PageTitle
        title="Gmail forwarding"
        subtitle="Want incoming mail forwarded after you leave? Tell us where, and IT will set it up before your account is deactivated. Skip this if you don't need forwarding."
        className="mb-5 sm:mb-8"
      />

      <div className="space-y-4">
        <StepCard>
          <StepHeader
            step="Step 1"
            title="Where should mail go?"
            description={
              doc.successorEmail
                ? "We've prefilled your successor's address. Change it if you want forwarding to go somewhere else."
                : "Usually a successor's Orono address, but any working email works."
            }
            status={
              isComplete
                ? { label: 'Submitted', tone: 'done' }
                : isSkipped
                  ? { label: 'Skipped', tone: 'done' }
                  : undefined
            }
          />
          <StepLabel>Forward mail to</StepLabel>
          <StepInput
            type="email"
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="successor@orono.k12.mn.us"
            disabled={isComplete || isSkipped}
            className="mb-4"
          />
          <StepLabel>Note for IT (optional)</StepLabel>
          <StepTextarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything we should know — duration, exceptions, etc."
            disabled={isComplete || isSkipped}
          />
        </StepCard>

        {(isComplete || isSkipped) && (
          <StepCard>
            <StepHeader
              step="Status"
              title={isSkipped ? 'No forwarding requested.' : 'Request submitted.'}
              description={
                isSkipped
                  ? 'You skipped this — no forwarding will be set up.'
                  : `IT will configure forwarding to ${savedForwardTo} before your account is deactivated. If something needs to change, reopen this task and resubmit, or email support@orono.k12.mn.us.`
              }
            />
            {isComplete && savedNote && (
              <InsetPanel>
                <StepLabel>Your note</StepLabel>
                <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>{savedNote}</p>
              </InsetPanel>
            )}
          </StepCard>
        )}

        <StepCard>
          {error && (
            <div className="mb-3">
              <StepError>{error}</StepError>
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Link
              to="/offboarding"
              className="inline-flex h-10 items-center justify-center px-4 transition hover:bg-black/5"
              style={{
                font: 'var(--type-button)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-button)',
              }}
            >
              {isComplete || isSkipped ? 'Done' : 'Cancel'}
            </Link>
            {isComplete || isSkipped ? (
              <Button
                variant="ghost"
                onClick={() => handleStatus('in_progress')}
                disabled={pending !== null || submitting}
              >
                {pending === 'reopen' ? 'Reopening…' : 'Reopen'}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => handleStatus('skipped')}
                  disabled={pending !== null || submitting}
                >
                  {pending === 'skip' ? 'Saving…' : "I don't need forwarding — skip"}
                </Button>
                <Button
                  variant="submit"
                  icon="send"
                  onClick={handleSubmit}
                  disabled={submitting || pending !== null}
                >
                  {submitting ? 'Submitting…' : 'Submit request'}
                </Button>
              </>
            )}
            <NextTaskButton currentKey="gmailForwarding" className="order-first sm:order-last" />
            <HelpFlagSection currentKey="gmailForwarding" className="order-first sm:order-last" />
          </div>
        </StepCard>
      </div>
    </div>
  );
}
