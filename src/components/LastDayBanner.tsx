import { useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { setLastDay } from '../lib/functions';

type Props = {
  lastDay: Timestamp | null;
};

function timestampToInputValue(ts: Timestamp | null): string {
  if (!ts) return '';
  return ts.toDate().toISOString().slice(0, 10);
}

function formatLastDay(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function LastDayBanner({ lastDay }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(timestampToInputValue(lastDay));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setValue(timestampToInputValue(lastDay));
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Pick a date.');
      return;
    }
    setSaving(true);
    try {
      await setLastDay({ lastDay: trimmed });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (editing || !lastDay) {
    return (
      <div
        className="mb-6 flex flex-col gap-2 rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span className="font-semibold text-white">
              {lastDay ? 'Update your last day' : 'When is your last day?'}
            </span>{' '}
            — helps IT prioritize follow-ups and time the OOO defaults.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-sm transition outline-none disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#1d2a5d',
              }}
            />
            <button
              onClick={handleSave}
              disabled={saving || !value}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {lastDay && (
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                style={{ borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {error && (
          <p
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(173,33,34,0.18)', color: '#fecaca' }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex flex-col items-start gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="min-w-0">
        <p
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Last day
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{formatLastDay(lastDay)}</p>
      </div>
      <button
        onClick={startEdit}
        className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
        style={{ borderColor: 'rgba(255,255,255,0.3)' }}
      >
        Change
      </button>
    </div>
  );
}
