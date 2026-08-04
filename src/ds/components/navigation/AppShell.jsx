import React from 'react';

/* The dark gradient shell and the centered content column. Nothing sits on
   the gradient except the title block, tab bar, and empty states. */

export function AppShell({ children, style, ...rest }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-page)', ...style }} {...rest}>
      <div style={{
        maxWidth: 'var(--width-content)', margin: '0 auto',
        padding: '48px 16px', display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {children}
      </div>
    </div>
  );
}
