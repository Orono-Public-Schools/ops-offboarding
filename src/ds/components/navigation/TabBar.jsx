import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* On-dark tab bar. The active tab takes the accent gradient and a colored glow.
   Both states use the same skewed-wipe language as filled buttons: the active
   tab's red panel slides off to reveal a brighter gradient, and an inactive
   tab's translucent panel sweeps in from the left.

   tone="inverse" keeps the structure and motion but reverses the active
   colors — a white pill with navy text — for secondary tab rows (like the
   admin sections) so the red "you are here" stays unique to the main nav. */

export function TabBar({ tabs = [], active, onSelect, tone = 'accent', style, ...rest }) {
  return (
    <nav
      style={{
        display: 'flex', gap: 6, flexWrap: 'wrap',
        padding: 6, borderRadius: 'var(--radius-card)',
        background: 'var(--on-dark-fill)',
        border: '1px solid var(--on-dark-border)',
        ...style,
      }}
      {...rest}
    >
      {tabs.map((t) => (
        <Tab key={t.id} tab={t} on={t.id === active} onSelect={onSelect} tone={tone} />
      ))}
    </nav>
  );
}

function Tab({ tab, on, onSelect, tone }) {
  const [hot, setHot] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const inverse = tone === 'inverse';

  const activeText = inverse ? 'var(--dark)' : '#fff';
  /* Active: the brighter layer the wipe reveals. Inverse trades the red
     gradient for plain white and a tint panel. */
  const activeBg = inverse ? '#ffffff' : 'linear-gradient(100deg, #c3282a 0%, #dc4a44 100%)';
  const activeWipe = inverse ? 'var(--tint)' : 'var(--gradient-accent)';
  const activeShadow = inverse ? '0 2px 10px rgba(0, 0, 0, 0.25)' : 'var(--shadow-accent-glow)';

  return (
    <button
      type="button"
      onClick={() => onSelect && onSelect(tab.id)}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => { setHot(false); setDown(false); }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', border: 'none', cursor: 'pointer',
        borderRadius: 'var(--radius-input)',
        font: 'var(--type-button)',
        color: on ? activeText : hot ? '#fff' : 'var(--on-dark-faint)',
        background: on ? activeBg : 'transparent',
        boxShadow: on ? activeShadow : 'none',
        transform: down ? 'scale(0.98)' : 'none',
        transition: 'var(--transition-control)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
          background: on ? activeWipe : 'var(--on-dark-hover)',
          /* Active tab wipes OFF to the right; inactive sweeps IN from the left. */
          transform: on
            ? (hot ? 'translate3d(100%, 0, 0) skewX(22deg)' : 'skewX(22deg)')
            : (hot ? 'skewX(22deg)' : 'translate3d(-100%, 0, 0) skewX(22deg)'),
          transition: 'transform var(--dur-slow) cubic-bezier(0.3, 1, 0.8, 1)',
        }}
      />

      {tab.icon ? <span style={{ position: 'relative', zIndex: 1, display: 'block' }}><Icon name={tab.icon} size={15} /></span> : null}
      <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
      {tab.count != null ? (
        <span style={{
          position: 'relative', zIndex: 1,
          font: 'var(--type-badge)', fontSize: 11, padding: '1px 6px',
          borderRadius: 'var(--radius-pill)',
          background: on
            ? (inverse ? 'rgba(var(--dark-rgb), 0.12)' : 'rgba(255,255,255,0.22)')
            : 'var(--on-dark-hover)',
          color: on ? activeText : hot ? '#fff' : 'var(--on-dark-muted)',
          transition: 'var(--transition-control)',
        }}>{tab.count}</span>
      ) : null}
    </button>
  );
}
