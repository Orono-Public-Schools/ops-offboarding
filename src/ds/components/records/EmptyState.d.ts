import * as React from 'react';
import type { IconName } from '../core/Icon';

/**
 * Empty list or cleared inbox. Empty states are one of the few things allowed
 * to sit directly on the gradient shell.
 * @startingPoint section="Surfaces" subtitle="Empty states, on dark and in card" viewport="700x280"
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: IconName;
  /** The headline. Plain and human, never "No data found". */
  line: string;
  note?: string;
  action?: React.ReactNode;
  /** Which surface it sits on. Default "dark". */
  on?: 'dark' | 'card';
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
