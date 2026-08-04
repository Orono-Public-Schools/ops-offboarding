import type { FormDefinition } from './types';

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
].map((s) => ({ value: s, label: s }));

export const changeOfAddress: FormDefinition = {
  id: 'changeOfAddress',
  title: 'Change of Address',
  description:
    'Let HR know your home address or phone number has changed so payroll, benefits, and district mailings stay current.',
  version: 1,
  summaryFields: ['street1', 'city'],
  sections: [
    {
      title: 'Effective date',
      fields: [
        {
          id: 'effectiveDate',
          type: 'date',
          label: 'Date of change',
          required: true,
          helper: 'When the new address takes (or took) effect.',
        },
      ],
    },
    {
      title: 'New address',
      fields: [
        { id: 'street1', type: 'text', label: 'Street address', required: true },
        {
          id: 'street2',
          type: 'text',
          label: 'Apt / unit (optional)',
        },
        { id: 'city', type: 'text', label: 'City', required: true },
        {
          id: 'state',
          type: 'select',
          label: 'State',
          required: true,
          options: US_STATES,
        },
        {
          id: 'zip',
          type: 'text',
          label: 'ZIP code',
          required: true,
          pattern: '^\\d{5}(-\\d{4})?$',
          patternMessage: 'Enter a 5-digit ZIP (or ZIP+4).',
          maxLength: 10,
        },
      ],
    },
    {
      title: 'Phone',
      fields: [
        {
          id: 'phoneChanged',
          type: 'checkbox',
          label: 'My phone number is also changing',
        },
        {
          id: 'phone',
          type: 'phone',
          label: 'New phone number',
          required: true,
          showIf: { field: 'phoneChanged', equals: true },
        },
      ],
    },
    {
      title: 'Anything else?',
      fields: [
        {
          id: 'notes',
          type: 'textarea',
          label: 'Notes for HR (optional)',
          placeholder: 'Anything HR should know about this change…',
        },
      ],
    },
  ],
};

/** Registry of live forms, keyed by form id. */
export const FORM_DEFINITIONS: Record<string, FormDefinition> = {
  [changeOfAddress.id]: changeOfAddress,
};

export function getFormDefinition(id: string): FormDefinition | null {
  return FORM_DEFINITIONS[id] ?? null;
}
