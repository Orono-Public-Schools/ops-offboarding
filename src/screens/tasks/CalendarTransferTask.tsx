import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { HelpFlagSection } from '../../components/HelpFlagSection';
import { NextTaskButton } from '../../components/NextTaskButton';
import {
  InsetPanel,
  StepCard,
  StepError,
  StepHeader,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { Button } from '../../ds/components/core/Button';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
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
      <PageTitle
        title="Calendar handoff"
        subtitle="We pull calendars you own or manage (other than your primary) so you can hand off the ones that need it."
        className="mb-5 sm:mb-8"
      />

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
                <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                  You don’t own or manage any calendars besides your primary. Nothing to do here.
                </p>
              ) : (
                <div>
                  {calendars.map((c, i) => {
                    const isOwner = c.accessRole === 'owner';
                    return (
                      <a
                        key={c.id}
                        href={calendarSettingsUrl(c.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 py-3 transition hover:bg-black/[0.03]"
                        style={{ borderTop: i > 0 ? '1px solid var(--divider)' : undefined }}
                      >
                        <span
                          className="h-9 w-2 shrink-0 rounded-full"
                          style={{ background: c.backgroundColor ?? 'var(--text-placeholder)' }}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate"
                            style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}
                          >
                            {c.summary}
                          </span>
                          {c.description && (
                            <span
                              className="block truncate"
                              style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}
                            >
                              {c.description}
                            </span>
                          )}
                        </span>
                        <StatusBadge
                          state={isOwner ? 'processing' : 'draft'}
                          label={isOwner ? 'Owner' : 'Manager'}
                          icon={false}
                          size="sm"
                          className="shrink-0"
                        />
                        <span
                          style={{
                            font: 'var(--type-caption)',
                            fontWeight: 600,
                            color: 'var(--secondary)',
                          }}
                        >
                          Open ↗
                        </span>
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
              <InsetPanel key={tip.title}>
                <p style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>{tip.title}</p>
                <p
                  className="mt-1 leading-relaxed"
                  style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
                >
                  {tip.body}
                </p>
              </InsetPanel>
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
                <InsetPanel>
                  <StepLabel>Your note</StepLabel>
                  <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
                    {taskState.notes}
                  </p>
                </InsetPanel>
              )}
              {taskState.completedAt && isComplete && (
                <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
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

          <div className="flex flex-wrap items-center gap-2">
            {isComplete || isSkipped ? (
              <Button
                variant="ghost"
                onClick={() => handleStatus('in_progress')}
                disabled={pending !== null}
              >
                {pending === 'reopen' ? 'Saving…' : 'Reopen'}
              </Button>
            ) : (
              <>
                <Button
                  variant="submit"
                  icon="check"
                  onClick={() => handleStatus('completed')}
                  disabled={pending !== null}
                >
                  {pending === 'complete' ? 'Saving…' : "I'm done — mark complete"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleStatus('skipped')}
                  disabled={pending !== null}
                >
                  {pending === 'skip' ? 'Saving…' : "Doesn't apply — skip"}
                </Button>
              </>
            )}
            <NextTaskButton currentKey="calendarTransfer" />
            <HelpFlagSection currentKey="calendarTransfer" />
          </div>

          {saveError && <StepError>{saveError}</StepError>}
        </StepCard>
      </div>
    </div>
  );
}
