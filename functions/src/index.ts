import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

initializeApp();

const ALLOWED_DOMAIN = 'orono.k12.mn.us';
const REGION = 'us-central1';

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

export const startOffboarding = onCall({ region: REGION }, async (request) => {
  const { uid, email } = requireAuthedDomainUser(request);
  const displayName = request.auth!.token.name ?? email;

  const db = getFirestore();
  const ref = db.collection('offboardings').doc(uid);

  const created = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, {
      uid,
      email,
      displayName,
      department: null,
      supervisor: null,
      successorEmail: null,
      lastDay: null,
      status: 'in_progress',
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      tasks: initialTasks(),
    });
    return true;
  });

  return { offboardingId: uid, created };
});

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
};

function dateToMillis(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;
  const ms = Date.parse(dateStr);
  if (Number.isNaN(ms)) return undefined;
  return ms;
}

export const setOutOfOffice = onCall<SetOutOfOfficePayload>({ region: REGION }, async (request) => {
  const { uid } = requireAuthedDomainUser(request);

  const message = request.data?.message?.trim();
  const subject = request.data?.subject?.trim() || 'I am no longer with Orono Public Schools';
  const startDate = request.data?.startDate ?? null;
  const endDate = request.data?.endDate ?? null;
  const googleAccessToken = request.data?.googleAccessToken;

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
    const before = snap.get('tasks.outOfOffice') ?? null;
    tx.update(ref, {
      'tasks.outOfOffice': {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        message,
        subject,
        startDate,
        endDate,
        help: snap.get('tasks.outOfOffice.help') ?? null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(auditRef, {
      ts: FieldValue.serverTimestamp(),
      actor: uid,
      action: 'set_out_of_office',
      target: 'tasks.outOfOffice',
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
  sharedDriveId?: string;
  googleAccessToken?: string;
};

export const moveFileToSharedDrive = onCall<MoveFilePayload>(
  { region: REGION },
  async (request) => {
    const { uid } = requireAuthedDomainUser(request);
    const { fileId, sharedDriveId, googleAccessToken } = request.data ?? {};
    if (!fileId || !sharedDriveId || !googleAccessToken) {
      throw new HttpsError('invalid-argument', 'fileId, sharedDriveId, and token are required.');
    }

    const currentParents = await getDriveFileParents(fileId, googleAccessToken);
    const params = new URLSearchParams({
      addParents: sharedDriveId,
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
      decisionTarget: sharedDriveId,
      moved: true,
      action: 'move_to_shared_drive',
    });

    return { success: true };
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
