import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from './firebase';
import type {
  FileRef,
  FormData,
  SubmissionStatus,
  TableColumn,
  TableRow,
} from '../../shared/forms/types';
import { getFormDefinition } from '../../shared/forms/definitions';
import { visibleFields } from '../../shared/forms/validate';

export type { FormData, FormValue, SubmissionStatus } from '../../shared/forms/types';
export type {
  FileRef,
  FormDefinition,
  FormField,
  FormSection,
  TableColumn,
  TableRow,
} from '../../shared/forms/types';
export {
  FORM_DEFINITIONS,
  getFormDefinition,
  changeOfAddress,
} from '../../shared/forms/definitions';
export { isFieldVisible, isSectionVisible, validateForm } from '../../shared/forms/validate';

const functions = getFunctions(app, 'us-central1');

export const submitForm = httpsCallable<{ formId: string; data: FormData }, { id: string }>(
  functions,
  'submitForm',
);

export const updateSubmissionStatus = httpsCallable<
  { id: string; status: SubmissionStatus; note?: string | null },
  { success: boolean }
>(functions, 'updateSubmissionStatus');

/** HR admins: remove a submission (clears any leave record's back-link). */
export const deleteSubmission = httpsCallable<{ id: string }, { success: boolean }>(
  functions,
  'deleteSubmission',
);

/** HR: turn an LOA submission into a `leaves` record (links back via leaveId). */
export const createLeaveFromSubmission = httpsCallable<
  { submissionId: string; employeeRef: string },
  { id: string }
>(functions, 'createLeaveFromSubmission');

export type ActivityEntry = {
  ts: Timestamp | null;
  actor: string;
  actorEmail: string;
  action: string;
  note: string | null;
};

export type Submission = {
  id: string;
  formId: string;
  formVersion: number;
  formTitle: string;
  status: SubmissionStatus;
  submitterUid: string;
  submitterEmail: string;
  submitterName: string;
  data: FormData;
  summary: string;
  /** Set once HR creates the linked leave record (LOA submissions only). */
  leaveId?: string | null;
  activityLog: ActivityEntry[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  completedAt: Timestamp | null;
};

function toSubmission(id: string, data: DocumentData): Submission {
  return { ...(data as Submission), id };
}

type ListState =
  | { loading: true; submissions: null; error: null }
  | { loading: false; submissions: Submission[]; error: null }
  | { loading: false; submissions: null; error: string };

/** Live list of the signed-in user's submissions, newest first. */
export function useMySubmissions(uid: string | null): ListState {
  const [state, setState] = useState<ListState>({ loading: true, submissions: null, error: null });

  useEffect(() => {
    if (!uid) return;
    // No orderBy: equality-filtered + sorted client-side to avoid needing a
    // composite index.
    const q = query(collection(db, 'submissions'), where('submitterUid', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const subs = snap.docs
          .map((d) => toSubmission(d.id, d.data()))
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setState({ loading: false, submissions: subs, error: null });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, submissions: null, error: 'Could not load your submissions.' });
      },
    );
  }, [uid]);

  return state;
}

/** Live list of ALL submissions (HR/IT only — rules enforce), newest first. */
export function useAllSubmissions(enabled: boolean): ListState {
  const [state, setState] = useState<ListState>({ loading: true, submissions: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setState({
          loading: false,
          submissions: snap.docs.map((d) => toSubmission(d.id, d.data())),
          error: null,
        });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, submissions: null, error: 'Could not load submissions.' });
      },
    );
  }, [enabled]);

  return state;
}

type DetailState =
  | { loading: true; submission: null; error: null }
  | { loading: false; submission: Submission; error: null }
  | { loading: false; submission: null; error: string };

/** Live single submission by id. Direct doc read so rules can authorize the
 *  submitter (a filtered query would be denied for non-HR users). */
export function useSubmission(id: string | null): DetailState {
  const [state, setState] = useState<DetailState>({ loading: true, submission: null, error: null });

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, 'submissions', id),
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, submission: null, error: 'Submission not found.' });
        } else {
          setState({
            loading: false,
            submission: toSubmission(snap.id, snap.data()),
            error: null,
          });
        }
      },
      (err) => {
        console.error(err);
        setState({ loading: false, submission: null, error: 'Could not load this submission.' });
      },
    );
  }, [id]);

  return state;
}

/**
 * A submission's values as ordered, labeled display entries. Uses the form
 * definition for labels/order; falls back to raw keys if the definition
 * has since been removed.
 */
export type SubmissionEntry = {
  label: string;
  value: string;
  /** Set for file fields — the attachment to link to. */
  file?: FileRef;
  /** Set for table fields — rows plus their column spec for rendering. */
  rows?: TableRow[];
  columns?: TableColumn[];
};

/** "REQ-35091" (legacy PaperPal-style ids) and "35091" both display "#35091". */
export function displayId(id: string): string {
  return `#${id.replace(/^REQ-/, '')}`;
}

export function allFieldsForSubmission(s: Submission): SubmissionEntry[] {
  const def = getFormDefinition(s.formId);
  if (!def) {
    return Object.entries(s.data).map(([k, v]) => ({
      label: k,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
  }
  const entries: SubmissionEntry[] = [];
  for (const field of visibleFields(def, s.data)) {
    const raw = s.data[field.id];
    if (raw === undefined || raw === '') continue;
    const labelOf = (v: string) => field.options?.find((o) => o.value === v)?.label ?? v;
    if (field.type === 'file') {
      if (typeof raw !== 'object' || Array.isArray(raw)) continue;
      const ref = raw as FileRef;
      entries.push({ label: field.label, value: ref.name, file: ref });
      continue;
    }
    if (field.type === 'table') {
      if (!Array.isArray(raw) || raw.length === 0) continue;
      const rows = raw as TableRow[];
      entries.push({
        label: field.label,
        value: `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`,
        rows,
        columns: field.columns,
      });
      continue;
    }
    let value: string;
    if (field.type === 'checkbox') {
      value = raw === true ? 'Yes' : 'No';
    } else if (Array.isArray(raw)) {
      if (raw.length === 0) continue;
      value = (raw as string[]).map(labelOf).join(', ');
    } else {
      value = labelOf(String(raw));
    }
    entries.push({ label: field.label, value });
  }
  return entries;
}

export const STATUS_BADGES: Record<SubmissionStatus, { label: string; color: string; bg: string }> =
  {
    submitted: { label: 'Submitted', color: '#4356a9', bg: 'rgba(67,86,169,0.12)' },
    processing: { label: 'Processing', color: '#2d3f89', bg: 'rgba(45,63,137,0.12)' },
    completed: { label: 'Completed', color: '#1d2a5d', bg: 'rgba(29,42,93,0.12)' },
    denied: { label: 'Denied', color: '#ad2122', bg: 'rgba(173,33,34,0.12)' },
  };
