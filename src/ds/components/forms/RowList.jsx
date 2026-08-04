import React from 'react';

/* Repeating rows inside a card: hairline dividers, py-3, no wrapper box per
   row. Use for line items, trip legs, checklist bodies, detail pairs. */

export function RowList({ children, style, ...rest }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <div style={style} {...rest}>
      {items.map((child, i) => (
        <div key={i} style={{
          padding: i === 0 ? '0 0 12px' : i === items.length - 1 ? '12px 0 0' : '12px 0',
          borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
        }}>
          {child}
        </div>
      ))}
    </div>
  );
}

/* One label / value pair, the most common row shape. */
export function DetailRow({ label, value, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <span style={{
        font: 'var(--type-field-label)', letterSpacing: 'var(--tracking-wider)',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</span>
      <span style={{ font: 'var(--type-body)', color: 'var(--dark)', fontWeight: 500, textAlign: 'right' }}>{right || value}</span>
    </div>
  );
}
