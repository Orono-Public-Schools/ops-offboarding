import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAbAzC2HONizE8PjmhCJE-_wRT4TsZ8sfw',
  authDomain: 'ops-offboarding.firebaseapp.com',
  projectId: 'ops-offboarding',
  storageBucket: 'ops-offboarding.firebasestorage.app',
  messagingSenderId: '671076042374',
  appId: '1:671076042374:web:bab7b5999ab7abe406b307',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const ALLOWED_DOMAIN = 'orono.k12.mn.us';
