import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '../lib/auth';
import { listRoleHolders, setUserRole, type RoleHolder, type RoleName } from '../lib/functions';
import type { StaffRecord } from '../lib/staff';
import { Card } from '../ds/components/core/Card';
import { Icon } from '../ds/components/core/Icon';
import { PersonPicker } from './PersonPicker';

type Message = { kind: 'ok' | 'error'; text: string };

const COLUMNS: Array<{ role: RoleName; branch: string; label: string }> = [
  { role: 'hr_staff', branch: 'HR branch', label: 'HR staff' },
  { role: 'hr_admin', branch: 'HR branch', label: 'HR admin' },
  { role: 'it_support', branch: 'Tech branch', label: 'IT support' },
  { role: 'it_admin', branch: 'Tech branch', label: 'IT admin' },
];

/** ✓/✕ per role, in COLUMNS order. */
const MATRIX: Array<{ can: string; cells: [boolean, boolean, boolean, boolean] }> = [
  {
    can: 'Work the HR Portal — employees, checklists, leaves, forms inbox',
    cells: [true, true, false, true],
  },
  { can: 'Run the master-sheet import', cells: [false, true, false, true] },
  { can: 'Remove employees & delete records', cells: [false, true, false, true] },
  { can: 'Manage HR roles', cells: [false, true, false, true] },
  { can: 'Offboarding dashboard & help requests', cells: [false, false, true, true] },
  { can: 'Staff sync & directory', cells: [false, false, true, true] },
  { can: 'Admin settings & IT roles', cells: [false, false, false, true] },
];

/** Everyone sits in exactly one column — the highest role they hold. */
function primaryRole(h: RoleHolder): RoleName | null {
  if (h.itAdmin) return 'it_admin';
  if (h.hrRole === 'admin') return 'hr_admin';
  if (h.itSupport) return 'it_support';
  if (h.hrRole === 'staff') return 'hr_staff';
  return null;
}

const BRANCH_LABEL: CSSProperties = {
  font: '600 9px/1.3 var(--font-sans)',
  letterSpacing: 'var(--tracking-wider)',
  textTransform: 'uppercase',
  color: 'var(--text-placeholder)',
  display: 'block',
};

export function AccessCard() {
  const { user } = useAuth();
  const [holders, setHolders] = useState<RoleHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [pickerRole, setPickerRole] = useState<RoleName | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRoleHolders();
      setHolders(res.data.holders);
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not load roles.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grant = async (role: RoleName, person: StaffRecord) => {
    setMessage(null);
    setPending(person.email);
    const label = COLUMNS.find((c) => c.role === role)?.label ?? role;
    try {
      await setUserRole({ email: person.email, role, grant: true });
      setMessage({
        kind: 'ok',
        text: `${person.displayName} is now ${label} — any previous role moved with them. Takes effect at their next sign-in.`,
      });
      await refresh();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not grant that role.',
      });
      throw err;
    } finally {
      setPending(null);
    }
  };

  const revoke = async (role: RoleName, holder: RoleHolder) => {
    const who = holder.displayName ?? holder.email;
    const label = COLUMNS.find((c) => c.role === role)?.label ?? role;
    if (!window.confirm(`Remove ${label} from ${who}? They drop back to regular staff access.`)) {
      return;
    }
    setMessage(null);
    setPending(holder.email);
    try {
      await setUserRole({ email: holder.email, role, grant: false });
      setMessage({
        kind: 'ok',
        text: `Removed. ${who} is regular staff once they sign out and back in.`,
      });
      await refresh();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not revoke that role.',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Card collapsible eyebrow="Access" heading="Who can do what" pad={16}>
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
        One role per person — adding someone to a column moves them there. Changes take effect
        after they sign out and back in.
      </p>

      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 10px 6px 0',
                  font: 'var(--type-field-label)',
                  letterSpacing: 'var(--tracking-wider)',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-input)',
                }}
              >
                Can they…
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.role}
                  style={{
                    textAlign: 'center',
                    padding: '4px 8px 6px',
                    font: 'var(--type-field-label)',
                    letterSpacing: 'var(--tracking-wider)',
                    textTransform: 'uppercase',
                    color: 'var(--secondary)',
                    borderBottom: '1px solid var(--border-input)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.can}>
                <td
                  style={{
                    padding: '5px 10px 5px 0',
                    font: 'var(--type-body-sm)',
                    color: 'var(--dark)',
                    borderBottom: '1px solid var(--divider)',
                  }}
                >
                  {row.can}
                </td>
                {row.cells.map((yes, i) => (
                  <td
                    key={i}
                    style={{
                      textAlign: 'center',
                      padding: '5px 8px',
                      borderBottom: '1px solid var(--divider)',
                      font: '700 12px/1 var(--font-sans)',
                      color: yes ? 'var(--secondary)' : 'var(--text-placeholder)',
                      opacity: yes ? 1 : 0.6,
                    }}
                  >
                    {yes ? '✓' : '✕'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10,
        }}
      >
        {COLUMNS.map((col) => {
          const members = holders.filter((h) => primaryRole(h) === col.role);
          return (
            <div
              key={col.role}
              style={{
                background: 'var(--surface-inset)',
                border: '1px solid var(--divider)',
                borderRadius: 10,
                padding: '10px 9px',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '0 3px 6px' }}>
                <span style={BRANCH_LABEL}>{col.branch}</span>
                <span style={{ font: '600 13px/1.4 var(--font-sans)', color: 'var(--dark)' }}>
                  {col.label}
                </span>
                <span
                  style={{
                    marginLeft: 7,
                    padding: '1.5px 7px',
                    borderRadius: 999,
                    font: '600 10.5px/1.3 var(--font-sans)',
                    background: 'var(--tint)',
                    color: 'var(--secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {loading ? '…' : members.length}
                </span>
              </div>

              {!loading && members.length === 0 && (
                <p
                  style={{
                    font: 'var(--type-body-sm)',
                    color: 'var(--text-placeholder)',
                    margin: '2px 3px 4px',
                  }}
                >
                  Nobody yet.
                </p>
              )}
              {members.map((h) => {
                const isSelf = h.uid === user?.uid;
                const isPending = pending === h.email;
                return (
                  <div
                    key={h.uid}
                    className="access-pill"
                    title={h.email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-input)',
                      borderRadius: 8,
                      padding: '6px 9px',
                      marginTop: 6,
                      minWidth: 0,
                      opacity: isPending ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        font: '600 12.5px/1.4 var(--font-sans)',
                        color: 'var(--dark)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {h.displayName ?? h.email}
                    </span>
                    {isSelf && (
                      <span
                        style={{
                          font: '600 10px/1.3 var(--font-sans)',
                          padding: '1.5px 7px',
                          borderRadius: 999,
                          background: 'var(--tint)',
                          color: 'var(--secondary)',
                          flex: '0 0 auto',
                        }}
                      >
                        You
                      </span>
                    )}
                    <span style={{ flex: 1 }} />
                    {!(isSelf && col.role === 'it_admin') && (
                      <button
                        type="button"
                        className="access-x"
                        title={`Remove ${col.label}`}
                        disabled={isPending}
                        onClick={() => void revoke(col.role, h)}
                        style={{
                          width: 18,
                          height: 18,
                          border: 'none',
                          background: 'none',
                          borderRadius: 5,
                          color: 'var(--text-placeholder)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: '0 0 auto',
                        }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </div>
                );
              })}

              <span style={{ flex: 1 }} />
              <button
                type="button"
                className="access-add"
                onClick={() => setPickerRole(col.role)}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '7px 0',
                  borderRadius: 8,
                  border: '1px dashed var(--border-input)',
                  background: 'none',
                  color: 'var(--secondary)',
                  font: '600 12px/1.3 var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>
          );
        })}
      </div>

      {/* Hover behaviors for the pills — remove hides until you're on the row. */}
      <style>{`
        .access-pill .access-x { opacity: 0; transition: opacity 0.15s, background 0.15s, color 0.15s; }
        .access-pill:hover .access-x, .access-x:focus-visible { opacity: 1; outline: none; }
        .access-x:hover, .access-x:focus-visible { background: rgba(var(--accent-rgb), 0.10); color: var(--accent); }
        .access-add:hover, .access-add:focus-visible { background: var(--tint); border-color: var(--secondary); outline: none; }
      `}</style>

      {message && (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: message.kind === 'ok' ? 'var(--primary)' : 'var(--accent)',
            background: message.kind === 'ok' ? 'var(--tint)' : 'rgba(var(--accent-rgb), 0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            margin: '14px 0 0',
          }}
        >
          {message.text}
        </p>
      )}

      <PersonPicker
        open={pickerRole !== null}
        title={
          pickerRole
            ? `Add ${COLUMNS.find((c) => c.role === pickerRole)?.label ?? ''}`
            : ''
        }
        description="One role per person — if they already hold a role, this moves them."
        confirmLabel={(selected) =>
          selected
            ? `Make ${selected.givenName || selected.displayName} ${
                COLUMNS.find((c) => c.role === pickerRole)?.label ?? 'this role'
              }`
            : 'Grant role'
        }
        onClose={() => setPickerRole(null)}
        onConfirm={(person) => (pickerRole ? grant(pickerRole, person) : Promise.resolve())}
      />
    </Card>
  );
}
