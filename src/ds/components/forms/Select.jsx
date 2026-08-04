import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* Custom select. The closed control is a ruled field like every other input;
   opening drops a white panel on the card shadow, options sweep a tint in from
   the left on hover, and the chosen one carries a check. Keyboard: up/down to
   move, enter or space to take it, escape to close. */

const SELECT_SPRING = 'cubic-bezier(0.2, 0.9, 0.3, 1.2)';

function normalize(options) {
  return (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export function Select({
  options = [], value, defaultValue, onChange, placeholder = 'Choose one',
  icon, id, name, disabled, invalid, style, ...rest
}) {
  const items = normalize(options);
  const [open, setOpen] = React.useState(false);
  const [inner, setInner] = React.useState(defaultValue != null ? defaultValue : '');
  const current = value != null ? value : inner;
  const selectedIndex = items.findIndex((o) => o.value === current);
  const [active, setActive] = React.useState(selectedIndex < 0 ? 0 : selectedIndex);
  const [hoverIndex, setHoverIndex] = React.useState(-1);
  const root = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const pick = (o) => {
    if (value == null) setInner(o.value);
    setOpen(false);
    if (onChange) onChange({ target: { name, value: o.value } });
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault(); setOpen(true); setActive(selectedIndex < 0 ? 0 : selectedIndex); return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (items[active]) pick(items[active]); }
  };

  const label = selectedIndex >= 0 ? items[selectedIndex].label : placeholder;

  return (
    <div ref={root} style={{ position: 'relative', ...style }}>
      <button
        type="button" id={id} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative', width: '100%',
          display: 'flex', alignItems: 'center', gap: 8,
          height: 38, padding: '0 2px',
          background: 'transparent', border: 'none',
          borderBottom: `1px solid ${invalid ? 'var(--accent)' : 'var(--border-input)'}`,
          font: 'var(--type-body)', textAlign: 'left',
          color: selectedIndex >= 0 ? 'var(--dark)' : 'var(--text-placeholder)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
        {...rest}
      >
        {/* Same focus rule as a text field — it wipes in when the panel opens. */}
        <span aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
          background: invalid ? 'var(--gradient-accent)' : 'var(--gradient-primary)',
          transform: open ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left',
          transition: 'transform var(--dur-slow) cubic-bezier(0.3, 1, 0.8, 1)',
        }} />
        {icon ? <span style={{ color: open ? 'var(--primary)' : 'var(--text-placeholder)', display: 'flex' }}><Icon name={icon} size={15} /></span> : null}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{
          color: 'var(--text-muted)', display: 'flex',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: `transform var(--dur-fast) ${SELECT_SPRING}`,
        }}><Icon name="chevronDown" size={15} /></span>
      </button>

      <div
        role="listbox"
        style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: -8, right: -8, zIndex: 30,
          background: 'var(--surface-card)', borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card-hover)', padding: 6,
          maxHeight: 248, overflowY: 'auto',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.98)',
          transformOrigin: 'top center',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity var(--dur-fast) var(--ease), transform var(--dur-fast) ${SELECT_SPRING}`,
        }}
      >
        {items.map((o, i) => {
          const on = o.value === current;
          const lit = i === (hoverIndex >= 0 ? hoverIndex : active);
          return (
            <div
              key={o.value}
              role="option" aria-selected={on}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(-1)}
              onClick={() => pick(o)}
              style={{
                position: 'relative', overflow: 'hidden', isolation: 'isolate',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-input)',
                cursor: 'pointer',
                font: on ? 'var(--type-strong)' : 'var(--type-body)',
                color: on ? 'var(--dark)' : 'var(--text-body)',
              }}
            >
              <span aria-hidden="true" style={{
                position: 'absolute', top: 0, left: '-6%', width: '112%', height: '100%', zIndex: -1,
                background: on ? 'var(--tint)' : 'var(--surface-inset)',
                transform: lit || on ? 'skewX(14deg)' : 'translate3d(-102%, 0, 0) skewX(14deg)',
                transition: 'transform var(--dur-slow) cubic-bezier(0.3, 1, 0.8, 1)',
              }} />
              <span style={{
                width: 16, height: 16, flex: '0 0 auto', display: 'grid', placeItems: 'center',
                color: 'var(--secondary)',
                opacity: on ? 1 : 0,
                transform: on ? 'scale(1)' : 'scale(0.4)',
                transition: `opacity var(--dur-fast) var(--ease), transform var(--dur-fast) ${SELECT_SPRING}`,
              }}><Icon name="check" size={14} strokeWidth={2.75} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>{o.label}</span>
            </div>
          );
        })}
      </div>

      <input type="hidden" name={name} value={current} />
    </div>
  );
}
