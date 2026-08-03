import type { FormData, FormDefinition, FormField } from './types';

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

export function isFieldVisible(field: FormField, data: FormData): boolean {
  if (!field.showIf) return true;
  return data[field.showIf.field] === field.showIf.equals;
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
  const fields = allFields(def);
  const knownIds = new Set(fields.map((f) => f.id));

  for (const key of Object.keys(data)) {
    if (!knownIds.has(key)) {
      errors[key] = 'Unknown field.';
    }
  }

  for (const field of fields) {
    if (!isFieldVisible(field, data)) continue;
    const raw = data[field.id];

    if (field.type === 'checkbox') {
      if (raw !== undefined && typeof raw !== 'boolean') {
        errors[field.id] = 'Invalid value.';
        continue;
      }
      cleaned[field.id] = raw === true;
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

/** Build the denormalized list-view summary for a submission. */
export function buildSummary(def: FormDefinition, cleaned: FormData): string {
  const parts = (def.summaryFields ?? [])
    .map((id) => cleaned[id])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  return parts.length > 0 ? parts.join(', ') : def.title;
}
