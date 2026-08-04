import * as React from 'react';
import type { IconName } from '../core/Icon';

/**
 * Custom select. Closed, it is a ruled field like any input; open, it drops a
 * white panel on the card shadow with the chosen row checked and hovered rows
 * sweeping a tint in from the left. Keyboard: up/down, enter/space, escape.
 * @startingPoint section="Forms" subtitle="Select, closed and open" viewport="700x340"
 */
export interface SelectProps {
  options?: Array<string | { value: string; label: string }>;
  /** Controlled value. Omit for uncontrolled with `defaultValue`. */
  value?: string;
  defaultValue?: string;
  /** Called with a synthetic `{ target: { name, value } }`. */
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  placeholder?: string;
  icon?: IconName;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Reddens the rule, for a failed validation. */
  invalid?: boolean;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
