import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type FileScanEntry = {
  fileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  ownedByUser: boolean;
  inMyDrive: boolean;
  inSharedDrive: string | null;
  collaborators: Array<{ email: string; role: string }>;
  collaboratorCount: number;
  lastModified: Timestamp | null;
  riskScore: number;
  decision: 'personal' | 'moveToShared' | 'transfer' | 'delete' | 'pending';
  decisionTarget: string | null;
  movedAt: Timestamp | null;
};

type FileScanState =
  | { loading: true }
  | { loading: false; error: Error }
  | { loading: false; entries: FileScanEntry[] };

export function useFileScan(uid: string | null, limitN = 100): FileScanState {
  const [state, setState] = useState<FileScanState>({ loading: true });

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'offboardings', uid, 'fileScan'), orderBy('riskScore', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs.slice(0, limitN).map((d) => d.data() as FileScanEntry);
        setState({ loading: false, entries });
      },
      (err) => setState({ loading: false, error: err }),
    );
    return unsub;
  }, [uid, limitN]);

  return state;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const ICON_BY_TYPE: Record<string, string> = {
  'application/vnd.google-apps.document': 'Doc',
  'application/vnd.google-apps.spreadsheet': 'Sheet',
  'application/vnd.google-apps.presentation': 'Slides',
  'application/vnd.google-apps.form': 'Form',
  'application/vnd.google-apps.folder': 'Folder',
  'application/vnd.google-apps.drawing': 'Drawing',
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
};

export function shortType(mimeType: string): string {
  if (ICON_BY_TYPE[mimeType]) return ICON_BY_TYPE[mimeType];
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  return 'File';
}

export function driveUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
