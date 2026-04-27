import { useState } from 'react';
import { setSupervisor } from '../lib/functions';
import type { DirectoryPerson } from '../lib/people';
import { SupervisorPicker } from './SupervisorPicker';

type Props = {
  supervisorEmail: string | null;
  supervisorName: string | null | undefined;
};

export function SupervisorBanner({ supervisorEmail, supervisorName }: Props) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async (person: DirectoryPerson) => {
    await setSupervisor({ email: person.email, displayName: person.displayName });
  };

  if (!supervisorEmail) {
    return (
      <>
        <div
          className="mb-6 flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span className="font-semibold text-white">Add your supervisor</span> (optional) — used
            to pre-fill OOO templates and as a fallback contact.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Add
          </button>
        </div>
        <SupervisorPicker
          open={open}
          currentEmail={null}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="mb-6 flex flex-col items-start gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Supervisor
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">
            {supervisorName ?? supervisorEmail}
          </p>
          {supervisorName && (
            <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {supervisorEmail}
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        >
          Change
        </button>
      </div>
      <SupervisorPicker
        open={open}
        currentEmail={supervisorEmail}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
