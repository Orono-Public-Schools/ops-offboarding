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
  | 'textarea';

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
  sections: FormSection[];
};

/** A submission's raw field values, keyed by field id. */
export type FormData = Record<string, string | boolean | string[]>;

export type SubmissionStatus = 'submitted' | 'processing' | 'completed' | 'denied';

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  'submitted',
  'processing',
  'completed',
  'denied',
];
