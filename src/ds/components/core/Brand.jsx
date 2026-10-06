import React from 'react';

/* OronoHR identity (chosen 2026-10-06): the letters HR drawn as geometric
   strokes over one short red rule — the mark — and the wordmark "OronoHR"
   with HR in the secondary blue. Red stays reserved for the mark's rule and
   for actions; the wordmark never uses it.

   The letters are paths, not text, so the favicon renders identically on a
   machine without Inter. Geometry lives in a 32×32 box; public/favicon.svg
   and the touch icon are the same drawing. */

const NAVY = '#1d2a5d';
const RULE_ON_NAVY = '#e98b8b';
const RULE_ON_PAPER = '#ad2122';

/** `tile` paints the navy rounded square behind white letters (favicon, on
    paper). Without it the glyph is white on whatever dark surface it sits on. */
export function Mark({ size = 24, tile = false, style, ...rest }) {
  const ink = '#ffffff';
  const rule = RULE_ON_NAVY;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: 'block', flex: '0 0 auto', ...style }} {...rest}>
      {tile && <rect width="32" height="32" rx="7" fill={NAVY} />}
      <g fill={ink}>
        <rect x="6.5" y="8" width="3.2" height="12" />
        <rect x="12.3" y="8" width="3.2" height="12" />
        <rect x="6.5" y="12.4" width="9" height="3.2" />
        <rect x="18" y="8" width="3.2" height="12" />
      </g>
      <path d="M19.6 9.6h3a2.4 2.4 0 0 1 0 4.8h-3" fill="none" stroke={ink} strokeWidth="3.2" />
      <path d="M22.2 15.4 25.4 20" fill="none" stroke={ink} strokeWidth="3.2" />
      <rect x="6.5" y="22.5" width="19.7" height="2.4" rx="1.2" fill={rule} />
    </svg>
  );
}

/** Mark for a light surface: the letters in navy, the rule in action red. */
export function MarkOnPaper({ size = 24, style, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: 'block', flex: '0 0 auto', ...style }} {...rest}>
      <g fill={NAVY}>
        <rect x="6.5" y="8" width="3.2" height="12" />
        <rect x="12.3" y="8" width="3.2" height="12" />
        <rect x="6.5" y="12.4" width="9" height="3.2" />
        <rect x="18" y="8" width="3.2" height="12" />
      </g>
      <path d="M19.6 9.6h3a2.4 2.4 0 0 1 0 4.8h-3" fill="none" stroke={NAVY} strokeWidth="3.2" />
      <path d="M22.2 15.4 25.4 20" fill="none" stroke={NAVY} strokeWidth="3.2" />
      <rect x="6.5" y="22.5" width="19.7" height="2.4" rx="1.2" fill={RULE_ON_PAPER} />
    </svg>
  );
}

/** "OronoHR" set in Inter. `onDark` (default) is white with HR in the
    lightened secondary; on paper it is navy with HR in --secondary. */
export function Wordmark({ size = 17, onDark = true, style, ...rest }) {
  return (
    <span
      style={{
        font: `700 ${size}px/1 var(--font-sans)`,
        letterSpacing: '-0.01em',
        color: onDark ? '#ffffff' : 'var(--dark)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      Orono<span style={{ color: onDark ? '#a9b6ea' : 'var(--secondary)' }}>HR</span>
    </span>
  );
}
