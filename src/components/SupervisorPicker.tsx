import type { StaffRecord } from '../lib/staff';
import { PersonPicker } from './PersonPicker';

type Props = {
  open: boolean;
  currentEmail?: string | null;
  onClose: () => void;
  onConfirm: (person: StaffRecord) => Promise<void>;
};

export function SupervisorPicker({ open, currentEmail, onClose, onConfirm }: Props) {
  return (
    <PersonPicker
      open={open}
      title="Add your supervisor"
      description="Optional. We'll use this to pre-fill your out-of-office message and as a fallback contact for IT. You can skip and revisit anytime."
      currentEmail={currentEmail}
      confirmLabel={(selected) =>
        selected ? `Save ${selected.givenName ?? 'supervisor'}` : 'Save supervisor'
      }
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
