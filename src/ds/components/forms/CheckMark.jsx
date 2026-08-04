import React from 'react';

/* The box flips on its Y axis to reveal an inked face with the check already
   drawn on it — the tick is a physical turn, not a fade. Shared by ChoiceRow
   and ChecklistItem so both feel the same. */

export function CheckMark({
  checked, size = 18, radius = 5, waiting = false, hovered = false, tone = 'primary',
}) {
  const inkFace = tone === 'secondary' ? 'var(--secondary)' : 'var(--gradient-primary)';
  const inkEdge = tone === 'secondary' ? 'var(--secondary)' : 'var(--primary)';

  /* Faces also swap opacity at the halfway point. backface-visibility alone is
     enough in a browser, but export and snapshot renderers ignore backface
     culling and paint both faces — the opacity swap keeps the mark correct
     everywhere. */
  const half = 'opacity 1ms linear 160ms';
  const face = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    borderRadius: radius,
    display: 'grid', placeItems: 'center',
  };

  return (
    <span style={{
      /* inline-block matters: a bare inline span ignores width/height and the
         absolutely-positioned faces collapse to zero. */
      position: 'relative', display: 'inline-block',
      width: size, height: size, flex: '0 0 auto', perspective: 60,
    }}>
      <span style={{
        position: 'absolute', inset: 0,
        transformStyle: 'preserve-3d',
        transform: checked ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform var(--dur-slow) cubic-bezier(0.2, 0.8, 0.25, 1.1)',
      }}>
        {/* Front: empty box. Waiting shows a clock, for a task in someone else's hands. */}
        <span style={{
          ...face,
          zIndex: 1,
          background: waiting ? 'rgba(var(--secondary-rgb), 0.12)' : '#fff',
          boxShadow: `inset 0 0 0 1px ${hovered || waiting ? 'rgba(var(--secondary-rgb), 0.45)' : 'var(--border-input)'}`,
          opacity: checked ? 0 : 1,
          transition: `box-shadow var(--dur-fast) var(--ease), ${half}`,
        }}>
          {waiting ? (
            <svg width={size - 7} height={size - 7} viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          ) : null}
        </span>

        {/* Back: inked face, check already drawn. */}
        <span style={{
          ...face,
          transform: 'rotateY(180deg)',
          background: inkFace,
          boxShadow: `0 0 0 1px ${inkEdge}`,
          opacity: checked ? 1 : 0,
          transition: half,
        }}>
          <svg width={size - 7} height={size - 7} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      </span>
    </span>
  );
}
