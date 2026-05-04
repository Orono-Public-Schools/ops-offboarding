import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { BuildingChecklist } from './offboarding';

/**
 * Default return date used when no setting is configured. Schumann/Intermediate
 * sample messages historically used Aug 25; Secondary used Aug 26 (one day
 * later for staff). The +1 offset for Secondary is preserved automatically.
 */
const DEFAULT_RETURN_DATE = '2026-08-24';

export type EoySettings = {
  returnDate: string | null;
};

type State = { loading: true } | { loading: false; settings: EoySettings };

export function useEoySettings(): State {
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    const ref = doc(db, 'appSettings', 'eoyVacationResponder');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        setState({
          loading: false,
          settings: { returnDate: (data?.returnDate as string | null | undefined) ?? null },
        });
      },
      () => setState({ loading: false, settings: { returnDate: null } }),
    );
    return unsub;
  }, []);

  return state;
}

/** Add days to an ISO date string (YYYY-MM-DD). */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the per-building return date. Secondary returns one day after the
 * configured base (matches OPS's historical pattern where staff at the
 * secondary buildings had one extra day before returning).
 */
export function returnDateForBuilding(
  baseIso: string | null | undefined,
  building: BuildingChecklist | null | undefined,
): string {
  const base = baseIso ?? DEFAULT_RETURN_DATE;
  if (building === 'secondary') return addDays(base, 1);
  return base;
}

export function formatReturnDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "August 24th" — for use in the responder body. */
export function formatReturnDateOrdinal(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day = d.getDate();
  return `${month} ${day}${ordinalSuffix(day)}`;
}

function ordinalSuffix(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return 'st';
  if (rem10 === 2 && rem100 !== 12) return 'nd';
  if (rem10 === 3 && rem100 !== 13) return 'rd';
  return 'th';
}

export const DEFAULT_EOY_RETURN_DATE = DEFAULT_RETURN_DATE;
