import * as React from 'react';

/**
 * White floating card — the only content surface. No border; the layered
 * shadow separates it from the dark shell. The uppercase letterspaced heading
 * sits in a tinted strip across the top of the card, separating chrome from
 * content; that strip is the signature of this style.
 * @startingPoint section="Surfaces" subtitle="Cards and card headings" viewport="700x300"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase letterspaced category label above the heading. */
  eyebrow?: string;
  /** Small uppercase letterspaced heading in the dark anchor color. */
  heading?: string;
  /** Right side of the heading row — a badge, a count, a quiet action. */
  headingRight?: React.ReactNode;
  /** Hairline-topped footer region — use for QuietLink rows and minor actions. */
  footer?: React.ReactNode;
  /** Padding in px. Default 20; use 16 for dense cards. */
  pad?: number;
  /** Read-only / inset variant on #f8f9fb. The heading strip inverts to white. */
  inset?: boolean;
  /** "strip" (default) puts the heading in a tinted top strip; "plain" keeps it
   *  inline above the body — use for small cards where a strip is too heavy. */
  variant?: 'strip' | 'plain';
  /** Adds hover lift — pair with onClick. */
  interactive?: boolean;
  bodyStyle?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
