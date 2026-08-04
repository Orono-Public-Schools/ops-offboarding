import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { HelpFlagSection } from '../../components/HelpFlagSection';
import { NextTaskButton } from '../../components/NextTaskButton';
import {
  StepCard,
  StepError,
  StepHeader,
  StepInput,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { Button } from '../../ds/components/core/Button';
import { Icon } from '../../ds/components/core/Icon';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { getGoogleAccessToken } from '../../lib/auth';
import { markTaskComplete, setOutOfOffice } from '../../lib/functions';
import type { BuildingChecklist } from '../../lib/offboarding';
import { formatReturnDateOrdinal, returnDateForBuilding, useEoySettings } from '../../lib/settings';
import type { OutletCtx } from '../../App';

type TemplateId = 'summer' | 'summer-with-coverage' | 'custom';

function buildTemplates(building: BuildingChecklist | null | undefined, returnDateIso: string) {
  const returnDate = formatReturnDateOrdinal(returnDateForBuilding(returnDateIso, building));
  return {
    summer: {
      label: 'Summer break',
      subject: 'On summer break',
      body: `Thank you for contacting me. Orono Schools are on summer break until ${returnDate}. If you need assistance please contact the office at 952-449-8338.\n\nThank you, and have a great summer!`,
    },
    'summer-with-coverage': {
      label: 'Summer + coverage contact',
      subject: 'On summer break',
      body: `Thank you for contacting me. Orono Schools are on summer break until ${returnDate}. If your message needs attention before then, please reach out to [colleague name and email] or the office at 952-449-8338.\n\nThank you, and have a great summer!`,
    },
    custom: {
      label: 'Custom',
      subject: '',
      body: '',
    },
  } as const;
}

export function SummerVacationResponderTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const taskState = doc.tasks.eoyVacationResponder ?? { status: 'not_started' };
  const settingsState = useEoySettings();
  const baseReturnDate =
    !settingsState.loading && settingsState.settings.returnDate
      ? settingsState.settings.returnDate
      : '2026-08-24';

  const templates = useMemo(
    () => buildTemplates(doc.buildingChecklist, baseReturnDate),
    [doc.buildingChecklist, baseReturnDate],
  );

  const [templateId, setTemplateId] = useState<TemplateId>('summer');
  const [subject, setSubject] = useState<string>(
    (taskState.subject as string | undefined) ?? templates['summer'].subject,
  );
  const [message, setMessage] = useState<string>(
    (taskState.message as string | undefined) ?? templates['summer'].body,
  );
  const [startDate, setStartDate] = useState<string>(
    (taskState.startDate as string | null | undefined) ?? '',
  );
  const [endDate, setEndDate] = useState<string>(
    (taskState.endDate as string | null | undefined) ??
      returnDateForBuilding(baseReturnDate, doc.buildingChecklist),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [manualPending, setManualPending] = useState<'complete' | 'skip' | 'reopen' | null>(null);

  const isComplete = taskState.status === 'completed' || savedOk;
  const isSkipped = taskState.status === 'skipped';

  const handleManual = async (status: 'completed' | 'skipped' | 'in_progress') => {
    setError(null);
    setSavedOk(false);
    setManualPending(
      status === 'completed' ? 'complete' : status === 'skipped' ? 'skip' : 'reopen',
    );
    try {
      await markTaskComplete({ taskKey: 'eoyVacationResponder', status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setManualPending(null);
    }
  };

  const applyTemplate = (id: TemplateId) => {
    setTemplateId(id);
    if (id !== 'custom') {
      setSubject(templates[id].subject);
      setMessage(templates[id].body);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSavedOk(false);

    const token = getGoogleAccessToken();
    if (!token) {
      setError('Your Google session expired. Please sign out and sign in again.');
      return;
    }
    if (!message.trim()) {
      setError('Message cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await setOutOfOffice({
        message: message.trim(),
        subject: subject.trim() || 'On summer break',
        startDate: startDate || null,
        endDate: endDate || null,
        googleAccessToken: token,
        taskKey: 'eoyVacationResponder',
      });
      setSavedOk(true);
    } catch (err) {
      const code = (err as { code?: string; message?: string }).code ?? '';
      if (code === 'functions/permission-denied') {
        setError('Google rejected the request. Please sign out and sign in again.');
      } else {
        setError(
          (err as { message?: string }).message ?? 'Could not set out-of-office. Please try again.',
        );
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="Summer vacation responder"
        subtitle="Set the automatic reply people will get over summer break. Activates today and runs until you turn it off (you can stop it any time from Gmail)."
        className="mb-5 sm:mb-8"
      />

      <div className="space-y-4">
        <StepCard>
          <StepHeader
            step="Step 1"
            title="Pick a template"
            description="Or start from scratch with Custom."
            status={isComplete ? { label: 'Active', tone: 'done' } : undefined}
          />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(templates) as TemplateId[]).map((id) => {
              const active = templateId === id;
              return (
                <button
                  key={id}
                  onClick={() => applyTemplate(id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    color: active ? 'var(--secondary)' : 'var(--text-body)',
                    background: active ? 'rgba(var(--secondary-rgb), 0.1)' : 'transparent',
                    border: active
                      ? '1px solid rgba(var(--secondary-rgb), 0.45)'
                      : '1px solid var(--border-input)',
                  }}
                >
                  {templates[id].label}
                </button>
              );
            })}
          </div>
        </StepCard>

        <StepCard>
          <StepHeader
            step="Step 2"
            title="Message"
            description="Edit the subject and body people will see."
          />
          <StepLabel>Subject</StepLabel>
          <StepInput
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-4"
          />
          <StepLabel>Body</StepLabel>
          <StepTextarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
        </StepCard>

        <StepCard>
          <StepHeader
            step="Step 3"
            title="Dates (optional)"
            description="Leave blank to start immediately. End on or near your return date."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <StepLabel>Start</StepLabel>
              <StepInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <StepLabel>End</StepLabel>
              <StepInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </StepCard>

        {savedOk && (
          <StepCard>
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(var(--dark-rgb), 0.1)', color: 'var(--dark)' }}
              >
                <Icon name="check" size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>
                  Your summer responder is live.
                </p>
                <p
                  className="mt-1 leading-relaxed"
                  style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
                >
                  Anyone who emails you will get this message. Update it from this page or turn it
                  off in Gmail settings anytime.
                </p>
              </div>
            </div>
          </StepCard>
        )}

        <StepCard>
          {error && (
            <div className="mb-3">
              <StepError>{error}</StepError>
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Link
              to="/offboarding"
              className="inline-flex h-10 items-center justify-center px-4 transition hover:bg-black/5"
              style={{
                font: 'var(--type-button)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-button)',
              }}
            >
              {savedOk ? 'Done' : 'Cancel'}
            </Link>
            {isComplete || isSkipped ? (
              <Button
                variant="ghost"
                onClick={() => handleManual('in_progress')}
                disabled={manualPending !== null || saving}
              >
                {manualPending === 'reopen' ? 'Reopening…' : 'Reopen'}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => handleManual('skipped')}
                  disabled={manualPending !== null || saving}
                >
                  {manualPending === 'skip' ? 'Saving…' : 'Skip'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleManual('completed')}
                  disabled={manualPending !== null || saving}
                >
                  {manualPending === 'complete' ? 'Saving…' : 'Mark complete'}
                </Button>
              </>
            )}
            <Button
              variant="submit"
              icon="send"
              onClick={handleSave}
              disabled={saving || manualPending !== null}
            >
              {saving
                ? 'Saving…'
                : taskState.status === 'completed' || savedOk
                  ? 'Update responder'
                  : 'Activate responder'}
            </Button>
            <NextTaskButton
              currentKey="eoyVacationResponder"
              className="order-first sm:order-last"
            />
            <HelpFlagSection
              currentKey="eoyVacationResponder"
              className="order-first sm:order-last"
            />
          </div>
        </StepCard>
      </div>
    </div>
  );
}
