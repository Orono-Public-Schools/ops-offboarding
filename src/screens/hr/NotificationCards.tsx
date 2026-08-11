import { useEffect, useState } from 'react';
import { useAuth, useIsHrAdmin } from '../../lib/auth';
import { FORM_DEFINITIONS } from '../../lib/forms';
import {
  setNotificationPrefs,
  setNotificationSettings,
  useMyNotificationPrefs,
  useNotificationSettings,
  type NotificationSettings,
  type PrefChoice,
} from '../../lib/notifications';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { Field } from '../../ds/components/forms/Field';

const FORMS = Object.values(FORM_DEFINITIONS).sort((a, b) => a.title.localeCompare(b.title));

const caption: React.CSSProperties = {
  font: 'var(--type-caption)',
  color: 'var(--text-muted)',
  margin: '0 0 12px',
};

const rowLabel: React.CSSProperties = {
  font: 'var(--type-strong)',
  color: 'var(--dark)',
};

function TriChoice<T extends string>({
  value,
  choices,
  onPick,
  disabled,
}: {
  value: T;
  choices: Array<{ key: T; label: string }>;
  onPick: (key: T) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {choices.map((c) => (
        <Button
          key={c.key}
          size="sm"
          variant={value === c.key ? 'primary' : 'ghost'}
          disabled={disabled}
          onClick={() => onPick(c.key)}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}

/** Every HR role holder: their own always/never overrides per form. */
export function MyNotificationPrefsCard() {
  const { user } = useAuth();
  const prefs = useMyNotificationPrefs(user?.uid ?? null);
  const [overrides, setOverrides] = useState<Record<string, PrefChoice | 'default'>>({});
  const [error, setError] = useState<string | null>(null);

  const choiceFor = (formId: string): PrefChoice | 'default' =>
    overrides[formId] ?? prefs.forms[formId] ?? 'default';

  const pick = (formId: string, choice: PrefChoice | 'default') => {
    setOverrides((o) => ({ ...o, [formId]: choice }));
    setError(null);
    const forms: Record<string, PrefChoice | null> = {};
    for (const f of FORMS) {
      const c = formId === f.id ? choice : choiceFor(f.id);
      forms[f.id] = c === 'default' ? null : c;
    }
    setNotificationPrefs({ forms }).catch((err) => {
      console.error(err);
      setOverrides((o) => {
        const next = { ...o };
        delete next[formId];
        return next;
      });
      setError('Could not save that preference. Please try again.');
    });
  };

  return (
    <Card collapsible eyebrow="Your email" heading="When a request lands" pad={16}>
      <p style={caption}>
        Per form: follow the admin setup below, always get the email yourself, or never get it —
        "never" wins even if you're on the recipient list. Status updates go to submitters
        automatically either way.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FORMS.map((f) => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={rowLabel}>{f.title}</span>
            <TriChoice
              value={choiceFor(f.id)}
              choices={[
                { key: 'default', label: 'Default' },
                { key: 'always', label: 'Always' },
                { key: 'never', label: 'Never' },
              ]}
              onPick={(c) => pick(f.id, c)}
              disabled={prefs.loading}
            />
          </div>
        ))}
      </div>
      {error && (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: '12px 0 0' }}>
          {error}
        </p>
      )}
    </Card>
  );
}

type FormDraft = { recipients: string; notify: 'default' | 'on' | 'off' };

function draftsFrom(s: NotificationSettings): Record<string, FormDraft> {
  const out: Record<string, FormDraft> = {};
  for (const f of FORMS) {
    const pf = s.perForm[f.id] ?? {};
    out[f.id] = {
      recipients: (pf.recipients ?? []).join(', '),
      notify: pf.notifySubmit === undefined ? 'default' : pf.notifySubmit ? 'on' : 'off',
    };
  }
  return out;
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** HR admins: master switches, the default address, per-form recipients. */
export function NotificationSettingsCard() {
  const isHrAdmin = useIsHrAdmin();
  const state = useNotificationSettings(isHrAdmin);
  const [draft, setDraft] = useState<{
    defaultRecipient: string;
    notifySubmit: boolean;
    notifyStatus: boolean;
    forms: Record<string, FormDraft>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Seed the draft once the settings land; live edits stay untouched after.
  useEffect(() => {
    if (state.loading || draft !== null) return;
    setDraft({
      defaultRecipient: state.settings.defaultRecipient ?? '',
      notifySubmit: state.settings.notifySubmit,
      notifyStatus: state.settings.notifyStatus,
      forms: draftsFrom(state.settings),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loading]);

  if (!isHrAdmin) return null;

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const perForm: NotificationSettings['perForm'] = {};
      for (const f of FORMS) {
        const d = draft.forms[f.id];
        const entry: { recipients?: string[]; notifySubmit?: boolean } = {};
        const recipients = parseEmails(d.recipients);
        if (recipients.length > 0) entry.recipients = recipients;
        if (d.notify !== 'default') entry.notifySubmit = d.notify === 'on';
        if (Object.keys(entry).length > 0) perForm[f.id] = entry;
      }
      await setNotificationSettings({
        defaultRecipient: draft.defaultRecipient.trim() || null,
        notifySubmit: draft.notifySubmit,
        notifyStatus: draft.notifyStatus,
        perForm,
      });
      setMessage({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      console.error(err);
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Could not save the settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const setForm = (formId: string, patch: Partial<FormDraft>) =>
    setDraft((d) =>
      d ? { ...d, forms: { ...d.forms, [formId]: { ...d.forms[formId], ...patch } } } : d,
    );

  return (
    <Card collapsible eyebrow="Email notifications" heading="Who hears about submissions" pad={16}>
      {!draft ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Loading…
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={rowLabel}>New-submission emails to staff</span>
            <TriChoice
              value={draft.notifySubmit ? 'on' : 'off'}
              choices={[
                { key: 'on', label: 'On' },
                { key: 'off', label: 'Off' },
              ]}
              onPick={(k) => setDraft({ ...draft, notifySubmit: k === 'on' })}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={rowLabel}>Status emails to submitters</span>
            <TriChoice
              value={draft.notifyStatus ? 'on' : 'off'}
              choices={[
                { key: 'on', label: 'On' },
                { key: 'off', label: 'Off' },
              ]}
              onPick={(k) => setDraft({ ...draft, notifyStatus: k === 'on' })}
            />
          </div>
          <Field
            label="Default address"
            type="email"
            value={draft.defaultRecipient}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft({ ...draft, defaultRecipient: e.target.value })
            }
            placeholder="hr@orono.k12.mn.us"
            help="Forms with no recipients of their own email this address. Leave blank for inbox-only."
            optional
          />
          {FORMS.map((f) => (
            <div key={f.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 8,
                }}
              >
                <span style={rowLabel}>{f.title}</span>
                <TriChoice
                  value={draft.forms[f.id].notify}
                  choices={[
                    { key: 'default', label: 'Default' },
                    { key: 'on', label: 'On' },
                    { key: 'off', label: 'Off' },
                  ]}
                  onPick={(k) => setForm(f.id, { notify: k })}
                />
              </div>
              <Field
                label="Recipients"
                value={draft.forms[f.id].recipients}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm(f.id, { recipients: e.target.value })
                }
                placeholder="Comma-separated — blank uses the default address"
                optional
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" icon="save" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save notification settings'}
            </Button>
          </div>
          {message && (
            <p
              style={{
                font: 'var(--type-body-sm)',
                color: message.kind === 'ok' ? 'var(--text-muted)' : 'var(--accent)',
                margin: 0,
                textAlign: 'right',
              }}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
