import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app, 'us-central1');

export const startOffboarding = httpsCallable<
  {
    type: 'returning' | 'leaving';
    buildingChecklist: 'schumann' | 'intermediate' | 'secondary' | 'nonInstructional' | null;
  },
  {
    offboardingId: string;
    created: boolean;
    type: 'returning' | 'leaving';
    buildingChecklist: 'schumann' | 'intermediate' | 'secondary' | 'nonInstructional' | null;
  }
>(functions, 'startOffboarding');

export const setSupervisor = httpsCallable<
  { email: string; displayName: string | null },
  { supervisorEmail: string; supervisorName: string | null }
>(functions, 'setSupervisor');

export const setOutOfOffice = httpsCallable<
  {
    message: string;
    subject: string;
    startDate: string | null;
    endDate: string | null;
    googleAccessToken: string;
    taskKey?: 'outOfOffice' | 'eoyVacationResponder';
  },
  { success: boolean }
>(functions, 'setOutOfOffice');

export const scanDrive = httpsCallable<
  { googleAccessToken: string },
  { scanCount: number; atRiskCount: number; truncated: boolean }
>(functions, 'scanDrive');

export const listSharedDrives = httpsCallable<
  { googleAccessToken: string },
  { drives: Array<{ id: string; name: string }> }
>(functions, 'listSharedDrives');

export const moveFileToSharedDrive = httpsCallable<
  {
    fileId: string;
    targetFolderId?: string;
    sharedDriveId?: string;
    googleAccessToken: string;
  },
  { success: boolean }
>(functions, 'moveFileToSharedDrive');

export const createDriveFolder = httpsCallable<
  { name: string; parentId: string | null; googleAccessToken: string },
  { id: string; name: string }
>(functions, 'createDriveFolder');

export type DriveDestination = {
  kind: 'sharedDrive' | 'sharedDriveFolder' | 'personalFolder';
  folderId: string;
  name: string;
  sharedDriveId?: string;
  sharedDriveName?: string;
};

export const setDriveDestinations = httpsCallable<
  { destinations: DriveDestination[] },
  { count: number }
>(functions, 'setDriveDestinations');

export const markTaskComplete = httpsCallable<
  {
    taskKey: string;
    status?: 'completed' | 'skipped' | 'in_progress' | 'not_started';
    notes?: string | null;
  },
  { taskKey: string; status: string }
>(functions, 'markTaskComplete');

export const createHandoffDoc = httpsCallable<
  { name: string; googleAccessToken: string },
  { docId: string; docName: string; docUrl: string }
>(functions, 'createHandoffDoc');

export const promoteGroupOwner = httpsCallable<
  { groupId: string; newOwnerEmail: string; googleAccessToken: string },
  { success: boolean; action: 'inserted' | 'updated' }
>(functions, 'promoteGroupOwner');

export const syncStaffRoster = httpsCallable<void, { synced: number; removed: number }>(
  functions,
  'syncStaffRoster',
);

export const resetUserChecklist = httpsCallable<{ uid: string }, { success: boolean; uid: string }>(
  functions,
  'resetUserChecklist',
);

export const setEoySettings = httpsCallable<
  { returnDate: string | null },
  { returnDate: string | null }
>(functions, 'setEoySettings');

export const transferFileOwnership = httpsCallable<
  { fileId: string; newOwnerEmail: string; googleAccessToken: string },
  { success: boolean }
>(functions, 'transferFileOwnership');

export const markFilePersonal = httpsCallable<{ fileId: string }, { success: boolean }>(
  functions,
  'markFilePersonal',
);

export const markFilesPersonalBulk = httpsCallable<{ fileIds: string[] }, { updated: number }>(
  functions,
  'markFilesPersonalBulk',
);
