import { useEffect, useState } from 'react';
import { Button } from '../ds/components/core/Button';
import { Icon } from '../ds/components/core/Icon';
import { getGoogleAccessToken, useAuth } from '../lib/auth';
import {
  createDriveFolder,
  listSharedDrives,
  setDriveDestinations,
  type DriveDestination,
} from '../lib/functions';
import { StepError, StepInput } from './TaskStep';

type SharedDrive = { id: string; name: string };

type Props = {
  open: boolean;
  initialDestinations: DriveDestination[];
  onClose: () => void;
  onSaved: (destinations: DriveDestination[]) => void;
};

export function DriveDestinationsSetup({ open, initialDestinations, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [drives, setDrives] = useState<SharedDrive[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDriveIds, setSelectedDriveIds] = useState<Set<string>>(new Set());
  const [createPersonal, setCreatePersonal] = useState(true);
  const [personalFolderName, setPersonalFolderName] = useState('My Offboarding');
  const [existingPersonalFolder, setExistingPersonalFolder] = useState<DriveDestination | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize from existing destinations.
  useEffect(() => {
    if (!open) return;
    const ids = new Set<string>();
    let personal: DriveDestination | null = null;
    for (const d of initialDestinations) {
      if (d.kind === 'sharedDrive') ids.add(d.folderId);
      if (d.kind === 'personalFolder') personal = d;
    }
    setSelectedDriveIds(ids);
    setExistingPersonalFolder(personal);
    setCreatePersonal(personal !== null);
    if (personal) setPersonalFolderName(personal.name);
    else if (user?.displayName) {
      const first = user.displayName.split(' ')[0];
      setPersonalFolderName(`My Offboarding — ${first}`);
    }
  }, [open, initialDestinations, user?.displayName]);

  // Load shared drives.
  useEffect(() => {
    if (!open) return;
    const token = getGoogleAccessToken();
    if (!token) {
      setLoadError('Your Google session expired. Please sign out and sign in again.');
      return;
    }
    setLoadError(null);
    listSharedDrives({ googleAccessToken: token })
      .then((res) => setDrives(res.data.drives))
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load shared drives.');
        console.error(err);
      });
  }, [open]);

  const toggleDrive = (id: string) => {
    setSelectedDriveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const token = getGoogleAccessToken();
      if (!token) throw new Error('Session expired. Please sign in again.');

      const destinations: DriveDestination[] = [];
      if (drives) {
        for (const id of selectedDriveIds) {
          const drive = drives.find((d) => d.id === id);
          if (!drive) continue;
          destinations.push({
            kind: 'sharedDrive',
            folderId: drive.id,
            name: drive.name,
            sharedDriveId: drive.id,
            sharedDriveName: drive.name,
          });
        }
      }

      if (createPersonal) {
        if (existingPersonalFolder && existingPersonalFolder.name === personalFolderName.trim()) {
          destinations.push(existingPersonalFolder);
        } else {
          const trimmed = personalFolderName.trim() || 'My Offboarding';
          const folder = await createDriveFolder({
            name: trimmed,
            parentId: null,
            googleAccessToken: token,
          });
          destinations.push({
            kind: 'personalFolder',
            folderId: folder.data.id,
            name: folder.data.name,
          });
        }
      }

      await setDriveDestinations({ destinations });
      onSaved(destinations);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save destinations.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col"
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card-hover)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 p-5"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <div>
            <p
              className="uppercase"
              style={{
                font: 'var(--type-card-eyebrow)',
                letterSpacing: 'var(--tracking-widest)',
                color: 'var(--text-muted)',
              }}
            >
              Drive destinations
            </p>
            <h2 className="mt-1" style={{ font: 'var(--type-card-title)', color: 'var(--dark)' }}>
              Where will you be sending things?
            </h2>
            <p className="mt-1" style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Pick the shared drives you'll move work into, and optionally create a personal staging
              folder to download before you leave. You can change these anytime.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 transition hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6">
            <h3
              className="mb-2 uppercase"
              style={{
                font: 'var(--type-field-label)',
                letterSpacing: 'var(--tracking-wider)',
                color: 'var(--text-muted)',
              }}
            >
              Shared drives
            </h3>
            {loadError && <StepError>{loadError}</StepError>}
            {!drives && !loadError && (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-placeholder)' }}>
                Loading…
              </p>
            )}
            {drives && drives.length === 0 && (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-placeholder)' }}>
                You're not a member of any shared drives.
              </p>
            )}
            {drives && drives.length > 0 && (
              <div>
                {drives.map((drive, i) => {
                  const checked = selectedDriveIds.has(drive.id);
                  return (
                    <label
                      key={drive.id}
                      className="flex cursor-pointer items-center gap-3 px-2 py-3 transition"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--divider)' : undefined,
                        background: checked ? 'rgba(var(--secondary-rgb), 0.08)' : 'transparent',
                        borderRadius: checked ? 8 : 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDrive(drive.id)}
                        className="h-4 w-4 cursor-pointer"
                        style={{ accentColor: 'var(--secondary)' }}
                      />
                      <span style={{ font: 'var(--type-strong)', color: 'var(--dark)' }}>
                        {drive.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3
              className="mb-2 uppercase"
              style={{
                font: 'var(--type-field-label)',
                letterSpacing: 'var(--tracking-wider)',
                color: 'var(--text-muted)',
              }}
            >
              Personal staging folder
            </h3>
            <label
              className="mb-3 flex cursor-pointer items-start gap-3"
              style={{ color: 'var(--text-body)' }}
            >
              <input
                type="checkbox"
                checked={createPersonal}
                onChange={(e) => setCreatePersonal(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer"
                style={{ accentColor: 'var(--secondary)' }}
              />
              <span style={{ font: 'var(--type-body)' }}>
                Create a folder in my personal Drive where I can collect things to download before
                my account is deactivated.
              </span>
            </label>
            {createPersonal && (
              <StepInput
                type="text"
                value={personalFolderName}
                onChange={(e) => setPersonalFolderName(e.target.value)}
                placeholder="Folder name"
              />
            )}
            {existingPersonalFolder && createPersonal && (
              <p
                className="mt-2"
                style={{ font: 'var(--type-caption)', color: 'var(--text-placeholder)' }}
              >
                Already created. Renaming will create a new folder; the old one stays in your Drive.
              </p>
            )}
          </div>
        </div>

        {saveError && (
          <div className="mx-5 mb-3">
            <StepError>{saveError}</StepError>
          </div>
        )}

        <div
          className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save destinations'}
          </Button>
        </div>
      </div>
    </div>
  );
}
