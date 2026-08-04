import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { ProgressBar } from '../core/ProgressBar.jsx';

/* Portal-home tile. Hover floods the card from the corner in navy and inverts
   the text ("flood"), or lifts it off the page ("lift"). Cards showing progress
   always use lift — a flood would swallow the track. */

export function ModuleCard({
  icon, title, description, meta, total, done, disabled, footer, hover = 'flood',
  onClick, style, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const live = !!onClick && !disabled;
  const mode = total != null ? 'lift' : hover;
  const flooded = live && hot && mode === 'flood';

  return (
    <article
      onClick={live ? onClick : undefined}
      onMouseEnter={live ? () => setHot(true) : undefined}
      onMouseLeave={live ? () => setHot(false) : undefined}
      style={{
        position: 'relative', overflow: 'hidden', zIndex: 0,
        display: 'flex', flexDirection: 'column', gap: 10,
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-card)',
        boxShadow: live && hot && mode === 'lift' ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        border: '1px solid transparent',
        borderColor: live && hot && mode === 'lift' ? 'rgba(var(--secondary-rgb), 0.4)' : 'transparent',
        padding: 20,
        cursor: live ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
        transform: live && hot && mode === 'lift' ? 'translateY(-4px)' : 'none',
        transition: 'box-shadow var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {live && mode === 'flood' ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', zIndex: -1, top: -16, right: -16,
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--gradient-primary)',
            transform: flooded ? 'scale(26)' : 'scale(1)',
            transformOrigin: '50% 50%',
            transition: 'transform var(--dur-slow) var(--ease)',
          }}
        />
      ) : null}

      {live ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, right: 0, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--gradient-primary)', color: '#fff',
            borderRadius: '0 var(--radius-card) 0 26px',
            opacity: flooded ? 0 : hot ? 1 : 0.75,
            transition: 'opacity var(--dur-fast) var(--ease)',
          }}
        >
          <span style={{ margin: '-3px -3px 0 0' }}><Icon name="arrowRight" size={13} strokeWidth={2.5} /></span>
        </span>
      ) : null}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        color: flooded ? '#fff' : hot && live ? 'var(--primary)' : 'var(--secondary)',
        transition: 'color var(--dur-slow) var(--ease)',
      }}>
        {icon ? <Icon name={icon} size={17} /> : null}
        {/* Sentence case, not the uppercase strip: tile titles are content
            headings, and per the voice rules uppercase stays on category
            labels. */}
        <h3 style={{
          margin: 0, font: 'var(--type-card-title)', letterSpacing: 'var(--tracking-tight)',
          color: flooded ? '#fff' : 'var(--dark)',
          transition: 'color var(--dur-slow) var(--ease)',
        }}>{title}</h3>
      </div>

      {description ? (
        <p style={{
          margin: 0, font: 'var(--type-body-sm)', lineHeight: 1.55, paddingRight: live ? 14 : 0,
          color: flooded ? 'rgba(255, 255, 255, 0.82)' : 'var(--text-muted)',
          transition: 'color var(--dur-slow) var(--ease)',
        }}>{description}</p>
      ) : null}

      {total != null ? <div style={{ marginTop: 4 }}><ProgressBar total={total} done={done || 0} /></div> : null}

      {footer || meta ? (
        <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {footer || <span />}
          {meta ? (
            <span style={{
              font: 'var(--type-caption)',
              color: flooded ? 'rgba(255, 255, 255, 0.6)' : 'var(--text-placeholder)',
              transition: 'color var(--dur-slow) var(--ease)',
            }}>{meta}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
