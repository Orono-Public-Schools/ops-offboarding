import { useMemo, useState, type CSSProperties } from 'react';
import { useStaff, type StaffRecord } from '../lib/staff';
import { Card } from '../ds/components/core/Card';
import { Field } from '../ds/components/forms/Field';
import { EmptyState } from '../ds/components/records/EmptyState';

type SortKey = 'name' | 'email' | 'title' | 'building' | 'employeeId';

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'title', label: 'Title' },
  { key: 'building', label: 'Bldg' },
  { key: 'employeeId', label: 'EE#' },
];

function matches(s: StaffRecord, needle: string): boolean {
  if (!needle) return true;
  const hay = [s.displayName, s.email, s.title, s.building, s.employeeId, s.username]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .every((t) => hay.includes(t));
}

function sortValue(s: StaffRecord, key: SortKey): string | number {
  switch (key) {
    case 'email':
      return s.email;
    case 'title':
      return (s.title ?? '').toLowerCase() || '￿';
    case 'building':
      return (s.building ?? '').toLowerCase() || '￿';
    case 'employeeId': {
      const n = Number(s.employeeId);
      return Number.isFinite(n) && s.employeeId ? n : Number.MAX_SAFE_INTEGER;
    }
    default:
      return `${s.familyName} ${s.givenName}`.toLowerCase();
  }
}

/** Everyone the nightly staff sync knows about, searchable and sortable. */
export function StaffDirectoryCard() {
  const state = useStaff();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });

  const staff = 'staff' in state ? state.staff : [];
  const filtered = useMemo(() => {
    const needle = search.trim();
    return staff
      .filter((s) => matches(s, needle))
      .sort((a, b) => {
        const va = sortValue(a, sort.key);
        const vb = sortValue(b, sort.key);
        const cmp =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb));
        return cmp * sort.dir || a.displayName.localeCompare(b.displayName);
      });
  }, [staff, search, sort]);

  return (
    <Card
      collapsible
      defaultOpen
      eyebrow="Directory"
      heading={
        state.loading
          ? 'Who the sync knows about'
          : `${staff.length} synced staff${filtered.length !== staff.length ? ` · ${filtered.length} match` : ''}`
      }
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '12px 16px 8px' }}>
        <Field
          icon="search"
          placeholder="Search name, email, title, building, EE#…"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>
      {state.loading ? (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--text-muted)',
            margin: 0,
            padding: '8px 16px 16px',
          }}
        >
          Loading…
        </p>
      ) : 'error' in state ? (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--accent)',
            margin: 0,
            padding: '8px 16px 16px',
          }}
        >
          Could not load the directory.
        </p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '0 16px 16px' }}>
          <EmptyState
            on="card"
            icon="users"
            line={staff.length === 0 ? 'Nobody synced yet' : 'Nobody matches that'}
            note={staff.length === 0 ? 'Run a sync above to pull the staff sheet in.' : undefined}
          />
        </div>
      ) : (
        <div style={{ overflowY: 'auto', maxHeight: 480 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() =>
                      setSort((s) => ({
                        key: c.key,
                        dir: s.key === c.key ? ((-s.dir) as 1 | -1) : 1,
                      }))
                    }
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      background: 'var(--surface-card)',
                      textAlign: 'left',
                      padding: '6px 12px',
                      font: '600 9.5px/1.3 var(--font-sans)',
                      letterSpacing: 'var(--tracking-wider)',
                      textTransform: 'uppercase',
                      color: sort.key === c.key ? 'var(--primary)' : 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-input)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {c.label}
                    {sort.key === c.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const cell: CSSProperties = {
                  padding: '7px 12px',
                  borderBottom: '1px solid var(--divider)',
                  font: '400 12.5px/1.4 var(--font-sans)',
                  color: 'var(--text-muted)',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                };
                return (
                  <tr key={s.email}>
                    <td style={{ ...cell, color: 'var(--dark)', fontWeight: 600 }}>
                      {s.displayName}
                    </td>
                    <td style={cell} title={s.email}>
                      {s.email}
                    </td>
                    <td style={cell} title={s.title}>
                      {s.title ?? '—'}
                    </td>
                    <td style={cell}>{s.building ?? '—'}</td>
                    <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>
                      {s.employeeId ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
