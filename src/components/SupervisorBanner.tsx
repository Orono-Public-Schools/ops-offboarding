import { useState } from 'react';
import { setSupervisor } from '../lib/functions';
import type { StaffRecord } from '../lib/staff';
import { SupervisorPicker } from './SupervisorPicker';
import { Button } from '../ds/components/core/Button';

type Props = {
  supervisorEmail: string | null;
  supervisorName: string | null | undefined;
};

/** Row inside the "Your details" card: the saved supervisor, or an invitation
 *  to add one. The picker itself is the shared PersonPicker dialog. */
export function SupervisorBanner({ supervisorEmail, supervisorName }: Props) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async (person: StaffRecord) => {
    await setSupervisor({ email: person.email, displayName: person.displayName });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            style={{
              margin: 0,
              font: 'var(--type-field-label)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Supervisor
          </p>
          {supervisorEmail ? (
            <>
              <p
                className="truncate"
                style={{ margin: '3px 0 0', font: 'var(--type-strong)', color: 'var(--dark)' }}
              >
                {supervisorName ?? supervisorEmail}
              </p>
              {supervisorName && (
                <p
                  className="truncate"
                  style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--text-muted)' }}
                >
                  {supervisorEmail}
                </p>
              )}
            </>
          ) : (
            <p
              style={{ margin: '3px 0 0', font: 'var(--type-caption)', color: 'var(--text-muted)' }}
            >
              Optional — pre-fills your out-of-office and gives IT a fallback contact.
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {supervisorEmail ? 'Change' : 'Add'}
        </Button>
      </div>
      <SupervisorPicker
        open={open}
        currentEmail={supervisorEmail ?? null}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
