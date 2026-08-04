import type { ReactNode } from 'react';
import { Button } from '../ds/components/core/Button';

/** White floating card — the only content surface for task steps. */
export function StepCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-4 sm:p-5"
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  );
}

export function StepHeader({
  step,
  title,
  description,
  status,
  action,
}: {
  step?: string;
  title: string;
  description?: string;
  status?: { label: string; tone?: 'pending' | 'done' };
  action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  const done = status?.tone === 'done';
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {step && (
          <p
            className="uppercase"
            style={{
              font: 'var(--type-card-eyebrow)',
              letterSpacing: 'var(--tracking-widest)',
              color: 'var(--text-muted)',
            }}
          >
            {step}
          </p>
        )}
        <h2 className="mt-1" style={{ font: 'var(--type-card-title)', color: 'var(--dark)' }}>
          {title}
        </h2>
        {description && (
          <p
            className="mt-1 leading-relaxed"
            style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}
          >
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {status && (
          <span
            className="rounded-full px-2.5 py-1 whitespace-nowrap"
            style={{
              font: 'var(--type-badge)',
              color: done ? 'var(--dark)' : 'var(--secondary)',
              background: done ? 'rgba(var(--dark-rgb), 0.12)' : 'rgba(var(--secondary-rgb), 0.12)',
            }}
          >
            {status.label}
          </span>
        )}
        {action && (
          <Button variant="secondary" size="sm" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function StepLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="mb-1 block uppercase"
      style={{
        font: 'var(--type-field-label)',
        letterSpacing: 'var(--tracking-wider)',
        color: 'var(--text-muted)',
      }}
    >
      {children}
    </label>
  );
}

export function StepInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> & {
    style?: React.CSSProperties;
  },
) {
  const { className = '', style, onFocus, onBlur, ...rest } = props;
  return (
    <input
      {...rest}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.boxShadow = 'var(--ring-focus)';
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-input)';
        e.currentTarget.style.boxShadow = 'none';
        onBlur?.(e);
      }}
      className={`w-full px-3 py-2 text-sm transition outline-none ${className}`}
      style={{
        background: rest.disabled ? 'var(--surface-inset)' : 'var(--surface-card)',
        border: '1px solid var(--border-input)',
        borderRadius: 'var(--radius-input)',
        color: 'var(--dark)',
        ...style,
      }}
    />
  );
}

export function StepTextarea(
  props: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & {
    style?: React.CSSProperties;
  },
) {
  const { className = '', style, onFocus, onBlur, ...rest } = props;
  return (
    <textarea
      {...rest}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.boxShadow = 'var(--ring-focus)';
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-input)';
        e.currentTarget.style.boxShadow = 'none';
        onBlur?.(e);
      }}
      className={`w-full resize-none px-3 py-2 text-sm transition outline-none ${className}`}
      style={{
        background: rest.disabled ? 'var(--surface-inset)' : 'var(--surface-card)',
        border: '1px solid var(--border-input)',
        borderRadius: 'var(--radius-input)',
        color: 'var(--dark)',
        ...style,
      }}
    />
  );
}

/** Primary action on a step card — passthrough to the ds primary button. */
export function StepPrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button variant="primary" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

/** Quieter outline button for secondary actions — ds secondary formula. */
export function StepOutlineButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

export function StepError({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-3 px-3 py-2"
      style={{
        font: 'var(--type-caption)',
        color: 'var(--accent)',
        background: 'rgba(var(--accent-rgb), 0.08)',
        borderRadius: 8,
      }}
    >
      {children}
    </p>
  );
}

export function InsetPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-3 ${className}`}
      style={{ background: 'var(--surface-inset)', borderRadius: 8 }}
    >
      {children}
    </div>
  );
}
