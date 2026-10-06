import * as React from 'react';

/** The HR-over-a-rule mark. `tile` adds the navy rounded square behind it. */
export declare function Mark(
  props: React.SVGAttributes<SVGSVGElement> & { size?: number; tile?: boolean },
): JSX.Element;
/** The same mark in navy on a light surface. */
export declare function MarkOnPaper(
  props: React.SVGAttributes<SVGSVGElement> & { size?: number },
): JSX.Element;
/** "OronoHR" in Inter with HR in the secondary blue. */
export declare function Wordmark(
  props: React.HTMLAttributes<HTMLSpanElement> & { size?: number; onDark?: boolean },
): JSX.Element;
