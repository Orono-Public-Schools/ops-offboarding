import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from './firebase';

const functions = getFunctions(app, 'us-central1');

/** Mirrors NotificationSettings in functions/src/notifications.ts. */
export type NotificationSettings = {
  defaultRecipient: string | null;
  notifySubmit: boolean;
  notifyStatus: boolean;
  perForm: Record<string, { recipients?: string[]; notifySubmit?: boolean }>;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  defaultRecipient: null,
  notifySubmit: true,
  notifyStatus: true,
  perForm: {},
};

export type PrefChoice = 'always' | 'never';

export const setNotificationSettings = httpsCallable<
  Omit<NotificationSettings, never>,
  { success: boolean }
>(functions, 'setNotificationSettings');

/** Pass null for a form to fall back to the admin config. */
export const setNotificationPrefs = httpsCallable<
  { forms: Record<string, PrefChoice | null> },
  { success: boolean }
>(functions, 'setNotificationPrefs');

type SettingsState = { loading: boolean; settings: NotificationSettings };

/** Live admin notification settings; defaults until the doc exists. */
export function useNotificationSettings(enabled: boolean): SettingsState {
  const [state, setState] = useState<SettingsState>({
    loading: true,
    settings: DEFAULT_NOTIFICATION_SETTINGS,
  });

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      doc(db, 'appSettings', 'notifications'),
      (snap) => {
        const data = snap.exists() ? (snap.data() as Partial<NotificationSettings>) : {};
        setState({
          loading: false,
          settings: {
            defaultRecipient: data.defaultRecipient ?? null,
            notifySubmit: data.notifySubmit !== false,
            notifyStatus: data.notifyStatus !== false,
            perForm: data.perForm ?? {},
          },
        });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, settings: DEFAULT_NOTIFICATION_SETTINGS });
      },
    );
  }, [enabled]);

  return state;
}

type PrefsState = { loading: boolean; forms: Record<string, PrefChoice> };

/** The signed-in role holder's own always/never overrides. */
export function useMyNotificationPrefs(uid: string | null): PrefsState {
  const [state, setState] = useState<PrefsState>({ loading: true, forms: {} });

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'notificationPrefs', uid),
      (snap) => {
        setState({
          loading: false,
          forms: snap.exists() ? ((snap.get('forms') as Record<string, PrefChoice>) ?? {}) : {},
        });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, forms: {} });
      },
    );
  }, [uid]);

  return state;
}
