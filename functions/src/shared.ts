import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

initializeApp();

export const ALLOWED_DOMAIN = 'orono.k12.mn.us';
export const REGION = 'us-central1';

export const TASK_KEYS = [
  // Leaving
  'drivePersonal',
  'driveTeam',
  'groupsOwnership',
  'outOfOffice',
  'calendarTransfer',
  'gmailForwarding',
  'sitesOwnership',
  'contactsExport',
  'deviceReturn',
  'knowledgeTransfer',
  'sharedCredentials',
  // Returning end-of-year
  'eoyTeacherDevice',
  'eoyHardware',
  'eoyStudentIpads',
  'eoyChromebookCheckin',
  'eoyDeviceForm',
  'eoySeesaw',
  'eoyGoogleClassroom',
  'eoySchoology',
  'eoySummerPL',
  'eoyVacationResponder',
] as const;

export const TASK_KEY_SET = new Set<string>(TASK_KEYS);

export function initialTasks() {
  return Object.fromEntries(TASK_KEYS.map((k) => [k, { status: 'not_started', help: null }]));
}

export function requireAuthedDomainUser(request: {
  auth?: { uid: string; token: { email?: string } };
}) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  const email = request.auth.token.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError('permission-denied', `Restricted to @${ALLOWED_DOMAIN} accounts.`);
  }
  return { uid: request.auth.uid, email };
}

export async function deleteSubcollection(
  collection: FirebaseFirestore.CollectionReference,
  pageSize = 400,
): Promise<number> {
  const db = getFirestore();
  let total = 0;
  while (true) {
    const snap = await collection.limit(pageSize).get();
    if (snap.empty) break;
    const writer = db.bulkWriter();
    for (const doc of snap.docs) writer.delete(doc.ref);
    await writer.close();
    total += snap.size;
    if (snap.size < pageSize) break;
  }
  return total;
}
