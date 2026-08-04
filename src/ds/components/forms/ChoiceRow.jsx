import React from 'react';
import { CheckMark } from './CheckMark.jsx';

/* Radio, checkbox, or switch as a full-width row with a description.

   Selecting one settles it into place with a slight spring: the row grows a
   couple of pixels, takes the light tint and a secondary border, and the dot
   fires a single ring outward. Red stays out of it — selection is navy. */

const CHOICE_SPRING = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

export function ChoiceRow({
  type = 'radio', name, value, checked, onChange, title, description, meta, disabled, style, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const [ring, setRing] = React.useState(false);
  const was = React.useRef(!!checked);

  /* Fire the ring only on the transition into checked, never on mount. */
  React.useEffect(() => {
    if (checked && !was.current) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 30);
      return () => clearTimeout(t);
    }
    was.current = !!checked;
    return undefined;
  }, [checked]);
  React.useEffect(() => { was.current = !!checked; }, [checked]);

  const mark = () => {
    if (type === 'switch') {
      return (
        <span style={{
          width: 36, height: 20, flex: '0 0 auto', marginTop: 1,
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--gradient-primary)' : '#cbd5e1',
          position: 'relative', transition: `background var(--dur-fast) var(--ease)`,
        }}>
          <span style={{
            position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16,
            borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: `left var(--dur-fast) ${CHOICE_SPRING}`,
          }} />
        </span>
      );
    }
    /* Checkboxes flip; radios scale a dot. Different motion for different
       semantics — one of several, or one of many. */
    if (type === 'checkbox') {
      return (
        <span style={{ marginTop: 1, display: 'block' }}>
          <CheckMark checked={checked} hovered={hot} tone="secondary" />
        </span>
      );
    }
    return (
      <span style={{
        width: 18, height: 18, flex: '0 0 auto', marginTop: 1,
        borderRadius: '50%',
        background: checked ? 'var(--secondary)' : '#fff',
        border: `1px solid ${checked ? 'var(--secondary)' : 'var(--border-input)'}`,
        display: 'grid', placeItems: 'center',
        /* One ring outward as it takes the selection. */
        boxShadow: ring
          ? '0 0 0 0 rgba(var(--secondary-rgb), 0.45)'
          : '0 0 0 8px rgba(var(--secondary-rgb), 0)',
        transition: `background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), box-shadow ${ring ? '0ms' : '700ms'} var(--ease)`,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#fff',
          transform: checked ? 'scale(1)' : 'scale(0)',
          transition: `transform var(--dur-fast) ${CHOICE_SPRING}`,
        }} />
      </span>
    );
  };

  return (
    <label
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        /* The row gains 2px top and bottom when selected — it settles in place. */
        padding: checked ? '14px 14px' : '12px 14px',
        background: checked ? 'var(--tint)' : hot ? 'var(--surface-inset)' : 'transparent',
        border: `1px solid ${checked ? 'rgba(var(--secondary-rgb), 0.45)' : 'var(--border-input)'}`,
        borderRadius: 'var(--radius-input)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: `padding var(--dur-slow) ${CHOICE_SPRING}, background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)`,
        position: 'relative',
        ...style,
      }}
    >
      <input
        type={type === 'switch' ? 'checkbox' : type}
        name={name} value={value} checked={!!checked} onChange={onChange} disabled={disabled}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        {...rest}
      />
      {mark()}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{
          font: 'var(--type-strong)',
          color: checked ? 'var(--dark)' : 'var(--text-body)',
          transition: 'color var(--dur-fast) var(--ease)',
        }}>{title}</span>
        {description ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{description}</span> : null}
      </span>
      {meta ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 2 }}>{meta}</span> : null}
    </label>
  );
}
