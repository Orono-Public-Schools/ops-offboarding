import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export type HelpRequest = {
  reason: string;
  requestedAt: Timestamp;
  resolvedAt: Timestamp | null;
};

export type TaskKey =
  // Leaving-flow tasks
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
  | 'sharedCredentials'
  // Returning end-of-year tasks
  | 'eoyTeacherDevice'
  | 'eoyHardware'
  | 'eoyStudentIpads'
  | 'eoyChromebookCheckin'
  | 'eoyDeviceForm'
  | 'eoySeesaw'
  | 'eoyGoogleClassroom'
  | 'eoySchoology'
  | 'eoySummerPL'
  | 'eoyVacationResponder';

export type TaskState = {
  status: TaskStatus;
  completedAt?: Timestamp | null;
  help?: HelpRequest | null;
  [k: string]: unknown;
};

export type FlowType = 'returning' | 'leaving';
export type BuildingChecklist = 'schumann' | 'intermediate' | 'secondary' | 'nonInstructional';

export type OffboardingDoc = {
  uid: string;
  email: string;
  displayName: string;
  department: string | null;
  supervisor: string | null;
  supervisorName?: string | null;
  successorEmail: string | null;
  lastDay: Timestamp | null;
  type?: FlowType;
  buildingChecklist?: BuildingChecklist | null;
  status: 'in_progress' | 'completed' | 'archived';
  startedAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
  tasks: Record<TaskKey, TaskState>;
};

/** Map building initials from the staff roster to a checklist variant. */
export function checklistForBuilding(
  buildingInitials: string | null | undefined,
): BuildingChecklist {
  const code = (buildingInitials ?? '').trim().toUpperCase();
  if (code === 'SE') return 'schumann';
  if (code === 'IS') return 'intermediate';
  if (code === 'HS' || code === 'MS' || code === 'HMS') return 'secondary';
  return 'nonInstructional';
}

export const BUILDING_CHECKLISTS: Array<{
  key: BuildingChecklist;
  label: string;
  detail: string;
}> = [
  {
    key: 'schumann',
    label: 'Schumann Elementary',
    detail: 'iPads, Seesaw, K–4',
  },
  {
    key: 'intermediate',
    label: 'Intermediate School',
    detail: 'Chromebooks, Google Classroom',
  },
  {
    key: 'secondary',
    label: 'Middle School / High School',
    detail: 'Schoology',
  },
  {
    key: 'nonInstructional',
    label: 'Non-instructional',
    detail: 'District office, IT, food service, transportation, etc.',
  },
];

export const IMPLEMENTED_TASKS = new Set<TaskKey>([
  // Leaving
  'outOfOffice',
  'drivePersonal',
  'knowledgeTransfer',
  'deviceReturn',
  'sharedCredentials',
  'contactsExport',
  'calendarTransfer',
  'sitesOwnership',
  'driveTeam',
  'groupsOwnership',
  // End-of-year (all guided)
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
]);

/**
 * The leaving-flow task list — what users see on their dashboard if they chose
 * the "leaving Orono Public Schools" branch.
 */
export const LEAVING_TASK_KEYS: TaskKey[] = [
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
];

/**
 * Per-building end-of-year task lists for users who are returning next year.
 * Tasks aren't building-specific in the data model — we just choose which
 * subset to show based on the user's chosen building checklist.
 */
export const RETURNING_TASK_KEYS_BY_BUILDING: Record<BuildingChecklist, TaskKey[]> = {
  schumann: [
    'eoyTeacherDevice',
    'eoyStudentIpads',
    'eoyHardware',
    'eoySeesaw',
    'eoySummerPL',
    'eoyVacationResponder',
  ],
  intermediate: [
    'eoyTeacherDevice',
    'eoyChromebookCheckin',
    'eoyHardware',
    'eoyGoogleClassroom',
    'eoySummerPL',
    'eoyVacationResponder',
  ],
  secondary: ['eoyDeviceForm', 'eoyHardware', 'eoySchoology', 'eoyVacationResponder'],
  nonInstructional: ['eoyTeacherDevice', 'eoyVacationResponder'],
};

export function taskKeysForDoc(doc: OffboardingDoc): TaskKey[] {
  if (doc.type === 'returning' && doc.buildingChecklist) {
    return RETURNING_TASK_KEYS_BY_BUILDING[doc.buildingChecklist];
  }
  return LEAVING_TASK_KEYS;
}

export const TASK_CATALOGUE: ReadonlyArray<{
  key: TaskKey;
  label: string;
  description: string;
}> = [
  {
    key: 'drivePersonal',
    label: 'My Drive cleanup',
    description:
      'Set up destinations and move things in Drive so nothing important disappears with your account.',
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
    description:
      'Create a handoff doc with active projects, key contacts, and the gotchas only you know.',
  },
  {
    key: 'sharedCredentials',
    label: 'Shared credentials',
    description: 'Hand off any shared logins or rotate credentials you had access to.',
  },

  // End-of-year tasks (returning users)
  {
    key: 'eoyTeacherDevice',
    label: 'Your device',
    description: 'Decide whether to keep your laptop or have it stored over the summer.',
  },
  {
    key: 'eoyHardware',
    label: 'Hardware cleanup',
    description: 'Return unwanted devices, store accessories, remove personal tech.',
  },
  {
    key: 'eoyStudentIpads',
    label: 'Student iPads',
    description: 'Leave iPads in their charging stations.',
  },
  {
    key: 'eoyChromebookCheckin',
    label: 'Student Chromebook check-in',
    description: 'Have students complete the check-in form before leaving for summer.',
  },
  {
    key: 'eoyDeviceForm',
    label: 'Device plans form',
    description: "Fill out the form to tell IT what you're doing with your devices.",
  },
  {
    key: 'eoySeesaw',
    label: 'Seesaw',
    description: 'Auto-archive on June 6 — nothing to delete or remove.',
  },
  {
    key: 'eoyGoogleClassroom',
    label: 'Google Classroom',
    description: 'Archive your classes on or before June 6.',
  },
  {
    key: 'eoySchoology',
    label: 'Schoology',
    description: 'Auto-archives June 7 — save courses to resources if you want to keep them.',
  },
  {
    key: 'eoySummerPL',
    label: 'Summer Professional Learning',
    description: 'Optional — sign up for on-demand courses and the AI summer workshop.',
  },
  {
    key: 'eoyVacationResponder',
    label: 'Summer vacation responder',
    description: 'Set your out-of-office for summer break.',
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
