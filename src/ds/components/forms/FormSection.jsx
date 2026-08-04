import React from 'react';
import { Card } from '../core/Card.jsx';

/* A form step = one card. The step number is a small tinted counter beside
   the uppercase heading. */

export function FormSection({ eyebrow, step, title, description, children, aside, style, ...rest }) {
  return (
    <Card
      style={style}
      eyebrow={eyebrow}
      heading={title}
      headingRight={aside}
      bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      {...rest}
    >
      {description ? (
        <p style={{ margin: '-4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{description}</p>
      ) : null}
      {children}
      {step != null ? (
        <span style={{
          position: 'absolute', top: 18, left: -10, width: 22, height: 22,
          borderRadius: 'var(--radius-pill)', background: 'var(--gradient-primary)',
          color: '#fff', font: '600 11px/22px var(--font-sans)', textAlign: 'center',
          boxShadow: 'var(--shadow-primary)', display: 'none',
        }}>{step}</span>
      ) : null}
    </Card>
  );
}
