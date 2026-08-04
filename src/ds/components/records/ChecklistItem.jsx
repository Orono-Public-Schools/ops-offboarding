import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { CheckMark } from '../forms/CheckMark.jsx';

/* One line of an offboarding or onboarding checklist. The box flips to an inked
   face when the task is done — the same mark a form checkbox uses — and a task
   waiting on someone else shows a clock on its front face. */

export function ChecklistItem({
  state = 'todo', title, description, owner, due, icon, onToggle, style, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const done = state === 'done';
  const waiting = state === 'waiting';

  return (
    <div
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{ display: 'flex', gap: 12, alignItems: 'flex-start', ...style }}
      {...rest}
    >
      <button
        type="button" onClick={onToggle} aria-pressed={done}
        aria-label={done ? `${title} — done` : title}
        style={{
          padding: 0, border: 'none', background: 'none', marginTop: 1,
          cursor: onToggle ? 'pointer' : 'default', display: 'block',
        }}
      >
        <CheckMark checked={done} waiting={waiting} hovered={hot && !!onToggle} size={20} radius={6} />
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{
          font: 'var(--type-strong)',
          color: done ? 'var(--text-muted)' : 'var(--dark)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--border-input)',
          transition: 'color var(--dur-slow) var(--ease)',
        }}>{title}</span>
        {description ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{description}</span> : null}
        {owner ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: 'var(--type-caption)', fontSize: 11.5, color: 'var(--secondary)', fontWeight: 500 }}>
            <Icon name={icon || 'clock'} size={12} />{owner}
          </span>
        ) : null}
      </div>

      {due ? (
        <span style={{
          flex: '0 0 auto', font: 'var(--type-caption)', whiteSpace: 'nowrap', marginTop: 2,
          color: done ? 'var(--text-placeholder)' : 'var(--text-muted)',
        }}>{due}</span>
      ) : null}
    </div>
  );
}
