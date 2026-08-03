import { useEffect, useMemo, useRef, useState } from 'react';
import {
  isFieldVisible,
  submitForm,
  validateForm,
  type FormData,
  type FormDefinition,
  type FormField,
} from '../../lib/forms';

const DRAFT_PREFIX = 'oronohr:draft:';

function loadDraft(formId: string): FormData {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${formId}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as FormData;
  } catch {
    // Corrupt draft — start fresh.
  }
  return {};
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label
      htmlFor={field.id}
      className="mb-1 block text-xs font-semibold tracking-wider uppercase"
      style={{ color: 'var(--color-ink-muted)' }}
    >
      {field.label}
      {field.required && (
        <span aria-hidden style={{ color: 'var(--color-ops-red)' }}>
          {' '}
          *
        </span>
      )}
    </label>
  );
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: string | boolean | undefined;
  error?: string;
  onChange: (v: string | boolean) => void;
}) {
  const invalid = Boolean(error);

  if (field.type === 'checkbox') {
    return (
      <label
        className="flex cursor-pointer items-center gap-2 text-sm"
        style={{ color: 'var(--color-ink)' }}
      >
        <input
          id={field.id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[#4356a9]"
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex flex-col gap-1.5">
          {field.options?.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
              style={{ color: 'var(--color-ink)' }}
            >
              <input
                type="radio"
                name={field.id}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="h-4 w-4 cursor-pointer accent-[#4356a9]"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        <FieldLabel field={field} />
        <select
          id={field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className="input-form"
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <FieldLabel field={field} />
        <textarea
          id={field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          rows={4}
          className="input-form resize-none"
        />
      </div>
    );
  }

  const inputType =
    field.type === 'date'
      ? 'date'
      : field.type === 'email'
        ? 'email'
        : field.type === 'phone'
          ? 'tel'
          : 'text';
  return (
    <div>
      <FieldLabel field={field} />
      <input
        id={field.id}
        type={inputType}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        aria-invalid={invalid}
        className="input-form"
      />
    </div>
  );
}

export function FormRenderer({
  def,
  onSubmitted,
}: {
  def: FormDefinition;
  onSubmitted: (id: string) => void;
}) {
  const [data, setData] = useState<FormData>(() => loadDraft(def.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const draftTimer = useRef<number | null>(null);

  // Debounced draft autosave.
  useEffect(() => {
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(`${DRAFT_PREFIX}${def.id}`, JSON.stringify(data));
      } catch {
        // Storage full/unavailable — drafts are best-effort.
      }
    }, 800);
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
    };
  }, [data, def.id]);

  const hasDraft = useMemo(() => Object.keys(data).length > 0, [data]);

  const setField = (id: string, v: string | boolean) => {
    setData((d) => ({ ...d, [id]: v }));
    setErrors((e) => {
      if (!e[id]) return e;
      const { [id]: _removed, ...rest } = e;
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const result = validateForm(def, data);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitForm({ formId: def.id, data: result.cleaned });
      localStorage.removeItem(`${DRAFT_PREFIX}${def.id}`);
      onSubmitted(res.data.id);
    } catch (err) {
      const details = (err as { details?: { fieldErrors?: Record<string, string> } })?.details;
      if (details?.fieldErrors) {
        setErrors(details.fieldErrors);
      } else {
        console.error(err);
        setSubmitError('Something went wrong submitting the form. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(`${DRAFT_PREFIX}${def.id}`);
    setData({});
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {def.sections.map((section, i) => {
        const visibleFields = section.fields.filter((f) => isFieldVisible(f, data));
        if (visibleFields.length === 0) return null;
        return (
          <div
            key={i}
            className="rounded-xl p-4 sm:p-5"
            style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
          >
            {section.title && (
              <h2
                className="mb-4 text-sm font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-ops-navy)' }}
              >
                {section.title}
              </h2>
            )}
            {section.description && (
              <p className="mb-4 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {section.description}
              </p>
            )}
            <div className="flex flex-col gap-4">
              {visibleFields.map((field) => (
                <div key={field.id}>
                  <FieldControl
                    field={field}
                    value={data[field.id]}
                    error={errors[field.id]}
                    onChange={(v) => setField(field.id, v)}
                  />
                  {field.helper && !errors[field.id] && (
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {field.helper}
                    </p>
                  )}
                  {errors[field.id] && (
                    <p
                      className="mt-1 text-xs font-semibold"
                      style={{ color: 'var(--color-ops-red)' }}
                    >
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {submitError && (
        <p
          className="rounded-lg px-3 py-2 text-center text-xs"
          style={{ background: 'rgba(173,33,34,0.08)', color: 'var(--color-ops-red)' }}
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {hasDraft && (
          <button
            type="button"
            onClick={clearDraft}
            disabled={submitting}
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Clear form
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
          style={{ background: 'var(--grad-danger)', boxShadow: 'var(--shadow-danger)' }}
        >
          {submitting ? 'Submitting…' : 'Submit to HR'}
        </button>
      </div>
    </form>
  );
}
