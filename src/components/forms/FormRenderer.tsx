import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import {
  isFieldVisible,
  isSectionVisible,
  submitForm,
  validateForm,
  type FileRef,
  type FormData,
  type FormDefinition,
  type FormField,
  type FormValue,
  type TableRow,
} from '../../lib/forms';
import { MAX_UPLOAD_BYTES, removeFormFile, uploadFormFile } from '../../lib/storage';
import { Button } from '../../ds/components/core/Button';
import { Icon } from '../../ds/components/core/Icon';
import { DateField } from './DateField';
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
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    default:
      return 'text';
  }
}

/** Bare https:// URLs in info text become real links. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('http') ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'underline' }}
          >
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** Question labels for choice groups read as sentences, bold and dark —
 *  distinct from the small uppercase labels on text inputs. */
const GROUP_LABEL: React.CSSProperties = {
  font: '600 13.5px/1.4 var(--font-sans)',
  color: 'var(--dark)',
  margin: '0 0 8px',
};

const FIELD_ERROR: React.CSSProperties = {
  font: 'var(--type-caption)',
  color: 'var(--accent)',
  margin: '4px 0 0',
};

const CELL_INPUT: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-input)',
  borderRadius: 8,
  padding: '7px 10px',
  font: '400 13px/1.4 var(--font-sans)',
  color: 'var(--dark)',
  background: 'var(--surface-card)',
  boxSizing: 'border-box',
};

function FileField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: FormValue | undefined;
  error?: string;
  onChange: (v: FormValue) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const current =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as FileRef) : null;

  const pick = async (file: File | undefined) => {
    if (!file || !user) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError('That file is over 15 MB — trim it down and try again.');
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const uploaded = await uploadFormFile(user.uid, file);
      if (current) removeFormFile(current);
      onChange(uploaded);
    } catch (err) {
      console.error(err);
      setLocalError('The upload failed — please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shown = localError ?? error;
  return (
    <div>
      <p style={GROUP_LABEL}>{field.label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={field.accept}
        style={{ display: 'none' }}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {current ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-input)',
            borderRadius: 8,
            padding: '8px 8px 8px 12px',
            maxWidth: 440,
          }}
        >
          <span style={{ display: 'flex', color: 'var(--secondary)' }}>
            <Icon name="fileText" size={15} />
          </span>
          <span
            style={{
              font: '600 12.5px/1.4 var(--font-sans)',
              color: 'var(--dark)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {current.name}
          </span>
          <button
            type="button"
            title="Remove this file"
            disabled={busy}
            onClick={() => {
              removeFormFile(current);
              onChange('');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.10)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-placeholder)';
            }}
            style={{
              width: 22,
              height: 22,
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              color: 'var(--text-placeholder)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void pick(e.dataTransfer.files?.[0]);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            maxWidth: 440,
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px dashed ${dragOver ? 'var(--secondary)' : 'var(--border-input)'}`,
            background: dragOver ? 'var(--tint)' : 'transparent',
            cursor: busy ? 'default' : 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!busy) e.currentTarget.style.background = 'var(--tint)';
          }}
          onMouseLeave={(e) => {
            if (!dragOver) e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={{ display: 'flex', color: 'var(--secondary)' }}>
            <Icon name="plus" size={14} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                font: '600 12.5px/1.4 var(--font-sans)',
                color: 'var(--secondary)',
              }}
            >
              {busy ? 'Uploading…' : 'Attach a file'}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-caption)',
                color: 'var(--text-placeholder)',
              }}
            >
              PDF, Word, or image — drop it here or click to browse
            </span>
          </span>
        </button>
      )}
      {shown && <p style={FIELD_ERROR}>{shown}</p>}
    </div>
  );
}

function TableField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: FormValue | undefined;
  error?: string;
  onChange: (v: FormValue) => void;
}) {
  const cols = field.columns ?? [];
  const rows: TableRow[] = Array.isArray(value)
    ? (value as unknown[]).filter(
        (r): r is TableRow => typeof r === 'object' && r !== null && !Array.isArray(r),
      )
    : [];
  const grid = cols.map((c) => `${c.width ?? 1}fr`).join(' ') + ' 32px';
  const maxRows = field.maxRows ?? 30;

  const setCell = (i: number, key: string, v: string) =>
    onChange(rows.map((r, ri) => (ri === i ? { ...r, [key]: v } : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, ri) => ri !== i));

  return (
    <div>
      <p style={GROUP_LABEL}>{field.label}</p>
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8 }}>
            {cols.map((c) => (
              <span
                key={c.key}
                style={{
                  font: 'var(--type-field-label)',
                  letterSpacing: 'var(--tracking-wider)',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {c.label}
              </span>
            ))}
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 8 }}>
              {cols.map((c) => (
                <input
                  key={c.key}
                  value={row[c.key] ?? ''}
                  onChange={(e) => setCell(i, c.key, e.target.value)}
                  maxLength={c.maxLength ?? 200}
                  aria-label={`${c.label}, row ${i + 1}`}
                  style={CELL_INPUT}
                />
              ))}
              <button
                type="button"
                onClick={() => removeRow(i)}
                title="Remove this row"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-placeholder)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="secondary"
        icon="plus"
        disabled={rows.length >= maxRows}
        onClick={() => onChange([...rows, {}])}
      >
        {rows.length === 0 ? 'Add the first course' : 'Add another'}
      </Button>
      {error && <p style={FIELD_ERROR}>{error}</p>}
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: FormValue | undefined;
  error?: string;
  onChange: (v: FormValue) => void;
}) {
  if (field.type === 'file') {
    return <FileField field={field} value={value} error={error} onChange={onChange} />;
  }

  if (field.type === 'table') {
    return <TableField field={field} value={value} error={error} onChange={onChange} />;
  }

  if (field.type === 'signature') {
    return (
      <div>
        <Field
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder="Type your full name"
          error={error}
        />
        {field.consent && (
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
            {field.consent}
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'checkboxes') {
    const values = Array.isArray(value)
      ? (value as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const toggle = (v: string) =>
      onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
    return (
      <div>
        <p style={GROUP_LABEL}>{field.label}</p>
        {field.helper && (
          <p
            style={{
              font: 'var(--type-caption)',
              color: 'var(--text-muted)',
              margin: '-4px 0 8px',
            }}
          >
            {field.helper}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options?.map((o) => (
            <ChoiceRow
              key={o.value}
              type="checkbox"
              title={o.label}
              description={o.description}
              checked={values.includes(o.value)}
              onChange={() => toggle(o.value)}
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
        <p style={GROUP_LABEL}>{field.label}</p>
        {field.helper && (
          <p
            style={{
              font: 'var(--type-caption)',
              color: 'var(--text-muted)',
              margin: '-4px 0 8px',
            }}
          >
            {field.helper}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options?.map((o) => (
            <ChoiceRow
              key={o.value}
              type="radio"
              name={field.id}
              title={o.label}
              description={o.description}
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

  if (field.type === 'date') {
    return (
      <DateField
        label={field.label}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        placeholder={field.placeholder}
        help={error ? undefined : field.helper}
        error={error}
        optional={!field.required}
      />
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

  const setField = (id: string, v: FormValue) => {
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
    // Uploaded attachments belong to the draft — clear them out of Storage too.
    for (const f of def.sections.flatMap((s) => s.fields)) {
      if (f.type !== 'file') continue;
      const v = data[f.id];
      if (v && typeof v === 'object' && !Array.isArray(v)) removeFormFile(v as FileRef);
    }
    localStorage.removeItem(`${DRAFT_PREFIX}${def.id}`);
    setData({});
    setErrors({});
  };

  const visibleSections = def.sections
    .filter((s) => isSectionVisible(s, data))
    .map((section) => ({
      section,
      fields: section.fields.filter((f) => isFieldVisible(f, data)),
    }))
    // A section earns its card with fields to fill or info to read.
    .filter(({ section, fields }) => fields.length > 0 || (section.info?.length ?? 0) > 0);
  const blocked = visibleSections.some(({ section }) => section.blocking === true);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {visibleSections.map(({ section, fields }, i) => (
        <FormSection
          key={section.title ?? i}
          eyebrow={`Step ${i + 1} of ${visibleSections.length}`}
          title={section.title ?? ''}
          description={section.description}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {section.info?.map((paragraph, pi) => (
              <p
                key={pi}
                style={{
                  font: 'var(--type-body-sm)',
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                <Linkified text={paragraph} />
              </p>
            ))}
            {fields.map((field) => (
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
      ))}

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
          <Button type="button" variant="inverse" onClick={clearDraft} disabled={submitting}>
            Clear the form
          </Button>
        )}
        <Button type="submit" variant="submit" icon="send" disabled={submitting || blocked}>
          {blocked ? 'Come back once your supervisor knows' : submitting ? 'Sending…' : 'Send to HR'}
        </Button>
      </div>
    </form>
  );
}
