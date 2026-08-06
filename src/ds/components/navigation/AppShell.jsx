import React from 'react';

/* The dark gradient shell and the centered content column. Nothing sits on
   the gradient except the title block, tab bar, and empty states. */

export function AppShell({ children, style, ...rest }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a1230', ...style }} {...rest}>
      {/* The gradient lives on a viewport-fixed underlay so it reads
          identically on every page — painted on the scrolling container it
          stretched with content height, so tall pages looked darker. */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, background: 'var(--gradient-page)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative',
        maxWidth: 'var(--width-content)', margin: '0 auto',
        padding: '48px 16px', display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {children}
      </div>
    </div>
  );
}
