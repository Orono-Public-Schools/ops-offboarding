import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listRoleHolders, setUserRole, type RoleHolder, type RoleName } from '../lib/functions';
import type { StaffRecord } from '../lib/staff';
import { Button } from '../ds/components/core/Button';
import { Card } from '../ds/components/core/Card';
import { RowList } from '../ds/components/forms/RowList';
import { PersonPicker } from './PersonPicker';

type Message = { kind: 'ok' | 'error'; text: string };

const ROLE_META: Record<RoleName, { label: string; blurb: string; grantLabel: string }> = {
  it_admin: {
    label: 'IT admins',
    blurb:
      'Everything — this dashboard, the staff sync, offboarding, the full HR side, and role management.',
    grantLabel: 'Grant IT admin',
  },
  hr_admin: {
    label: 'HR admins',
    blurb:
      'The full HR Portal plus the master-sheet import, employee removal, and HR role management.',
    grantLabel: 'Grant HR admin',
  },
  hr_staff: {
    label: 'HR staff',
    blurb:
      'Day-to-day HR Portal work — checklists, records, leaves, and the forms inbox. No import, no deletions.',
    grantLabel: 'Grant HR staff',
  },
};

function inRole(h: RoleHolder, role: RoleName): boolean {
  if (role === 'it_admin') return h.itAdmin;
  if (role === 'hr_admin') return h.hrRole === 'admin';
  return h.hrRole === 'staff';
}

export function RolesCard() {
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
    setPending(`${role}:${person.email}`);
    try {
      await setUserRole({ email: person.email, role, grant: true });
      setMessage({
        kind: 'ok',
        text: `${person.displayName} now holds ${ROLE_META[role].label.replace(/s$/, '')}. They'll need to sign out and back in before it takes effect.`,
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
    if (!window.confirm(`Remove ${ROLE_META[role].label.replace(/s$/, '')} from ${who}?`)) return;
    setMessage(null);
    setPending(`${role}:${holder.email}`);
    try {
      await setUserRole({ email: holder.email, role, grant: false });
      setMessage({
        kind: 'ok',
        text: `Removed. ${who} keeps normal staff access; the change lands once they sign out and back in.`,
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
    <Card collapsible defaultOpen eyebrow="Access" heading="Who can do what" pad={16}>
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 4px' }}>
        Role changes take effect after the person signs out and signs in again.
      </p>

      {(Object.keys(ROLE_META) as RoleName[]).map((role) => {
        const meta = ROLE_META[role];
        const members = holders.filter((h) => inRole(h, role));
        return (
          <div key={role} style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    font: '600 13.5px/1.4 var(--font-sans)',
                    color: 'var(--dark)',
                    margin: 0,
                  }}
                >
                  {meta.label}
                </p>
                <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}>
                  {meta.blurb}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon="plus"
                onClick={() => setPickerRole(role)}
              >
                Add
              </Button>
            </div>
            {loading ? (
              <p
                style={{
                  font: 'var(--type-body-sm)',
                  color: 'var(--text-muted)',
                  margin: '8px 0 0',
                }}
              >
                Loading…
              </p>
            ) : members.length === 0 ? (
              <p
                style={{
                  font: 'var(--type-body-sm)',
                  color: 'var(--text-placeholder)',
                  margin: '8px 0 0',
                }}
              >
                Nobody yet.
              </p>
            ) : (
              <div style={{ marginTop: 8 }}>
                <RowList>
                  {members.map((h) => {
                    const isSelf = h.uid === user?.uid;
                    const isPending = pending === `${role}:${h.email}`;
                    return (
                      <div
                        key={h.uid}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              font: 'var(--type-body)',
                              fontWeight: 600,
                              color: 'var(--dark)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h.displayName ?? h.email}
                            {isSelf && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-pill)',
                                  font: '600 11px/1.3 var(--font-sans)',
                                  color: 'var(--primary)',
                                  background: 'rgba(var(--primary-rgb), 0.12)',
                                }}
                              >
                                You
                              </span>
                            )}
                          </p>
                          {h.displayName && (
                            <p
                              style={{
                                font: 'var(--type-caption)',
                                color: 'var(--text-muted)',
                                margin: 0,
                              }}
                            >
                              {h.email}
                            </p>
                          )}
                        </div>
                        {!(isSelf && role === 'it_admin') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isPending}
                            onClick={() => void revoke(role, h)}
                          >
                            {isPending ? 'Removing…' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </RowList>
              </div>
            )}
          </div>
        );
      })}

      {message && (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: message.kind === 'ok' ? 'var(--primary)' : 'var(--accent)',
            background: message.kind === 'ok' ? 'var(--tint)' : 'rgba(var(--accent-rgb), 0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            margin: '16px 0 0',
          }}
        >
          {message.text}
        </p>
      )}

      <PersonPicker
        open={pickerRole !== null}
        title={pickerRole ? ROLE_META[pickerRole].grantLabel : ''}
        description={pickerRole ? ROLE_META[pickerRole].blurb : ''}
        confirmLabel={(selected) =>
          selected && pickerRole
            ? `${ROLE_META[pickerRole].grantLabel} to ${selected.givenName || selected.displayName}`
            : (pickerRole && ROLE_META[pickerRole].grantLabel) || 'Grant'
        }
        onClose={() => setPickerRole(null)}
        onConfirm={(person) => (pickerRole ? grant(pickerRole, person) : Promise.resolve())}
      />
    </Card>
  );
}
