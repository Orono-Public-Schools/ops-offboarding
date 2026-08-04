import type { ReactNode } from 'react';

type Props = {
  label: string;
  defaultOpen?: boolean;
  /** Which surface the disclosure sits on. Default "dark" (the gradient shell). */
  on?: 'dark' | 'card';
  children: ReactNode;
};

/** Quiet disclosure: an uppercase eyebrow over a hairline, chevron rotating
 *  open — no filled bar competing with the cards around it. */
export function CollapsibleSection({ label, defaultOpen = false, on = 'dark', children }: Props) {
  const dark = on === 'dark';
  return (
    <details open={defaultOpen} className="group mb-3">
      <summary
        className="flex cursor-pointer list-none items-center justify-between py-2 transition [&::-webkit-details-marker]:hidden"
        style={{
          font: 'var(--type-card-eyebrow)',
          letterSpacing: 'var(--tracking-widest)',
          textTransform: 'uppercase',
          color: dark ? 'var(--on-dark-faint)' : 'var(--text-muted)',
          borderBottom: `1px solid ${dark ? 'var(--on-dark-border)' : 'var(--border-input)'}`,
        }}
      >
        <span>{label}</span>
        <span className="text-[10px] transition-transform duration-200 group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
