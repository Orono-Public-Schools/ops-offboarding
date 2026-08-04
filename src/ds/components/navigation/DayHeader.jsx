import React from 'react';

/* The portal's opening block. No greeting: a tear-off desk calendar, the state
   of the person's record as the actual headline, and the school year as a rail
   with today marked. The day count is the one number everyone in a district
   feels, so it earns the space. */

export function DayHeader({
  weekday, day, month, title, subtitle, actions,
  railPct, railLeft, railRight, style, ...rest
}) {
  const pct = railPct == null ? null : Math.max(0, Math.min(100, railPct));

  return (
    <header style={{ display: 'flex', gap: 20, alignItems: 'flex-start', ...style }} {...rest}>
      {day != null ? (
        <div style={{
          flex: '0 0 auto', width: 72, borderRadius: 10, overflow: 'hidden', textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--on-dark-border)',
        }}>
          {/* Navy, not accent — a weekday label is not an action. */}
          <div style={{
            background: 'var(--gradient-primary)', color: '#fff',
            font: 'var(--type-micro)', letterSpacing: '0.16em', textTransform: 'uppercase',
            padding: '6px 0',
          }}>{weekday}</div>
          <div style={{ font: 'var(--type-page-title)', color: '#fff', letterSpacing: '-0.02em', padding: '9px 0 3px' }}>{day}</div>
          <div style={{
            font: 'var(--type-micro)', letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--on-dark-faint)', padding: '0 0 9px',
          }}>{month}</div>
        </div>
      ) : null}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <h1 style={{
            margin: 0, font: 'var(--type-page-title)', letterSpacing: 'var(--tracking-tight)',
            color: 'var(--on-dark)', maxWidth: '30ch',
          }}>{title}</h1>
          {actions ? <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div> : null}
        </div>

        {subtitle ? (
          <p style={{ margin: '8px 0 0', font: 'var(--type-page-sub)', color: 'var(--on-dark-muted)', maxWidth: '62ch' }}>{subtitle}</p>
        ) : null}

        {pct != null ? (
          <div style={{ marginTop: 18, maxWidth: 460 }}>
            <div style={{ position: 'relative', height: 3, borderRadius: 2, background: 'rgba(255, 255, 255, 0.14)' }}>
              <span style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, borderRadius: 2,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.35), #fff)',
              }} />
              {/* Today: a "you are here" mark, the one sanctioned decorative red. */}
              <span style={{
                position: 'absolute', top: -3, left: `${pct}%`, transform: 'translateX(-50%)',
                width: 9, height: 9, borderRadius: 999,
                background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(var(--accent-rgb), 0.35)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ font: 'var(--type-caption)', fontSize: 11, color: 'var(--on-dark-faint)' }}>{railLeft}</span>
              {railRight ? (
                <span style={{ font: 'var(--type-caption)', fontSize: 11, color: 'var(--on-dark-faint)' }}>{railRight}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
