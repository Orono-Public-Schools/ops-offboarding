import * as React from 'react';
import type { IconName } from '../core/Icon';

/**
 * Labelled input, select, or textarea. Uppercase letterspaced label over a
 * hairline rule — no box. On focus a navy rule wipes in from the left on the
 * button curve. Read-only fields sit on the inset fill instead.
 * @startingPoint section="Forms" subtitle="Inputs, selects, read-only, errors" viewport="700x340"
 */
export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Caption under the control. */
  help?: string;
  /** Red caption; also reddens the border. */
  error?: string;
  optional?: boolean;
  as?: 'input' | 'textarea' | 'select';
  options?: Array<string | { value: string; label: string }>;
  rows?: number;
  /** Leading icon inside the well. */
  icon?: IconName;
  suffix?: React.ReactNode;
  inputStyle?: React.CSSProperties;
}
export declare function Field(props: FieldProps): JSX.Element;
