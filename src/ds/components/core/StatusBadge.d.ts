import * as React from 'react';

export type RequestStatus = 'draft' | 'submitted' | 'processing' | 'completed' | 'denied' | 'paid';

/**
 * Pill status badge: brand-family text on the same color at 12% opacity.
 * The ramp darkens as a request advances (grey -> secondary -> primary ->
 * dark anchor), with red for denied and green only for terminal success.
 * @startingPoint section="Status" subtitle="Status badges" viewport="700x160"
 */
export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  state?: RequestStatus;
  /** Override the word. */
  label?: string;
  /** Show the leading glyph (default true). */
  icon?: boolean;
  size?: 'sm' | 'md';
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
