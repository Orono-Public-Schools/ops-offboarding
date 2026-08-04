import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* Two contexts. On the dark shell: translucent white fill with a dashed
   border. Inside a card: the inset fill with a dashed hairline. */

export function EmptyState({ icon, line, note, action, on = 'dark', style, ...rest }) {
  const dark = on === 'dark';
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '40px 24px', textAlign: 'center',
        borderRadius: 'var(--radius-card)',
        background: dark ? 'var(--on-dark-fill)' : 'var(--surface-inset)',
        border: `1px dashed ${dark ? 'var(--on-dark-border)' : 'var(--border-input)'}`,
        ...style,
      }}
      {...rest}
    >
      {icon ? (
        <span style={{ color: dark ? 'var(--on-dark-faint)' : 'var(--text-placeholder)' }}>
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <p style={{
        margin: 0, font: 'var(--type-strong)',
        color: dark ? '#fff' : 'var(--dark)',
      }}>{line}</p>
      {note ? (
        <p style={{
          margin: 0, font: 'var(--type-body-sm)', maxWidth: '44ch',
          color: dark ? 'var(--on-dark-muted)' : 'var(--text-muted)',
        }}>{note}</p>
      ) : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}
