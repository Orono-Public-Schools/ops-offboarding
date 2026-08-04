import { useEffect, useState } from 'react';
import { Button } from '../ds/components/core/Button';
import { Icon } from '../ds/components/core/Icon';
import { getGoogleAccessToken } from '../lib/auth';
import { listSharedDrives } from '../lib/functions';
import { StepError, StepInput } from './TaskStep';

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
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col"
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card-hover)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 p-5"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <div>
            <p
              className="uppercase"
              style={{
                font: 'var(--type-card-eyebrow)',
                letterSpacing: 'var(--tracking-widest)',
                color: 'var(--text-muted)',
              }}
            >
              Shared drives
            </p>
            <h2 className="mt-1" style={{ font: 'var(--type-card-title)', color: 'var(--dark)' }}>
              Move to a shared drive
            </h2>
            <p className="mt-1" style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Pick a shared drive you're a member of. The file's ownership transfers to the shared
              drive itself, so it stays accessible after you leave.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 transition hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="p-5 pb-3">
          <StepInput
            type="search"
            placeholder="Filter shared drives…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {loading && (
            <p
              className="py-6 text-center"
              style={{ font: 'var(--type-body-sm)', color: 'var(--text-placeholder)' }}
            >
              Loading shared drives…
            </p>
          )}
          {!loading && drives?.length === 0 && (
            <p
              className="py-6 text-center"
              style={{ font: 'var(--type-body-sm)', color: 'var(--text-placeholder)' }}
            >
              You're not a member of any shared drives. Ask IT to add you to one, or pick a
              different action.
            </p>
          )}
          {!loading && drives && drives.length > 0 && visible.length === 0 && (
            <p
              className="py-6 text-center"
              style={{ font: 'var(--type-body-sm)', color: 'var(--text-placeholder)' }}
            >
              No drives match "{filter}".
            </p>
          )}
          {!loading && visible.length > 0 && (
            <div>
              {visible.map((drive, i) => {
                const isSelected = selected?.id === drive.id;
                return (
                  <button
                    key={drive.id}
                    onClick={() => setSelected(drive)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--divider)' : undefined,
                      background: isSelected ? 'rgba(var(--secondary-rgb), 0.08)' : 'transparent',
                      borderRadius: isSelected ? 8 : 0,
                    }}
                  >
                    <span
                      className="flex h-9 w-12 shrink-0 items-center justify-center uppercase"
                      style={{
                        font: 'var(--type-micro)',
                        background: 'var(--tint)',
                        color: 'var(--dark)',
                        borderRadius: 6,
                      }}
                    >
                      Drive
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}
                    >
                      {drive.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5">
            <StepError>{error}</StepError>
          </div>
        )}

        <div
          className="mt-3 flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!selected || confirming}>
            {confirming ? 'Moving…' : selected ? `Move to ${selected.name}` : 'Move to drive'}
          </Button>
        </div>
      </div>
    </div>
  );
}
