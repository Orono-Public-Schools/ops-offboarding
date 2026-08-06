import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app } from './firebase';
import type { FileRef } from '../../shared/forms/types';

const storage = getStorage(app);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Uploads into the caller's own folder — the only path Storage rules allow
 *  them to write; submitForm re-checks the prefix server-side. */
export async function uploadFormFile(uid: string, file: File): Promise<FileRef> {
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'attachment';
  const path = `uploads/${uid}/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type || undefined });
  return { path, name: safeName };
}

/** Best-effort cleanup when an attachment is replaced or the draft cleared. */
export function removeFormFile(fileRef: FileRef): void {
  deleteObject(ref(storage, fileRef.path)).catch(() => {
    // Already gone or not ours — nothing to do.
  });
}

export function fileDownloadUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}
