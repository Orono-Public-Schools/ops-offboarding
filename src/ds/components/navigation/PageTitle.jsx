import React from 'react';

export function PageTitle({ eyebrow, title, subtitle, actions, style, ...rest }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }} {...rest}>
      {eyebrow ? (
        <span style={{
          font: 'var(--type-field-label)', letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase', color: 'var(--on-dark-faint)',
        }}>{eyebrow}</span>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <h1 style={{
          margin: 0, font: 'var(--type-page-title)', letterSpacing: 'var(--tracking-tight)',
          color: 'var(--on-dark)',
        }}>{title}</h1>
        {actions ? <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div> : null}
      </div>
      {subtitle ? (
        <p style={{ margin: 0, font: 'var(--type-page-sub)', color: 'var(--on-dark-muted)', maxWidth: '62ch' }}>{subtitle}</p>
      ) : null}
    </header>
  );
}
