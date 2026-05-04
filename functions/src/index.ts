import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { google } from 'googleapis';

initializeApp();

const ALLOWED_DOMAIN = 'orono.k12.mn.us';
const REGION = 'us-central1';

// Spreadsheet that drives the staff picker. Sync via syncStaffRoster.
const STAFF_SHEET_ID = '1uvr4MN3DhNyHKxxZuVeT_Tag3U6EpkRxr3s82plIqbU';
const STAFF_SHEET_RANGE = 'A:H';

export const healthcheck = onRequest({ region: REGION, invoker: 'public' }, (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export const enforceDomain = beforeUserCreated((event) => {
  const email = event.data?.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError(
      'permission-denied',
      `Sign-in is restricted to @${ALLOWED_DOMAIN} accounts.`,
    );
  }
});

const TASK_KEYS = [
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

function initialTasks() {
  return Object.fromEntries(TASK_KEYS.map((k) => [k, { status: 'not_started', help: null }]));
}

function requireAuthedDomainUser(request: { auth?: { uid: string; token: { email?: string } } }) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  const email = request.auth.token.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError('permission-denied', `Restricted to @${ALLOWED_DOMAIN} accounts.`);
  }
  return { uid: request.auth.uid, email };
}

type SetEoySettingsPayload = { returnDate?: string | null };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const setEoySettings = onCall<SetEoySettingsPayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);
  if (request.auth?.token.it_admin !== true) {
    throw new HttpsError('permission-denied', 'IT admin only.');
  }
  const returnDate = request.data?.returnDate ?? null;
  if (returnDate !== null && (typeof returnDate !== 'string' || !ISO_DATE_RE.test(returnDate))) {
    throw new HttpsError('invalid-argument', 'returnDate must be YYYY-MM-DD or null.');
  }

  const db = getFirestore();
  await db.collection('appSettings').doc('eoyVacationResponder').set(
    {
      returnDate,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );
  return { returnDate };
});

type ResetUserPayload = { uid?: string };

async function deleteSubcollection(
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

export const resetUserChecklist = onCall<ResetUserPayload>(
  { region: REGION, timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    const { uid: callerUid } = requireAuthedDomainUser(request);
    const targetUid = request.data?.uid;
    if (!targetUid || typeof targetUid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    const isAdmin = request.auth?.token.it_admin === true;
    const isSelf = callerUid === targetUid;
    if (!isAdmin && !isSelf) {
      throw new HttpsError(
        'permission-denied',
        'You can only reset your own checklist unless you are an IT admin.',
      );
    }

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(targetUid);

    const auditDeleted = await deleteSubcollection(ref.collection('auditLog'));
    const fileScanDeleted = await deleteSubcollection(ref.collection('fileScan'));

    await ref.delete();

    return { success: true, uid: targetUid, auditDeleted, fileScanDeleted };
  },
);

type StartOffboardingPayload = {
  type?: 'returning' | 'leaving';
  buildingChecklist?: 'schumann' | 'intermediate' | 'secondary' | 'nonInstructional' | null;
};

const VALID_FLOW_TYPES = new Set(['returning', 'leaving']);
const VALID_BUILDING_CHECKLISTS = new Set([
  'schumann',
  'intermediate',
  'secondary',
  'nonInstructional',
]);

export const startOffboarding = onCall<StartOffboardingPayload>(
  { region: REGION },
  async (request) => {
    const { uid, email } = requireAuthedDomainUser(request);
    const displayName = request.auth!.token.name ?? email;

    const reqType = request.data?.type;
    const reqBuilding = request.data?.buildingChecklist ?? null;
    const type = reqType && VALID_FLOW_TYPES.has(reqType) ? reqType : 'leaving';
    const buildingChecklist =
      type === 'returning' && reqBuilding && VALID_BUILDING_CHECKLISTS.has(reqBuilding)
        ? reqBuilding
        : null;

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);

    const created = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        // If the doc already exists but doesn't have type/building yet (older
        // record), fill them in once based on this start request.
        const existingType = snap.get('type');
        if (!existingType) {
          tx.update(ref, {
            type,
            buildingChecklist,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return false;
      }
      tx.set(ref, {
        uid,
        email,
        displayName,
        department: null,
        supervisor: null,
        successorEmail: null,
        lastDay: null,
        type,
        buildingChecklist,
        status: 'in_progress',
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
        tasks: initialTasks(),
      });
      return true;
    });

    return { offboardingId: uid, created, type, buildingChecklist };
  },
);

type SetSupervisorPayload = {
  email?: string;
  displayName?: string;
};

export const setSupervisor = onCall<SetSupervisorPayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);

  const supervisorEmail = request.data?.email?.trim().toLowerCase();
  const supervisorName = request.data?.displayName?.trim() || null;

  if (!supervisorEmail || !supervisorEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new HttpsError(
      'invalid-argument',
      `Supervisor email must be a valid @${ALLOWED_DOMAIN} address.`,
    );
  }
  if (supervisorEmail === request.auth!.token.email) {
    throw new HttpsError('invalid-argument', 'You cannot pick yourself as your supervisor.');
  }

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const before = snap.get('supervisor') ?? null;

    tx.update(ref, {
      supervisor: supervisorEmail,
      supervisorName,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_supervisor',
      target: supervisorEmail,
      before,
      after: supervisorEmail,
      success: true,
      errorMsg: null,
    });
  });

  return { supervisorEmail, supervisorName };
});

type SetOutOfOfficePayload = {
  message?: string;
  subject?: string;
  startDate?: string | null;
  endDate?: string | null;
  googleAccessToken?: string;
  taskKey?: 'outOfOffice' | 'eoyVacationResponder';
};

const VALID_OOO_TASK_KEYS = new Set<string>(['outOfOffice', 'eoyVacationResponder']);

function dateToMillis(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;
  const ms = Date.parse(dateStr);
  if (Number.isNaN(ms)) return undefined;
  return ms;
}

export const setOutOfOffice = onCall<SetOutOfOfficePayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);

  const message = request.data?.message?.trim();
  const subject = request.data?.subject?.trim() || 'Out of office';
  const startDate = request.data?.startDate ?? null;
  const endDate = request.data?.endDate ?? null;
  const googleAccessToken = request.data?.googleAccessToken;
  const taskKey =
    request.data?.taskKey && VALID_OOO_TASK_KEYS.has(request.data.taskKey)
      ? request.data.taskKey
      : 'outOfOffice';

  if (!message) {
    throw new HttpsError('invalid-argument', 'Message is required.');
  }
  if (!googleAccessToken) {
    throw new HttpsError(
      'failed-precondition',
      'Missing Google access token. Please sign out and sign in again.',
    );
  }

  const gmailBody: Record<string, unknown> = {
    enableAutoReply: true,
    responseSubject: subject,
    responseBodyPlainText: message,
    restrictToContacts: false,
    restrictToDomain: false,
  };
  const startMs = dateToMillis(startDate);
  const endMs = dateToMillis(endDate);
  if (startMs !== undefined) gmailBody.startTime = startMs;
  if (endMs !== undefined) gmailBody.endTime = endMs;

  const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/vacation', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gmailBody),
  });

  if (!gmailRes.ok) {
    const bodyText = await gmailRes.text();
    if (gmailRes.status === 401 || gmailRes.status === 403) {
      throw new HttpsError(
        'permission-denied',
        'Google rejected the request. Please sign out and sign in again to refresh permissions.',
      );
    }
    throw new HttpsError('internal', `Gmail API error (${gmailRes.status}): ${bodyText}`);
  }

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);
  const auditRef = ref.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Offboarding record not found.');
    }
    const taskPath = `tasks.${taskKey}`;
    const before = snap.get(taskPath) ?? null;
    tx.update(ref, {
      [taskPath]: {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        message,
        subject,
        startDate,
        endDate,
        help: snap.get(`${taskPath}.help`) ?? null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_out_of_office',
      target: taskPath,
      before,
      after: { message, subject, startDate, endDate },
      success: true,
      errorMsg: null,
    });
  });

  return { success: true };
});

type ScanDrivePayload = {
  googleAccessToken?: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  driveId?: string;
  owners?: Array<{ emailAddress?: string }>;
  permissions?: Array<{ emailAddress?: string; role?: string; type?: string }>;
};

type DriveListResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
};

const DRIVE_FIELDS =
  'nextPageToken,files(id,name,mimeType,size,modifiedTime,driveId,owners(emailAddress),permissions(emailAddress,role,type))';
const DRIVE_QUERY = "trashed=false and 'me' in owners";
const MAX_FILES = 50000;
const PAGE_SIZE = 100;
const COLLABORATOR_CAP = 5;

function computeRiskScore(file: DriveFile, collaboratorCount: number): number {
  let score = collaboratorCount * 5;
  const sizeBytes = file.size ? Number(file.size) : 0;
  if (sizeBytes > 100 * 1024 * 1024) score += 10;
  if (file.modifiedTime) {
    const ageDays = (Date.now() - Date.parse(file.modifiedTime)) / (1000 * 60 * 60 * 24);
    if (ageDays < 30) score += 10;
    else if (ageDays < 180) score += 5;
  }
  if (
    file.mimeType?.startsWith('application/vnd.google-apps.') &&
    !file.mimeType.includes('folder')
  ) {
    score += 5;
  }
  return score;
}

export const scanDrive = onCall<ScanDrivePayload>(
  { region: REGION, timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    const { uid, email } = requireAuthedDomainUser(request);
    const googleAccessToken = request.data?.googleAccessToken;
    if (!googleAccessToken) {
      throw new HttpsError(
        'failed-precondition',
        'Missing Google access token. Please sign out and sign in again.',
      );
    }

    const db = getFirestore();
    const offboardingRef = db.collection('offboardings').doc(uid);
    const fileScanRef = offboardingRef.collection('fileScan');

    await offboardingRef.update({
      'tasks.drivePersonal.status': 'in_progress',
      'tasks.drivePersonal.scanStartedAt': FieldValue.serverTimestamp(),
      'tasks.drivePersonal.scanFinishedAt': null,
      'tasks.drivePersonal.scanCount': 0,
      'tasks.drivePersonal.scanProgress': 0,
      'tasks.drivePersonal.atRiskCount': 0,
      'tasks.drivePersonal.scanError': null,
      'tasks.drivePersonal.truncated': false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Clear prior scan results so re-runs don't leave stale docs.
    const existing = await fileScanRef.listDocuments();
    if (existing.length > 0) {
      const deleter = db.bulkWriter();
      for (const docRef of existing) deleter.delete(docRef);
      await deleter.close();
    }

    let pageToken: string | undefined;
    let totalScanned = 0;
    let atRisk = 0;
    const writer = db.bulkWriter();

    try {
      do {
        const params = new URLSearchParams({
          q: DRIVE_QUERY,
          fields: DRIVE_FIELDS,
          pageSize: String(PAGE_SIZE),
          corpora: 'user',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });

        if (!res.ok) {
          const bodyText = await res.text();
          if (res.status === 401 || res.status === 403) {
            throw new HttpsError(
              'permission-denied',
              'Google rejected the request. Please sign out and sign in again to refresh permissions.',
            );
          }
          throw new HttpsError('internal', `Drive API error (${res.status}): ${bodyText}`);
        }

        const body = (await res.json()) as DriveListResponse;
        const files = body.files ?? [];

        for (const file of files) {
          const collaborators = (file.permissions ?? [])
            .filter((p) => p.emailAddress && p.emailAddress !== email)
            .map((p) => ({ email: p.emailAddress!, role: p.role ?? 'reader' }));
          const collaboratorCount = collaborators.length;
          const inSharedDrive = file.driveId ?? null;
          const inMyDrive = !inSharedDrive;
          const sizeBytes = file.size ? Number(file.size) : 0;
          const riskScore = computeRiskScore(file, collaboratorCount);

          if (inMyDrive) atRisk += 1;

          writer.set(fileScanRef.doc(file.id), {
            fileId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            sizeBytes,
            ownedByUser: true,
            inMyDrive,
            inSharedDrive,
            collaborators: collaborators.slice(0, COLLABORATOR_CAP),
            collaboratorCount,
            lastModified: file.modifiedTime ? new Date(file.modifiedTime) : null,
            riskScore,
            decision: 'pending',
            decisionTarget: null,
            movedAt: null,
          });
        }

        totalScanned += files.length;
        pageToken = body.nextPageToken;

        // Live progress so the UI can show "Scanning… N files found".
        // Fire-and-forget; don't await — keeps the scan loop fast.
        offboardingRef
          .update({
            'tasks.drivePersonal.scanProgress': totalScanned,
          })
          .catch(() => {
            /* progress writes are best-effort */
          });

        if (totalScanned >= MAX_FILES) break;
      } while (pageToken);

      await writer.close();

      await offboardingRef.update({
        'tasks.drivePersonal.scanCount': totalScanned,
        'tasks.drivePersonal.atRiskCount': atRisk,
        'tasks.drivePersonal.scanFinishedAt': FieldValue.serverTimestamp(),
        'tasks.drivePersonal.status': 'in_progress',
        'tasks.drivePersonal.truncated': Boolean(pageToken),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const auditRef = offboardingRef.collection('auditLog').doc();
      await auditRef.set({
        ts: FieldValue.serverTimestamp(),
        actor: uid,
        action: 'scan_drive',
        target: 'tasks.drivePersonal',
        before: null,
        after: { scanCount: totalScanned, atRiskCount: atRisk, truncated: Boolean(pageToken) },
        success: true,
        errorMsg: null,
      });

      return { scanCount: totalScanned, atRiskCount: atRisk, truncated: Boolean(pageToken) };
    } catch (err) {
      try {
        await writer.close();
      } catch {
        /* ignore */
      }
      await offboardingRef.update({
        'tasks.drivePersonal.scanFinishedAt': FieldValue.serverTimestamp(),
        'tasks.drivePersonal.scanError':
          err instanceof Error ? err.message : 'Unknown error during scan.',
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw err;
    }
  },
);

// ─── Drive walkthrough action callables ──────────────────────────────────────

type ListSharedDrivesPayload = { googleAccessToken?: string };

type SharedDrive = { id: string; name: string };

export const listSharedDrives = onCall<ListSharedDrivesPayload>(
  { region: REGION },
  async (request) => {
    requireAuthedDomainUser(request);
    const token = request.data?.googleAccessToken;
    if (!token) {
      throw new HttpsError('failed-precondition', 'Missing Google access token.');
    }
    const drives: SharedDrive[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'nextPageToken,drives(id,name)',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const res = await fetch(`https://www.googleapis.com/drive/v3/drives?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new HttpsError(
            'permission-denied',
            'Google rejected the request. Please sign out and sign in again.',
          );
        }
        throw new HttpsError('internal', `Drive API error (${res.status}): ${txt}`);
      }
      const body = (await res.json()) as { drives?: SharedDrive[]; nextPageToken?: string };
      drives.push(...(body.drives ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    drives.sort((a, b) => a.name.localeCompare(b.name));
    return { drives };
  },
);

async function getDriveFileParents(fileId: string, token: string): Promise<string[]> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new HttpsError('internal', `Drive lookup failed (${res.status})`);
  const body = (await res.json()) as { parents?: string[] };
  return body.parents ?? [];
}

async function recordFileDecision(params: {
  uid: string;
  fileId: string;
  decision: 'personal' | 'moveToShared' | 'transfer';
  decisionTarget: string | null;
  moved: boolean;
  action: string;
}) {
  const db = getFirestore();
  const offboardingRef = db.collection('offboardings').doc(params.uid);
  const fileRef = offboardingRef.collection('fileScan').doc(params.fileId);
  const auditRef = offboardingRef.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(fileRef);
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'File scan entry not found.');
    }
    const before = snap.get('decision') ?? null;
    tx.update(fileRef, {
      decision: params.decision,
      decisionTarget: params.decisionTarget,
      movedAt: params.moved ? FieldValue.serverTimestamp() : null,
    });
    tx.update(offboardingRef, { updatedAt: FieldValue.serverTimestamp() });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: params.uid,
      action: params.action,
      target: params.fileId,
      before,
      after: { decision: params.decision, decisionTarget: params.decisionTarget },
      success: true,
      errorMsg: null,
    });
  });
}

type MoveFilePayload = {
  fileId?: string;
  // Either sharedDriveId (legacy: drop in root of shared drive) OR targetFolderId
  // (new: any folder — shared-drive root, shared-drive subfolder, or My Drive folder).
  sharedDriveId?: string;
  targetFolderId?: string;
  googleAccessToken?: string;
};

export const moveFileToSharedDrive = onCall<MoveFilePayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const { fileId, sharedDriveId, targetFolderId, googleAccessToken } = request.data ?? {};
    const target = targetFolderId ?? sharedDriveId;
    if (!fileId || !target || !googleAccessToken) {
      throw new HttpsError(
        'invalid-argument',
        'fileId, googleAccessToken, and a target folder are required.',
      );
    }

    const currentParents = await getDriveFileParents(fileId, googleAccessToken);
    const params = new URLSearchParams({
      addParents: target,
      removeParents: currentParents.join(',') || 'root',
      supportsAllDrives: 'true',
      fields: 'id,parents,driveId',
    });

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new HttpsError(
          'permission-denied',
          'Google rejected the move. You may need Manager access on the destination shared drive.',
        );
      }
      throw new HttpsError('internal', `Drive move failed (${res.status}): ${txt}`);
    }

    await recordFileDecision({
      uid,
      fileId,
      decision: 'moveToShared',
      decisionTarget: target,
      moved: true,
      action: 'move_to_folder',
    });

    return { success: true };
  },
);

type CreateFolderPayload = {
  name?: string;
  parentId?: string | null;
  googleAccessToken?: string;
};

export const createDriveFolder = onCall<CreateFolderPayload>(
  { region: REGION },
  async (request) => {
    requireAuthedDomainUser(request);
    const { name, parentId, googleAccessToken } = request.data ?? {};
    if (!name || !googleAccessToken) {
      throw new HttpsError('invalid-argument', 'Folder name and token are required.');
    }

    const body: Record<string, unknown> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) body.parents = [parentId];

    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,parents,driveId',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new HttpsError(
          'permission-denied',
          'Google rejected the folder create. Check that you have access to the parent location.',
        );
      }
      throw new HttpsError('internal', `Drive folder create failed (${res.status}): ${txt}`);
    }
    const folder = (await res.json()) as { id: string; name: string };
    return { id: folder.id, name: folder.name };
  },
);

type Destination = {
  kind: 'sharedDrive' | 'sharedDriveFolder' | 'personalFolder';
  folderId: string;
  name: string;
  sharedDriveId?: string;
  sharedDriveName?: string;
};

type SetDestinationsPayload = { destinations?: Destination[] };

export const setDriveDestinations = onCall<SetDestinationsPayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const destinations = request.data?.destinations ?? [];
    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);
    await ref.update({
      'tasks.drivePersonal.destinations': destinations,
      'tasks.drivePersonal.destinationsConfigured': true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { count: destinations.length };
  },
);

type PromoteGroupOwnerPayload = {
  groupId?: string;
  newOwnerEmail?: string;
  googleAccessToken?: string;
};

export const promoteGroupOwner = onCall<PromoteGroupOwnerPayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const { groupId, newOwnerEmail, googleAccessToken } = request.data ?? {};
    if (!groupId || !newOwnerEmail || !googleAccessToken) {
      throw new HttpsError('invalid-argument', 'groupId, newOwnerEmail, and token are required.');
    }
    const targetEmail = newOwnerEmail.trim().toLowerCase();
    if (!targetEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      throw new HttpsError(
        'invalid-argument',
        `New owner email must be a @${ALLOWED_DOMAIN} address.`,
      );
    }

    const baseUrl = `https://www.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(
      groupId,
    )}/members`;
    const memberUrl = `${baseUrl}/${encodeURIComponent(targetEmail)}`;

    const headers = {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    };

    // Determine whether the person is already a member.
    const getRes = await fetch(memberUrl, { headers });
    if (getRes.status === 401 || getRes.status === 403) {
      throw new HttpsError(
        'permission-denied',
        'Google rejected the request. You may not have permission to promote owners on this group.',
      );
    }

    let action: 'inserted' | 'updated';
    if (getRes.status === 404) {
      const insertRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: targetEmail, role: 'OWNER' }),
      });
      if (!insertRes.ok) {
        const txt = await insertRes.text();
        if (insertRes.status === 401 || insertRes.status === 403) {
          throw new HttpsError(
            'permission-denied',
            'Google rejected the add. You may need to be an Owner of the group to promote others.',
          );
        }
        throw new HttpsError('internal', `Add member failed (${insertRes.status}): ${txt}`);
      }
      action = 'inserted';
    } else if (getRes.ok) {
      const patchRes = await fetch(memberUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ email: targetEmail, role: 'OWNER' }),
      });
      if (!patchRes.ok) {
        const txt = await patchRes.text();
        if (patchRes.status === 401 || patchRes.status === 403) {
          throw new HttpsError(
            'permission-denied',
            'Google rejected the update. You may need to be an Owner of the group to change roles.',
          );
        }
        throw new HttpsError('internal', `Promote failed (${patchRes.status}): ${txt}`);
      }
      action = 'updated';
    } else {
      const txt = await getRes.text();
      throw new HttpsError('internal', `Member lookup failed (${getRes.status}): ${txt}`);
    }

    const db = getFirestore();
    const offboardingRef = db.collection('offboardings').doc(uid);
    const auditRef = offboardingRef.collection('auditLog').doc();
    await auditRef.set({
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'promote_group_owner',
      target: groupId,
      before: null,
      after: { groupId, newOwnerEmail: targetEmail, action },
      success: true,
      errorMsg: null,
    });
    await offboardingRef.update({ updatedAt: FieldValue.serverTimestamp() });

    return { success: true, action };
  },
);

type CreateHandoffDocPayload = {
  name?: string;
  googleAccessToken?: string;
};

export const createHandoffDoc = onCall<CreateHandoffDocPayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const name = request.data?.name?.trim() || 'Handoff Notes';
    const token = request.data?.googleAccessToken;
    if (!token) {
      throw new HttpsError('failed-precondition', 'Missing Google access token.');
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.document',
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new HttpsError(
          'permission-denied',
          'Google rejected the request. Please sign out and sign in again to refresh permissions.',
        );
      }
      throw new HttpsError('internal', `Drive create failed (${res.status}): ${txt}`);
    }
    const doc = (await res.json()) as { id: string; name: string };
    const docUrl = `https://docs.google.com/document/d/${doc.id}/edit`;

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);
    const auditRef = ref.collection('auditLog').doc();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError('failed-precondition', 'Offboarding record not found.');
      }
      tx.update(ref, {
        'tasks.knowledgeTransfer.docId': doc.id,
        'tasks.knowledgeTransfer.docName': doc.name,
        'tasks.knowledgeTransfer.docUrl': docUrl,
        'tasks.knowledgeTransfer.docCreatedAt': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(auditRef, {
        ts: FieldValue.serverTimestamp(),
        actor: uid,
        action: 'create_handoff_doc',
        target: 'tasks.knowledgeTransfer',
        before: null,
        after: { docId: doc.id, docName: doc.name },
        success: true,
        errorMsg: null,
      });
    });

    return { docId: doc.id, docName: doc.name, docUrl };
  },
);

const TASK_KEY_SET = new Set<string>(TASK_KEYS);

type MarkTaskCompletePayload = {
  taskKey?: string;
  status?: 'completed' | 'skipped' | 'in_progress' | 'not_started';
  notes?: string | null;
};

export const markTaskComplete = onCall<MarkTaskCompletePayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const taskKey = request.data?.taskKey;
    const status = request.data?.status ?? 'completed';
    const notes = request.data?.notes ?? null;

    if (!taskKey || !TASK_KEY_SET.has(taskKey)) {
      throw new HttpsError('invalid-argument', `Unknown taskKey: ${taskKey}`);
    }

    const db = getFirestore();
    const ref = db.collection('offboardings').doc(uid);
    const auditRef = ref.collection('auditLog').doc();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError('failed-precondition', 'Offboarding record not found.');
      }
      const before = snap.get(`tasks.${taskKey}.status`) ?? null;
      const updates: Record<string, unknown> = {
        [`tasks.${taskKey}.status`]: status,
        [`tasks.${taskKey}.completedAt`]:
          status === 'completed' ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (notes !== null) {
        updates[`tasks.${taskKey}.notes`] = notes;
      }
      tx.update(ref, updates);
      tx.set(auditRef, {
        ts: FieldValue.serverTimestamp(),
        actor: uid,
        action: 'mark_task_complete',
        target: `tasks.${taskKey}`,
        before,
        after: { status, notes },
        success: true,
        errorMsg: null,
      });
    });

    return { taskKey, status };
  },
);

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

export const syncStaffRoster = onCall(
  { region: REGION, timeoutSeconds: 240, memory: '512MiB' },
  async (request) => {
    requireAuthedDomainUser(request);
    if (request.auth?.token.it_admin !== true) {
      throw new HttpsError('permission-denied', 'IT admin only.');
    }

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

    return { synced: staff.length, removed };
  },
);

type TransferFilePayload = {
  fileId?: string;
  newOwnerEmail?: string;
  googleAccessToken?: string;
};

export const transferFileOwnership = onCall<TransferFilePayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const { fileId, newOwnerEmail, googleAccessToken } = request.data ?? {};
    if (!fileId || !newOwnerEmail || !googleAccessToken) {
      throw new HttpsError('invalid-argument', 'fileId, newOwnerEmail, and token are required.');
    }
    if (!newOwnerEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      throw new HttpsError('invalid-argument', `New owner must be a @${ALLOWED_DOMAIN} address.`);
    }

    const params = new URLSearchParams({
      transferOwnership: 'true',
      sendNotificationEmail: 'true',
      supportsAllDrives: 'true',
    });

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'owner',
          type: 'user',
          emailAddress: newOwnerEmail,
        }),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new HttpsError(
          'permission-denied',
          'Google rejected the transfer. The recipient may need to be in the same Workspace, or you may not own the file.',
        );
      }
      throw new HttpsError('internal', `Drive transfer failed (${res.status}): ${txt}`);
    }

    await recordFileDecision({
      uid,
      fileId,
      decision: 'transfer',
      decisionTarget: newOwnerEmail,
      moved: true,
      action: 'transfer_ownership',
    });

    return { success: true };
  },
);

type PersonalDecisionPayload = { fileId?: string };

export const markFilePersonal = onCall<PersonalDecisionPayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const fileId = request.data?.fileId;
    if (!fileId) {
      throw new HttpsError('invalid-argument', 'fileId is required.');
    }
    await recordFileDecision({
      uid,
      fileId,
      decision: 'personal',
      decisionTarget: null,
      moved: false,
      action: 'mark_personal',
    });
    return { success: true };
  },
);

type BulkPersonalPayload = { fileIds?: string[] };

export const markFilesPersonalBulk = onCall<BulkPersonalPayload>(
  { region: REGION, timeoutSeconds: 120 },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const fileIds = request.data?.fileIds ?? [];
    if (fileIds.length === 0) {
      return { updated: 0 };
    }
    const db = getFirestore();
    const offboardingRef = db.collection('offboardings').doc(uid);
    const writer = db.bulkWriter();
    const auditRef = offboardingRef.collection('auditLog').doc();
    for (const fileId of fileIds) {
      writer.update(offboardingRef.collection('fileScan').doc(fileId), {
        decision: 'personal',
        decisionTarget: null,
        movedAt: null,
      });
    }
    await writer.close();
    await auditRef.set({
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'mark_files_personal_bulk',
      target: 'fileScan',
      before: null,
      after: { count: fileIds.length },
      success: true,
      errorMsg: null,
    });
    await offboardingRef.update({ updatedAt: FieldValue.serverTimestamp() });
    return { updated: fileIds.length };
  },
);
