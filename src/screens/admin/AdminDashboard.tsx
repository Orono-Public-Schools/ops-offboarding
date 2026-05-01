import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  computeProgress,
  daysUntilLastDay,
  useAllOffboardings,
  type OffboardingSummary,
} from '../../lib/admin';
import { syncStaffRoster } from '../../lib/functions';
import { BUILDING_CHECKLISTS } from '../../lib/offboarding';

type FilterType = 'all' | 'returning' | 'leaving';

const BUILDING_LABEL_BY_KEY = new Map(BUILDING_CHECKLISTS.map((b) => [b.key, b.label]));

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
  // Default legacy docs (no type field) to "leaving" so badge matches the filter.
  const effectiveType = offboarding.type ?? 'leaving';
  const isLeaving = effectiveType === 'leaving';
  const isReturning = effectiveType === 'returning';
  const urgent = days !== null && days <= 7 && offboarding.status === 'in_progress';
  const buildingLabel = offboarding.buildingChecklist
    ? BUILDING_LABEL_BY_KEY.get(offboarding.buildingChecklist)
    : null;

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
          {isReturning && buildingLabel && <> · {buildingLabel}</>}
          {isLeaving && offboarding.supervisorName && (
            <> · supervisor {offboarding.supervisorName}</>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            background: isLeaving ? 'rgba(173,33,34,0.4)' : 'rgba(255,255,255,0.18)',
            color: '#ffffff',
          }}
        >
          {isLeaving ? 'Leaving' : 'Returning'}
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
        >
          {style.label}
        </span>
        {isLeaving && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: urgent ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
              color: '#ffffff',
            }}
          >
            {urgencyHint(days, offboarding.status)}
          </span>
        )}
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
  const [filter, setFilter] = useState<FilterType>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  const allOffboardings =
    !state.loading && 'offboardings' in state ? state.offboardings : ([] as OffboardingSummary[]);
  const filtered = useMemo(() => {
    if (filter === 'all') return allOffboardings;
    return allOffboardings.filter((o) => (o.type ?? 'leaving') === filter);
  }, [allOffboardings, filter]);
  const counts = useMemo(() => {
    let leaving = 0;
    let returning = 0;
    for (const o of allOffboardings) {
      if ((o.type ?? 'leaving') === 'leaving') leaving += 1;
      else returning += 1;
    }
    return { leaving, returning, all: allOffboardings.length };
  }, [allOffboardings]);

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
            Everyone with an active year-end checklist or offboarding. Click in to see per-task
            status and the audit log.
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

      {!state.loading && 'offboardings' in state && state.offboardings.length > 0 && (
        <div
          className="mb-4 flex flex-wrap gap-1 rounded-xl p-1"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          {(
            [
              { key: 'all', label: 'All', count: counts.all },
              { key: 'returning', label: 'Returning', count: counts.returning },
              { key: 'leaving', label: 'Leaving', count: counts.leaving },
            ] as const
          ).map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={
                  active
                    ? {
                        background: 'rgba(255,255,255,0.18)',
                        color: '#ffffff',
                      }
                    : { color: 'rgba(255,255,255,0.55)' }
                }
              >
                {opt.label}{' '}
                <span className="font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ({opt.count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!state.loading && 'offboardings' in state && filtered.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {state.offboardings.length === 0
              ? 'No checklists yet.'
              : `No ${filter} checklists right now.`}
          </p>
        </div>
      )}

      {!state.loading && 'offboardings' in state && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Row key={o.uid} offboarding={o} />
          ))}
        </div>
      )}
    </div>
  );
}
