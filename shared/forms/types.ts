/**
 * Form schema model shared between the web app and Cloud Functions.
 *
 * Definitions are plain JSON-serializable data: the renderer walks them to
 * produce UI and the validator walks them to check submissions — the same
 * definition file drives both, so client and server can never disagree.
 *
 * This folder is the source of truth. The functions build copies it to
 * functions/src/shared-gen/ (see functions/copy-shared.mjs); never edit the
 * copy.
 */

export type FieldOption = {
  value: string;
  label: string;
  /** Longer explanation rendered under the option's label (radio/checkboxes). */
  description?: string;
};

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  /** Multi-select: value is a string[] of chosen option values. */
  | 'checkboxes'
  | 'textarea'
  /** One uploaded attachment: value is a FileRef pointing into Storage. */
  | 'file'
  /** Repeating rows of typed cells: value is a TableRow[]. */
  | 'table'
  /** Typed-name eSignature: value is the signer's typed name. */
  | 'signature'
  /** Someone from the staff directory: value is a Person. */
  | 'person';

/** A Storage upload attached to a submission. */
export type FileRef = { path: string; name: string };

/** A staff member picked from the directory. */
export type Person = { email: string; name: string };

/** One row of a table field, keyed by column key. */
export type TableRow = Record<string, string>;

export type TableColumn = {
  key: string;
  label: string;
  required?: boolean;
  maxLength?: number;
  /** Relative width hint for the renderer (flex-grow). */
  width?: number;
};

/**
 * A visibility condition. When the target field holds an array (a
 * `checkboxes` value), `equals` matches if the array includes it.
 * Multiple conditions are ANDed.
 */
export type ShowIf = { field: string; equals: string | boolean };

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Small helper text rendered under the field. */
  helper?: string;
  /** Choices for select/radio/checkboxes fields. */
  options?: FieldOption[];
  maxLength?: number;
  /** Regex source the (string) value must match. */
  pattern?: string;
  patternMessage?: string;
  /** Render + validate this field only when the condition(s) hold. */
  showIf?: ShowIf | ShowIf[];
  /** file fields: accept attribute for the picker (e.g. ".pdf,.doc,.docx"). */
  accept?: string;
  /** table fields: the row shape. */
  columns?: TableColumn[];
  /** table fields: hard cap on rows (default 30). */
  maxRows?: number;
  /** signature fields: consent text rendered under the input. */
  consent?: string;
};

export type FormSection = {
  title?: string;
  description?: string;
  /** Informational paragraphs rendered before the fields (may be the whole
   *  section — `fields: []` makes a pure info section). Bare URLs linkify. */
  info?: string[];
  fields: FormField[];
  /** Render + validate this section only when the condition(s) hold. */
  showIf?: ShowIf | ShowIf[];
  /** While visible, the form cannot be submitted (e.g. "come back after
   *  you've told your supervisor"). */
  blocking?: boolean;
};

export type FormDefinition = {
  id: string;
  title: string;
  description: string;
  /** Bumped on breaking changes; stored on each submission. */
  version: number;
  /** Field ids whose values build the denormalized list-view summary. */
  summaryFields?: string[];
  /** Approval routing. `approverField` names a `person` field whose pick must
   *  approve the submission before it reaches HR; the chain is frozen onto
   *  the submission at submit time. Omit for forms that go straight to HR. */
  routing?: { approverField: string };
  sections: FormSection[];
};

/** A submission's raw field values, keyed by field id. */
export type FormValue = string | boolean | string[] | FileRef | TableRow[] | Person;
export type FormData = Record<string, FormValue>;

/**
 * submitted → (supervisor_approved) → processing → completed, or denied at
 * any step. A routed submission sits at `submitted` while its approver
 * decides (`pendingApprover` set); an unrouted one at `submitted` is already
 * in HR's inbox.
 */
export type SubmissionStatus =
  'submitted' | 'supervisor_approved' | 'processing' | 'completed' | 'denied';

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  'submitted',
  'supervisor_approved',
  'processing',
  'completed',
  'denied',
];

/** The approval step frozen onto a submission at submit time. */
export type SubmissionRouting = {
  approver: Person;
  approval: {
    decision: 'approved' | 'denied';
    byEmail: string;
    note: string | null;
  } | null;
};
