import * as React from 'react';

/**
 * One step of a form, rendered as a card with an uppercase letterspaced
 * heading. Multi-step forms are a vertical stack of these, 24px apart.
 * @startingPoint section="Forms" subtitle="Form section card" viewport="700x320"
 */
export interface FormSectionProps extends React.HTMLAttributes<HTMLElement> {
  step?: number;
  /** Uppercase category label above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right side of the heading row. */
  aside?: React.ReactNode;
}
export declare function FormSection(props: FormSectionProps): JSX.Element;
