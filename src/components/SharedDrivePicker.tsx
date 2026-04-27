import { useEffect, useState } from 'react';
import { getGoogleAccessToken } from '../lib/auth';
import { listSharedDrives } from '../lib/functions';

export type SharedDrive = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (drive: SharedDrive) => Promise<void>;
};

export function SharedDrivePicker({ open, onClose, onConfirm }: Props) {
  const [drives, setDrives] = useState<SharedDrive[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SharedDrive | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) {
      setDrives(null);
      setSelected(null);
      setError(null);
      setFilter('');
      return;
    }
    const token = getGoogleAccessToken();
    if (!token) {
      setError('Your Google session expired. Please sign out and sign in again.');
      return;
    }
    setLoading(true);
    listSharedDrives({ googleAccessToken: token })
      .then((res) => setDrives(res.data.drives))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shared drives.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the file.');
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const visible =
    drives?.filter((d) => d.name.toLowerCase().includes(filter.trim().toLowerCase())) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-xl"
        style={{
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 border-b p-5"
          style={{ borderColor: '#e2e5ea' }}
        >
          <div>
            <h2
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: '#1d2a5d' }}
            >
              Move to a shared drive
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
              Pick a shared drive you're a member of. The file's ownership transfers to the shared
              drive itself, so it stays accessible after you leave.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold"
            style={{ color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <div className="p-5 pb-3">
          <input
            type="search"
            placeholder="Filter shared drives…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg px-3 py-2 text-sm transition outline-none"
            style={{ background: '#ffffff', border: '1px solid #e2e5ea', color: '#1d2a5d' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2d3f89';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,63,137,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e5ea';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {loading && (
            <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
              Loading shared drives…
            </p>
          )}
          {!loading && drives?.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
              You're not a member of any shared drives. Ask IT to add you to one, or pick a
              different action.
            </p>
          )}
          {!loading && drives && drives.length > 0 && visible.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
              No drives match "{filter}".
            </p>
          )}
          {!loading && visible.length > 0 && (
            <div className="divide-y" style={{ borderColor: 'rgba(180,185,195,0.25)' }}>
              {visible.map((drive) => {
                const isSelected = selected?.id === drive.id;
                return (
                  <button
                    key={drive.id}
                    onClick={() => setSelected(drive)}
                    className="flex w-full items-center gap-3 py-3 text-left transition"
                    style={{
                      background: isSelected ? 'rgba(45,63,137,0.08)' : 'transparent',
                      borderRadius: 8,
                      padding: '0.5rem 0.75rem',
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                      style={{ background: '#eaecf5', color: '#1d2a5d' }}
                    >
                      Drive
                    </div>
                    <p
                      className="min-w-0 flex-1 truncate text-sm font-semibold"
                      style={{ color: '#1d2a5d' }}
                    >
                      {drive.name}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p
            className="mx-5 mt-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {error}
          </p>
        )}

        <div
          className="flex flex-col-reverse gap-3 border-t p-5 sm:flex-row sm:justify-end"
          style={{ borderColor: '#e2e5ea' }}
        >
          <button
            onClick={onClose}
            disabled={confirming}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
            style={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || confirming}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
            }}
          >
            {confirming ? 'Moving…' : selected ? `Move to ${selected.name}` : 'Move to drive'}
          </button>
        </div>
      </div>
    </div>
  );
}
