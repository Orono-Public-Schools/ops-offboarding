import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app, 'us-central1');

export const startOffboarding = httpsCallable<void, { offboardingId: string; created: boolean }>(
  functions,
  'startOffboarding',
);

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
  },
  { success: boolean }
>(functions, 'setOutOfOffice');
