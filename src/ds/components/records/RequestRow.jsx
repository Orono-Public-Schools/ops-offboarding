import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* One of the person's own open requests: title, case line, status badge, and
   the stage track. Hover matches the "Your last two weeks" module card — the
   row rises off the page onto white with a shadow and a tinted border, and the
   corner arrow tab resolves in. Nothing recolors, so the stage track keeps its
   meaning. */

export function RequestRow({
  title, kind, status, track, note, onClick, style, children, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const live = !!onClick;
  const lifted = live && hot;

  return (
    <div
      onClick={onClick}
      onMouseEnter={live ? () => setHot(true) : undefined}
      onMouseLeave={live ? () => setHot(false) : undefined}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '14px 16px', borderRadius: 'var(--radius-input)',
        background: lifted ? 'var(--surface-card)' : 'transparent',
        border: `1px solid ${lifted ? 'rgba(var(--secondary-rgb), 0.4)' : 'transparent'}`,
        boxShadow: lifted ? 'var(--shadow-card-hover)' : 'none',
        transform: lifted ? 'translateY(-4px)' : 'none',
        cursor: live ? 'pointer' : 'default',
        transition: 'background-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {live ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, right: 0, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--gradient-primary)', color: '#fff',
            borderRadius: '0 var(--radius-input) 0 22px',
            opacity: hot ? 1 : 0,
            transition: 'opacity var(--dur-fast) var(--ease)',
          }}
        >
          <span style={{ margin: '-2px -2px 0 0' }}><Icon name="arrowRight" size={12} strokeWidth={2.5} /></span>
        </span>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: track ? 14 : 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingRight: live ? 22 : 0 }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', font: 'var(--type-value)', color: 'var(--dark)' }}>{title}</span>
            {kind ? <span style={{ display: 'block', font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>{kind}</span> : null}
          </span>
          {status ? <span style={{ flex: '0 0 auto' }}>{status}</span> : null}
        </div>
        {track}
        {note ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{note}</span> : null}
        {children}
      </div>
    </div>
  );
}
