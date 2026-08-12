import React from 'react';

/* Pill badge. Formula: solid brand-family color for text, same color at 12%
   for the background. Workflow progression darkens through the ramp. */

const BADGE_STATES = {
  draft:      { label: 'Draft',      color: 'var(--status-draft)',      rgb: '148, 163, 184', icon: null },
  submitted:  { label: 'Submitted',  color: 'var(--status-submitted)',  rgb: 'var(--secondary-rgb)', icon: 'check' },
  processing: { label: 'Processing', color: 'var(--status-processing)', rgb: 'var(--primary-rgb)', icon: 'clock' },
  completed:  { label: 'Completed',  color: 'var(--status-completed)',  rgb: 'var(--dark-rgb)', icon: 'check' },
  denied:     { label: 'Denied',     color: 'var(--status-denied)',     rgb: 'var(--accent-rgb)', icon: 'x' },
  paid:       { label: 'Paid',       color: 'var(--status-paid)',       rgb: 'var(--success-rgb)', icon: 'check' },
};

export function StatusBadge({ state = 'submitted', label, icon = true, size = 'md', variant = 'pill', style, children, ...rest }) {
  const s = BADGE_STATES[state] || BADGE_STATES.submitted;
  const small = size === 'sm';
  /* variant="dot": the color system without the button anatomy — a 7px dot
     and a colored word, no fill, no icon. For list rows; pills keep detail
     headers. (Design review 2026-08-11, treatment S2.) */
  if (variant === 'dot') {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          font: 'var(--type-badge)', fontSize: small ? 11 : 12,
          color: s.color, whiteSpace: 'nowrap',
          ...style,
        }}
        {...rest}
      >
        <span aria-hidden="true" style={{
          width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: 'currentColor',
        }} />
        {children || label || s.label}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: small ? '3px 8px' : '4px 10px',
        borderRadius: 'var(--radius-pill)',
        font: 'var(--type-badge)',
        fontSize: small ? 11 : 12,
        color: s.color,
        background: `rgba(${s.rgb}, 0.12)`,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {icon && s.icon ? <IconGlyph name={s.icon} size={small ? 11 : 12} /> : null}
      {children || label || s.label}
    </span>
  );
}

/* Tiny local glyph so the badge has no import-order dependency. */
function IconGlyph({ name, size }) {
  const d = name === 'check' ? 'M20 6 9 17l-5-5' : name === 'x' ? 'M18 6 6 18M6 6l12 12' : 'M12 6v6l4 2';
  const ring = name === 'clock';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      {ring ? <circle cx="12" cy="12" r="9" /> : null}
      <path d={d} />
    </svg>
  );
}
