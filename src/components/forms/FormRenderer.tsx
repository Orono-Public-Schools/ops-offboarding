import { useEffect, useMemo, useRef, useState } from 'react';
import {
  isFieldVisible,
  submitForm,
  validateForm,
  type FormData,
  type FormDefinition,
  type FormField,
} from '../../lib/forms';
import { Button } from '../../ds/components/core/Button';
import { Field } from '../../ds/components/forms/Field';
import { ChoiceRow } from '../../ds/components/forms/ChoiceRow';
import { FormSection } from '../../ds/components/forms/FormSection';

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

function inputType(field: FormField): string {
  switch (field.type) {
    case 'date':
      return 'date';
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    default:
      return 'text';
  }
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
  if (field.type === 'checkbox') {
    return (
      <div>
        <ChoiceRow
          type="checkbox"
          title={field.label}
          description={field.helper}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {error && (
          <p style={{ font: 'var(--type-caption)', color: 'var(--accent)', margin: '4px 0 0' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <p
          style={{
            font: 'var(--type-field-label)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            margin: '0 0 8px',
          }}
        >
          {field.label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options?.map((o) => (
            <ChoiceRow
              key={o.value}
              type="radio"
              name={field.id}
              title={o.label}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
          ))}
        </div>
        {error && (
          <p style={{ font: 'var(--type-caption)', color: 'var(--accent)', margin: '4px 0 0' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <Field
        label={field.label}
        as="select"
        options={field.options?.map((o) => ({ value: o.value, label: o.label }))}
        value={typeof value === 'string' ? value : ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        help={error ? undefined : field.helper}
        error={error}
        optional={!field.required}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <Field
        label={field.label}
        as="textarea"
        rows={4}
        value={typeof value === 'string' ? value : ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={field.placeholder}
        help={error ? undefined : field.helper}
        error={error}
        optional={!field.required}
      />
    );
  }

  return (
    <Field
      label={field.label}
      type={inputType(field)}
      icon={field.type === 'date' ? 'calendar' : undefined}
      value={typeof value === 'string' ? value : ''}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={field.placeholder}
      help={error ? undefined : field.helper}
      error={error}
      optional={!field.required}
    />
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {def.sections.map((section, i) => {
        const visibleFields = section.fields.filter((f) => isFieldVisible(f, data));
        if (visibleFields.length === 0) return null;
        return (
          <FormSection
            key={i}
            step={i + 1}
            title={section.title ?? ''}
            description={section.description}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {visibleFields.map((field) => (
                <FieldControl
                  key={field.id}
                  field={field}
                  value={data[field.id]}
                  error={errors[field.id]}
                  onChange={(v) => setField(field.id, v)}
                />
              ))}
            </div>
          </FormSection>
        );
      })}

      {submitError && (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--accent)',
            background: 'rgba(var(--accent-rgb), 0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {hasDraft && (
          <Button type="button" variant="ghost" onClick={clearDraft} disabled={submitting}>
            Clear the form
          </Button>
        )}
        <Button type="submit" variant="submit" icon="send" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send to HR'}
        </Button>
      </div>
    </form>
  );
}
