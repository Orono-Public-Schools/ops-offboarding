import * as React from 'react';

/**
 * The white title block that sits directly on the gradient shell.
 * @startingPoint section="Navigation" subtitle="On-dark page titles" viewport="700x220"
 */
export interface PageTitleProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase letterspaced line above the title, at 50% white. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export declare function PageTitle(props: PageTitleProps): JSX.Element;
