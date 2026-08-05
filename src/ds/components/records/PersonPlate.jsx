import React from 'react';

/* People are a rounded photo slot plus name and role. When there is no photo
   the slot is a soft tinted panel with a diagonal hatch — never initials. */

const HATCH = 'repeating-linear-gradient(135deg, rgba(var(--secondary-rgb), 0.16) 0 1px, rgba(var(--secondary-rgb), 0.04) 1px 5px)';

export function PersonPlate({ name, role, meta, photo, size = 'md', photoSlot = true, style, ...rest }) {
  const z = size === 'sm' ? { px: 32, name: 13 } : size === 'lg' ? { px: 48, name: 16 } : { px: 38, name: 14 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, ...style }} {...rest}>
      {photoSlot || photo ? (
        <span
          aria-hidden="true"
          title={photo ? undefined : 'Staff photo'}
          style={{
            width: z.px, height: z.px, flex: '0 0 auto',
            borderRadius: 'var(--radius-input)',
            background: photo ? `center/cover no-repeat url(${photo})` : HATCH,
            border: '1px solid var(--border-input)',
          }}
        />
      ) : null}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{
          font: `600 ${z.name}px/1.35 var(--font-sans)`, color: 'var(--dark)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{name}</span>
        {role || meta ? (
          <span style={{
            font: 'var(--type-caption)', fontSize: 11.5, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{[role, meta].filter(Boolean).join(' · ')}</span>
        ) : null}
      </span>
    </div>
  );
}
