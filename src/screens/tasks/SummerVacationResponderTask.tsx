import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import {
  StepCard,
  StepError,
  StepHeader,
  StepInput,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { getGoogleAccessToken } from '../../lib/auth';
import { setOutOfOffice } from '../../lib/functions';
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

  const isComplete = taskState.status === 'completed' || savedOk;

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
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to dashboard
      </Link>

      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: '#ffffff' }}>
          Summer vacation responder
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Set the automatic reply people will get over summer break. Activates today and runs until
          you turn it off (you can stop it any time from Gmail).
        </p>
      </div>

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
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  style={{
                    background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                    borderColor: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
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
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#ffffff' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Your summer responder is live.</p>
                <p className="mt-1 text-xs leading-relaxed text-white/80">
                  Anyone who emails you will get this message. Update it from this page or turn it
                  off in Gmail settings anytime.
                </p>
              </div>
            </div>
          </StepCard>
        )}

        {error && <StepError>{error}</StepError>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            to="/"
            className="rounded-xl border px-4 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            {savedOk ? 'Done' : 'Cancel'}
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow-lg active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{
              background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
              boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
            }}
          >
            {saving
              ? 'Saving…'
              : taskState.status === 'completed' || savedOk
                ? 'Update responder'
                : 'Activate responder'}
          </button>
        </div>
      </div>
    </div>
  );
}
