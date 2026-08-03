import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useIsHR } from '../../lib/auth';
import {
  allFieldsForSubmission,
  STATUS_BADGES,
  updateSubmissionStatus,
  useSubmission,
  type Submission,
  type SubmissionStatus,
} from '../../lib/forms';

function formatTs(ts: { toDate: () => Date } | null): string {
  if (!ts) return '';
  return ts.toDate().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ACTION_LABEL(action: string): string {
  switch (action) {
    case 'submitted':
      return 'Submitted';
    case 'status_processing':
      return 'Marked processing';
    case 'status_completed':
      return 'Marked completed';
    case 'status_denied':
      return 'Denied';
    default:
      return action;
  }
}

function FieldValues({ submission }: { submission: Submission }) {
  const entries = allFieldsForSubmission(submission);
  return (
    <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
      {entries.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4"
        >
          <span
            className="shrink-0 text-xs font-semibold tracking-wider uppercase sm:w-44"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            {label}
          </span>
          <span className="text-sm break-words" style={{ color: 'var(--color-ink)' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function HrActions({ submission }: { submission: Submission }) {
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<SubmissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (status: SubmissionStatus) => {
    setError(null);
    setPending(status);
    try {
      await updateSubmissionStatus({ id: submission.id, status, note: note.trim() || null });
      setNote('');
    } catch (err) {
      console.error(err);
      setError('Could not update the submission. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const btn =
    'rounded-lg px-4 py-2 text-sm font-semibold transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0';

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
    >
      <h2
        className="mb-3 text-sm font-semibold tracking-widest uppercase"
        style={{ color: 'var(--color-ops-navy)' }}
      >
        HR actions
      </h2>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional note (visible to the submitter in the activity log)…"
        className="input-form resize-none"
      />
      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {submission.status !== 'denied' && (
          <button
            onClick={() => act('denied')}
            disabled={pending !== null}
            className={`${btn} border`}
            style={{ borderColor: 'var(--color-ops-red)', color: 'var(--color-ops-red)' }}
          >
            {pending === 'denied' ? 'Working…' : 'Deny'}
          </button>
        )}
        {submission.status !== 'processing' && submission.status !== 'completed' && (
          <button
            onClick={() => act('processing')}
            disabled={pending !== null}
            className={`${btn} border`}
            style={{ borderColor: 'var(--color-ops-light)', color: 'var(--color-ops-light)' }}
          >
            {pending === 'processing' ? 'Working…' : 'Mark processing'}
          </button>
        )}
        {submission.status !== 'completed' && (
          <button
            onClick={() => act('completed')}
            disabled={pending !== null}
            className={`${btn} text-white`}
            style={{
              background: 'var(--grad-primary)',
              boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
            }}
          >
            {pending === 'completed' ? 'Working…' : 'Mark completed'}
          </button>
        )}
      </div>
      {error && (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-center text-xs"
          style={{ background: 'rgba(173,33,34,0.08)', color: 'var(--color-ops-red)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmissionDetail() {
  const { id } = useParams();
  const isHR = useIsHR();
  const state = useSubmission(id ?? null);

  if (state.loading) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    );
  }
  if (state.error !== null) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {state.error}
        </p>
        <Link
          to="/forms"
          className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4"
        >
          Back to forms
        </Link>
      </div>
    );
  }

  const s = state.submission;
  const badge = STATUS_BADGES[s.status];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          to="/forms"
          className="inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        >
          ← My forms
        </Link>
        {isHR && (
          <Link
            to="/hr"
            className="inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            ← HR inbox
          </Link>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{s.formTitle}</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {s.id} · {s.submitterName} · {formatTs(s.createdAt)}
          </p>
        </div>
        <span
          className="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
        >
          <h2
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: 'var(--color-ops-navy)' }}
          >
            Submitted details
          </h2>
          <FieldValues submission={s} />
        </div>

        {isHR && <HrActions submission={s} />}

        <div
          className="rounded-xl p-4 sm:p-5"
          style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
        >
          <h2
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: 'var(--color-ops-navy)' }}
          >
            Activity
          </h2>
          <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
            {s.activityLog.map((entry, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {ACTION_LABEL(entry.action)}
                  <span className="ml-2 font-normal" style={{ color: 'var(--color-ink-faint)' }}>
                    {entry.actorEmail} · {formatTs(entry.ts)}
                  </span>
                </p>
                {entry.note && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                    {entry.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
