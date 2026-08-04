import * as React from 'react';

/**
 * The system's checkbox mark: the box flips on its Y axis to an inked face with
 * the check already drawn, so ticking something is a physical turn rather than a
 * fade. Shared by ChoiceRow and ChecklistItem.
 * @startingPoint section="Forms" subtitle="Flip checkbox mark" viewport="700x160"
 */
export interface CheckMarkProps {
  checked?: boolean;
  size?: number;
  radius?: number;
  /** Shows a clock on the front face — the task is in someone else's hands. */
  waiting?: boolean;
  /** Warms the resting border, for when the parent row is hovered. */
  hovered?: boolean;
  tone?: 'primary' | 'secondary';
}
export declare function CheckMark(props: CheckMarkProps): JSX.Element;
