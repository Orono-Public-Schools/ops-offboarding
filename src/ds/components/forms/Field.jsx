import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Select } from './Select.jsx';

/* Labelled input, select, or textarea. No box: an uppercase letterspaced label
   over a hairline rule, and on focus a navy rule wipes in from the left on the
   same curve as the buttons. Read-only fields sit on the inset fill. */

export function Field({
  label, help, error, optional, readOnly, id,
  as = 'input', options = [], rows = 3, icon, suffix,
  style, inputStyle, children, ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const fid = id || `f-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const inner = {
    flex: 1, width: '100%',
    minHeight: as === 'textarea' ? undefined : 38,
    padding: as === 'textarea' ? '8px 0' : 0,
    font: 'var(--type-body)',
    color: error ? 'var(--accent)' : 'var(--dark)',
    background: 'transparent',
    border: 'none', outline: 'none',
    resize: as === 'textarea' ? 'vertical' : undefined,
    appearance: as === 'select' ? 'none' : undefined,
    fontFamily: 'var(--font-sans)',
  };

  /* Selects are a custom panel, not a native <select>, so they get the whole
     field row rather than being wrapped in the ruled well below. */
  if (as === 'select' && !children) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...style }}>
        {label ? (
          <label htmlFor={fid} style={{
            font: 'var(--type-field-label)', letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {label}
            {optional ? <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text-placeholder)' }}>optional</span> : null}
          </label>
        ) : null}
        <Select id={fid} options={options} icon={icon} invalid={!!error} {...rest} />
        {error ? <p style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--accent)', fontWeight: 500 }}>{error}</p> : null}
        {help && !error ? <p style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{help}</p> : null}
      </div>
    );
  }

  let control;
  if (children) control = children;
  else if (as === 'textarea') control = <textarea id={fid} rows={rows} readOnly={readOnly} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inner, ...inputStyle }} {...rest} />;
  else if (as === 'select') control = (
    <select id={fid} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inner, ...inputStyle }} {...rest}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        return <option key={v} value={v}>{typeof o === 'string' ? o : o.label}</option>;
      })}
    </select>
  );
  else control = <input id={fid} readOnly={readOnly} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inner, ...inputStyle }} {...rest} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...style }}>
      {label ? (
        <label htmlFor={fid} style={{
          font: 'var(--type-field-label)', letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {label}
          {optional ? <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text-placeholder)' }}>optional</span> : null}
        </label>
      ) : null}

      <div style={{
        position: 'relative',
        display: 'flex', alignItems: as === 'textarea' ? 'flex-start' : 'center', gap: 8,
        /* Read-only answers get a tinted well; everything else is a bare rule. */
        padding: readOnly ? '0 10px' : '0 2px',
        background: readOnly ? 'var(--surface-inset)' : 'transparent',
        borderRadius: readOnly ? 'var(--radius-input)' : 0,
        borderBottom: `1px solid ${error ? 'var(--accent)' : readOnly ? 'transparent' : 'var(--border-input)'}`,
        transition: 'border-color var(--dur-fast) var(--ease)',
      }}>
        {/* The focus rule: wipes in from the left, 400ms, button curve. */}
        {!readOnly ? (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
              background: error ? 'var(--gradient-accent)' : 'var(--gradient-primary)',
              transform: focused ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'left',
              transition: 'transform var(--dur-slow) cubic-bezier(0.3, 1, 0.8, 1)',
            }}
          />
        ) : null}

        {icon ? <span style={{ color: focused ? 'var(--primary)' : 'var(--text-placeholder)', transition: 'color var(--dur-fast) var(--ease)' }}><Icon name={icon} size={15} /></span> : null}
        {control}
        {suffix ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{suffix}</span> : null}
        {as === 'select' ? <span style={{ color: 'var(--text-muted)' }}><Icon name="chevronDown" size={15} /></span> : null}
      </div>

      {error ? <p style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--accent)', fontWeight: 500 }}>{error}</p> : null}
      {help && !error ? <p style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{help}</p> : null}
    </div>
  );
}
