import * as React from 'react';

/**
 * The portal's opening block: a tear-off desk calendar, the state of the person's
 * record as the headline, and the school year as a rail with today marked. No
 * greeting — the header carries information instead of a pleasantry.
 * @startingPoint section="Navigation" subtitle="School-day page header" viewport="700x260"
 */
export interface DayHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Short weekday, e.g. "Mon". */
  weekday?: string;
  /** Day of month. Omit the whole calendar block by leaving this out. */
  day?: number | string;
  month?: string;
  /** The headline — a fact about their record, not a greeting. */
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** 0–100. Draws the rail with a red "you are here" mark at that position. */
  railPct?: number;
  /** Rail captions. Left names where you are, right what remains. */
  railLeft?: string;
  railRight?: string;
}
export declare function DayHeader(props: DayHeaderProps): JSX.Element;
