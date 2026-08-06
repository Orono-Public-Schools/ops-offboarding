import type { FormData, FormDefinition, FormField, FormSection, ShowIf } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s()+.-]{7,20}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_MAX_LENGTH: Record<string, number> = {
  text: 500,
  email: 320,
  phone: 20,
  textarea: 5000,
};

export function allFields(def: FormDefinition): FormField[] {
  return def.sections.flatMap((s) => s.fields);
}

function conditionMet(cond: ShowIf, data: FormData): boolean {
  const value = data[cond.field];
  if (Array.isArray(value)) return typeof cond.equals === 'string' && value.includes(cond.equals);
  return value === cond.equals;
}

function conditionsMet(showIf: ShowIf | ShowIf[] | undefined, data: FormData): boolean {
  if (!showIf) return true;
  const conds = Array.isArray(showIf) ? showIf : [showIf];
  return conds.every((c) => conditionMet(c, data));
}

export function isSectionVisible(section: FormSection, data: FormData): boolean {
  return conditionsMet(section.showIf, data);
}

export function isFieldVisible(field: FormField, data: FormData): boolean {
  return conditionsMet(field.showIf, data);
}

/** Fields that are live given the current answers: visible section AND
 *  visible field. Hidden fields are neither validated nor kept. */
export function visibleFields(def: FormDefinition, data: FormData): FormField[] {
  return def.sections
    .filter((s) => isSectionVisible(s, data))
    .flatMap((s) => s.fields.filter((f) => isFieldVisible(f, data)));
}

export type ValidationResult = {
  ok: boolean;
  /** Field id → human-readable problem. */
  errors: Record<string, string>;
  /** Trimmed values for visible, known fields only. */
  cleaned: FormData;
};

/**
 * Validate raw form data against a definition. Used by the client for inline
 * feedback and by the submitForm callable as the authoritative check.
 */
export function validateForm(def: FormDefinition, data: FormData): ValidationResult {
  const errors: Record<string, string> = {};
  const cleaned: FormData = {};
  const knownIds = new Set(allFields(def).map((f) => f.id));

  // A visible blocking section means "not yet" — the client disables Send,
  // and this keeps a hand-crafted call from submitting anyway.
  if (def.sections.some((s) => s.blocking === true && isSectionVisible(s, data))) {
    errors._form = 'This form cannot be submitted yet.';
  }

  for (const key of Object.keys(data)) {
    if (!knownIds.has(key)) {
      errors[key] = 'Unknown field.';
    }
  }

  for (const field of visibleFields(def, data)) {
    const raw = data[field.id];

    if (field.type === 'checkbox') {
      if (raw !== undefined && typeof raw !== 'boolean') {
        errors[field.id] = 'Invalid value.';
        continue;
      }
      cleaned[field.id] = raw === true;
      continue;
    }

    if (field.type === 'checkboxes') {
      if (raw !== undefined && !Array.isArray(raw)) {
        errors[field.id] = 'Invalid value.';
        continue;
      }
      const values = (raw ?? []).filter((v): v is string => typeof v === 'string');
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      if (values.some((v) => !allowed.has(v))) {
        errors[field.id] = 'Choose from the listed options.';
        continue;
      }
      if (values.length === 0) {
        if (field.required) errors[field.id] = 'Check at least one.';
        continue;
      }
      cleaned[field.id] = values;
      continue;
    }

    if (Array.isArray(raw)) {
      errors[field.id] = 'Invalid value.';
      continue;
    }

    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) {
      if (field.required) errors[field.id] = 'Required.';
      continue;
    }

    const maxLength = field.maxLength ?? DEFAULT_MAX_LENGTH[field.type] ?? 500;
    if (value.length > maxLength) {
      errors[field.id] = `Too long (max ${maxLength} characters).`;
      continue;
    }

    switch (field.type) {
      case 'email':
        if (!EMAIL_RE.test(value)) errors[field.id] = 'Enter a valid email address.';
        break;
      case 'phone':
        if (!PHONE_RE.test(value)) errors[field.id] = 'Enter a valid phone number.';
        break;
      case 'date':
        if (!ISO_DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
          errors[field.id] = 'Enter a valid date.';
        }
        break;
      case 'select':
      case 'radio':
        if (!field.options?.some((o) => o.value === value)) {
          errors[field.id] = 'Choose one of the listed options.';
        }
        break;
      default:
        if (field.pattern && !new RegExp(field.pattern).test(value)) {
          errors[field.id] = field.patternMessage ?? 'Invalid format.';
        }
        break;
    }

    if (!errors[field.id]) cleaned[field.id] = value;
  }

  return { ok: Object.keys(errors).length === 0, errors, cleaned };
}

/** Build the denormalized list-view summary for a submission. Option values
 *  are shown as their labels, arrays joined. */
export function buildSummary(def: FormDefinition, cleaned: FormData): string {
  const fieldsById = new Map(allFields(def).map((f) => [f.id, f]));
  const labelOf = (fieldId: string, value: string): string =>
    fieldsById.get(fieldId)?.options?.find((o) => o.value === value)?.label ?? value;
  const parts = (def.summaryFields ?? [])
    .map((id) => {
      const v = cleaned[id];
      if (typeof v === 'string' && v.length > 0) return labelOf(id, v);
      if (Array.isArray(v) && v.length > 0) return v.map((x) => labelOf(id, x)).join(', ');
      return null;
    })
    .filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(' · ') : def.title;
}
