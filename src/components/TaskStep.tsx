import type { ReactNode } from 'react';

const NAVY_GRADIENT = 'linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)';
const NAVY_GLOW = '0 2px 12px rgba(29,42,93,0.3)';

export function StepCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{ background: NAVY_GRADIENT, boxShadow: NAVY_GLOW }}
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
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {step && (
          <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">{step}</p>
        )}
        <h2 className="mt-0.5 text-base font-semibold text-white sm:text-lg">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-white/75">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {status && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{
              background:
                status.tone === 'done' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)',
              color: '#ffffff',
            }}
          >
            {status.label}
          </span>
        )}
        {action && (
          <button
            onClick={action.onClick}
            disabled={action.disabled}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.4)' }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export function StepLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold tracking-wider text-white/60 uppercase">
      {children}
    </label>
  );
}

export function StepInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> & {
    style?: React.CSSProperties;
  },
) {
  const { className = '', style, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-lg px-3 py-2 text-sm transition outline-none ${className}`}
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#1d2a5d',
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
  const { className = '', style, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full resize-none rounded-lg px-3 py-2 text-sm transition outline-none ${className}`}
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#1d2a5d',
        ...style,
      }}
    />
  );
}

/**
 * Primary action button styled in Orono red — designed to stand out against the
 * navy gradient StepCard backgrounds.
 */
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
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
      style={{
        background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
        boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Quieter outline button for secondary actions on a navy gradient surface
 * (e.g. external links, "edit", etc.).
 */
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
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
      style={{ borderColor: 'rgba(255,255,255,0.4)' }}
    >
      {children}
    </button>
  );
}

export function StepError({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-3 rounded-lg px-3 py-2 text-xs"
      style={{ background: 'rgba(255,255,255,0.12)', color: '#fecaca' }}
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
    <div className={`rounded-lg p-3 ${className}`} style={{ background: 'rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  );
}
