import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { requestHelp, resolveHelp } from '../lib/functions';
import type { HelpRequest, TaskKey } from '../lib/offboarding';
import type { OutletCtx } from '../App';

type Props = { currentKey: TaskKey; className?: string };

function formatRequestedAt(ts: HelpRequest['requestedAt'] | null | undefined): string | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
        className={`w-full rounded-xl p-4 ${className}`.trim()}
        style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.4)',
        }}
      >
        <div className="flex flex-wrap items-start gap-3">
          <span className="text-lg leading-none" aria-hidden>
            🚩
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: '#fde68a' }}>
              Help requested{when ? ` on ${when}` : ''} — IT will follow up.
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'rgba(253,230,138,0.85)' }}>
              "{help.reason}"
            </p>
            {error && (
              <p className="mt-2 text-xs" style={{ color: '#fecaca' }}>
                {error}
              </p>
            )}
          </div>
          <button
            onClick={handleCancelRequest}
            disabled={submitting}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-60"
            style={{ borderColor: 'rgba(253,230,138,0.5)', color: '#fde68a' }}
          >
            {submitting ? 'Cancelling…' : 'Cancel request'}
          </button>
        </div>
      </div>
    );
  }

  if (composing) {
    return (
      <div
        className={`w-full rounded-xl p-4 ${className}`.trim()}
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
        }}
      >
        <p className="mb-2 text-sm font-semibold" style={{ color: '#fde68a' }}>
          🚩 What's the snag? IT will follow up with you.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="e.g. I can't find the destination folder, my account doesn't have access, etc."
          className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#1d2a5d',
          }}
        />
        {error && (
          <p className="mt-2 text-xs" style={{ color: '#fecaca' }}>
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            onClick={cancelComposing}
            disabled={submitting}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Never mind
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
            style={{ background: '#f59e0b', color: '#1d2a5d' }}
          >
            {submitting ? 'Sending…' : 'Send help request'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startComposing}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98] ${className}`.trim()}
      style={{ borderColor: 'rgba(245,158,11,0.6)' }}
    >
      🚩 Flag for help
    </button>
  );
}
