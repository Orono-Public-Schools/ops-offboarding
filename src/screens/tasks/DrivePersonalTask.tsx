import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { HelpFlagSection } from '../../components/HelpFlagSection';
import { NextTaskButton } from '../../components/NextTaskButton';
import {
  InsetPanel,
  StepCard,
  StepError,
  StepHeader,
  StepInput,
  StepLabel,
  StepTextarea,
} from '../../components/TaskStep';
import { Button } from '../../ds/components/core/Button';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { getGoogleAccessToken, useAuth } from '../../lib/auth';
import {
  createDriveFolder,
  markTaskComplete,
  setDriveDestinations,
  type DriveDestination,
} from '../../lib/functions';
import type { OutletCtx } from '../../App';

const DRIVE_HOME_URL = 'https://drive.google.com/drive/u/0/my-drive';

const OUTLINE_LINK_STYLE: React.CSSProperties = {
  font: 'var(--type-button)',
  color: 'var(--secondary)',
  background: 'rgba(var(--secondary-rgb), 0.1)',
  border: '1px solid rgba(var(--secondary-rgb), 0.3)',
  borderRadius: 'var(--radius-button)',
};

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
      <PageTitle
        title="My Drive cleanup"
        subtitle="We help you set up a place to keep things, then you do the actual moving in Drive — it's faster and you know your files better than any tool can."
        className="mb-5 sm:mb-8"
      />

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
              className="flex items-center gap-3 p-3 transition"
              style={{ background: 'var(--surface-inset)', borderRadius: 8 }}
            >
              <span
                className="flex h-9 w-12 shrink-0 items-center justify-center uppercase"
                style={{
                  font: 'var(--type-micro)',
                  background: 'var(--tint)',
                  color: 'var(--dark)',
                  borderRadius: 6,
                }}
              >
                Folder
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate"
                  style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}
                >
                  {personalFolder.name}
                </span>
                <span
                  className="block truncate"
                  style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}
                >
                  In your personal Drive — download before your last day
                </span>
              </span>
              <span
                style={{ font: 'var(--type-caption)', fontWeight: 600, color: 'var(--secondary)' }}
              >
                Open ↗
              </span>
            </a>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <StepInput
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1"
              />
              <Button
                variant="primary"
                onClick={handleCreateFolder}
                disabled={creating}
                className="shrink-0"
              >
                {creating ? 'Creating…' : 'Create folder'}
              </Button>
            </div>
          )}
          {folderError && <StepError>{folderError}</StepError>}
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
            className="inline-flex h-10 items-center gap-2 px-4 transition hover:-translate-y-px"
            style={OUTLINE_LINK_STYLE}
          >
            Open My Drive ↗
          </a>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                <InsetPanel>
                  <StepLabel>Your note</StepLabel>
                  <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
                    {taskState.notes}
                  </p>
                </InsetPanel>
              )}
              {taskState.completedAt && (
                <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  Marked complete{' '}
                  {taskState.completedAt
                    .toDate()
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={handleReopen} disabled={marking}>
                  {marking ? 'Saving…' : 'Reopen — I have more to do'}
                </Button>
                <NextTaskButton currentKey="drivePersonal" />
                <HelpFlagSection currentKey="drivePersonal" />
              </div>
            </div>
          ) : (
            <>
              <StepLabel>Optional note for IT</StepLabel>
              <StepTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. left a few old projects on purpose; Math team has the active stuff"
                className="mb-3"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="submit"
                  icon="check"
                  onClick={handleMarkComplete}
                  disabled={marking}
                >
                  {marking ? 'Saving…' : "I'm done — mark complete"}
                </Button>
                <NextTaskButton currentKey="drivePersonal" />
                <HelpFlagSection currentKey="drivePersonal" />
              </div>
            </>
          )}

          {completeError && <StepError>{completeError}</StepError>}
        </StepCard>
      </div>
    </div>
  );
}
