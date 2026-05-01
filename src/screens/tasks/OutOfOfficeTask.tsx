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
import type { OutletCtx } from '../../App';

type TemplateId = 'left-ops' | 'leaving-soon' | 'custom';

function buildTemplates(supervisorEmail: string | null, supervisorName: string | null | undefined) {
  const contactLine = supervisorEmail
    ? `For assistance, please contact ${supervisorName ?? supervisorEmail} (${supervisorEmail}) or the appropriate Orono Public Schools department.`
    : 'For assistance, please contact the appropriate Orono Public Schools department.';

  return {
    'left-ops': {
      label: "I've left OPS",
      subject: 'No longer with Orono Public Schools',
      body: `Thank you for your message. I am no longer with Orono Public Schools.\n\n${contactLine}\n\nThis is an automatic reply — this address is no longer monitored.`,
    },
    'leaving-soon': {
      label: 'Leaving soon',
      subject: 'Out of office — transitioning from Orono Public Schools',
      body: `Thank you for your message. I will be leaving Orono Public Schools shortly and may have limited access to email.\n\n${contactLine}\n\nThis is an automatic reply.`,
    },
    custom: {
      label: 'Custom',
      subject: '',
      body: '',
    },
  } as const;
}

export function OutOfOfficeTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const taskState = doc.tasks.outOfOffice ?? { status: 'not_started' };

  const templates = useMemo(
    () => buildTemplates(doc.supervisor, doc.supervisorName),
    [doc.supervisor, doc.supervisorName],
  );

  const [templateId, setTemplateId] = useState<TemplateId>('left-ops');
  const [subject, setSubject] = useState<string>(
    (taskState.subject as string | undefined) ?? templates['left-ops'].subject,
  );
  const [message, setMessage] = useState<string>(
    (taskState.message as string | undefined) ?? templates['left-ops'].body,
  );
  const [startDate, setStartDate] = useState<string>(
    (taskState.startDate as string | null | undefined) ?? '',
  );
  const [endDate, setEndDate] = useState<string>(
    (taskState.endDate as string | null | undefined) ?? '',
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
        subject: subject.trim() || 'Out of office',
        startDate: startDate || null,
        endDate: endDate || null,
        googleAccessToken: token,
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
          Out-of-office responder
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Set the automatic reply people will get after you leave. Runs until you turn it off in
          Gmail or your account is deactivated.
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
          {!doc.supervisor && templateId !== 'custom' && (
            <p className="mt-3 text-xs text-white/60">
              Tip: add your supervisor on the dashboard and the template will include them as a
              fallback contact.
            </p>
          )}
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
            description="Leave blank to start immediately and run until your account is deactivated."
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
                <p className="text-sm font-semibold text-white">Your responder is live.</p>
                <p className="mt-1 text-xs leading-relaxed text-white/80">
                  Anyone who emails you will get this message right away. You can update it from
                  this page or turn it off in Gmail settings anytime.
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
