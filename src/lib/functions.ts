import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app, 'us-central1');

export const startOffboarding = httpsCallable<void, { offboardingId: string; created: boolean }>(
  functions,
  'startOffboarding',
);
