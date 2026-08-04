import React from 'react';
import { Icon } from './Icon.jsx';

/* The only content surface in the system: white, 12px, no border, layered
   soft shadow. Headings sit in a tinted strip at the top so the card's chrome
   is separated from its content (variant "strip", the default); "plain" keeps
   the heading inline with the body.

   Collapsible cards borrow ModuleCard's gradient corner tab as the toggle:
   the chevron rotates as the card opens, and the whole heading strip is the
   click target. */

export function Card({
  eyebrow, heading, headingRight, children, footer, pad, inset, interactive, variant = 'strip',
  collapsible, defaultOpen = false,
  onClick, style, bodyStyle, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const [headerHot, setHeaderHot] = React.useState(false);
  const [openState, setOpenState] = React.useState(!!defaultOpen);
  const padding = pad != null ? pad : 20;
  const strip = variant === 'strip' && !!heading;
  const canCollapse = !!collapsible && strip;
  const open = canCollapse ? openState : true;

  const surface = inset ? 'var(--surface-inset)' : 'var(--surface-card)';
  const stripBg = inset ? 'var(--surface-card)' : 'var(--surface-inset)';
  const shell = {
    position: 'relative',
    /* Strip cards paint NO section background: the header owns the top and the
       body/footer own the bottom, so every corner is a single antialiased
       curve. A section background underneath peeks out a sub-pixel past the
       strip's curve — visible as light pixels beside the corner tab. */
    background: strip ? 'transparent' : surface,
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
        <header
          onClick={canCollapse ? () => setOpenState((o) => !o) : undefined}
          onMouseEnter={canCollapse ? () => setHeaderHot(true) : undefined}
          onMouseLeave={canCollapse ? () => setHeaderHot(false) : undefined}
          role={canCollapse ? 'button' : undefined}
          aria-expanded={canCollapse ? open : undefined}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            /* The corner tab lives inside the clipped header so the tab and the
               strip share one rounded edge — two separately antialiased curves
               on the same corner leave a light sliver. */
            position: 'relative', overflow: 'hidden',
            padding: `${Math.max(12, padding - 6)}px ${padding}px`,
            paddingRight: canCollapse ? Math.max(padding, 40) : padding,
            borderRadius: open ? 'var(--radius-card) var(--radius-card) 0 0' : 'var(--radius-card)',
            /* On an inset card the strip inverts to white so it still reads as chrome. */
            background: stripBg,
            borderBottom: open ? '1px solid var(--border-input)' : 'none',
            cursor: canCollapse ? 'pointer' : 'inherit',
            userSelect: canCollapse ? 'none' : undefined,
          }}
        >
          {canCollapse ? (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', top: 0, right: 0, width: 30, height: 30, zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--gradient-primary)', color: '#fff',
                borderRadius: '0 0 0 26px',
                opacity: headerHot ? 1 : 0.75, pointerEvents: 'none',
                transition: 'opacity var(--dur-fast) var(--ease)',
              }}
            >
              <span style={{
                margin: '-3px -3px 0 0', display: 'flex',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--dur-slow) var(--ease)',
              }}>
                <Icon name="chevronDown" size={13} strokeWidth={2.5} />
              </span>
            </span>
          ) : null}
          {title}
          {headingRight ? (
            <span onClick={canCollapse ? (e) => e.stopPropagation() : undefined}>
              {headingRight}
            </span>
          ) : null}
        </header>
      ) : heading ? (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          {title}
          {headingRight}
        </header>
      ) : null}

      {open ? (
        <div
          style={
            strip
              ? {
                  padding,
                  background: surface,
                  borderRadius: footer ? 0 : '0 0 var(--radius-card) var(--radius-card)',
                  ...bodyStyle,
                }
              : bodyStyle
          }
        >
          {children}
        </div>
      ) : null}

      {/* Footer: hangs off a hairline, no strip weight — for minor navigation
          that would read as a fourth call to action in its own card. */}
      {open && footer ? (
        <div style={{
          padding: `${Math.max(12, padding - 4)}px ${padding}px`,
          borderTop: '1px solid var(--divider)',
          background: strip ? surface : undefined,
          borderRadius: strip ? '0 0 var(--radius-card) var(--radius-card)' : undefined,
        }}>{footer}</div>
      ) : null}
    </section>
  );
}
