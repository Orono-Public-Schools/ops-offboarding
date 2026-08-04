import * as React from 'react';

/**
 * A person: rounded photo slot (hatched tint when no photo) plus name and role.
 * Initials-in-a-circle is deliberately not offered.
 * @startingPoint section="People" subtitle="Person plates" viewport="700x200"
 */
export interface PersonPlateProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  role?: string;
  meta?: string;
  photo?: string;
  size?: 'sm' | 'md' | 'lg';
}
export declare function PersonPlate(props: PersonPlateProps): JSX.Element;
