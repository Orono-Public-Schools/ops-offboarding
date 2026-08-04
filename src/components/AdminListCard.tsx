import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listAdmins, setAdminClaim, type AdminRecord } from '../lib/functions';
import type { StaffRecord } from '../lib/staff';
import { Button } from '../ds/components/core/Button';
import { Card } from '../ds/components/core/Card';
import { RowList } from '../ds/components/forms/RowList';
import { PersonPicker } from './PersonPicker';

type Message = { kind: 'ok' | 'error'; text: string };

export function AdminListCard() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdmins();
      setAdmins(res.data.admins);
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not load admins.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = async (person: StaffRecord) => {
    setMessage(null);
    setPendingEmail(person.email);
    try {
      await setAdminClaim({ email: person.email, grant: true });
      setMessage({
        kind: 'ok',
        text: `${person.displayName} is now an admin. They’ll need to sign out and sign in again before the change takes effect.`,
      });
      await refresh();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not grant admin.',
      });
      throw err;
    } finally {
      setPendingEmail(null);
    }
  };

  const handleRevoke = async (admin: AdminRecord) => {
    const confirmed = window.confirm(
      `Remove admin access from ${admin.displayName ?? admin.email}? They’ll keep using their normal checklist but lose access to /admin.`,
    );
    if (!confirmed) return;
    setMessage(null);
    setPendingEmail(admin.email);
    try {
      await setAdminClaim({ email: admin.email, grant: false });
      setMessage({
        kind: 'ok',
        text: `Removed ${admin.displayName ?? admin.email}. They’ll need to sign out and sign in again before they fully lose admin access.`,
      });
      await refresh();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not revoke admin.',
      });
    } finally {
      setPendingEmail(null);
    }
  };

  return (
    <Card
      collapsible
      eyebrow="Access"
      heading="Who can work this dashboard"
      headingRight={
        <Button variant="primary" size="sm" icon="plus" onClick={() => setPickerOpen(true)}>
          Add admin
        </Button>
      }
      pad={16}
    >
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
        Admins see this dashboard, sync the roster, reset users, and manage who else gets in.
        Changes take effect after the person signs out and back in.
      </p>

      {loading ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Loading…
        </p>
      ) : admins.length === 0 ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          No admins yet.
        </p>
      ) : (
        <RowList>
          {admins.map((admin) => {
            const isSelf = admin.uid === user?.uid;
            const isPending = pendingEmail === admin.email;
            return (
              <div key={admin.uid} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="truncate"
                    style={{
                      font: 'var(--type-body)',
                      fontWeight: 600,
                      color: 'var(--dark)',
                      margin: 0,
                    }}
                  >
                    {admin.displayName ?? admin.email}
                    {isSelf && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          font: 'var(--type-badge)',
                          fontSize: 11,
                          color: 'var(--primary)',
                          background: 'rgba(var(--primary-rgb), 0.12)',
                        }}
                      >
                        You
                      </span>
                    )}
                  </p>
                  {admin.displayName && (
                    <p
                      className="truncate"
                      style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}
                    >
                      {admin.email}
                    </p>
                  )}
                </div>
                {!isSelf && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => void handleRevoke(admin)}
                  >
                    {isPending ? 'Removing…' : 'Remove'}
                  </Button>
                )}
              </div>
            );
          })}
        </RowList>
      )}

      {message && (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: message.kind === 'ok' ? 'var(--primary)' : 'var(--accent)',
            background: message.kind === 'ok' ? 'var(--tint)' : 'rgba(var(--accent-rgb), 0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            margin: '12px 0 0',
          }}
        >
          {message.text}
        </p>
      )}

      <PersonPicker
        open={pickerOpen}
        title="Grant IT admin access"
        description="Pick a staff member to grant admin access. They'll be able to see this dashboard, sync the roster, and reset users."
        confirmLabel={(selected) =>
          selected ? `Grant ${selected.givenName ?? 'admin'}` : 'Grant admin'
        }
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAdd}
      />
    </Card>
  );
}
