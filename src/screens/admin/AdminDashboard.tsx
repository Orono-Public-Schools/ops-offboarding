import { useState } from 'react';
import { Link } from 'react-router';
import {
  computeProgress,
  daysUntilLastDay,
  useAllOffboardings,
  type OffboardingSummary,
} from '../../lib/admin';
import { syncStaffRoster } from '../../lib/functions';

const STATUS_STYLES: Record<string, { label: string; cardBg: string; cardGlow: string }> = {
  in_progress: {
    label: 'In progress',
    cardBg: 'linear-gradient(135deg, #4356a9 0%, #5a6fbf 100%)',
    cardGlow: 'rgba(67,86,169,0.3)',
  },
  completed: {
    label: 'Completed',
    cardBg: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
    cardGlow: 'rgba(29,42,93,0.3)',
  },
  archived: {
    label: 'Archived',
    cardBg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    cardGlow: 'rgba(100,116,139,0.2)',
  },
};

function urgencyHint(days: number | null, status: string): string {
  if (status === 'completed') return 'Completed';
  if (status === 'archived') return 'Archived';
  if (days === null) return 'No last day set';
  if (days < 0) return `${Math.abs(days)}d past last day`;
  if (days === 0) return 'Last day is today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function Row({ offboarding }: { offboarding: OffboardingSummary }) {
  const style = STATUS_STYLES[offboarding.status] ?? STATUS_STYLES.in_progress;
  const { done, total, percent } = computeProgress(offboarding);
  const days = daysUntilLastDay(offboarding.lastDay);
  const urgent = days !== null && days <= 7 && offboarding.status === 'in_progress';

  return (
    <Link
      to={`/admin/offboardings/${offboarding.uid}`}
      className="flex flex-col gap-3 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
      style={{ background: style.cardBg, boxShadow: `0 2px 12px ${style.cardGlow}` }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {offboarding.displayName || offboarding.email}
        </p>
        <p className="truncate text-xs text-white/65">
          {offboarding.email}
          {offboarding.supervisorName && <> · supervisor {offboarding.supervisorName}</>}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
        >
          {style.label}
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            background: urgent ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
            color: '#ffffff',
          }}
        >
          {urgencyHint(days, offboarding.status)}
        </span>
        <span className="text-sm font-bold text-white">
          {percent}%{' '}
          <span className="text-xs font-normal text-white/70">
            ({done}/{total})
          </span>
        </span>
      </div>
    </Link>
  );
}

export function AdminDashboard() {
  const state = useAllOffboardings();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  const handleSyncStaff = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncStaffRoster();
      const removedNote = res.data.removed > 0 ? `, removed ${res.data.removed}` : '';
      setSyncMessage({
        kind: 'ok',
        text: `Synced ${res.data.synced} staff${removedNote}.`,
      });
    } catch (err) {
      setSyncMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Sync failed.',
      });
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
            IT admin dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Everyone currently going through offboarding. Click in to see per-task status and the
            audit log.
          </p>
        </div>
        <button
          onClick={handleSyncStaff}
          disabled={syncing}
          className="shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60 sm:text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        >
          {syncing ? 'Syncing…' : 'Sync staff roster'}
        </button>
      </div>

      {syncMessage && (
        <p
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{
            background:
              syncMessage.kind === 'ok' ? 'rgba(255,255,255,0.08)' : 'rgba(173,33,34,0.12)',
            color: syncMessage.kind === 'ok' ? '#ffffff' : '#fecaca',
          }}
        >
          {syncMessage.kind === 'ok' ? '✓ ' : '✕ '}
          {syncMessage.text}
        </p>
      )}

      {state.loading && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Loading…
        </p>
      )}

      {!state.loading && 'error' in state && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(173,33,34,0.12)', color: '#fecaca' }}
        >
          Couldn't load offboardings: {state.error.message}
        </div>
      )}

      {!state.loading && 'offboardings' in state && state.offboardings.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            No offboardings yet.
          </p>
        </div>
      )}

      {!state.loading && 'offboardings' in state && state.offboardings.length > 0 && (
        <div className="space-y-3">
          {state.offboardings.map((o) => (
            <Row key={o.uid} offboarding={o} />
          ))}
        </div>
      )}
    </div>
  );
}
