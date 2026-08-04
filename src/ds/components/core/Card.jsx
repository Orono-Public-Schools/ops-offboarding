import React from 'react';

/* The only content surface in the system: white, 12px, no border, layered
   soft shadow. Headings sit in a tinted strip at the top so the card's chrome
   is separated from its content (variant "strip", the default); "plain" keeps
   the heading inline with the body. */

export function Card({
  eyebrow, heading, headingRight, children, footer, pad, inset, interactive, variant = 'strip',
  onClick, style, bodyStyle, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const padding = pad != null ? pad : 20;
  const strip = variant === 'strip' && !!heading;

  const shell = {
    background: inset ? 'var(--surface-inset)' : 'var(--surface-card)',
    borderRadius: 'var(--radius-card)',
    boxShadow: hot ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
    /* No overflow clipping — an open Select panel has to escape the card. */
    padding: strip ? 0 : padding,
    cursor: onClick ? 'pointer' : 'default',
    transform: hot ? 'translateY(-2px)' : 'none',
    transition: 'box-shadow var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease)',
    ...style,
  };

  /* Eyebrow + sentence-case title. Without an eyebrow the heading falls back to
     the old uppercase strip label — fine for a small utility card, but any card
     a person lands on should say something. */
  const title = eyebrow ? (
    <div style={{ minWidth: 0 }}>
      <div style={{
        font: 'var(--type-card-eyebrow)', letterSpacing: 'var(--tracking-widest)',
        textTransform: 'uppercase', color: 'var(--secondary)',
      }}>{eyebrow}</div>
      <h2 style={{
        margin: '5px 0 0', font: 'var(--type-card-title)',
        letterSpacing: 'var(--tracking-tight)', color: 'var(--dark)',
      }}>{heading}</h2>
    </div>
  ) : (
    <h2 style={{
      margin: 0, font: 'var(--type-card-heading)',
      letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase',
      color: 'var(--dark)',
    }}>{heading}</h2>
  );

  return (
    <section
      onClick={onClick}
      onMouseEnter={interactive ? () => setHot(true) : undefined}
      onMouseLeave={interactive ? () => setHot(false) : undefined}
      style={shell}
      {...rest}
    >
      {strip ? (
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: `${Math.max(12, padding - 6)}px ${padding}px`,
          borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
          /* On an inset card the strip inverts to white so it still reads as chrome. */
          background: inset ? 'var(--surface-card)' : 'var(--surface-inset)',
          borderBottom: '1px solid var(--border-input)',
        }}>
          {title}
          {headingRight}
        </header>
      ) : heading ? (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          {title}
          {headingRight}
        </header>
      ) : null}

      <div style={strip ? { padding, ...bodyStyle } : bodyStyle}>{children}</div>

      {/* Footer: hangs off a hairline, no strip weight — for minor navigation
          that would read as a fourth call to action in its own card. */}
      {footer ? (
        <div style={{
          padding: `${Math.max(12, padding - 4)}px ${padding}px`,
          borderTop: '1px solid var(--divider)',
        }}>{footer}</div>
      ) : null}
    </section>
  );
}
