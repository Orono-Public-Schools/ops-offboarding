import React from 'react';

/* Segmented track — one segment per step so a checklist reads as countable.
   Filled segments use the primary gradient; the rest are the light tint. */

export function ProgressBar({ total = 5, done = 0, label, showCount = true, height = 6, style, ...rest }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const segs = [];
  for (let i = 0; i < total; i += 1) {
    segs.push(
      <span key={i} style={{
        flex: 1, height,
        borderRadius: 'var(--radius-pill)',
        background: i < done ? 'var(--gradient-primary)' : 'var(--tint)',
        transition: 'background var(--dur-slow) var(--ease)',
      }} />
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }} {...rest}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>{segs}</div>
      {showCount || label ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          <span>{label || `${done} of ${total} complete`}</span>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pct}%</span>
        </div>
      ) : null}
    </div>
  );
}
