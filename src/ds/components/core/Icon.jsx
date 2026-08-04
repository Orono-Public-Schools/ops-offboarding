import React from 'react';

/* Lucide glyphs, inlined so nothing depends on a CDN. 14-20px, inherits
   currentColor, 1.75 stroke. Add paths here rather than importing a set. */

const PATHS = {
  send: ['M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z', 'm21.854 2.147-10.94 10.939'],
  save: ['M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7', 'M7 3v4a1 1 0 0 0 1 1h7'],
  check: ['M20 6 9 17l-5-5'],
  clock: ['M12 6v6l4 2', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  home: ['M15 21v-8H9v8', 'M3 10a2 2 0 0 1 .7-1.5l7-5.8a2 2 0 0 1 2.5 0l7 5.8A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  fileText: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v5h5', 'M9 13h6', 'M9 17h4'],
  inbox: ['M22 12h-6l-2 3h-4l-2-3H2', 'M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13A4 4 0 0 1 19 7a4 4 0 0 1-3 3.87'],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  search: ['m21 21-4.34-4.34', 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'],
  download: ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'],
  plus: ['M5 12h14', 'M12 5v14'],
  mail: ['m22 7-8.99 5.73a2 2 0 0 1-2.02 0L2 7', 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
  key: ['m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4', 'm21 2-9.6 9.6', 'M7.5 22a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z'],
  laptop: ['M18 5a2 2 0 0 1 2 2v8H4V7a2 2 0 0 1 2-2z', 'M2 19h20'],
};

export function Icon({ name, size = 16, strokeWidth = 1.75, style, ...rest }) {
  const paths = PATHS[name] || [];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={{ display: 'block', flex: '0 0 auto', ...style }}
      {...rest}
    >
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
