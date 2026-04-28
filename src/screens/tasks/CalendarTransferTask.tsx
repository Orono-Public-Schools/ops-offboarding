import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import {
  StepCard,
  StepError,
  StepHeader,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import {
  CalendarTokenError,
  calendarSettingsUrl,
  fetchOwnedCalendars,
  type OwnedCalendar,
} from '../../lib/calendar';
import { markTaskComplete } from '../../lib/functions';
import type { OutletCtx } from '../../App';

const TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'Your primary calendar is tied to your account',
    body: 'It deactivates with you. Events on it (one-offs, your own scheduling) just go away — that’s expected.',
  },
  {
    title: 'Calendars you own need a new owner',
    body: 'If you created a calendar like "Math Department Schedule" that other people rely on, transfer ownership before you leave or it gets deleted with your account.',
  },
  {
    title: 'How to transfer ownership',
    body: 'Open the calendar’s settings, scroll to "Share with specific people," add a colleague, give them "Make changes and manage sharing." Then they can take ownership.',
  },
  {
    title: 'Calendars you only manage',
    body: 'These keep existing after you leave (someone else owns them) — you just lose access. Make sure another manager exists if you were the only one actively keeping it up.',
  },
  {
    title: 'Recurring meetings on your primary calendar',
    body: 'Open each meeting in Calendar, click ⋮ → "Change owner" or add a co-organizer so the series outlives your account.',
  },
];

export function CalendarTransferTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const taskState = (doc.tasks.calendarTransfer ?? { status: 'not_started' }) as {
    status: string;
    completedAt?: { toDate: () => Date } | null;
    notes?: string | null;
  };
  const isComplete = taskState.status === 'completed';
  const isSkipped = taskState.status === 'skipped';

  const [calendars, setCalendars] = useState<OwnedCalendar[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  const [notes, setNotes] = useState<string>(taskState.notes ?? '');
  const [pending, setPending] = useState<'complete' | 'skip' | 'reopen' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (calendars !== null || isComplete || isSkipped) return;
    void doScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doScan = async () => {
    setScanError(null);
    setTokenExpired(false);
    setScanning(true);
    try {
      const list = await fetchOwnedCalendars();
      setCalendars(list);
    } catch (err) {
      if (err instanceof CalendarTokenError) {
        setTokenExpired(true);
      } else {
        setScanError(err instanceof Error ? err.message : 'Could not load your calendars.');
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
        taskKey: 'calendarTransfer',
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
          Calendar handoff
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          We pull calendars you own or manage (other than your primary) so you can hand off the ones
          that need it.
        </p>
      </div>

      <div className="space-y-4">
        <StepCard>
          <StepHeader
            step="Step 1"
            title="Calendars you own or manage"
            description="Owners need to transfer ownership. Managers just lose access — calendar lives on. Click any row to open its settings in Google Calendar."
            action={
              !tokenExpired
                ? {
                    label: scanning ? 'Loading…' : calendars ? 'Refresh' : 'Load calendars',
                    onClick: () => void doScan(),
                    disabled: scanning,
                  }
                : undefined
            }
          />

          {tokenExpired && (
            <StepError>
              Your Google session expired. Sign out and sign back in to grant the calendar
              permission and try again.
            </StepError>
          )}
          {scanError && <StepError>{scanError}</StepError>}

          {!scanning && calendars && (
            <>
              {calendars.length === 0 ? (
                <p className="text-sm text-white/65">
                  You don’t own or manage any calendars besides your primary. Nothing to do here. ✓
                </p>
              ) : (
                <div className="space-y-2">
                  {calendars.map((c) => {
                    const isOwner = c.accessRole === 'owner';
                    return (
                      <a
                        key={c.id}
                        href={calendarSettingsUrl(c.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-white/5"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        <span
                          className="h-9 w-2 shrink-0 rounded-full"
                          style={{ background: c.backgroundColor ?? '#94a3b8' }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">
                            {c.summary}
                          </span>
                          {c.description && (
                            <span className="block truncate text-xs text-white/60">
                              {c.description}
                            </span>
                          )}
                        </span>
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
                        <span className="text-xs font-semibold text-white/80">Open ↗</span>
                      </a>
                    );
                  })}
                </div>
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
                  : 'Mark complete when you’ve handed off the calendars that matter. Skip if there’s nothing to transfer.'
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
                placeholder="e.g. transferred Math Dept schedule to Sue"
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
    </div>
  );
}
