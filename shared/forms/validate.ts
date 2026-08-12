import type {
  FileRef,
  FormData,
  FormDefinition,
  FormField,
  FormSection,
  ShowIf,
  TableRow,
} from './types';

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
  if (Array.isArray(value)) {
    return (
      typeof cond.equals === 'string' && (value as unknown[]).some((x) => x === cond.equals)
    );
  }
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

    if (field.type === 'file') {
      if (raw === undefined || raw === null || raw === '') {
        if (field.required) errors[field.id] = 'Attach a file.';
        continue;
      }
      const ref = raw as FileRef;
      if (
        typeof ref !== 'object' ||
        Array.isArray(ref) ||
        typeof ref.path !== 'string' ||
        typeof ref.name !== 'string'
      ) {
        errors[field.id] = 'Invalid file.';
        continue;
      }
      const path = ref.path.trim();
      const name = ref.name.trim();
      if (!path || path.length > 500 || !name || name.length > 200) {
        errors[field.id] = 'Invalid file.';
        continue;
      }
      cleaned[field.id] = { path, name };
      continue;
    }

    if (field.type === 'table') {
      if (raw !== undefined && !Array.isArray(raw)) {
        errors[field.id] = 'Invalid value.';
        continue;
      }
      const cols = field.columns ?? [];
      const colByKey = new Map(cols.map((c) => [c.key, c]));
      const rowsRaw = (raw ?? []) as unknown[];
      const maxRows = field.maxRows ?? 30;
      if (rowsRaw.length > maxRows) {
        errors[field.id] = `Too many rows (max ${maxRows}).`;
        continue;
      }
      const rows: TableRow[] = [];
      let problem: string | null = null;
      for (const r of rowsRaw) {
        if (typeof r !== 'object' || r === null || Array.isArray(r)) {
          problem = 'Invalid value.';
          break;
        }
        const row: TableRow = {};
        let hasContent = false;
        for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
          const col = colByKey.get(k);
          if (!col || typeof v !== 'string') {
            problem = 'Invalid value.';
            break;
          }
          const cell = v.trim();
          const max = col.maxLength ?? 200;
          if (cell.length > max) {
            problem = `Too long (max ${max} characters).`;
            break;
          }
          if (cell) {
            row[k] = cell;
            hasContent = true;
          }
        }
        if (problem) break;
        if (!hasContent) continue; // a fully empty row is just dropped
        const missing = cols.find((c) => c.required && !row[c.key]);
        if (missing) {
          problem = `Each row needs a ${missing.label.toLowerCase()}.`;
          break;
        }
        rows.push(row);
      }
      if (problem) {
        errors[field.id] = problem;
        continue;
      }
      if (rows.length === 0) {
        if (field.required) errors[field.id] = 'Add at least one row.';
        continue;
      }
      cleaned[field.id] = rows;
      continue;
    }

    if (field.type === 'signature') {
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) {
        if (field.required) errors[field.id] = 'Type your name to sign.';
        continue;
      }
      if (value.length < 2 || value.length > 120) {
        errors[field.id] = 'Enter your full name.';
        continue;
      }
      cleaned[field.id] = value;
      continue;
    }

    if (Array.isArray(raw) || (typeof raw === 'object' && raw !== null)) {
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
  const labelOf = (fieldId: string, value: string): string => {
    const field = fieldsById.get(fieldId);
    // Dates read MM-DD-YYYY everywhere people see them; ISO stays stored.
    if (field?.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      return `${m}-${d}-${y}`;
    }
    return field?.options?.find((o) => o.value === value)?.label ?? value;
  };
  const parts = (def.summaryFields ?? [])
    .map((id) => {
      const v = cleaned[id];
      if (typeof v === 'string' && v.length > 0) return labelOf(id, v);
      if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')) {
        return (v as string[]).map((x) => labelOf(id, x)).join(', ');
      }
      return null;
    })
    .filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(' · ') : def.title;
}
