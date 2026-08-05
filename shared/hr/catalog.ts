/**
 * Task and detail-field catalogues for HR records. One entry per column of
 * the master workbook, keyed so a record's `tasks`/`details` maps stay
 * meaningful if columns are ever renamed in the sheet.
 */

import type { ChangeType, ProcessType } from './types';

export type HrTaskSpec = {
  key: string;
  label: string;
  /** Tickable but never counted in progress or required for completion. */
  optional?: boolean;
};

export type HrDetailSpec = {
  key: string;
  label: string;
  /** UI hint only — values are always strings (see DetailMap). */
  kind: 'date' | 'text' | 'textarea' | 'select';
  options?: string[];
};

export type HrRecordSpec = {
  label: string;
  tasks: HrTaskSpec[];
  details: HrDetailSpec[];
};

export const PROCESS_SPECS: Record<ProcessType, HrRecordSpec> = {
  new_hire: {
    label: 'New hire',
    // Trimmed 2026-08-05 to the boxes HR actually works; contract-sent became
    // a date detail, and the Google column answers the Gmail question.
    tasks: [
      { key: 'payrollChangeForm', label: 'Payroll change form' },
      { key: 'backgroundCheck', label: 'Background check complete' },
      { key: 'paperwork', label: 'Paperwork complete' },
      { key: 'i9', label: 'I-9 complete' },
      { key: 'frontline', label: 'Frontline updated' },
      { key: 'efPlus', label: 'EF+ updated' },
      { key: 'vector', label: 'Added to Vector' },
      { key: 'notifyUnion', label: 'Union notified' },
      { key: 'synergy', label: 'Synergy' },
      { key: 'healthSafety', label: 'Health & Safety', optional: true },
      { key: 'key', label: 'Key issued', optional: true },
      { key: 'lunchPin', label: 'Lunch PIN set', optional: true },
    ],
    details: [
      { key: 'boardDate', label: 'Board date', kind: 'date' },
      { key: 'startDate', label: 'Start date', kind: 'date' },
      { key: 'ltsEndDate', label: 'LTS end date', kind: 'date' },
      { key: 'contractSentDate', label: 'Contract sent', kind: 'date' },
      { key: 'checkin30Due', label: '30-day check-in due', kind: 'date' },
      { key: 'checkin90Due', label: '90-day check-in due', kind: 'date' },
      { key: 'replacing', label: 'Replacing / student teacher', kind: 'text' },
      { key: 'orientationDate', label: 'Orientation date', kind: 'date' },
    ],
  },
  termination: {
    label: 'Termination',
    tasks: [
      { key: 'payrollChangeForm', label: 'Payroll change form' },
      { key: 'termDetailsSent', label: 'Termination details & procedures sent' },
      { key: 'exitInterviewSent', label: 'Exit interview sent' },
      { key: 'unionNotified', label: 'Union notified' },
      { key: 's2Disabled', label: 'S2 access disabled' },
      { key: 'frontline', label: 'Frontline updated' },
      { key: 'efPlus', label: 'EF+ updated' },
      { key: 'keepCertified', label: 'Keep Certified printed / sent to PELSB' },
      { key: 'starReport', label: 'STAR report' },
      { key: 'posted', label: 'Position posted' },
      { key: 'filled', label: 'Position filled' },
      { key: 'smasgUpdate', label: 'SMASG update' },
      { key: 'edemgUpdate', label: 'EDEMG update' },
      { key: 'applitrack', label: 'Post to Applitrack' },
      { key: 'elvetUpdate', label: 'ELVET update' },
      { key: 'collectKey', label: 'Collect key' },
      { key: 'collectSecurityCard', label: 'Collect security card' },
      { key: 'lunchAccount', label: 'Lunch account closed' },
      { key: 'parkingPermit', label: 'Parking permit returned' },
      { key: 'phoneRemoved', label: 'Phone' },
      { key: 'collectDevices', label: 'Collect technology devices' },
      { key: 'removeWebsiteProfile', label: 'Remove website profile & contact info' },
      { key: 'removeGoogleProfile', label: 'Remove Google profile & contact info' },
    ],
    details: [
      { key: 'boardDate', label: 'Board date', kind: 'date' },
      { key: 'termDate', label: 'Termination date', kind: 'date' },
      {
        key: 'termType',
        label: 'Termination type',
        kind: 'select',
        options: ['Resignation', 'Retirement', 'Termination', 'Non-renewal', 'Other'],
      },
    ],
  },
  ce_onboarding: {
    label: 'CE / Sub / Coaching',
    tasks: [
      { key: 'backgroundCheck', label: 'Background check complete' },
      { key: 'paperwork', label: 'Paperwork complete' },
      { key: 'i9', label: 'I-9 complete' },
      { key: 'frontline', label: 'Frontline updated' },
      { key: 'efPlus', label: 'EF+ updated' },
    ],
    details: [
      { key: 'startDate', label: 'Start date', kind: 'date' },
      { key: 'lunchPin', label: 'Lunch PIN', kind: 'text' },
    ],
  },
};

export const CHANGE_SPECS: Record<ChangeType, HrRecordSpec> = {
  building: {
    label: 'Building change',
    tasks: [
      { key: 'changeForm', label: 'Change form' },
      { key: 'efFrontline', label: 'EF+ & Frontline updated' },
      { key: 'emailGroups', label: 'Email group distribution changed' },
    ],
    details: [
      { key: 'boardDate', label: 'Board date', kind: 'date' },
      { key: 'effectiveDate', label: 'Effective date', kind: 'date' },
      { key: 'previousBuilding', label: 'Previous building', kind: 'text' },
      { key: 'newBuilding', label: 'New building', kind: 'text' },
    ],
  },
  position: {
    label: 'Position / contract change',
    tasks: [
      { key: 'changeForm', label: 'Change form' },
      { key: 'efFrontline', label: 'EF+ & Frontline updated' },
    ],
    details: [
      { key: 'boardDate', label: 'Board date', kind: 'date' },
      { key: 'effectiveDate', label: 'Effective date', kind: 'date' },
      { key: 'previousBuilding', label: 'Previous building', kind: 'text' },
      { key: 'previousPosition', label: 'Previous position', kind: 'text' },
      { key: 'newBuilding', label: 'New building', kind: 'text' },
      { key: 'newPosition', label: 'New position', kind: 'text' },
      { key: 'subReplacement', label: 'Sub / replacement', kind: 'text' },
    ],
  },
  name: {
    label: 'Name change',
    tasks: [
      { key: 'proofReceived', label: 'Proof of name change received (new SS card)' },
      { key: 'efFrontline', label: 'EF+ & Frontline updated' },
      { key: 'keepCertified', label: 'Keep Certified' },
      { key: 's2IdBadge', label: 'S2 / ID badge' },
    ],
    details: [
      { key: 'effectiveDate', label: 'Effective date', kind: 'date' },
      { key: 'previousName', label: 'Previous name', kind: 'text' },
      { key: 'newName', label: 'New name', kind: 'text' },
      { key: 'emailChangedTo', label: 'Email changed to', kind: 'text' },
    ],
  },
  address: {
    label: 'Address change',
    tasks: [{ key: 'efinanceUpdated', label: 'Updated in eFinance' }],
    details: [
      { key: 'effectiveDate', label: 'Effective date', kind: 'date' },
      { key: 'newAddress', label: 'New address', kind: 'textarea' },
    ],
  },
};

export const LEAVE_SPEC: HrRecordSpec = {
  label: 'Leave of absence',
  tasks: [],
  details: [
    { key: 'boardDate', label: 'Board date', kind: 'date' },
    { key: 'payrollChangeForm', label: 'Payroll change form created', kind: 'date' },
    { key: 'notifiedOEA', label: 'Notified OEA', kind: 'select', options: ['Yes', 'No'] },
    { key: 'anticipatedStart', label: 'Anticipated start', kind: 'date' },
    { key: 'anticipatedEnd', label: 'Anticipated end', kind: 'date' },
    { key: 'actualStart', label: 'Actual start', kind: 'date' },
    { key: 'actualEnd', label: 'Actual end', kind: 'date' },
    {
      key: 'unpaidPortion',
      label: 'Any part unpaid by Orono',
      kind: 'select',
      options: ['Yes', 'No'],
    },
    { key: 'retirementPlan', label: 'TRA or PERA', kind: 'select', options: ['TRA', 'PERA'] },
    { key: 'loggedInTraPera', label: 'Logged in TRA/PERA', kind: 'select', options: ['Yes', 'No'] },
    { key: 'vacancyOrSub', label: 'Vacancy posted / contract LT sub', kind: 'text' },
    { key: 'starReport', label: 'STAR report', kind: 'text' },
    { key: 'subContractStatus', label: 'Sub contract status', kind: 'text' },
    { key: 'leader', label: 'Leader', kind: 'text' },
    { key: 'leaderEmail', label: 'Leader email', kind: 'text' },
  ],
};

export const LEAVE_REASON_OPTIONS = [
  'Mobility LOA',
  'Maternity',
  'Bonding',
  'Medical',
  'Unpaid',
  'Other',
];

/** Spec lookup for a record in a given collection. */
export function specFor(
  collection: 'processes' | 'leaves' | 'changes',
  type: string | null,
): HrRecordSpec | null {
  if (collection === 'leaves') return LEAVE_SPEC;
  if (collection === 'processes') {
    return (PROCESS_SPECS as Record<string, HrRecordSpec>)[type ?? ''] ?? null;
  }
  return (CHANGE_SPECS as Record<string, HrRecordSpec>)[type ?? ''] ?? null;
}

export function taskKeys(spec: HrRecordSpec): Set<string> {
  return new Set(spec.tasks.map((t) => t.key));
}

/** Complete = every required (non-optional) task done or N/A. */
export function isChecklistComplete(
  spec: HrRecordSpec,
  tasks: Record<string, { done?: boolean; na?: boolean } | undefined>,
): boolean {
  const required = spec.tasks.filter((t) => !t.optional);
  if (required.length === 0) return false;
  return required.every((t) => {
    const s = tasks[t.key];
    return s ? s.done === true || s.na === true : false;
  });
}

export function detailKeys(spec: HrRecordSpec): Set<string> {
  return new Set(spec.details.map((d) => d.key));
}
