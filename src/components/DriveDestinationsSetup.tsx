import { useEffect, useState } from 'react';
import { getGoogleAccessToken, useAuth } from '../lib/auth';
import {
  createDriveFolder,
  listSharedDrives,
  setDriveDestinations,
  type DriveDestination,
} from '../lib/functions';

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
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-xl"
        style={{
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 border-b p-5"
          style={{ borderColor: '#e2e5ea' }}
        >
          <div>
            <h2
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: '#1d2a5d' }}
            >
              Where will you be sending things?
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
              Pick the shared drives you'll move work into, and optionally create a personal staging
              folder to download before you leave. You can change these anytime.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold"
            style={{ color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6">
            <h3
              className="mb-2 text-xs font-semibold tracking-wider uppercase"
              style={{ color: '#64748b' }}
            >
              Shared drives
            </h3>
            {loadError && (
              <p
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
              >
                {loadError}
              </p>
            )}
            {!drives && !loadError && (
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                Loading…
              </p>
            )}
            {drives && drives.length === 0 && (
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                You're not a member of any shared drives.
              </p>
            )}
            {drives && drives.length > 0 && (
              <div className="space-y-2">
                {drives.map((drive) => {
                  const checked = selectedDriveIds.has(drive.id);
                  return (
                    <label
                      key={drive.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50"
                      style={{
                        border: '1px solid',
                        borderColor: checked ? '#2d3f89' : '#e2e5ea',
                        background: checked ? 'rgba(45,63,137,0.04)' : '#ffffff',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDrive(drive.id)}
                        className="h-4 w-4 cursor-pointer accent-[#4356a9]"
                      />
                      <span className="text-sm font-semibold" style={{ color: '#1d2a5d' }}>
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
              className="mb-2 text-xs font-semibold tracking-wider uppercase"
              style={{ color: '#64748b' }}
            >
              Personal staging folder
            </h3>
            <label
              className="mb-3 flex cursor-pointer items-start gap-3"
              style={{ color: '#334155' }}
            >
              <input
                type="checkbox"
                checked={createPersonal}
                onChange={(e) => setCreatePersonal(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-[#4356a9]"
              />
              <span className="text-sm">
                Create a folder in my personal Drive where I can collect things to download before
                my account is deactivated.
              </span>
            </label>
            {createPersonal && (
              <input
                type="text"
                value={personalFolderName}
                onChange={(e) => setPersonalFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full rounded-lg px-3 py-2 text-sm transition outline-none"
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
            )}
            {existingPersonalFolder && createPersonal && (
              <p className="mt-2 text-xs" style={{ color: '#94a3b8' }}>
                Already created. Renaming will create a new folder; the old one stays in your Drive.
              </p>
            )}
          </div>
        </div>

        {saveError && (
          <p
            className="mx-5 mb-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {saveError}
          </p>
        )}

        <div
          className="flex flex-col-reverse gap-3 border-t p-5 sm:flex-row sm:justify-end"
          style={{ borderColor: '#e2e5ea' }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
            style={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)',
              boxShadow: '0 2px 8px rgba(29,42,93,0.25)',
            }}
          >
            {saving ? 'Saving…' : 'Save destinations'}
          </button>
        </div>
      </div>
    </div>
  );
}
