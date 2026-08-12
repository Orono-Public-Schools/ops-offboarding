import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* One submission in the HR inbox. Flex, not grid: person and request shrink,
   badge and age never do, so nothing can overlap at any width.

   `rail` (a CSS color) paints a status-colored edge on the left and, with
   `unread`, sits the row on a faint secondary tint — the design-review
   "Rail" treatment (2026-08-11). Without `rail` the row renders as before. */

export function InboxRow({
  person, request, kind, status, time, selected, unread, onClick, actions, rail,
  chevron = true, style, ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const unreadTint = rail && unread;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        position: rail ? 'relative' : undefined,
        display: 'flex', alignItems: 'center', gap: 14,
        padding: rail ? '12px 10px 12px 14px' : '12px 4px',
        background: selected
          ? 'var(--tint)'
          : hot
            ? unreadTint ? 'rgba(var(--secondary-rgb), 0.1)' : 'var(--surface-inset)'
            : unreadTint ? 'rgba(var(--secondary-rgb), 0.055)' : 'transparent',
        borderRadius: 'var(--radius-input)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color var(--dur-fast) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {rail ? (
        <span aria-hidden="true" style={{
          position: 'absolute', left: 0, top: 8, bottom: 8, width: 3.5,
          borderRadius: 'var(--radius-pill)', background: rail,
        }} />
      ) : null}
      {person ? <div style={{ flex: '1 1 96px', minWidth: 0, paddingLeft: 10 }}>{person}</div> : null}

      <div style={{ flex: '2 1 150px', minWidth: 0, paddingLeft: person ? 0 : 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          font: unread ? '600 14px/1.4 var(--font-sans)' : '400 14px/1.4 var(--font-sans)',
          color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{request}</span>
        {kind ? (
          <span style={{
            font: 'var(--type-caption)', fontSize: 11.5, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{kind}</span>
        ) : null}
      </div>

      <div style={{ flex: '0 0 auto' }}>{status}</div>

      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', paddingRight: 10 }}>
        {time ? (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-placeholder)', whiteSpace: 'nowrap' }}>{time}</span>
        ) : null}
        {actions ? <span style={{ opacity: hot || selected ? 1 : 0, transition: 'opacity var(--dur-fast) var(--ease)' }}>{actions}</span> : null}
        {onClick && !actions && chevron ? (
          <span style={{ color: 'var(--text-placeholder)', opacity: hot ? 1 : 0.5, transition: 'opacity var(--dur-fast) var(--ease)' }}>
            <Icon name="chevronRight" size={15} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
