import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { TASK_CATALOGUE, type OffboardingDoc, type TaskKey } from './offboarding';

export type OffboardingSummary = OffboardingDoc & { uid: string };

type ListState =
  | { loading: true }
  | { loading: false; error: Error }
  | { loading: false; offboardings: OffboardingSummary[] };

export function useAllOffboardings(): ListState {
  const [state, setState] = useState<ListState>({ loading: true });

  useEffect(() => {
    const q = query(collection(db, 'offboardings'), orderBy('startedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const offboardings = snap.docs.map(
          (d) => ({ ...(d.data() as OffboardingDoc), uid: d.id }) as OffboardingSummary,
        );
        setState({ loading: false, offboardings });
      },
      (err) => setState({ loading: false, error: err }),
    );
    return unsub;
  }, []);

  return state;
}

type DetailState =
  | { loading: true }
  | { loading: false; error: Error }
  | { loading: false; exists: false }
  | { loading: false; exists: true; data: OffboardingSummary };

export function useOffboardingDetail(uid: string | null): DetailState {
  const [state, setState] = useState<DetailState>({ loading: true });

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'offboardings', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, exists: false });
        } else {
          setState({
            loading: false,
            exists: true,
            data: { ...(snap.data() as OffboardingDoc), uid: snap.id },
          });
        }
      },
      (err) => setState({ loading: false, error: err }),
    );
    return unsub;
  }, [uid]);

  return state;
}

export type AuditEntry = {
  id: string;
  ts: Timestamp | null;
  actor: string;
  action: string;
  target: string;
  before: unknown;
  after: unknown;
  success: boolean;
  errorMsg: string | null;
};

type AuditState =
  | { loading: true }
  | { loading: false; error: Error }
  | { loading: false; entries: AuditEntry[] };

export function useAuditLog(uid: string | null, limitN = 25): AuditState {
  const [state, setState] = useState<AuditState>({ loading: true });

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'offboardings', uid, 'auditLog'),
      orderBy('ts', 'desc'),
      limit(limitN),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditEntry, 'id'>),
        }));
        setState({ loading: false, entries });
      },
      (err) => setState({ loading: false, error: err }),
    );
    return unsub;
  }, [uid, limitN]);

  return state;
}

export function computeProgress(offboarding: OffboardingDoc): {
  done: number;
  total: number;
  percent: number;
} {
  const total = TASK_CATALOGUE.length;
  let done = 0;
  for (const task of TASK_CATALOGUE) {
    const status = offboarding.tasks[task.key as TaskKey]?.status;
    if (status === 'completed' || status === 'skipped') done += 1;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function daysUntilLastDay(lastDay: Timestamp | null): number | null {
  if (!lastDay) return null;
  const ms = lastDay.toMillis() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
