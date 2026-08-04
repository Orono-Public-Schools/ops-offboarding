import React from 'react';

/* Named stages of a request, so "where is this?" is answerable at a glance.
   Passed stages behind you are navy; the one you are on is inked and ringed;
   the rest are the light tint. */

export function StatusTrack({ stages = [], current = 0, tone = 'accent', invert = false, style, ...rest }) {
  /* On a navy ground the ramp flips to white and the current node brightens —
     #ad2122 has too little contrast against the flood to carry meaning. */
  const doneColor = invert ? '#ffffff' : 'var(--primary)';
  const aheadFill = invert ? 'rgba(255, 255, 255, 0.22)' : 'var(--tint)';
  const aheadRing = invert ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.35)' : 'inset 0 0 0 1px var(--border-input)';
  const aheadText = invert ? 'rgba(255, 255, 255, 0.5)' : 'var(--text-placeholder)';
  const doneText = invert ? 'rgba(255, 255, 255, 0.85)' : 'var(--primary)';
  const nowColor = invert
    ? '#ff8a80'
    : tone === 'accent' ? 'var(--accent)' : 'var(--primary)';
  const nowRing = invert
    ? 'rgba(255, 138, 128, 0.3)'
    : tone === 'accent' ? 'rgba(var(--accent-rgb), 0.16)' : 'rgba(var(--primary-rgb), 0.16)';

  const nodes = [];
  stages.forEach((s, i) => {
    const done = i < current;
    const now = i === current;
    if (i > 0) {
      nodes.push(
        <span key={`seg-${i}`} style={{
          height: 2, flex: '1 1 auto',
          background: i <= current ? doneColor : aheadFill,
          transition: 'background-color var(--dur-slow) var(--ease)',
        }} />
      );
    }
    nodes.push(
      <span key={`node-${i}`} style={{
        width: 9, height: 9, borderRadius: 999, flex: '0 0 auto',
        background: now ? nowColor : done ? doneColor : aheadFill,
        boxShadow: now ? `0 0 0 3px ${nowRing}` : done ? 'none' : aheadRing,
        transition: 'var(--transition-control)',
      }} />
    );
  });

  return (
    <div style={style} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center' }}>{nodes}</div>
      {/* Labels read from the SAME geometry as the nodes. A node's center sits at
          4.5px + i/(n-1) of the track's inner width, so each label is placed at
          that exact offset rather than on an evenly divided grid. */}
      <div style={{ position: 'relative', height: 16, marginTop: 7 }}>
        {stages.map((label, i) => {
          const done = i < current;
          const now = i === current;
          const t = stages.length > 1 ? i / (stages.length - 1) : 0;
          const first = i === 0;
          const last = i === stages.length - 1;
          return (
            <span key={label} style={{
              position: 'absolute', top: 0, whiteSpace: 'nowrap',
              left: `calc(${t * 100}% + ${4.5 - t * 9}px)`,
              transform: first ? 'none' : last ? 'translateX(-100%)' : 'translateX(-50%)',
              font: 'var(--type-caption)', fontSize: 11,
              fontWeight: now ? 600 : done ? 500 : 400,
              color: now ? nowColor : done ? doneText : aheadText,
              transition: 'color var(--dur-slow) var(--ease)',
            }}>{label}</span>
          );
        })}
      </div>
    </div>
  );
}
