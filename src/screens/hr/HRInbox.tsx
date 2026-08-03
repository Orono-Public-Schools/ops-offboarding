import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useIsHR } from '../../lib/auth';
import { STATUS_BADGES, useAllSubmissions, type SubmissionStatus } from '../../lib/forms';

const FILTERS: Array<{ key: SubmissionStatus | 'all' | 'open'; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'denied', label: 'Denied' },
];

export function HRInbox() {
  const isHR = useIsHR();
  const state = useAllSubmissions(isHR);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('open');

  if (!isHR) return <Navigate to="/" replace />;

  const filtered = state.submissions?.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'open') return s.status === 'submitted' || s.status === 'processing';
    return s.status === filter;
  });

  return (
    <div>
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
        style={{ borderColor: 'rgba(255,255,255,0.3)' }}
      >
        ← Back to portal
      </Link>

      <h1 className="text-xl font-bold text-white sm:text-2xl">HR Inbox</h1>
      <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Form submissions from staff. Open one to process it.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
              style={
                active
                  ? { background: '#ffffff', color: 'var(--color-ops-navy)' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {state.loading && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Loading…
          </p>
        )}
        {state.error && (
          <p className="text-sm" style={{ color: '#fecaca' }}>
            {state.error}
          </p>
        )}
        {filtered?.length === 0 && (
          <div
            className="rounded-xl px-4 py-8 text-center text-sm"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px dashed rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            Nothing here.
          </div>
        )}
        {filtered?.map((s) => {
          const badge = STATUS_BADGES[s.status];
          return (
            <Link
              key={s.id}
              to={`/forms/submissions/${s.id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition hover:-translate-y-px"
              style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-ops-navy)' }}>
                  {s.formTitle}
                  <span className="ml-2 font-normal" style={{ color: 'var(--color-ink-faint)' }}>
                    {s.id}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                  {s.submitterName} · {s.summary} ·{' '}
                  {s.createdAt ? s.createdAt.toDate().toLocaleDateString() : ''}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
