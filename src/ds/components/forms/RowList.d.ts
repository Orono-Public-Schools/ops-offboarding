import * as React from 'react';

/**
 * Repeating rows separated by hairline dividers — no gray box per row.
 * @startingPoint section="Forms" subtitle="Divided row lists and detail pairs" viewport="700x260"
 */
export interface RowListProps extends React.HTMLAttributes<HTMLDivElement> {}
export declare function RowList(props: RowListProps): JSX.Element;

export interface DetailRowProps {
  /** Uppercase letterspaced key. */
  label: string;
  value?: React.ReactNode;
  /** Right-hand content when it isn't plain text (a badge, a link). */
  right?: React.ReactNode;
}
export declare function DetailRow(props: DetailRowProps): JSX.Element;
