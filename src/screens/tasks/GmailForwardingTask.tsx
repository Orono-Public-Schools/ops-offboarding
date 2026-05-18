import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { HelpFlagSection } from '../../components/HelpFlagSection';
import { NextTaskButton } from '../../components/NextTaskButton';
import {
  StepCard,
  StepError,
  StepHeader,
  StepInput,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
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
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          Gmail forwarding
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Want incoming mail forwarded after you leave? Tell us where, and IT will set it up before
          your account is deactivated. Skip this if you don't need forwarding.
        </p>
      </div>

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
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                  Your note
                </p>
                <p className="mt-1 text-sm text-white/85">{savedNote}</p>
              </div>
            )}
          </StepCard>
        )}

        {error && <StepError>{error}</StepError>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link
            to="/"
            className="rounded-xl border px-4 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            {isComplete || isSkipped ? 'Done' : 'Cancel'}
          </Link>
          {isComplete || isSkipped ? (
            <button
              onClick={() => handleStatus('in_progress')}
              disabled={pending !== null || submitting}
              className="rounded-xl border px-4 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
              style={{ borderColor: 'rgba(255,255,255,0.4)' }}
            >
              {pending === 'reopen' ? 'Reopening…' : 'Reopen'}
            </button>
          ) : (
            <>
              <button
                onClick={() => handleStatus('skipped')}
                disabled={pending !== null || submitting}
                className="rounded-xl border px-4 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              >
                {pending === 'skip' ? 'Saving…' : "I don't need forwarding — skip"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || pending !== null}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow-lg active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                style={{
                  background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                  boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </>
          )}
          <NextTaskButton currentKey="gmailForwarding" className="order-first sm:order-last" />
          <HelpFlagSection currentKey="gmailForwarding" className="order-first sm:order-last" />
        </div>
      </div>
    </div>
  );
}
