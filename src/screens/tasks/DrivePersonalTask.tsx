import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { StepCard, StepHeader } from '../../components/TaskStep';
import { getGoogleAccessToken, useAuth } from '../../lib/auth';
import {
  createDriveFolder,
  markTaskComplete,
  setDriveDestinations,
  type DriveDestination,
} from '../../lib/functions';
import type { OutletCtx } from '../../App';

const DRIVE_HOME_URL = 'https://drive.google.com/drive/u/0/my-drive';

const TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'Things in shared drives are already safe',
    body: "If a file lives in a shared drive, the drive owns it — your account leaving doesn't affect it. You only need to deal with files in your personal Drive.",
  },
  {
    title: 'Look for files you share with a team',
    body: 'In Drive, sort by collaborators or filter by who you share with. These are usually the most important to move into a shared drive so the team keeps them.',
  },
  {
    title: 'Drag-and-drop into your destinations',
    body: 'Open the destination in one tab, your files in another, and drag. Drive handles ownership transfer automatically when you move into a shared drive.',
  },
  {
    title: 'When in doubt, drop it in your personal folder',
    body: 'Anything in your personal staging folder you can download as a zip from Drive before your account is deactivated.',
  },
  {
    title: "Old, untouched files probably aren't needed",
    body: "Sort by last-modified — anything you haven't touched in over a year is usually safe to leave (it'll be deleted with your account).",
  },
];

export function DrivePersonalTask() {
  const { doc } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const taskState = (doc.tasks.drivePersonal ?? { status: 'not_started' }) as {
    status: string;
    completedAt?: { toDate: () => Date } | null;
    notes?: string | null;
    destinations?: DriveDestination[];
  };
  const personalFolder = taskState.destinations?.find((d) => d.kind === 'personalFolder') ?? null;
  const isComplete = taskState.status === 'completed';

  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const [notes, setNotes] = useState<string>(taskState.notes ?? '');
  const [marking, setMarking] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    if (folderName) return;
    const first = user?.displayName?.split(' ')[0];
    setFolderName(first ? `My Offboarding — ${first}` : 'My Offboarding');
  }, [user?.displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateFolder = async () => {
    setFolderError(null);
    const token = getGoogleAccessToken();
    if (!token) {
      setFolderError('Your Google session expired. Please sign out and sign in again.');
      return;
    }
    const name = folderName.trim() || 'My Offboarding';
    setCreating(true);
    try {
      const res = await createDriveFolder({ name, parentId: null, googleAccessToken: token });
      const newDestination: DriveDestination = {
        kind: 'personalFolder',
        folderId: res.data.id,
        name: res.data.name,
      };
      const others = (taskState.destinations ?? []).filter((d) => d.kind !== 'personalFolder');
      await setDriveDestinations({ destinations: [...others, newDestination] });
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Could not create the folder.');
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
        taskKey: 'drivePersonal',
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
      await markTaskComplete({
        taskKey: 'drivePersonal',
        status: 'in_progress',
      });
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
          My Drive cleanup
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          We help you set up a place to keep things, then you do the actual moving in Drive — it's
          faster and you know your files better than any tool can.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1: Personal folder */}
        <StepCard>
          <StepHeader
            step="Step 1"
            title="Personal staging folder"
            description="Optional — create a folder in your Drive to collect anything you want to keep. You can download it before your account is deactivated."
            status={personalFolder ? { label: 'Created', tone: 'done' } : { label: 'Not yet' }}
          />
          {personalFolder ? (
            <a
              href={`https://drive.google.com/drive/u/0/folders/${personalFolder.folderId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <span
                className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                Folder
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {personalFolder.name}
                </span>
                <span className="block truncate text-xs text-white/60">
                  In your personal Drive — download before your last day
                </span>
              </span>
              <span className="text-xs font-semibold text-white/80">Open ↗</span>
            </a>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 rounded-lg px-3 py-2 text-sm transition outline-none"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#1d2a5d',
                }}
              />
              <button
                onClick={handleCreateFolder}
                disabled={creating}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                  boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                }}
              >
                {creating ? 'Creating…' : 'Create folder'}
              </button>
            </div>
          )}
          {folderError && (
            <p
              className="mt-3 rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fecaca' }}
            >
              {folderError}
            </p>
          )}
        </StepCard>

        {/* Step 2: Open Drive + tips */}
        <StepCard>
          <StepHeader
            step="Step 2"
            title="Move things in Drive"
            description="Open Drive in a new tab and drag files into your destinations. Drive handles ownership transfer automatically when you drop something into a shared drive."
          />
          <a
            href={DRIVE_HOME_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.4)' }}
          >
            Open My Drive ↗
          </a>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

        {/* Step 3: Mark complete */}
        <StepCard>
          <StepHeader
            step="Step 3"
            title="When you're done"
            description={
              isComplete
                ? "You've marked this complete. IT will see it on their dashboard."
                : 'Once your personal Drive only has stuff you’re okay losing, mark this task complete.'
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
                {marking ? 'Saving…' : 'Reopen — I have more to do'}
              </button>
            </div>
          ) : (
            <>
              <label className="mb-1 block text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                Optional note for IT
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. left a few old projects on purpose; Math team has the active stuff"
                className="mb-3 w-full resize-none rounded-lg px-3 py-2 text-sm transition outline-none"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#1d2a5d',
                }}
              />
              <button
                onClick={handleMarkComplete}
                disabled={marking}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                  boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
                }}
              >
                {marking ? 'Saving…' : "I'm done — mark complete"}
              </button>
            </>
          )}

          {completeError && (
            <p
              className="mt-3 rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fecaca' }}
            >
              {completeError}
            </p>
          )}
        </StepCard>
      </div>
    </div>
  );
}
