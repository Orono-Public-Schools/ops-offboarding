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

export type FieldOption = { value: string; label: string };

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'textarea';

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Small helper text rendered under the field. */
  helper?: string;
  /** Choices for select/radio fields. */
  options?: FieldOption[];
  maxLength?: number;
  /** Regex source the (string) value must match. */
  pattern?: string;
  patternMessage?: string;
  /** Render + validate this field only when another field has a given value. */
  showIf?: { field: string; equals: string | boolean };
};

export type FormSection = {
  title?: string;
  description?: string;
  fields: FormField[];
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
export type FormData = Record<string, string | boolean>;

export type SubmissionStatus = 'submitted' | 'processing' | 'completed' | 'denied';

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  'submitted',
  'processing',
  'completed',
  'denied',
];
