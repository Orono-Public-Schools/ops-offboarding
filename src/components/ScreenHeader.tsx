import { useState, type ReactNode } from 'react';
import { Icon } from '../ds/components/core/Icon';

/**
 * On-dark page header where the eyebrow IS the way back: a breadcrumb that
 * points left and returns to the module's index, replacing the boxy Back
 * button PageTitle screens carry in their actions slot.
 */
export function ScreenHeader({
  crumb,
  onBack,
  title,
  subtitle,
  note,
  actions,
}: {
  /** Uppercase breadcrumb label naming where back leads, e.g. "HR forms". */
  crumb: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
  /** Fainter one-liner under the subtitle (e.g. the draft-autosave note). */
  note?: string;
  actions?: ReactNode;
}) {
  const [hot, setHot] = useState(false);
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={onBack}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          alignSelf: 'flex-start',
          padding: '2px 0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          font: 'var(--type-field-label)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          color: hot ? 'var(--on-dark)' : 'var(--on-dark-faint)',
          transition: 'color 140ms',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'flex',
            // The kit has no arrowLeft — flip arrowRight; +X in the rotated
            // frame nudges the arrow leftward on hover.
            transform: hot ? 'rotate(180deg) translateX(3px)' : 'rotate(180deg)',
            transition: 'transform 180ms',
          }}
        >
          <Icon name="arrowRight" size={12} />
        </span>
        {crumb}
      </button>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            margin: 0,
            font: 'var(--type-page-title)',
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--on-dark)',
          }}
        >
          {title}
        </h1>
        {actions ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>
        ) : null}
      </div>
      {subtitle ? (
        <p
          style={{
            margin: 0,
            font: 'var(--type-page-sub)',
            color: 'var(--on-dark-muted)',
            maxWidth: '62ch',
          }}
        >
          {subtitle}
        </p>
      ) : null}
      {note ? (
        <p
          style={{
            margin: '2px 0 0',
            font: 'var(--type-caption)',
            color: 'var(--on-dark-faint)',
            maxWidth: '62ch',
          }}
        >
          {note}
        </p>
      ) : null}
    </header>
  );
}
