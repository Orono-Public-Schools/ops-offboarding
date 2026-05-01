import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { PersonPicker } from '../../components/PersonPicker';
import {
  StepCard,
  StepError,
  StepHeader,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { getGoogleAccessToken, useAuth } from '../../lib/auth';
import { markTaskComplete, promoteGroupOwner } from '../../lib/functions';
import {
  fetchOwnedOrManagedGroups,
  groupManageUrl,
  GroupsTokenError,
  type UserGroup,
} from '../../lib/groups';
import type { OutletCtx } from '../../App';

const TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'Groups need at least one owner',
    body: 'If you’re the only owner of a group, promote someone else to OWNER before your account deactivates — otherwise the group ends up ownerless and IT has to step in.',
  },
  {
    title: 'How to transfer ownership',
    body: 'Open the group → Members tab → find the person you want as new owner → change their role to "Owner." You can stay an owner alongside them, or step down to "Member."',
  },
  {
    title: 'Manager-only is okay',
    body: 'If you’re a Manager (not Owner), the group already has someone else in charge. You don’t need to transfer anything — your access just goes away.',
  },
  {
    title: 'Membership in groups',
    body: 'Just being a member of a group is fine — when your account deactivates, you’re removed automatically and the group goes on without you.',
  },
];

export function GroupsOwnershipTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const taskState = (doc.tasks.groupsOwnership ?? { status: 'not_started' }) as {
    status: string;
    completedAt?: { toDate: () => Date } | null;
    notes?: string | null;
  };
  const isComplete = taskState.status === 'completed';
  const isSkipped = taskState.status === 'skipped';

  const [groups, setGroups] = useState<UserGroup[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  const [notes, setNotes] = useState<string>(taskState.notes ?? '');
  const [pending, setPending] = useState<'complete' | 'skip' | 'reopen' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Promotion modal state.
  const [promoteFor, setPromoteFor] = useState<UserGroup | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (groups !== null || isComplete || isSkipped || !user?.email) return;
    void doScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const doScan = async () => {
    if (!user?.email) return;
    setScanError(null);
    setTokenExpired(false);
    setScanning(true);
    try {
      const list = await fetchOwnedOrManagedGroups(user.email);
      setGroups(list);
    } catch (err) {
      if (err instanceof GroupsTokenError) {
        setTokenExpired(true);
      } else {
        setScanError(err instanceof Error ? err.message : 'Could not load your groups.');
        console.error(err);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleStatus = async (status: 'completed' | 'skipped' | 'in_progress') => {
    setSaveError(null);
    setPending(status === 'completed' ? 'complete' : status === 'skipped' ? 'skip' : 'reopen');
    try {
      await markTaskComplete({
        taskKey: 'groupsOwnership',
        status,
        notes: status === 'in_progress' ? null : notes.trim() || null,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setPending(null);
    }
  };

  const ownerCount = groups?.filter((g) => g.role === 'OWNER').length ?? 0;
  const managerCount = groups?.filter((g) => g.role === 'MANAGER').length ?? 0;

  const handlePromote = async (person: { email: string; displayName: string }) => {
    if (!promoteFor) return;
    const token = getGoogleAccessToken();
    if (!token) throw new Error('Session expired. Please sign in again.');
    setPromoting(true);
    setPromoteSuccess(null);
    try {
      const res = await promoteGroupOwner({
        groupId: promoteFor.id,
        newOwnerEmail: person.email,
        googleAccessToken: token,
      });
      setPromoteSuccess(
        `${person.displayName} is now an Owner of ${promoteFor.name} (${res.data.action === 'inserted' ? 'added to group' : 'role upgraded'}).`,
      );
      await doScan();
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div>
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to dashboard
      </Link>

      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          Google Groups
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          We pull groups where you're an Owner or Manager so you can hand off the ones you run.
        </p>
      </div>

      <div className="space-y-4">
        <StepCard>
          <StepHeader
            step="Step 1"
            title="Groups you own or manage"
            description="Owners need to promote a successor before leaving — otherwise the group ends up ownerless. Managers are usually fine."
            action={
              !tokenExpired
                ? {
                    label: scanning ? 'Loading…' : groups ? 'Refresh' : 'Load groups',
                    onClick: () => void doScan(),
                    disabled: scanning,
                  }
                : undefined
            }
          />

          {tokenExpired && (
            <StepError>
              Your Google session expired or doesn't have the groups permission. Sign out and sign
              back in to grant it.
            </StepError>
          )}
          {scanError && <StepError>{scanError}</StepError>}

          {!scanning && groups && (
            <>
              {groups.length === 0 ? (
                <p className="text-sm text-white/65">
                  You don't own or manage any groups. Nothing to do here. ✓
                </p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-white/65">
                    {groups.length} group{groups.length === 1 ? '' : 's'} — {ownerCount} owner,{' '}
                    {managerCount} manager
                  </p>
                  <div className="space-y-2">
                    {groups.map((g) => {
                      const isOwner = g.role === 'OWNER';
                      return (
                        <div
                          key={g.id}
                          className="flex items-center gap-3 rounded-lg p-3"
                          style={{ background: 'rgba(255,255,255,0.08)' }}
                        >
                          <span
                            className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                          >
                            Group
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{g.name}</p>
                            <p className="truncate text-xs text-white/60">
                              {g.email}
                              {typeof g.directMembersCount === 'number' && (
                                <>
                                  {' '}
                                  · {g.directMembersCount} member
                                  {g.directMembersCount === 1 ? '' : 's'}
                                </>
                              )}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: isOwner
                                ? 'rgba(255,255,255,0.22)'
                                : 'rgba(255,255,255,0.1)',
                              color: '#ffffff',
                            }}
                          >
                            {isOwner ? 'Owner' : 'Manager'}
                          </span>
                          <button
                            onClick={() => {
                              setPromoteSuccess(null);
                              setPromoteFor(g);
                            }}
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-px active:scale-[0.98]"
                            style={{
                              background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                              boxShadow: '0 2px 8px rgba(173,33,34,0.3)',
                            }}
                          >
                            Promote owner
                          </button>
                          <a
                            href={groupManageUrl(g)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-xs font-semibold text-white/70 transition hover:text-white"
                          >
                            Open ↗
                          </a>
                        </div>
                      );
                    })}
                  </div>
                  {promoteSuccess && (
                    <p
                      className="mt-3 rounded-lg px-3 py-2 text-xs"
                      style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff' }}
                    >
                      ✓ {promoteSuccess}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </StepCard>

        <StepCard>
          <StepHeader step="Step 2" title="What to do" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TIPS.map((tip) => (
              <div
                key={tip.title}
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <p className="text-sm font-semibold text-white">{tip.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/75">{tip.body}</p>
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard>
          <StepHeader
            step="Step 3"
            title="When you're done"
            description={
              isComplete
                ? "You've marked this complete."
                : isSkipped
                  ? "You've skipped this."
                  : "Mark complete when you've handed off groups that need it. Skip if there's nothing to transfer."
            }
            status={
              isComplete
                ? { label: 'Completed', tone: 'done' }
                : isSkipped
                  ? { label: 'Skipped', tone: 'done' }
                  : { label: 'Not yet' }
            }
          />

          {(isComplete || isSkipped) && (
            <div className="mb-4 space-y-2">
              {taskState.notes && (
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                    Your note
                  </p>
                  <p className="mt-1 text-sm text-white/85">{taskState.notes}</p>
                </div>
              )}
              {taskState.completedAt && isComplete && (
                <p className="text-xs text-white/60">
                  Marked complete{' '}
                  {taskState.completedAt
                    .toDate()
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {!isComplete && !isSkipped && (
            <>
              <StepLabel>Optional note for IT</StepLabel>
              <StepTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. promoted Sue to owner of math-dept@; staff-allstaff@ — no action needed"
                className="mb-3"
              />
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {isComplete || isSkipped ? (
              <button
                onClick={() => handleStatus('in_progress')}
                disabled={pending !== null}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              >
                {pending === 'reopen' ? 'Saving…' : 'Reopen'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleStatus('completed')}
                  disabled={pending !== null}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                    boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                  }}
                >
                  {pending === 'complete' ? 'Saving…' : "I'm done — mark complete"}
                </button>
                <button
                  onClick={() => handleStatus('skipped')}
                  disabled={pending !== null}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  style={{ borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  {pending === 'skip' ? 'Saving…' : "Doesn't apply — skip"}
                </button>
              </>
            )}
          </div>

          {saveError && <StepError>{saveError}</StepError>}
        </StepCard>
      </div>

      <PersonPicker
        open={promoteFor !== null}
        title={promoteFor ? `Promote owner of ${promoteFor.name}` : 'Promote owner'}
        description={
          promoting
            ? 'Updating the group…'
            : "Pick a colleague to make Owner. If they're not already in the group, they'll be added."
        }
        confirmLabel={(s) =>
          s ? `Make ${s.givenName ?? s.displayName} an owner` : 'Promote to owner'
        }
        currentEmail={null}
        onClose={() => setPromoteFor(null)}
        onConfirm={(p) => handlePromote({ email: p.email, displayName: p.displayName })}
      />
    </div>
  );
}
