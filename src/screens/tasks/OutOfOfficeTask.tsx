import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
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
          Set the automatic reply people will get after you leave. This sets your Gmail vacation
          responder and runs until you disable it (or your account is deactivated).
        </p>
      </div>

      <div className="space-y-6">
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: '#1d2a5d' }}
          >
            Template
          </h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(templates) as TemplateId[]).map((id) => {
              const active = templateId === id;
              return (
                <button
                  key={id}
                  onClick={() => applyTemplate(id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
                        }
                      : {
                          background: '#eaecf5',
                          color: '#1d2a5d',
                        }
                  }
                >
                  {templates[id].label}
                </button>
              );
            })}
          </div>
          {!doc.supervisor && templateId !== 'custom' && (
            <p className="mt-3 text-xs" style={{ color: '#94a3b8' }}>
              Tip: add your supervisor on the dashboard and the template will include them as a
              fallback contact.
            </p>
          )}
        </div>

        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: '#1d2a5d' }}
          >
            Message
          </h2>

          <label
            className="mb-1 block text-xs font-semibold tracking-wider uppercase"
            style={{ color: '#64748b' }}
          >
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-4 w-full rounded-lg px-3 py-2 text-sm transition outline-none"
            style={{ background: '#ffffff', border: '1px solid #e2e5ea', color: '#1d2a5d' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2d3f89';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,63,137,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e5ea';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          <label
            className="mb-1 block text-xs font-semibold tracking-wider uppercase"
            style={{ color: '#64748b' }}
          >
            Body
          </label>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none rounded-lg px-3 py-2 text-sm transition outline-none"
            style={{ background: '#ffffff', border: '1px solid #e2e5ea', color: '#1d2a5d' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2d3f89';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,63,137,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e5ea';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: '#1d2a5d' }}
          >
            Dates (optional)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                style={{ color: '#64748b' }}
              >
                Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: '#ffffff', border: '1px solid #e2e5ea', color: '#1d2a5d' }}
              />
              <p className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
                Leave blank to start immediately.
              </p>
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                style={{ color: '#64748b' }}
              >
                End
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: '#ffffff', border: '1px solid #e2e5ea', color: '#1d2a5d' }}
              />
              <p className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
                Leave blank and the responder runs until your account is deactivated.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {error}
          </p>
        )}

        {savedOk && (
          <div
            className="flex items-start gap-3 rounded-xl p-4 sm:p-5"
            style={{
              background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              boxShadow: '0 2px 12px rgba(29,42,93,0.3)',
            }}
          >
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
                Anyone who emails you will get this message right away. You can update it from this
                page or turn it off in Gmail settings anytime.
              </p>
            </div>
          </div>
        )}

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
              background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
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
