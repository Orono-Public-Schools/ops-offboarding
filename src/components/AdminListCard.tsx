import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listAdmins, setAdminClaim, type AdminRecord } from '../lib/functions';
import type { StaffRecord } from '../lib/staff';
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
    <div className="mb-6 rounded-xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            IT admins
          </p>
          <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            People who can see this dashboard, sync the roster, reset users, and manage admins. New
            admins must sign out and sign in again before the change takes effect.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] sm:text-sm"
          style={{
            background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
            boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
          }}
        >
          Add admin
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Loading…
          </p>
        )}
        {!loading && admins.length === 0 && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            No admins yet.
          </p>
        )}
        {!loading &&
          admins.map((admin) => {
            const isSelf = admin.uid === user?.uid;
            const isPending = pendingEmail === admin.email;
            return (
              <div
                key={admin.uid}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {admin.displayName ?? admin.email}
                    {isSelf && (
                      <span
                        className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: 'rgba(255,255,255,0.18)',
                          color: '#ffffff',
                        }}
                      >
                        You
                      </span>
                    )}
                  </p>
                  {admin.displayName && (
                    <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {admin.email}
                    </p>
                  )}
                </div>
                {!isSelf && (
                  <button
                    onClick={() => void handleRevoke(admin)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                    style={{ borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    {isPending ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {message && (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-xs"
          style={{
            background: message.kind === 'ok' ? 'rgba(255,255,255,0.08)' : 'rgba(173,33,34,0.18)',
            color: message.kind === 'ok' ? '#ffffff' : '#fecaca',
          }}
        >
          {message.kind === 'ok' ? '✓ ' : '✕ '}
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
    </div>
  );
}
