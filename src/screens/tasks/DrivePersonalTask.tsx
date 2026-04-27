import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { PersonPicker } from '../../components/PersonPicker';
import { SharedDrivePicker } from '../../components/SharedDrivePicker';
import { getGoogleAccessToken, useAuth } from '../../lib/auth';
import { driveUrl, formatBytes, shortType, useFileScan, type FileScanEntry } from '../../lib/drive';
import {
  markFilePersonal,
  markFilesPersonalBulk,
  moveFileToSharedDrive,
  scanDrive,
  transferFileOwnership,
} from '../../lib/functions';
import type { OutletCtx } from '../../App';

type Mode = 'summary' | 'walkthrough';

function categorize(entries: FileScanEntry[]) {
  const personal: FileScanEntry[] = [];
  const handedOff: FileScanEntry[] = [];
  const needsDecision: FileScanEntry[] = [];
  const decided: FileScanEntry[] = [];
  for (const e of entries) {
    if (e.decision !== 'pending') {
      decided.push(e);
      continue;
    }
    if (!e.inMyDrive) {
      handedOff.push(e);
      continue;
    }
    if (e.collaboratorCount === 0) {
      personal.push(e);
      continue;
    }
    needsDecision.push(e);
  }
  return { personal, handedOff, needsDecision, decided };
}

type CategoryVariant = 'urgent' | 'neutral' | 'success';

const CATEGORY_STYLES: Record<CategoryVariant, { cardBg: string; cardGlow: string }> = {
  urgent: {
    cardBg: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
    cardGlow: 'rgba(173,33,34,0.3)',
  },
  neutral: {
    cardBg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    cardGlow: 'rgba(100,116,139,0.2)',
  },
  success: {
    cardBg: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
    cardGlow: 'rgba(29,42,93,0.3)',
  },
};

function CategoryCard({
  label,
  count,
  detail,
  action,
  variant,
}: {
  label: string;
  count: number;
  detail: string;
  action?: { label: string; onClick: () => void; loading?: boolean };
  variant: CategoryVariant;
}) {
  const style = CATEGORY_STYLES[variant];
  return (
    <div
      className="flex flex-col rounded-xl p-4 sm:p-5"
      style={{ background: style.cardBg, boxShadow: `0 2px 12px ${style.cardGlow}` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
        >
          {count}
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-white/80">{detail}</p>
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.loading || count === 0}
          className="mt-auto self-start rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
          style={{ borderColor: 'rgba(255,255,255,0.4)' }}
        >
          {action.loading ? 'Working…' : action.label}
        </button>
      )}
    </div>
  );
}

function WalkthroughCard({
  entry,
  index,
  total,
  onMove,
  onTransfer,
  onPersonal,
  onSkip,
  pending,
}: {
  entry: FileScanEntry;
  index: number;
  total: number;
  onMove: () => void;
  onTransfer: () => void;
  onPersonal: () => Promise<void>;
  onSkip: () => void;
  pending: 'move' | 'transfer' | 'personal' | null;
}) {
  const modified = entry.lastModified
    ? entry.lastModified.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  const collabPreview = entry.collaborators
    .slice(0, 3)
    .map((c) => c.email)
    .join(', ');
  const overflow = entry.collaboratorCount - Math.min(3, entry.collaborators.length);

  return (
    <div
      className="rounded-xl p-5 sm:p-6"
      style={{
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: '#94a3b8' }}
        >
          File {index + 1} of {total}
        </span>
        <a
          href={driveUrl(entry.fileId)}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold"
          style={{ color: '#2d3f89' }}
        >
          Open in Drive →
        </a>
      </div>

      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
          style={{ background: '#eaecf5', color: '#1d2a5d' }}
        >
          {shortType(entry.mimeType)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold" style={{ color: '#1d2a5d' }}>
            {entry.name}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: '#64748b' }}>
            {formatBytes(entry.sizeBytes)} · Modified {modified}
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-lg p-3" style={{ background: '#f8f9fb', color: '#475569' }}>
        <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#64748b' }}>
          Shared with {entry.collaboratorCount}
        </p>
        <p className="mt-1 text-sm" style={{ color: '#334155' }}>
          {collabPreview || '—'}
          {overflow > 0 && <span style={{ color: '#94a3b8' }}> + {overflow} more</span>}
        </p>
      </div>

      <p className="mb-3 text-sm font-semibold" style={{ color: '#1d2a5d' }}>
        What should happen to this file?
      </p>

      <div className="space-y-2">
        <button
          onClick={onMove}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
          style={{ borderColor: '#cbd5e1', color: '#1d2a5d' }}
        >
          <span>Move to a shared drive</span>
          {pending === 'move' && (
            <span className="text-xs font-normal text-slate-400">Working…</span>
          )}
        </button>
        <button
          onClick={onTransfer}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
          style={{ borderColor: '#cbd5e1', color: '#1d2a5d' }}
        >
          <span>Transfer to a colleague</span>
          {pending === 'transfer' && (
            <span className="text-xs font-normal text-slate-400">Working…</span>
          )}
        </button>
        <button
          onClick={() => onPersonal()}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
          style={{ borderColor: '#cbd5e1', color: '#1d2a5d' }}
        >
          <span>It's personal — leave it</span>
          {pending === 'personal' && (
            <span className="text-xs font-normal text-slate-400">Working…</span>
          )}
        </button>
      </div>

      <button
        onClick={onSkip}
        disabled={pending !== null}
        className="mt-4 w-full rounded-xl px-4 py-2 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-50"
        style={{ color: '#64748b' }}
      >
        Skip — decide later
      </button>
    </div>
  );
}

export function DrivePersonalTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const taskState = (doc.tasks.drivePersonal ?? { status: 'not_started' }) as {
    status: string;
    scanCount?: number;
    atRiskCount?: number;
    scanFinishedAt?: { toDate: () => Date } | null;
    truncated?: boolean;
    scanError?: string | null;
  };
  const fileScan = useFileScan(user?.uid ?? null, 5000);

  const [mode, setMode] = useState<Mode>('summary');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [bulkPersonalBusy, setBulkPersonalBusy] = useState(false);
  const [actionPending, setActionPending] = useState<'move' | 'transfer' | 'personal' | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'shared' | 'transfer' | null>(null);

  const entries = !fileScan.loading && 'entries' in fileScan ? fileScan.entries : [];
  const categories = useMemo(() => categorize(entries), [entries]);

  const queue = useMemo(
    () => categories.needsDecision.filter((e) => !skippedIds.has(e.fileId)),
    [categories.needsDecision, skippedIds],
  );
  const current = queue[0] ?? null;
  const reviewedCount = categories.decided.filter((e) => e.inMyDrive).length;
  const totalToReview = categories.needsDecision.length + reviewedCount;

  const handleScan = async () => {
    setScanError(null);
    const token = getGoogleAccessToken();
    if (!token) {
      setScanError('Your Google session expired. Please sign out and sign in again.');
      return;
    }
    setScanning(true);
    try {
      await scanDrive({ googleAccessToken: token });
      setSkippedIds(new Set());
      setMode('summary');
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleBulkPersonal = async () => {
    if (categories.personal.length === 0) return;
    setBulkPersonalBusy(true);
    try {
      await markFilesPersonalBulk({ fileIds: categories.personal.map((e) => e.fileId) });
    } catch (err) {
      console.error(err);
    } finally {
      setBulkPersonalBusy(false);
    }
  };

  const handlePersonalCurrent = async () => {
    if (!current) return;
    setActionPending('personal');
    try {
      await markFilePersonal({ fileId: current.fileId });
    } catch (err) {
      console.error(err);
    } finally {
      setActionPending(null);
    }
  };

  const handleSkipCurrent = () => {
    if (!current) return;
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.add(current.fileId);
      return next;
    });
  };

  const handleConfirmSharedDrive = async (drive: { id: string; name: string }) => {
    if (!current) return;
    const token = getGoogleAccessToken();
    if (!token) throw new Error('Session expired. Please sign in again.');
    setActionPending('move');
    try {
      await moveFileToSharedDrive({
        fileId: current.fileId,
        sharedDriveId: drive.id,
        googleAccessToken: token,
      });
    } finally {
      setActionPending(null);
    }
  };

  const handleConfirmTransfer = async (person: { email: string; displayName: string }) => {
    if (!current) return;
    const token = getGoogleAccessToken();
    if (!token) throw new Error('Session expired. Please sign in again.');
    setActionPending('transfer');
    try {
      await transferFileOwnership({
        fileId: current.fileId,
        newOwnerEmail: person.email,
        googleAccessToken: token,
      });
    } finally {
      setActionPending(null);
    }
  };

  const lastScanned = taskState.scanFinishedAt
    ? taskState.scanFinishedAt.toDate().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  // Render
  return (
    <div>
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to dashboard
      </Link>

      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          My Drive cleanup
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          We sort your Drive into three buckets so you only have to make decisions on the files that
          actually need them.
        </p>
      </div>

      {scanError && (
        <p
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
        >
          {scanError}
        </p>
      )}

      {!lastScanned && (
        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1d2a5d' }}>
            No scan yet
          </p>
          <p className="mt-2 text-xs" style={{ color: '#64748b' }}>
            We'll list files you own in your personal Drive and group them by what needs your
            attention. Reads metadata only — never opens file contents.
          </p>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
            }}
          >
            {scanning ? 'Scanning…' : 'Scan My Drive'}
          </button>
        </div>
      )}

      {lastScanned && mode === 'summary' && (
        <div className="space-y-4">
          <div
            className="flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <span className="font-semibold text-white">
                {taskState.scanCount ?? 0} files scanned
              </span>{' '}
              · last scan {lastScanned}
              {taskState.truncated && (
                <span style={{ color: '#fca5a5' }}> · stopped at 50,000-file limit</span>
              )}
            </p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
              style={{ borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {scanning ? 'Scanning…' : 'Rescan'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CategoryCard
              label="Needs your decision"
              count={categories.needsDecision.length}
              detail="Files in My Drive that you share with others. Walk through these one by one."
              variant="urgent"
              action={
                categories.needsDecision.length > 0
                  ? { label: 'Start review', onClick: () => setMode('walkthrough') }
                  : undefined
              }
            />
            <CategoryCard
              label="Personal — no shares"
              count={categories.personal.length}
              detail="Will be deleted with your account. One click marks them as 'leave alone' so they stop showing up."
              variant="neutral"
              action={
                categories.personal.length > 0
                  ? {
                      label: 'Mark as leave alone',
                      loading: bulkPersonalBusy,
                      onClick: handleBulkPersonal,
                    }
                  : undefined
              }
            />
            <CategoryCard
              label="Already in shared drives"
              count={categories.handedOff.length}
              detail="Owned by a shared drive. Nothing to do — these stay accessible after you leave."
              variant="success"
            />
            {categories.decided.length > 0 && (
              <CategoryCard
                label="Already decided"
                count={categories.decided.length}
                detail="Files you've moved, transferred, or marked personal in earlier sessions."
                variant="success"
              />
            )}
          </div>
        </div>
      )}

      {lastScanned && mode === 'walkthrough' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMode('summary')}
              className="text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              ← Back to summary
            </button>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {reviewedCount} of {totalToReview} reviewed
            </p>
          </div>

          {current ? (
            <WalkthroughCard
              entry={current}
              index={reviewedCount}
              total={totalToReview}
              onMove={() => setPickerOpen('shared')}
              onTransfer={() => setPickerOpen('transfer')}
              onPersonal={handlePersonalCurrent}
              onSkip={handleSkipCurrent}
              pending={actionPending}
            />
          ) : (
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
              }}
            >
              <h3
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: '#1d2a5d' }}
              >
                {skippedIds.size > 0 ? 'Pause — caught up for now' : 'All done'}
              </h3>
              <p className="mt-2 text-sm" style={{ color: '#334155' }}>
                {skippedIds.size > 0
                  ? `${skippedIds.size} file${skippedIds.size === 1 ? '' : 's'} skipped. They'll wait until you come back.`
                  : "You've made a decision on every shared file in your Drive."}
              </p>
              <div className="mt-5 flex flex-col-reverse justify-center gap-3 sm:flex-row">
                <Link
                  to="/"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
                  style={{ borderColor: '#cbd5e1', color: '#475569' }}
                >
                  Back to dashboard
                </Link>
                {skippedIds.size > 0 && (
                  <button
                    onClick={() => setSkippedIds(new Set())}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px"
                    style={{
                      background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
                      boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
                    }}
                  >
                    Review skipped files
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <SharedDrivePicker
        open={pickerOpen === 'shared'}
        onClose={() => setPickerOpen(null)}
        onConfirm={handleConfirmSharedDrive}
      />
      <PersonPicker
        open={pickerOpen === 'transfer'}
        title="Transfer to a colleague"
        description="The file's ownership transfers to the person you pick. Both of you have to be in @orono.k12.mn.us. Google will email them to let them know."
        confirmLabel={(s) => (s ? `Transfer to ${s.givenName ?? s.displayName}` : 'Transfer')}
        onClose={() => setPickerOpen(null)}
        onConfirm={(p) => handleConfirmTransfer({ email: p.email, displayName: p.displayName })}
      />
    </div>
  );
}
