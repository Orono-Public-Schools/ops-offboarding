import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { ProgressBar } from '../../ds/components/core/ProgressBar';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';

const TASK_BADGES: Record<
  TaskStatus,
  { state: 'draft' | 'processing' | 'completed'; label?: string }
> = {
  not_started: { state: 'draft', label: 'Not started' },
  in_progress: { state: 'processing', label: 'In progress' },
  completed: { state: 'completed' },
  skipped: { state: 'draft', label: 'Skipped' },
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
    <DetailRow
      label={ts}
      value={
        <>
          <span style={{ font: 'var(--type-strong)' }}>{label}</span>
          {entry.target && entry.target !== `tasks.${label}` && (
            <span style={{ color: 'var(--text-muted)' }}> · {entry.target}</span>
          )}
          {!entry.success && (
            <StatusBadge state="denied" label="Failed" size="sm" style={{ marginLeft: 8 }} />
          )}
        </>
      }
    />
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
      <p
        style={{
          font: 'var(--type-body-sm)',
          color: 'var(--on-dark-faint)',
          textAlign: 'center',
          padding: '48px 0',
        }}
      >
        Loading…
      </p>
    );
  }

  if ('error' in detail) {
    return (
      <EmptyState
        icon="search"
        line="We can't load that record"
        note={detail.error.message}
        action={
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            Back to the dashboard
          </Button>
        }
      />
    );
  }

  if (!detail.exists) {
    return (
      <EmptyState
        icon="search"
        line="That record doesn't exist"
        note="It may have been reset, or you don't have access to it."
        action={
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            Back to the dashboard
          </Button>
        }
      />
    );
  }

  const o = detail.data;
  const { done, total } = computeProgress(o);
  const days = daysUntilLastDay(o.lastDay);
  const taskLookup = new Map(TASK_CATALOGUE.map((t) => [t.key, t]));
  const visibleTasks = taskKeysForDoc(o)
    .map((key) => taskLookup.get(key))
    .filter((t): t is (typeof TASK_CATALOGUE)[number] => Boolean(t));

  const statusBadge =
    o.status === 'in_progress' ? (
      <StatusBadge state="processing" label="In progress" size="md" />
    ) : o.status === 'completed' ? (
      <StatusBadge state="completed" size="md" />
    ) : (
      <StatusBadge state="draft" label={o.status} size="md" />
    );

  const daysLine =
    days === null
      ? null
      : days < 0
        ? `${Math.abs(days)} days past their last day`
        : days === 0
          ? 'Their last day is today'
          : `${days} days until their last day`;

  const errorStyle: React.CSSProperties = {
    font: 'var(--type-body-sm)',
    color: 'var(--accent)',
    background: 'rgba(var(--accent-rgb), 0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    margin: 0,
  };

  return (
    <>
      <PageTitle
        eyebrow={`Offboarding · ${o.email}`}
        title={o.displayName || o.email}
        subtitle={o.supervisorName ? `Supervisor ${o.supervisorName} (${o.supervisor})` : undefined}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {statusBadge}
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
              All offboardings
            </Button>
          </div>
        }
      />

      <Card eyebrow="Progress" heading={`${done} of ${total} tasks handled`} pad={16}>
        <ProgressBar total={total} done={done} />
        {daysLine && (
          <p
            style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '10px 0 0' }}
          >
            {daysLine}
          </p>
        )}
      </Card>

      {resolveError && <p style={errorStyle}>{resolveError}</p>}

      <Card eyebrow="Tasks" heading="Where each one sits" pad={16}>
        <RowList>
          {visibleTasks.map((task) => {
            const state = o.tasks[task.key as TaskKey];
            const status = (state?.status as TaskStatus) ?? 'not_started';
            const badge = TASK_BADGES[status];
            const completedAt =
              (state?.completedAt as { toDate: () => Date } | null | undefined) ?? null;
            const notes = state?.notes as string | null | undefined;
            const forwardTo =
              task.key === 'gmailForwarding'
                ? (state?.forwardTo as string | null | undefined)
                : null;
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
              <div key={task.key}>
                <div className="flex items-start justify-between gap-3">
                  <span style={{ font: 'var(--type-body)', fontWeight: 600, color: 'var(--dark)' }}>
                    {task.label}
                  </span>
                  <StatusBadge state={badge.state} label={badge.label} size="sm" />
                </div>
                {completedAt && (
                  <p
                    style={{
                      font: 'var(--type-caption)',
                      color: 'var(--text-muted)',
                      margin: '2px 0 0',
                    }}
                  >
                    Completed{' '}
                    {completedAt.toDate().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
                {(forwardTo || forwardingNote) && (
                  <div
                    style={{
                      background: 'var(--surface-inset)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginTop: 8,
                    }}
                  >
                    {forwardTo && (
                      <p style={{ font: 'var(--type-body-sm)', color: 'var(--dark)', margin: 0 }}>
                        <span style={{ fontWeight: 600 }}>Forward to</span> {forwardTo}
                      </p>
                    )}
                    {forwardingNote && (
                      <p
                        style={{
                          font: 'var(--type-caption)',
                          color: 'var(--text-muted)',
                          margin: forwardTo ? '4px 0 0' : 0,
                        }}
                      >
                        {forwardingNote}
                      </p>
                    )}
                  </div>
                )}
                {notes && (
                  <p
                    style={{
                      font: 'var(--type-caption)',
                      color: 'var(--text-muted)',
                      margin: '6px 0 0',
                    }}
                  >
                    {notes}
                  </p>
                )}
                {helpPending && help && (
                  <div
                    style={{
                      background: 'var(--tint)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginTop: 8,
                    }}
                  >
                    <p style={{ font: 'var(--type-body-sm)', color: 'var(--dark)', margin: 0 }}>
                      <span style={{ fontWeight: 600 }}>Asked for help</span>
                      {helpRequestedAt ? ` · ${helpRequestedAt}` : ''}
                    </p>
                    <p
                      style={{
                        font: 'var(--type-caption)',
                        color: 'var(--text-body)',
                        margin: '4px 0 8px',
                      }}
                    >
                      “{help.reason}”
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="check"
                      disabled={resolvingKey === task.key}
                      onClick={() => void handleResolveHelp(task.key as TaskKey)}
                    >
                      {resolvingKey === task.key ? 'Resolving…' : 'Mark resolved'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </RowList>
      </Card>

      <Card eyebrow="Audit" heading="Everything that's happened" pad={16}>
        {audit.loading && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Loading…
          </p>
        )}
        {!audit.loading && 'error' in audit && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
            Couldn't load audit log: {audit.error.message}
          </p>
        )}
        {!audit.loading && 'entries' in audit && audit.entries.length === 0 && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            No activity yet.
          </p>
        )}
        {!audit.loading && 'entries' in audit && audit.entries.length > 0 && (
          <RowList>
            {audit.entries.map((e) => (
              <AuditRow key={e.id} entry={e} />
            ))}
          </RowList>
        )}
      </Card>

      <Card eyebrow="Reset" heading="Start this person over" pad={16}>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Their checklist, task statuses, audit log entries, and cached file scan results are
          permanently deleted. They see the welcome screen again next time they sign in.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="destructive" disabled={resetting} onClick={() => void handleReset()}>
            {resetting ? 'Resetting…' : 'Reset user'}
          </Button>
        </div>
        {resetError && <p style={{ ...errorStyle, margin: '12px 0 0' }}>{resetError}</p>}
      </Card>
    </>
  );
}
