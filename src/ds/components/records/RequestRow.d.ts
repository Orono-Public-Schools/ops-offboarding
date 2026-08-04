import * as React from 'react';

/**
 * A person's own open request, on the portal home card: title, case line,
 * status badge, and a StatusTrack. Hovering rises off the page onto white with
 * a shadow and a tinted border — the same treatment as a progress module card.
 * @startingPoint section="Lists" subtitle="Open request rows with stage track" viewport="700x260"
 */
export interface RequestRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  /** Form and case number, plus how long ago it was filed. */
  kind?: string;
  /** A <StatusBadge />. */
  status?: React.ReactNode;
  /** A <StatusTrack />. */
  track?: React.ReactNode;
  /** Optional caption under the track, e.g. "With benefits since Friday". */
  note?: string;
}
export declare function RequestRow(props: RequestRowProps): JSX.Element;
