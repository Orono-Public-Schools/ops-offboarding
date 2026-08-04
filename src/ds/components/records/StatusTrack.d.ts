import * as React from 'react';

/**
 * Named stages of a request — Filed, Received, With benefits, Complete — so a
 * person can see where theirs sits without emailing HR. Stages behind the
 * current one are navy; the current node is inked and ringed.
 * @startingPoint section="Status" subtitle="Request stage tracker" viewport="700x200"
 */
export interface StatusTrackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stage names, 3–5 of them. Sentence case, named for what happens. */
  stages?: string[];
  /** Zero-based index of the stage the request is on now. */
  current?: number;
  /** "accent" (default) inks the current stage red — the one place red marks
   *  state rather than an action. "primary" keeps it navy. */
  tone?: 'accent' | 'primary';
  /** Render for a navy ground: the ramp flips to white and the current node
   *  brightens to #ff8a80. RequestRow sets this while its flood is up. */
  invert?: boolean;
}
export declare function StatusTrack(props: StatusTrackProps): JSX.Element;
