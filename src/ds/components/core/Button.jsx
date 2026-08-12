import React from 'react';
import { Icon } from './Icon.jsx';

/* primary  — brand gradient, for approve/continue
   submit   — action red, ONE per screen, animated icon on hover
   secondary/destructive — outline formula: color text, 10% bg, 30% border
   ghost    — text only, for cancel

   Filled variants carry a skewed wipe: a deeper panel covers the gradient at
   rest and slides off to the right on hover, so the brighter gradient is
   revealed rather than the button simply changing color. */

function outline(rgb, color) {
  return {
    color,
    background: `rgba(${rgb}, 0.1)`,
    border: `1px solid rgba(${rgb}, 0.3)`,
    hover: { background: `rgba(${rgb}, 0.16)`, borderColor: `rgba(${rgb}, 0.45)` },
  };
}

const BUTTON_VARIANTS = {
  /* background = what the wipe reveals; wipe = the resting face, so a button at
     rest is exactly the brief's gradient (primary) or solid red (submit). */
  primary: {
    color: '#fff', background: 'linear-gradient(100deg, #35479c 0%, #4a5cbd 100%)',
    border: '1px solid transparent', shadow: 'var(--shadow-primary)',
    wipe: 'var(--gradient-primary)', hover: {},
  },
  submit: {
    color: '#fff', background: 'linear-gradient(100deg, #c3282a 0%, #dc4a44 100%)',
    border: '1px solid transparent', shadow: 'var(--shadow-accent)',
    wipe: 'var(--accent)', hover: {},
  },
  secondary: { ...outline('var(--secondary-rgb)', 'var(--secondary)'), shadow: 'none' },
  destructive: { ...outline('var(--accent-rgb)', 'var(--accent)'), shadow: 'none' },
  ghost: {
    color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent',
    shadow: 'none', hover: { background: 'rgba(100, 116, 139, 0.08)', color: 'var(--text-body)' },
  },
  /* Quiet button for the navy shell — ghost reads invisible there. White
     hairline so it still has a button's silhouette (PaperPal's btn-cancel). */
  inverse: {
    color: 'rgba(255, 255, 255, 0.75)', background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.28)', shadow: 'none',
    hover: {
      background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.45)',
    },
  },
};

const BUTTON_SIZES = {
  sm: { height: 32, padding: '0 12px', fontSize: 13 },
  md: { height: 40, padding: '0 16px', fontSize: 14 },
  lg: { height: 46, padding: '0 22px', fontSize: 15 },
};

export function Button({
  variant = 'primary', size = 'md', icon, iconRight, children, disabled, full, style, ...rest
}) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const z = BUTTON_SIZES[size] || BUTTON_SIZES.md;
  const [hot, setHot] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const live = hot && !disabled;

  /* Playful icon motion on the one committing action. */
  const playful = variant === 'submit' && live;
  const iconShift = playful ? (icon === 'send' ? 'translate(3px, -3px)' : 'translateX(3px)') : 'none';

  return (
    <button
      type={rest.type || 'button'}
      disabled={disabled}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => { setHot(false); setDown(false); }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: full ? '100%' : undefined,
        height: z.height, padding: z.padding,
        font: 'var(--type-button)', fontSize: z.fontSize,
        borderRadius: 'var(--radius-button)',
        color: v.color, background: v.background, border: v.border,
        boxShadow: v.shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: down && !disabled ? 'scale(0.98)' : live ? 'translateY(-1px)' : 'none',
        transition: 'var(--transition-control)',
        ...(live ? v.hover : null),
        ...style,
      }}
      {...rest}
    >
      {v.wipe ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
            background: v.wipe,
            transform: live ? 'translate3d(100%, 0, 0) skewX(22deg)' : 'skewX(22deg)',
            transition: 'transform var(--dur-slow) cubic-bezier(0.3, 1, 0.8, 1)',
          }}
        />
      ) : null}

      {icon ? (
        <span style={{ position: 'relative', zIndex: 1, display: 'block', transform: iconShift, transition: 'transform var(--dur-slow) var(--ease)' }}>
          <Icon name={icon} size={z.fontSize + 2} />
        </span>
      ) : null}

      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>

      {iconRight ? (
        <span style={{ position: 'relative', zIndex: 1, display: 'block', transform: live ? 'translateX(3px)' : 'none', transition: 'transform var(--dur-slow) var(--ease)' }}>
          <Icon name={iconRight} size={z.fontSize + 2} />
        </span>
      ) : null}
    </button>
  );
}
