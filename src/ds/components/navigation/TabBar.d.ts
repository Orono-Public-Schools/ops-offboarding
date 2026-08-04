import * as React from 'react';
import type { IconName } from '../core/Icon';

export interface TabEntry {
  id: string;
  label: string;
  icon?: IconName;
  count?: number;
}

/**
 * On-dark tab bar. The active tab carries the accent gradient and a glow —
 * the one place the accent appears outside a submit or destructive control.
 * @startingPoint section="Navigation" subtitle="On-dark tab bar" viewport="700x160"
 */
export interface TabBarProps extends React.HTMLAttributes<HTMLElement> {
  tabs?: TabEntry[];
  active?: string;
  onSelect?: (id: string) => void;
  /** "accent" (default) — red-gradient active, for the main nav only.
   *  "inverse" — white active pill with navy text, for secondary tab rows. */
  tone?: 'accent' | 'inverse';
}
export declare function TabBar(props: TabBarProps): JSX.Element;
