import * as React from 'react';

/**
 * Segmented progress track: one segment per step, filled with the primary
 * gradient, unfilled in the light tint.
 * @startingPoint section="Status" subtitle="Segmented progress" viewport="700x180"
 */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  total?: number;
  done?: number;
  /** Replaces "3 of 6 complete". */
  label?: string;
  showCount?: boolean;
  height?: number;
}
export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
