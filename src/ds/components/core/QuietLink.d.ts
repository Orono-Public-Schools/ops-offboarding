import * as React from 'react';
import type { IconName } from './Icon';

/**
 * Minor navigation: no fill, no border, a navy rule wiping in from the left on
 * hover. For things that are doors to elsewhere — paystubs, the full form index,
 * contacting HR — so they never compete with the module tiles that are the real
 * actions on a screen.
 * @startingPoint section="Controls" subtitle="Quiet ruled links" viewport="700x200"
 */
export interface QuietLinkProps extends React.HTMLAttributes<HTMLElement> {
  icon?: IconName;
  /** Renders an <a>; omit for a <button>. */
  href?: string;
}
export declare function QuietLink(props: QuietLinkProps): JSX.Element;
