import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import {
  StepCard,
  StepError,
  StepHeader,
  StepInput,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { getGoogleAccessToken, useAuth } from '../../lib/auth';
import { createHandoffDoc, markTaskComplete } from '../../lib/functions';
import type { OutletCtx } from '../../App';

const TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'Active projects',
    body: 'What are you in the middle of? Status, next steps, who else is involved.',
  },
  {
    title: 'Recurring tasks',
    body: "Anything you do weekly or monthly that someone else will need to pick up — note when it's due and who depends on it.",
  },
  {
    title: 'Key contacts and relationships',
    body: 'Vendors, parents, partner orgs, internal points of contact — the people your successor should know exist.',
  },
  {
    title: 'Things you had to figure out the hard way',
    body: 'Workarounds, gotchas, undocumented quirks — the institutional knowledge that disappears when you leave.',
  },
  {
    title: 'Where things live',
    body: 'Drive folders, shared drives, sites, important docs — give your successor the map.',
  },
  {
    title: 'Login info',
    body: "Mention systems your successor will need access to — but don't paste passwords here. IT can grant access through normal channels.",
  },
];

export function KnowledgeTransferTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const taskState = (doc.tasks.knowledgeTransfer ?? { status: 'not_started' }) as {
    status: string;
    completedAt?: { toDate: () => Date } | null;
    notes?: string | null;
    docId?: string;
    docName?: string;
    docUrl?: string;
  };
  const isComplete = taskState.status === 'completed';
  const hasDoc = Boolean(taskState.docId && taskState.docUrl);

  const [docName, setDocName] = useState('');
  const [creating, setCreating] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [notes, setNotes] = useState<string>(taskState.notes ?? '');
  const [marking, setMarking] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    if (docName) return;
    const first = user?.displayName?.split(' ')[0];
    setDocName(first ? `Handoff Notes — ${first}` : 'Handoff Notes');
  }, [user?.displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateDoc = async () => {
    setDocError(null);
    const token = getGoogleAccessToken();
    if (!token) {
      setDocError('Your Google session expired. Please sign out and sign in again.');
      return;
    }
    setCreating(true);
    try {
      await createHandoffDoc({
        name: docName.trim() || 'Handoff Notes',
        googleAccessToken: token,
      });
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Could not create the doc.');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleMarkComplete = async () => {
    setCompleteError(null);
    setMarking(true);
    try {
      await markTaskComplete({
        taskKey: 'knowledgeTransfer',
        status: 'completed',
        notes: notes.trim() || null,
      });
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

  const handleReopen = async () => {
    setCompleteError(null);
    setMarking(true);
    try {
      await markTaskComplete({ taskKey: 'knowledgeTransfer', status: 'in_progress' });
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      console.error(err);
    } finally {
      setMarking(false);
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
          Knowledge transfer
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Leave a handoff doc with the things your successor will need to know — projects, contacts,
          gotchas, and where things live.
        </p>
      </div>

      <div className="space-y-4">
        <StepCard>
          <StepHeader
            step="Step 1"
            title="Create your handoff doc"
            description="We'll spin up a Google Doc in your Drive. Edit it in Google Docs, share it with whoever needs it before you leave."
            status={hasDoc ? { label: 'Created', tone: 'done' } : { label: 'Not yet' }}
          />
          {hasDoc ? (
            <a
              href={taskState.docUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <span
                className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                Doc
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {taskState.docName ?? 'Handoff Notes'}
                </span>
                <span className="block truncate text-xs text-white/60">
                  Open in Google Docs to start writing
                </span>
              </span>
              <span className="text-xs font-semibold text-white/80">Open ↗</span>
            </a>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <StepInput
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Doc name"
                className="flex-1"
              />
              <button
                onClick={handleCreateDoc}
                disabled={creating}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                  boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                }}
              >
                {creating ? 'Creating…' : 'Create doc'}
              </button>
            </div>
          )}
          {docError && <StepError>{docError}</StepError>}
        </StepCard>

        <StepCard>
          <StepHeader
            step="Step 2"
            title="What to include"
            description="A few prompts to fill in. Use as much or as little as you need — even a short doc beats none."
          />
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
                : 'Once your handoff doc has what your successor will need, mark this task complete.'
            }
            status={isComplete ? { label: 'Completed', tone: 'done' } : { label: 'Not yet' }}
          />

          {isComplete ? (
            <div className="space-y-3">
              {taskState.notes && (
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                    Your note
                  </p>
                  <p className="mt-1 text-sm text-white/85">{taskState.notes}</p>
                </div>
              )}
              {taskState.completedAt && (
                <p className="text-xs text-white/60">
                  Marked complete{' '}
                  {taskState.completedAt
                    .toDate()
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
              <button
                onClick={handleReopen}
                disabled={marking}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              >
                {marking ? 'Saving…' : 'Reopen — I have more to add'}
              </button>
            </div>
          ) : (
            <>
              <StepLabel>Optional note for IT</StepLabel>
              <StepTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. doc is in shared drive 'Math Department' under Handoffs/"
                className="mb-3"
              />
              <button
                onClick={handleMarkComplete}
                disabled={marking || !hasDoc}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                  boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                }}
              >
                {marking ? 'Saving…' : "I'm done — mark complete"}
              </button>
              {!hasDoc && (
                <p className="mt-2 text-xs text-white/60">
                  Create the doc first so there's something to point to.
                </p>
              )}
            </>
          )}

          {completeError && <StepError>{completeError}</StepError>}
        </StepCard>
      </div>
    </div>
  );
}
