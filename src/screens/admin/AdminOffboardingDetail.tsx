import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  computeProgress,
  daysUntilLastDay,
  useAuditLog,
  useOffboardingDetail,
  type AuditEntry,
} from '../../lib/admin';
import { resetUserChecklist, resolveHelp } from '../../lib/functions';
import {
  TASK_CATALOGUE,
  taskKeysForDoc,
  type HelpRequest,
  type TaskKey,
  type TaskStatus,
} from '../../lib/offboarding';

const TASK_STATUS_STYLES: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not started', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  in_progress: { label: 'In progress', color: '#a5b4fc', bg: 'rgba(67,86,169,0.25)' },
  completed: { label: 'Completed', color: '#ffffff', bg: 'rgba(255,255,255,0.18)' },
  skipped: { label: 'Skipped', color: '#cbd5e1', bg: 'rgba(51,65,85,0.45)' },
};

const ACTION_LABELS: Record<string, string> = {
  set_supervisor: 'Set supervisor',
  set_last_day: 'Set last day',
  set_out_of_office: 'Activated out-of-office',
  scan_drive: 'Scanned Drive',
  move_to_folder: 'Moved file',
  move_to_shared_drive: 'Moved file to shared drive',
  transfer_ownership: 'Transferred file ownership',
  mark_personal: 'Marked file personal',
  mark_files_personal_bulk: 'Bulk-marked personal files',
  mark_task_complete: 'Updated task status',
  create_handoff_doc: 'Created handoff doc',
  request_help: 'Flagged for help',
  resolve_help: 'Resolved help request',
  request_gmail_forwarding: 'Requested mail forwarding',
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
  const navigate = useNavigate();
  const detail = useOffboardingDetail(uid ?? null);
  const audit = useAuditLog(uid ?? null, 50);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resolvingKey, setResolvingKey] = useState<TaskKey | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleResolveHelp = async (taskKey: TaskKey) => {
    if (!uid) return;
    setResolveError(null);
    setResolvingKey(taskKey);
    try {
      await resolveHelp({ taskKey, uid });
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Could not resolve. Please try again.');
      console.error(err);
    } finally {
      setResolvingKey(null);
    }
  };

  const handleReset = async () => {
    if (!uid) return;
    const confirmed = window.confirm(
      'Reset this user? Their checklist, all task statuses, audit log entries, and any cached file scan results will be permanently deleted. They’ll see the welcome screen again next time they sign in.',
    );
    if (!confirmed) return;
    setResetting(true);
    setResetError(null);
    try {
      await resetUserChecklist({ uid });
      navigate('/admin');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Reset failed.');
      console.error(err);
      setResetting(false);
    }
  };

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
  const taskLookup = new Map(TASK_CATALOGUE.map((t) => [t.key, t]));
  const visibleTasks = taskKeysForDoc(o)
    .map((key) => taskLookup.get(key))
    .filter((t): t is (typeof TASK_CATALOGUE)[number] => Boolean(t));

  return (
    <div>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to admin dashboard
      </Link>

      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
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
        <button
          onClick={handleReset}
          disabled={resetting}
          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 sm:text-sm"
          style={{
            background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
            boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
          }}
        >
          {resetting ? 'Resetting…' : 'Reset user'}
        </button>
      </div>

      {resetError && (
        <p
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(173,33,34,0.18)', color: '#fecaca' }}
        >
          {resetError}
        </p>
      )}

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

      {resolveError && (
        <p
          className="mb-3 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(173,33,34,0.18)', color: '#fecaca' }}
        >
          {resolveError}
        </p>
      )}

      {/* Task grid */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleTasks.map((task) => {
          const state = o.tasks[task.key as TaskKey];
          const status = (state?.status as TaskStatus) ?? 'not_started';
          const style = TASK_STATUS_STYLES[status];
          const completedAt =
            (state?.completedAt as { toDate: () => Date } | null | undefined) ?? null;
          const notes = state?.notes as string | null | undefined;
          const forwardTo =
            task.key === 'gmailForwarding' ? (state?.forwardTo as string | null | undefined) : null;
          const forwardingNote =
            task.key === 'gmailForwarding' ? (state?.note as string | null | undefined) : null;
          const help = state?.help as HelpRequest | null | undefined;
          const helpPending = Boolean(help && !help.resolvedAt);
          const helpRequestedAt = help?.requestedAt?.toDate
            ? help.requestedAt.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <div
              key={task.key}
              className="rounded-xl p-4"
              style={{
                background: helpPending ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
                border: helpPending ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
              }}
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
              {forwardTo && (
                <p className="mt-2 text-xs font-semibold text-white/85">Forward to: {forwardTo}</p>
              )}
              {forwardingNote && <p className="mt-1 text-xs text-white/70">{forwardingNote}</p>}
              {notes && <p className="mt-2 text-xs text-white/70">{notes as string}</p>}
              {helpPending && help && (
                <div
                  className="mt-3 rounded-lg p-3"
                  style={{ background: 'rgba(245,158,11,0.18)' }}
                >
                  <p
                    className="text-[11px] font-semibold tracking-wider uppercase"
                    style={{ color: '#fde68a' }}
                  >
                    🚩 Help requested{helpRequestedAt ? ` · ${helpRequestedAt}` : ''}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: '#fde68a' }}>
                    "{help.reason}"
                  </p>
                  <button
                    onClick={() => handleResolveHelp(task.key as TaskKey)}
                    disabled={resolvingKey === task.key}
                    className="mt-2 rounded-lg border px-3 py-1 text-[11px] font-semibold transition hover:bg-white/10 disabled:opacity-60"
                    style={{ borderColor: 'rgba(253,230,138,0.5)', color: '#fde68a' }}
                  >
                    {resolvingKey === task.key ? 'Resolving…' : 'Mark resolved'}
                  </button>
                </div>
              )}
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
