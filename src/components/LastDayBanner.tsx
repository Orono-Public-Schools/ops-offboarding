import { useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { setLastDay } from '../lib/functions';
import { Button } from '../ds/components/core/Button';
import { Field } from '../ds/components/forms/Field';

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

/** Row inside the "Your details" card: shows the saved last day, or a date
 *  field when it hasn't been set yet (or is being changed). */
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Field
            label="Last day"
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={saving}
            help="Helps IT prioritize follow-ups and time the out-of-office defaults."
            error={error ?? undefined}
          />
        </div>
        <div className="flex shrink-0 gap-2 sm:pt-6">
          {lastDay && (
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !value}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p
          style={{
            margin: 0,
            font: 'var(--type-field-label)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Last day
        </p>
        <p
          className="truncate"
          style={{ margin: '3px 0 0', font: 'var(--type-strong)', color: 'var(--dark)' }}
        >
          {formatLastDay(lastDay)}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={startEdit}>
        Change
      </Button>
    </div>
  );
}
