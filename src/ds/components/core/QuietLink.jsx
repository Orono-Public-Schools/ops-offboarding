import React from 'react';
import { Icon } from './Icon.jsx';

/* Minor navigation — the things that are doors to elsewhere rather than actions
   in their own right. No fill, no border: a navy rule wipes in from the left on
   hover, the same rule a field draws on focus. */

export function QuietLink({ icon, children, href, onClick, style, ...rest }) {
  const [hot, setHot] = React.useState(false);
  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      type={href ? undefined : 'button'}
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '3px 0', border: 'none', background: 'none', cursor: 'pointer',
        font: 'var(--type-strong)', textAlign: 'left', textDecoration: 'none',
        color: hot ? 'var(--primary)' : 'var(--dark)',
        transition: 'color var(--dur-fast) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {icon ? (
        <span style={{
          display: 'flex', color: hot ? 'var(--secondary)' : 'var(--text-placeholder)',
          transition: 'color var(--dur-fast) var(--ease)',
        }}><Icon name={icon} size={14} /></span>
      ) : null}
      {children}
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5,
        background: 'var(--gradient-primary)',
        transform: hot ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left',
        transition: 'transform var(--dur-slow) cubic-bezier(0.3, 1, 0.8, 1)',
      }} />
    </Tag>
  );
}
