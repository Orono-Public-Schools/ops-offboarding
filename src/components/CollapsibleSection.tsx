import type { ReactNode } from 'react';

type Props = {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({ label, defaultOpen = false, children }: Props) {
  return (
    <details open={defaultOpen} className="group mb-3">
      <summary
        className="flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold tracking-wider text-white uppercase transition [&::-webkit-details-marker]:hidden"
        style={{ background: '#1d2a5d' }}
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
