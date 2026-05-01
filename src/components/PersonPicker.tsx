import { useEffect, useMemo, useState } from 'react';
import { searchStaff, useStaff, type StaffRecord } from '../lib/staff';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: (selected: StaffRecord | null) => string;
  currentEmail?: string | null;
  onClose: () => void;
  onConfirm: (person: StaffRecord) => Promise<void>;
};

function Avatar({ person }: { person: StaffRecord }) {
  const initials =
    (person.givenName?.[0] ?? '') + (person.familyName?.[0] ?? '') ||
    person.displayName.slice(0, 1).toUpperCase();
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ background: '#eaecf5', color: '#1d2a5d' }}
    >
      {initials.toUpperCase()}
    </div>
  );
}

export function PersonPicker({
  open,
  title,
  description,
  confirmLabel,
  currentEmail,
  onClose,
  onConfirm,
}: Props) {
  const staffState = useStaff();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StaffRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(null);
      setError(null);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!('staff' in staffState)) return [];
    return searchStaff(staffState.staff, query);
  }, [staffState, query]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const buttonLabel = confirming
    ? 'Saving…'
    : (confirmLabel?.(selected) ??
      (selected ? `Confirm ${selected.givenName ?? ''}`.trim() : 'Confirm'));

  const loading = staffState.loading;
  const loadError = !staffState.loading && 'error' in staffState ? staffState.error : null;
  const empty = !staffState.loading && 'staff' in staffState && staffState.staff.length === 0;

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
              {title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
              {description}
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
            autoFocus
            type="search"
            name="person-directory-query"
            placeholder="Type a name or email…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            className="w-full rounded-lg px-3 py-2 text-sm transition outline-none"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e5ea',
              color: '#1d2a5d',
            }}
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
              Loading staff…
            </p>
          )}
          {loadError && (
            <p
              className="my-3 rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
            >
              Couldn't load staff: {loadError.message}
            </p>
          )}
          {empty && (
            <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
              The staff list is empty. Ask IT to sync the roster from the admin dashboard.
            </p>
          )}
          {!loading && !empty && query.trim() && results.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
              No matches in the staff list.
            </p>
          )}
          {!loading && !empty && !query.trim() && (
            <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
              Start typing to search the staff list.
            </p>
          )}
          {results.length > 0 && (
            <div className="divide-y" style={{ borderColor: 'rgba(180,185,195,0.25)' }}>
              {results.map((person) => {
                const isSelected = selected?.email === person.email;
                const isCurrent = currentEmail === person.email;
                return (
                  <button
                    key={person.email}
                    onClick={() => setSelected(person)}
                    className="flex w-full items-center gap-3 py-3 text-left transition"
                    style={{
                      background: isSelected ? 'rgba(45,63,137,0.08)' : 'transparent',
                      borderRadius: 8,
                      padding: '0.5rem 0.75rem',
                    }}
                  >
                    <Avatar person={person} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: '#1d2a5d' }}>
                        {person.displayName}
                        {isCurrent && (
                          <span
                            className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: 'rgba(67,86,169,0.12)', color: '#4356a9' }}
                          >
                            Current
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs" style={{ color: '#64748b' }}>
                        {person.email}
                      </p>
                    </div>
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
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
