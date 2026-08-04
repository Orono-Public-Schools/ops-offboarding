import * as React from 'react';
import type { IconName } from '../core/Icon';

/**
 * Portal-home tile for one thing a person can do. Hovering floods the card
 * from the corner in navy and inverts the text; a corner arrow tab marks it as
 * clickable at rest. Optional segmented progress for checklist-style modules.
 * @startingPoint section="Surfaces" subtitle="Module cards, with and without progress" viewport="700x300"
 */
export interface ModuleCardProps extends React.HTMLAttributes<HTMLElement> {
  icon?: IconName;
  title: string;
  description?: string;
  /** Bottom-right caption, e.g. "4 min". */
  meta?: string;
  /** Pass both to show progress. */
  total?: number;
  done?: number;
  /** Dims the card for unavailable modules (closed enrollment, etc). */
  disabled?: boolean;
  /** "flood" (default) floods navy from the corner; "lift" rises off the page.
   *  Cards passing `total` always use lift — a flood would swallow the track. */
  hover?: 'flood' | 'lift';
  footer?: React.ReactNode;
}
export declare function ModuleCard(props: ModuleCardProps): JSX.Element;
