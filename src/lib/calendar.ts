import { clearGoogleAccessToken, getGoogleAccessToken } from './auth';

export type OwnedCalendar = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  backgroundColor?: string;
};

export class CalendarTokenError extends Error {
  constructor() {
    super('Google access token expired or missing.');
    this.name = 'CalendarTokenError';
  }
}

const FIELDS = 'items(id,summary,description,primary,accessRole,backgroundColor)';

export async function fetchOwnedCalendars(): Promise<OwnedCalendar[]> {
  const token = getGoogleAccessToken();
  if (!token) throw new CalendarTokenError();

  const params = new URLSearchParams({ fields: FIELDS, maxResults: '250' });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (res.status === 401 || res.status === 403) {
    clearGoogleAccessToken();
    throw new CalendarTokenError();
  }
  if (!res.ok) {
    throw new Error(`Calendar API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { items?: OwnedCalendar[] };
  const items = body.items ?? [];
  // Calendars where the user has edit-or-better access, excluding their primary
  // (which is tied to the account and can't be transferred — it just gets
  // deactivated). Includes "writer" because that's what Google labels as
  // "Manage" in the sharing UI.
  return items.filter((c) => (c.accessRole === 'owner' || c.accessRole === 'writer') && !c.primary);
}

export function calendarSettingsUrl(id: string): string {
  // Google Calendar's per-calendar settings/sharing page accepts a base64url-
  // encoded calendar id. Falls back to the general settings page if the URL
  // doesn't resolve for some reason.
  const encoded = btoa(id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `https://calendar.google.com/calendar/u/0/r/settings/calendar/${encoded}`;
}
