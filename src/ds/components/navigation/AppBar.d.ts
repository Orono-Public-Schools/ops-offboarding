import * as React from 'react';

/**
 * Thin on-dark bar: wordmark and the signed-in person. Set type, not a logo —
 * no district mark was supplied.
 * @startingPoint section="Navigation" subtitle="On-dark app bar" viewport="700x140"
 */
export interface AppBarProps extends React.HTMLAttributes<HTMLDivElement> {
  person?: { name: string; role: string };
  onSignOut?: () => void;
}
export declare function AppBar(props: AppBarProps): JSX.Element;
