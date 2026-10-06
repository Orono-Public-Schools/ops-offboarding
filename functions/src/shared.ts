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

/** Tech-branch access: IT support or IT admin. Covers the offboarding
 *  dashboard, help requests, and the staff sync — never HR records. */
export function isTechRole(token: Record<string, unknown>): boolean {
  return token.it_admin === true || token.it_support === true;
}

/** HR access level from custom claims. `it_admin` and legacy `hr: true`
 *  count as admin level; `hr: 'staff'` is day-to-day access only. */
export function hrLevel(token: Record<string, unknown>): 'admin' | 'staff' | null {
  if (token.it_admin === true) return 'admin';
  if (token.hr === true || token.hr === 'admin') return 'admin';
  if (token.hr === 'staff') return 'staff';
  return null;
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
