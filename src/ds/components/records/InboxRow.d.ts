import * as React from 'react';

/**
 * One submission in the HR inbox: person, request, status badge, age.
 * Rows sit inside a single card, divided by hairlines via RowList.
 * @startingPoint section="Lists" subtitle="HR inbox rows" viewport="700x280"
 */
export interface InboxRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A <PersonPlate size="sm" />. */
  person?: React.ReactNode;
  request: string;
  /** Secondary line: form and case number. */
  kind?: string;
  /** A <StatusBadge />. */
  status?: React.ReactNode;
  time?: string;
  selected?: boolean;
  unread?: boolean;
  /** Hover-revealed actions; replaces the chevron. */
  actions?: React.ReactNode;
}
export declare function InboxRow(props: InboxRowProps): JSX.Element;
