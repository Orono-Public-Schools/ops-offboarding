import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AdminListCard } from '../../components/AdminListCard';
import {
  computeProgress,
  daysUntilLastDay,
  useAllOffboardings,
  type OffboardingSummary,
} from '../../lib/admin';
import { setEoySettings, syncStaffRoster } from '../../lib/functions';
import {
  BUILDING_CHECKLISTS,
  TASK_CATALOGUE,
  type HelpRequest,
  type TaskKey,
} from '../../lib/offboarding';
import {
  DEFAULT_EOY_RETURN_DATE,
  formatRelativeTime,
  useEoySettings,
  useStaffRosterSyncStatus,
} from '../../lib/settings';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { DayHeader } from '../../ds/components/navigation/DayHeader';
import { TabBar, type TabEntry } from '../../ds/components/navigation/TabBar';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { Field } from '../../ds/components/forms/Field';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';

type FilterType = 'all' | 'returning' | 'leaving';

type AdminTab = 'offboarding' | 'onboarding' | 'forms' | 'staff';
const ADMIN_TABS: TabEntry[] = [
  { id: 'offboarding', label: 'Offboarding', icon: 'logOut' },
  { id: 'onboarding', label: 'Onboarding', icon: 'users' },
  { id: 'forms', label: 'Forms', icon: 'fileText' },
  { id: 'staff', label: 'Staff & access', icon: 'key' },
];
function isAdminTab(v: string | null): v is AdminTab {
  return v === 'offboarding' || v === 'onboarding' || v === 'forms' || v === 'staff';
}

const BUILDING_LABEL_BY_KEY = new Map(BUILDING_CHECKLISTS.map((b) => [b.key, b.label]));

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** School-year rail: Sep 1 – Jun 10. Returns null over the summer. */
function schoolYearRail(now: Date): { pct: number; left: string; right: string } | null {
  const y = now.getFullYear();
  const start = now.getMonth() >= 8 ? new Date(y, 8, 1) : new Date(y - 1, 8, 1);
  const end = now.getMonth() >= 8 ? new Date(y + 1, 5, 10) : new Date(y, 5, 10);
  if (now > end || now < start) return null;
  const day = Math.ceil((now.getTime() - start.getTime()) / 86_400_000);
  const total = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  return {
    pct: Math.round((day / total) * 100),
    left: `Day ${day} of the school year`,
    right: `${total - day} days to June 10`,
  };
}

function badgeFor(status: string): { state: 'processing' | 'completed' | 'draft'; label?: string } {
  if (status === 'in_progress') return { state: 'processing', label: 'In progress' };
  if (status === 'completed') return { state: 'completed' };
  if (status === 'archived') return { state: 'draft', label: 'Archived' };
  return { state: 'draft', label: status };
}

function urgencyHint(days: number | null): string {
  if (days === null) return 'No last day set';
  if (days < 0) return `${Math.abs(days)}d past last day`;
  if (days === 0) return 'Last day is today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function Row({ offboarding }: { offboarding: OffboardingSummary }) {
  const { done, total } = computeProgress(offboarding);
  const days = daysUntilLastDay(offboarding.lastDay);
  // Default legacy docs (no type field) to "leaving" so the label matches the filter.
  const effectiveType = offboarding.type ?? 'leaving';
  const isLeaving = effectiveType === 'leaving';
  const badge = badgeFor(offboarding.status);
  const buildingLabel = offboarding.buildingChecklist
    ? BUILDING_LABEL_BY_KEY.get(offboarding.buildingChecklist)
    : null;

  const meta = [offboarding.email];
  if (!isLeaving && buildingLabel) meta.push(buildingLabel);
  if (isLeaving && offboarding.supervisorName)
    meta.push(`supervisor ${offboarding.supervisorName}`);

  return (
    <Link
      to={`/admin/offboardings/${offboarding.uid}`}
      className="flex flex-col gap-2 no-underline transition-colors duration-200 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{ font: 'var(--type-body)', fontWeight: 600, color: 'var(--dark)', margin: 0 }}
        >
          {offboarding.displayName || offboarding.email}
        </p>
        <p
          className="truncate"
          style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}
        >
          {meta.join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          {done} of {total}
        </span>
        <StatusBadge state={badge.state} label={badge.label} size="sm" />
        {isLeaving && offboarding.status === 'in_progress' && (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            {urgencyHint(days)}
          </span>
        )}
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          {isLeaving ? 'Leaving' : 'Returning'}
        </span>
      </div>
    </Link>
  );
}

export function AdminDashboard() {
  const state = useAllOffboardings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: AdminTab = isAdminTab(tabParam) ? tabParam : 'offboarding';
  const [filter, setFilter] = useState<FilterType>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  const settingsState = useEoySettings();
  const syncState = useStaffRosterSyncStatus();
  const [returnDateInput, setReturnDateInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (settingsState.loading) return;
    setReturnDateInput(settingsState.settings.returnDate ?? DEFAULT_EOY_RETURN_DATE);
  }, [settingsState]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const value = returnDateInput.trim() || null;
      await setEoySettings({ returnDate: value });
      setSettingsMessage({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      setSettingsMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Save failed.',
      });
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const allOffboardings =
    !state.loading && 'offboardings' in state ? state.offboardings : ([] as OffboardingSummary[]);

  const taskLabelByKey = useMemo(() => new Map(TASK_CATALOGUE.map((t) => [t.key, t.label])), []);

  const openHelpRequests = useMemo(() => {
    type Open = {
      uid: string;
      displayName: string;
      email: string;
      taskKey: TaskKey;
      taskLabel: string;
      reason: string;
      requestedAt: Date | null;
    };
    const out: Open[] = [];
    for (const o of allOffboardings) {
      for (const [key, state] of Object.entries(o.tasks ?? {})) {
        const help = (state as { help?: HelpRequest | null } | undefined)?.help;
        if (!help || help.resolvedAt) continue;
        out.push({
          uid: o.uid,
          displayName: o.displayName || o.email,
          email: o.email,
          taskKey: key as TaskKey,
          taskLabel: taskLabelByKey.get(key as TaskKey) ?? key,
          reason: help.reason,
          requestedAt: help.requestedAt?.toDate ? help.requestedAt.toDate() : null,
        });
      }
    }
    out.sort((a, b) => {
      const ta = a.requestedAt?.getTime() ?? 0;
      const tb = b.requestedAt?.getTime() ?? 0;
      return tb - ta;
    });
    return out;
  }, [allOffboardings, taskLabelByKey]);
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

  const now = new Date();
  const rail = schoolYearRail(now);
  const inMotion = allOffboardings.filter((o) => o.status === 'in_progress').length;

  const staffCount = !syncState.loading ? syncState.status?.synced : undefined;
  const headline =
    tab === 'staff'
      ? staffCount
        ? `${staffCount} people on the roster`
        : 'Staff & access'
      : tab === 'onboarding'
        ? 'Onboarding has no settings yet'
        : tab === 'forms'
          ? 'Forms run themselves for now'
          : inMotion === 0
            ? 'Nothing in motion'
            : inMotion === 1
              ? 'One offboarding in motion'
              : `${inMotion} offboardings in motion`;
  const subtitle =
    tab === 'staff'
      ? 'The roster sync and who can work this dashboard.'
      : tab === 'onboarding'
        ? 'When onboarding opens, new-hire settings and checklists will live here.'
        : tab === 'forms'
          ? 'Submissions land in the HR inbox; routing settings arrive with the next batch of forms.'
          : 'Everyone with an active checklist shows here. Open a row for per-task status and the audit trail.';

  const messageStyle = (kind: 'ok' | 'error'): React.CSSProperties => ({
    font: 'var(--type-body-sm)',
    color: kind === 'ok' ? 'var(--primary)' : 'var(--accent)',
    background: kind === 'ok' ? 'var(--tint)' : 'rgba(var(--accent-rgb), 0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    margin: '12px 0 0',
  });

  return (
    <>
      <DayHeader
        weekday={WEEKDAYS[now.getDay()]}
        day={now.getDate()}
        month={MONTHS[now.getMonth()]}
        title={headline}
        subtitle={subtitle}
        railPct={rail?.pct}
        railLeft={rail?.left}
        railRight={rail?.right}
      />

      <TabBar
        tabs={ADMIN_TABS}
        active={tab}
        onSelect={(id) => navigate(`/admin?tab=${id}`, { replace: true })}
      />

      {tab === 'offboarding' && openHelpRequests.length > 0 && (
        <Card
          eyebrow="Help"
          heading={
            openHelpRequests.length === 1
              ? 'One task is waiting on a hand'
              : `${openHelpRequests.length} tasks are waiting on a hand`
          }
          pad={16}
        >
          <RowList>
            {openHelpRequests.map((req) => (
              <Link
                key={`${req.uid}-${req.taskKey}`}
                to={`/admin/offboardings/${req.uid}`}
                className="flex flex-col gap-1 no-underline sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p
                    style={{
                      font: 'var(--type-body)',
                      fontWeight: 600,
                      color: 'var(--dark)',
                      margin: 0,
                    }}
                  >
                    {req.displayName} · {req.taskLabel}
                  </p>
                  <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}>
                    “{req.reason}”
                  </p>
                </div>
                <span
                  className="shrink-0"
                  style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}
                >
                  {req.requestedAt
                    ? req.requestedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </span>
              </Link>
            ))}
          </RowList>
        </Card>
      )}

      {tab === 'offboarding' && (
        <Card
          eyebrow="Offboardings"
          heading={
            filter === 'all'
              ? 'Everyone with a checklist'
              : filter === 'leaving'
                ? 'People leaving the district'
                : 'People coming back in fall'
          }
          headingRight={
            allOffboardings.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(
                  [
                    { key: 'all', label: 'All', count: counts.all },
                    { key: 'returning', label: 'Returning', count: counts.returning },
                    { key: 'leaving', label: 'Leaving', count: counts.leaving },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.key}
                    size="sm"
                    variant={filter === opt.key ? 'primary' : 'ghost'}
                    onClick={() => setFilter(opt.key)}
                  >
                    {opt.label} ({opt.count})
                  </Button>
                ))}
              </div>
            ) : undefined
          }
          pad={16}
        >
          {state.loading ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Loading…
            </p>
          ) : 'error' in state ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
              Couldn't load offboardings: {state.error.message}
            </p>
          ) : filtered.length === 0 ? (
            <EmptyState
              on="card"
              icon="users"
              line={
                state.offboardings.length === 0
                  ? 'No checklists yet'
                  : `No ${filter} checklists right now`
              }
              note={
                state.offboardings.length === 0
                  ? 'Checklists appear here the moment staff start one.'
                  : undefined
              }
            />
          ) : (
            <RowList>
              {filtered.map((o) => (
                <Row key={o.uid} offboarding={o} />
              ))}
            </RowList>
          )}
        </Card>
      )}

      {tab === 'offboarding' && (
        <Card eyebrow="Settings" heading="What the summer responder promises" pad={16}>
          <p
            style={{
              font: 'var(--type-caption)',
              color: 'var(--text-muted)',
              margin: '0 0 12px',
            }}
          >
            The return date staff reference in their summer vacation responder. Secondary buildings
            auto-shift one day later — that matches OPS's historical pattern.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field
                label="Return date"
                type="date"
                value={returnDateInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReturnDateInput(e.target.value)
                }
                disabled={settingsState.loading || savingSettings}
              />
            </div>
            <Button
              variant="primary"
              icon="save"
              disabled={settingsState.loading || savingSettings}
              onClick={() => void handleSaveSettings()}
            >
              {savingSettings ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {settingsMessage && (
            <p style={messageStyle(settingsMessage.kind)}>{settingsMessage.text}</p>
          )}
        </Card>
      )}

      {tab === 'onboarding' && (
        <EmptyState
          icon="users"
          line="Nothing to set up yet"
          note="Onboarding ships in a later phase — new-hire checklists and settings will live on this tab."
        />
      )}

      {tab === 'forms' && (
        <EmptyState
          icon="fileText"
          line="No form settings yet"
          note="Staff submissions land in the HR inbox. Per-form routing and visibility settings arrive with the next batch of forms."
          action={
            <Button variant="secondary" onClick={() => navigate('/hr')}>
              Open the HR inbox
            </Button>
          }
        />
      )}

      {tab === 'staff' && (
        <Card
          eyebrow="Roster"
          heading="Synced nightly at 3:00 AM Central"
          headingRight={
            <Button
              variant="primary"
              size="sm"
              disabled={syncing}
              onClick={() => void handleSyncStaff()}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          }
          pad={16}
        >
          <RowList>
            <DetailRow
              label="Staff"
              value={
                syncState.loading
                  ? 'Loading…'
                  : syncState.status?.lastSyncedAt
                    ? `${syncState.status.synced ?? '?'} people`
                    : '—'
              }
            />
            <DetailRow
              label="Last synced"
              value={
                syncState.loading
                  ? 'Loading…'
                  : syncState.status?.lastSyncedAt
                    ? `${formatRelativeTime(syncState.status.lastSyncedAt)}${
                        syncState.status.source ? ` (${syncState.status.source})` : ''
                      }`
                    : 'Never'
              }
            />
          </RowList>
          <p
            style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '12px 0 0' }}
          >
            Use Sync now if you’ve just edited the roster sheet and need staff to show up
            immediately.
          </p>
          {syncMessage && <p style={messageStyle(syncMessage.kind)}>{syncMessage.text}</p>}
        </Card>
      )}

      {tab === 'staff' && <AdminListCard />}
    </>
  );
}
