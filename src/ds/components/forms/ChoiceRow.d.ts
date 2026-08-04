import * as React from 'react';

/**
 * Radio, checkbox, or switch as a full-width row with a description. Selecting
 * one settles it in with a slight spring — the row grows 2px, takes the light
 * tint and a secondary border, and the dot fires one ring outward.
 * @startingPoint section="Forms" subtitle="Radio, checkbox and switch rows" viewport="700x300"
 */
export interface ChoiceRowProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: 'radio' | 'checkbox' | 'switch';
  title: string;
  description?: string;
  meta?: string;
  checked?: boolean;
}
export declare function ChoiceRow(props: ChoiceRowProps): JSX.Element;
