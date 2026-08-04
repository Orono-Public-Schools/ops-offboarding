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
      <PageTitle
        title="Out-of-office responder"
        subtitle="Set the automatic reply people will get after you leave. Runs until you turn it off in Gmail or your account is deactivated."
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
          {!doc.supervisor && templateId !== 'custom' && (
            <p className="mt-3" style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
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
                style={{ background: 'rgba(var(--dark-rgb), 0.1)', color: 'var(--dark)' }}
              >
                <Icon name="check" size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>
                  Your responder is live.
                </p>
                <p
                  className="mt-1 leading-relaxed"
                  style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
                >
                  Anyone who emails you will get this message right away. You can update it from
                  this page or turn it off in Gmail settings anytime.
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
            <Button variant="submit" icon="send" onClick={handleSave} disabled={saving}>
              {saving
                ? 'Saving…'
                : taskState.status === 'completed' || savedOk
                  ? 'Update responder'
                  : 'Activate responder'}
            </Button>
            <NextTaskButton currentKey="outOfOffice" className="order-first sm:order-last" />
            <HelpFlagSection currentKey="outOfOffice" className="order-first sm:order-last" />
          </div>
        </StepCard>
      </div>
    </div>
  );
}
