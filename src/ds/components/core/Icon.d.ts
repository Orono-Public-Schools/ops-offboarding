import * as React from 'react';

export type IconName =
  | 'send' | 'save' | 'check' | 'clock' | 'x' | 'arrowRight' | 'chevronDown'
  | 'chevronRight' | 'calendar' | 'home' | 'fileText' | 'inbox' | 'users'
  | 'logOut' | 'search' | 'download' | 'plus' | 'mail' | 'key' | 'laptop';

/**
 * Inline Lucide glyph, 14-20px, inheriting the current text color.
 * @startingPoint section="Foundations" subtitle="Icon set" viewport="700x200"
 */
export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}
export declare function Icon(props: IconProps): JSX.Element;
export declare const ICON_NAMES: string[];
