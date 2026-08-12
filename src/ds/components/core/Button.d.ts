import * as React from 'react';
import type { IconName } from './Icon';

/**
 * primary = brand gradient (approve/continue) · submit = action red, one per
 * screen, with playful icon motion on hover · secondary and destructive = the
 * outline formula (color text, 10% bg, 30% border) · ghost = cancel.
 *
 * Filled variants carry a skewed wipe: a deeper panel covers the gradient at
 * rest and slides off to the right on hover, revealing the brighter gradient.
 * @startingPoint section="Controls" subtitle="Button variants and sizes" viewport="700x220"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'submit' | 'secondary' | 'destructive' | 'ghost' | 'inverse';
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon name. On submit buttons it animates on hover. */
  icon?: IconName;
  iconRight?: IconName;
  full?: boolean;
}
export declare function Button(props: ButtonProps): JSX.Element;
