import * as React from 'react';
import type { IconName } from '../core/Icon';

/**
 * One line of an offboarding or onboarding checklist. The box is empty for
 * to-do, a tinted clock when it is out of the person's hands, and a gradient
 * check when done.
 * @startingPoint section="Lists" subtitle="Checklist rows" viewport="700x260"
 */
export interface ChecklistItemProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: 'todo' | 'waiting' | 'done';
  title: string;
  description?: string;
  /** Who currently holds it, e.g. "With Facilities". */
  owner?: string;
  due?: string;
  /** Glyph beside the owner line. */
  icon?: IconName;
  onToggle?: () => void;
}
export declare function ChecklistItem(props: ChecklistItemProps): JSX.Element;
