import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { google } from 'googleapis';

import { ALLOWED_DOMAIN, REGION, requireAuthedDomainUser } from './shared';

// Spreadsheet that drives the staff picker. Sync via syncStaffRoster.
const STAFF_SHEET_ID = '1uvr4MN3DhNyHKxxZuVeT_Tag3U6EpkRxr3s82plIqbU';
const STAFF_SHEET_RANGE = 'A:H';

type StaffRow = {
  email: string;
  displayName: string;
  givenName: string;
  familyName: string;
  username?: string;
  building?: string;
  title?: string;
  employeeId?: string;
};

function parseStaffRows(rows: string[][]): StaffRow[] {
  // Header row:
  // OneSync Internal ID | Building Initials | Username | Email | Employee ID
  //   | Last Name | First Name | Title
  const out: StaffRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip rows whose Email column doesn't look like an email — handles header
    // row(s) and any blank/garbage rows uniformly.
    const building = (row[1] ?? '').trim();
    const username = (row[2] ?? '').trim();
    const email = (row[3] ?? '').trim().toLowerCase();
    const employeeId = (row[4] ?? '').trim();
    const familyName = (row[5] ?? '').trim();
    const givenName = (row[6] ?? '').trim();
    const title = (row[7] ?? '').trim();
    if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) continue;
    const displayName = [givenName, familyName].filter(Boolean).join(' ') || email;
    out.push({
      email,
      displayName,
      givenName,
      familyName,
      username: username || undefined,
      building: building || undefined,
      title: title || undefined,
      employeeId: employeeId || undefined,
    });
  }
  return out;
}

async function performStaffRosterSync(
  source: 'manual' | 'scheduled',
  triggeredBy: string | null = null,
): Promise<{ synced: number; removed: number }> {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  let rows: string[][];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: STAFF_SHEET_ID,
      range: STAFF_SHEET_RANGE,
    });
    rows = (res.data.values as string[][]) ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new HttpsError(
      'internal',
      `Sheets API error: ${msg}. Check that the sheet is shared with the function's service account, and that the Sheets API is enabled.`,
    );
  }

  const staff = parseStaffRows(rows);
  if (staff.length === 0) {
    const sample = rows.slice(0, 3).map((r) => r.slice(0, 7));
    throw new HttpsError(
      'failed-precondition',
      `No staff rows parsed. Got ${rows.length} rows from sheet. First rows: ${JSON.stringify(sample)}`,
    );
  }

  const db = getFirestore();
  const writer = db.bulkWriter();
  const seenEmails = new Set<string>();
  for (const s of staff) {
    seenEmails.add(s.email);
    writer.set(db.collection('staff').doc(s.email), {
      ...s,
      syncedAt: FieldValue.serverTimestamp(),
    });
  }
  await writer.close();

  // Remove docs no longer in the sheet so the picker doesn't show stale staff.
  const existing = await db.collection('staff').listDocuments();
  const deleter = db.bulkWriter();
  let removed = 0;
  for (const ref of existing) {
    if (!seenEmails.has(ref.id)) {
      deleter.delete(ref);
      removed += 1;
    }
  }
  await deleter.close();

  await db.collection('appSettings').doc('staffRosterSync').set(
    {
      lastSyncedAt: FieldValue.serverTimestamp(),
      source,
      triggeredBy,
      synced: staff.length,
      removed,
    },
    { merge: true },
  );

  return { synced: staff.length, removed };
}

export const syncStaffRoster = onCall(
  { region: REGION, timeoutSeconds: 240, memory: '512MiB' },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    if (request.auth?.token.it_admin !== true) {
      throw new HttpsError('permission-denied', 'IT admin only.');
    }
    return performStaffRosterSync('manual', uid);
  },
);

export const scheduledStaffRosterSync = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'America/Chicago',
    region: REGION,
    timeoutSeconds: 240,
    memory: '512MiB',
  },
  async () => {
    try {
      const result = await performStaffRosterSync('scheduled');
      logger.info('Scheduled staff roster sync complete', result);
    } catch (err) {
      logger.error('Scheduled staff roster sync failed', err);
      throw err;
    }
  },
);
