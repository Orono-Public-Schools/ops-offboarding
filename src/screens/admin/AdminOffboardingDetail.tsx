import { Link, useParams } from 'react-router';
import {
  computeProgress,
  daysUntilLastDay,
  useAuditLog,
  useOffboardingDetail,
  type AuditEntry,
} from '../../lib/admin';
import { TASK_CATALOGUE, type TaskKey, type TaskStatus } from '../../lib/offboarding';

const TASK_STATUS_STYLES: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not started', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  in_progress: { label: 'In progress', color: '#a5b4fc', bg: 'rgba(67,86,169,0.25)' },
  completed: { label: 'Completed', color: '#ffffff', bg: 'rgba(255,255,255,0.18)' },
  skipped: { label: 'Skipped', color: '#cbd5e1', bg: 'rgba(51,65,85,0.45)' },
};

const ACTION_LABELS: Record<string, string> = {
  set_supervisor: 'Set supervisor',
  set_out_of_office: 'Activated out-of-office',
  scan_drive: 'Scanned Drive',
  move_to_folder: 'Moved file',
  move_to_shared_drive: 'Moved file to shared drive',
  transfer_ownership: 'Transferred file ownership',
  mark_personal: 'Marked file personal',
  mark_files_personal_bulk: 'Bulk-marked personal files',
  mark_task_complete: 'Updated task status',
  create_handoff_doc: 'Created handoff doc',
};

function AuditRow({ entry }: { entry: AuditEntry }) {
  const ts = entry.ts?.toDate
    ? entry.ts.toDate().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  return (
    <div className="flex items-baseline gap-3 py-2" style={{ padding: '0.5rem 0' }}>
      <span className="shrink-0 font-mono text-xs text-white/50" style={{ minWidth: '4.5rem' }}>
        {ts}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-white">{label}</span>
        {entry.target && entry.target !== `tasks.${label}` && (
          <span className="ml-2 truncate text-xs text-white/60">{entry.target}</span>
        )}
      </span>
      {!entry.success && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: 'rgba(173,33,34,0.25)', color: '#fecaca' }}
        >
          Failed
        </span>
      )}
    </div>
  );
}

export function AdminOffboardingDetail() {
  const { uid } = useParams();
  const detail = useOffboardingDetail(uid ?? null);
  const audit = useAuditLog(uid ?? null, 50);

  if (detail.loading) {
    return (
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Loading…
      </p>
    );
  }

  if ('error' in detail) {
    return (
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: 'rgba(173,33,34,0.12)', color: '#fecaca' }}
      >
        Couldn't load record: {detail.error.message}
      </div>
    );
  }

  if (!detail.exists) {
    return (
      <div>
        <Link
          to="/admin"
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          ← Back to admin dashboard
        </Link>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
          That record doesn't exist (or you don't have access).
        </p>
      </div>
    );
  }

  const o = detail.data;
  const { done, total, percent } = computeProgress(o);
  const days = daysUntilLastDay(o.lastDay);

  return (
    <div>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to admin dashboard
      </Link>

      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          {o.displayName || o.email}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {o.email}
          {o.supervisorName && (
            <>
              {' · '}supervisor {o.supervisorName} ({o.supervisor})
            </>
          )}
        </p>
      </div>

      {/* Summary card */}
      <div
        className="mb-4 rounded-xl p-4 sm:p-5"
        style={{
          background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
          boxShadow: '0 2px 12px rgba(29,42,93,0.3)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3 text-white">
          <span className="text-2xl font-bold">{percent}%</span>
          <span className="text-xs text-white/70">
            {done} of {total} tasks done
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            {o.status === 'in_progress'
              ? 'In progress'
              : o.status === 'completed'
                ? 'Completed'
                : o.status}
          </span>
          {days !== null && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              {days < 0
                ? `${Math.abs(days)}d past last day`
                : days === 0
                  ? 'Last day is today'
                  : `${days}d until last day`}
            </span>
          )}
        </div>
      </div>

      {/* Task grid */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TASK_CATALOGUE.map((task) => {
          const state = o.tasks[task.key as TaskKey];
          const status = (state?.status as TaskStatus) ?? 'not_started';
          const style = TASK_STATUS_STYLES[status];
          const completedAt =
            (state?.completedAt as { toDate: () => Date } | null | undefined) ?? null;
          const notes = state?.notes as string | null | undefined;

          return (
            <div
              key={task.key}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{task.label}</h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: style.bg, color: style.color }}
                >
                  {style.label}
                </span>
              </div>
              {completedAt && (
                <p className="text-xs text-white/55">
                  Completed{' '}
                  {completedAt.toDate().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
              {notes && <p className="mt-2 text-xs text-white/70">{notes as string}</p>}
            </div>
          );
        })}
      </div>

      {/* Audit log */}
      <div className="rounded-xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-white/60 uppercase">
          Recent activity
        </h2>
        {audit.loading && <p className="text-sm text-white/60">Loading…</p>}
        {!audit.loading && 'error' in audit && (
          <p className="text-sm" style={{ color: '#fecaca' }}>
            Couldn't load audit log: {audit.error.message}
          </p>
        )}
        {!audit.loading && 'entries' in audit && audit.entries.length === 0 && (
          <p className="text-sm text-white/60">No activity yet.</p>
        )}
        {!audit.loading && 'entries' in audit && audit.entries.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {audit.entries.map((e) => (
              <AuditRow key={e.id} entry={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
