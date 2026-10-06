import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* Thin on-dark bar above the title: wordmark left, signed-in person right.

   The sign-out control rests as a 32px icon square and expands on hover to
   reveal its label, so the destructive-ish action names itself before you can
   click it. Widths animate on the system's 200ms easing; press nudges down 1px
   rather than diagonally, to match every other control. */

export function AppBar({ person, onSignOut, onPersonClick, style, ...rest }) {
  const [hot, setHot] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const [personHot, setPersonHot] = React.useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, ...style }} {...rest}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/OronoIcon.png" alt="" style={{ height: 26, width: 26 }} />
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: '700 17px/1 var(--font-sans)', letterSpacing: '-0.01em', color: '#fff' }}>
            Orono<span style={{ color: '#e98b8b' }}>HR</span>
          </span>
          <span style={{ font: 'var(--type-caption)', color: 'var(--on-dark-faint)' }}>Independent District 278</span>
        </span>
      </span>
      {person ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* With onPersonClick the name block doubles as the account link —
              same quiet affordance pattern as the sign-out reveal. */}
          <span
            role={onPersonClick ? 'button' : undefined}
            tabIndex={onPersonClick ? 0 : undefined}
            aria-label={onPersonClick ? 'Your account' : undefined}
            onClick={onPersonClick}
            onKeyDown={onPersonClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onPersonClick(); } : undefined}
            onMouseEnter={onPersonClick ? () => setPersonHot(true) : undefined}
            onMouseLeave={onPersonClick ? () => setPersonHot(false) : undefined}
            style={{
              textAlign: 'right', display: 'flex', flexDirection: 'column',
              cursor: onPersonClick ? 'pointer' : 'default',
              borderRadius: 'var(--radius-input)',
              padding: '3px 8px', margin: '-3px -8px',
              background: personHot ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'background var(--dur-fast) var(--ease)',
            }}
          >
            <span style={{ font: 'var(--type-caption)', fontWeight: 600, color: '#fff' }}>{person.name}</span>
            <span style={{ font: 'var(--type-caption)', fontSize: 11, color: 'var(--on-dark-faint)' }}>{person.role}</span>
          </span>
          <button
            type="button" onClick={onSignOut}
            onMouseEnter={() => setHot(true)}
            onMouseLeave={() => { setHot(false); setDown(false); }}
            onMouseDown={() => setDown(true)}
            onMouseUp={() => setDown(false)}
            aria-label="Sign out"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
              width: hot ? 108 : 32, height: 32, overflow: 'hidden',
              padding: 0, borderRadius: 'var(--radius-input)', cursor: 'pointer',
              /* Orono red: a 55% red fill at rest so it reads as red on the navy
                 shell without competing with the active tab, going to the full
                 accent gradient on hover. The glyph is lightened to #f6cdcd for
                 contrast against the deeper fill. */
              color: hot ? '#fff' : '#f6cdcd',
              background: hot ? 'var(--gradient-accent)' : 'rgba(var(--accent-rgb), 0.55)',
              border: `1px solid ${hot ? 'transparent' : 'rgba(var(--accent-rgb), 0.75)'}`,
              boxShadow: hot ? 'var(--shadow-accent)' : 'none',
              transform: down ? 'translateY(1px)' : 'none',
              transition: 'width var(--dur-fast) var(--ease), var(--transition-control)',
            }}
          >
            <span style={{
              flex: '0 0 auto', width: 30, display: 'grid', placeItems: 'center',
              transition: 'width var(--dur-fast) var(--ease)',
            }}>
              <Icon name="logOut" size={15} />
            </span>
            <span style={{
              font: 'var(--type-button)', fontSize: 13, whiteSpace: 'nowrap',
              opacity: hot ? 1 : 0,
              transition: 'opacity var(--dur-fast) var(--ease)',
            }}>Sign out</span>
          </button>
        </span>
      ) : null}
    </div>
  );
}
