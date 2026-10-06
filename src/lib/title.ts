import { useEffect } from 'react';

const APP = 'OronoHR';

/** Page-first tab titles: "Leave of Absence · OronoHR". Null or empty
 *  leaves the plain app name; unmounting restores it. */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP;
    return () => {
      document.title = APP;
    };
  }, [title]);
}
