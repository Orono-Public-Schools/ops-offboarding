import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type StaffRecord = {
  email: string;
  displayName: string;
  givenName: string;
  familyName: string;
  username?: string;
  building?: string;
  title?: string;
  employeeId?: string;
  syncedAt?: Timestamp;
};

type State =
  | { loading: true }
  | { loading: false; error: Error }
  | { loading: false; staff: StaffRecord[] };

let cached: { staff: StaffRecord[]; ts: number } | null = null;

export function useStaff(): State {
  const [state, setState] = useState<State>(
    cached ? { loading: false, staff: cached.staff } : { loading: true },
  );

  useEffect(() => {
    const q = query(collection(db, 'staff'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const staff = snap.docs
          .map((d) => d.data() as StaffRecord)
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        cached = { staff, ts: Date.now() };
        setState({ loading: false, staff });
      },
      (err) => setState({ loading: false, error: err }),
    );
    return unsub;
  }, []);

  return state;
}

export function searchStaff(staff: StaffRecord[], query: string, limit = 10): StaffRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/);
  const matches = staff.filter((s) => {
    const haystack = [s.email, s.displayName, s.givenName, s.familyName, s.title]
      .filter(Boolean)
      .map((v) => (v as string).toLowerCase())
      .join(' ');
    return tokens.every((t) => haystack.includes(t));
  });
  return matches.slice(0, limit);
}
