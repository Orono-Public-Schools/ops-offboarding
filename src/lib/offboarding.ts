import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export type TaskKey =
  | 'drivePersonal'
  | 'driveTeam'
  | 'groupsOwnership'
  | 'outOfOffice'
  | 'calendarTransfer'
  | 'gmailForwarding'
  | 'sitesOwnership'
  | 'contactsExport'
  | 'deviceReturn'
  | 'knowledgeTransfer'
  | 'sharedCredentials';

export type TaskState = {
  status: TaskStatus;
  completedAt?: Timestamp | null;
  [k: string]: unknown;
};

export type OffboardingDoc = {
  uid: string;
  email: string;
  displayName: string;
  department: string | null;
  supervisor: string | null;
  successorEmail: string | null;
  lastDay: Timestamp | null;
  status: 'in_progress' | 'completed' | 'archived';
  startedAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
  tasks: Record<TaskKey, TaskState>;
};

export const TASK_CATALOGUE: ReadonlyArray<{
  key: TaskKey;
  label: string;
  description: string;
}> = [
  {
    key: 'drivePersonal',
    label: 'My Drive cleanup',
    description:
      'Review files in your personal Drive and decide what to move, transfer, or delete.',
  },
  {
    key: 'driveTeam',
    label: 'Shared Drive handoff',
    description: 'Confirm ownership of files you created in team Shared Drives.',
  },
  {
    key: 'groupsOwnership',
    label: 'Google Groups',
    description: 'Transfer ownership of any groups you manage to a successor.',
  },
  {
    key: 'outOfOffice',
    label: 'Out-of-office responder',
    description: 'Set up an automatic reply that points people to your successor.',
  },
  {
    key: 'calendarTransfer',
    label: 'Calendar events',
    description: 'Transfer ownership of recurring meetings and shared calendars.',
  },
  {
    key: 'gmailForwarding',
    label: 'Gmail forwarding',
    description: 'Optionally forward incoming mail to your successor until deactivation.',
  },
  {
    key: 'sitesOwnership',
    label: 'Google Sites',
    description: 'Transfer ownership of any Sites you own.',
  },
  {
    key: 'contactsExport',
    label: 'Contacts export',
    description: 'Export any personal contacts you want to keep.',
  },
  {
    key: 'deviceReturn',
    label: 'Device return',
    description: 'Return your district-issued devices to IT.',
  },
  {
    key: 'knowledgeTransfer',
    label: 'Knowledge transfer',
    description: 'Leave a handoff doc for your successor with key context.',
  },
  {
    key: 'sharedCredentials',
    label: 'Shared credentials',
    description: 'Hand off any shared logins or rotate credentials you had access to.',
  },
];

type State =
  | { loading: true }
  | { loading: false; error: Error }
  | { loading: false; exists: false }
  | { loading: false; exists: true; data: OffboardingDoc };

export function useOffboarding(uid: string | null): State {
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    if (!uid) {
      setState({ loading: true });
      return;
    }
    const ref = doc(db, 'offboardings', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, exists: false });
        } else {
          setState({ loading: false, exists: true, data: snap.data() as OffboardingDoc });
        }
      },
      (err) => setState({ loading: false, error: err }),
    );
    return unsub;
  }, [uid]);

  return state;
}
