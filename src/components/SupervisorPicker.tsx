import { useEffect, useRef, useState } from 'react';
import { signOut } from '../lib/auth';
import { searchDirectoryPeople, TokenExpiredError, type DirectoryPerson } from '../lib/people';

type Props = {
  open: boolean;
  currentEmail?: string | null;
  onClose: () => void;
  onConfirm: (person: DirectoryPerson) => Promise<void>;
};

function Avatar({ person }: { person: DirectoryPerson }) {
  if (person.photoUrl) {
    return (
      <img
        src={person.photoUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full"
        referrerPolicy="no-referrer"
      />
    );
  }
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

export function SupervisorPicker({ open, currentEmail, onClose, onConfirm }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DirectoryPerson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setError(null);
      setTokenExpired(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const people = await searchDirectoryPeople(query);
        setResults(people);
        setError(null);
      } catch (err) {
        if (err instanceof TokenExpiredError) {
          setTokenExpired(true);
        } else {
          setError('Search failed. Please try again.');
          console.error(err);
        }
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm(selected);
      onClose();
    } catch (err) {
      setError('Could not save supervisor. Please try again.');
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

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
              Add your supervisor
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
              Optional. We'll use this to pre-fill your out-of-office message and as a fallback
              contact for IT. You can skip and revisit anytime.
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

        {tokenExpired ? (
          <div className="p-5 text-sm" style={{ color: '#334155' }}>
            <p>Your Google session expired. Please sign in again to keep searching.</p>
            <button
              onClick={async () => {
                await signOut();
              }}
              className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 pb-3">
              <input
                autoFocus
                type="search"
                name="supervisor-directory-query"
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
              {searching && (
                <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
                  Searching…
                </p>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
                  No matches in the directory.
                </p>
              )}
              {!searching && !query.trim() && (
                <p className="py-6 text-center text-sm" style={{ color: '#94a3b8' }}>
                  Start typing to search the OPS directory.
                </p>
              )}
              {!searching && results.length > 0 && (
                <div className="divide-y" style={{ borderColor: 'rgba(180,185,195,0.25)' }}>
                  {results.map((person) => {
                    const isSelected = selected?.email === person.email;
                    const isCurrent = currentEmail === person.email;
                    return (
                      <button
                        key={person.resourceName}
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
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: '#1d2a5d' }}
                          >
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
                            {person.department ? ` · ${person.department}` : ''}
                            {person.title ? ` · ${person.title}` : ''}
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
                {confirming
                  ? 'Saving…'
                  : selected
                    ? `Save ${selected.givenName ?? 'supervisor'}`
                    : 'Save supervisor'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
