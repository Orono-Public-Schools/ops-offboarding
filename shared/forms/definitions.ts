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

const SCHOOL_SITES = [
  'Activities Center',
  'Discovery Center',
  'District Office',
  'High School',
  'Intermediate School',
  'Middle School',
  'Schumann Elementary School',
  'Outside (Buildings and Grounds)',
  'Spartan Kids Childcare',
].map((s) => ({ value: s, label: s }));

const IF_NOTIFIED = { field: 'supervisorNotified', equals: 'yes' };

/**
 * Ported from HR's Google Form "Leave of Absence — Initial Notification to
 * District" (2026-08). Name/email come from sign-in, so the form doesn't ask.
 * MGDPA/FMLA stance: reason categories only — never medical detail.
 */
export const leaveOfAbsence: FormDefinition = {
  id: 'leaveOfAbsence',
  title: 'Leave of Absence',
  description:
    'Tell Human Resources about an upcoming leave of absence. Details route directly to HR; other district officials only see what their specific role requires.',
  version: 1,
  summaryFields: ['leaveType', 'anticipatedStart'],
  sections: [
    {
      title: 'Before you start',
      description:
        'Employees must notify the District at least 30 days before the beginning of a leave of absence, unless the need for leave is unforeseeable.',
      fields: [
        {
          id: 'supervisorNotified',
          type: 'radio',
          label:
            'Have you already notified your direct supervisor about your need for a leave of absence?',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },
      ],
    },
    {
      title: 'Talk to your supervisor first',
      showIf: { field: 'supervisorNotified', equals: 'no' },
      blocking: true,
      info: [
        'Return to this form after your supervisor has been notified about (a) your need for a leave of absence and (b) the general expected timeline of the leave.',
        'You are not required to share the specific medical details of your circumstances with your supervisor — but all employees must provide timely notice, at least 30 days before the leave begins.',
      ],
      fields: [],
    },
    {
      title: 'About you',
      description:
        'Your name and district email come from your sign-in, so HR already has them.',
      showIf: IF_NOTIFIED,
      fields: [
        {
          id: 'employeeId',
          type: 'text',
          label: 'Employee #',
          required: true,
          pattern: '^\\d{1,6}$',
          patternMessage: 'Digits only.',
          maxLength: 6,
        },
        { id: 'jobTitle', type: 'text', label: 'Job title', required: true },
        {
          id: 'sites',
          type: 'checkboxes',
          label: 'Which school sites do you work at?',
          helper: 'Check all that apply.',
          required: true,
          options: SCHOOL_SITES,
        },
      ],
    },
    {
      title: 'Background',
      description:
        'Human Resources requires certain details to support employees in navigating the leave of absence process. In many situations, information will need to be substantiated with appropriate provider documentation before the leave begins.',
      showIf: IF_NOTIFIED,
      fields: [
        {
          id: 'reason',
          type: 'radio',
          label: 'What is the reason for your leave request?',
          helper: 'Category only — HR never collects medical details through this form.',
          options: [
            { value: 'own_health', label: 'Your own serious health condition' },
            { value: 'family_health', label: "Family member's health condition" },
            { value: 'bonding', label: 'Bonding with a new child' },
            { value: 'military', label: 'Military family leave' },
            { value: 'safety', label: 'Safety leave' },
            { value: 'extended_unpaid', label: 'Extended unpaid leave of absence' },
          ],
        },
        {
          id: 'anticipatedStart',
          type: 'date',
          label: 'Anticipated leave start date',
          helper: 'This can be changed later if needed.',
          required: true,
        },
        {
          id: 'anticipatedEnd',
          type: 'date',
          label: 'Anticipated leave end date',
          helper: 'This can be changed later if needed.',
          required: true,
        },
        {
          id: 'leaveType',
          type: 'radio',
          label: 'What type of leave do you anticipate using?',
          helper: 'Check only one option.',
          required: true,
          options: [
            {
              value: 'pfml',
              label: 'Minnesota Paid Family & Medical Leave (PFML)',
              description:
                "A leave category established under Minnesota state law. Partial wage replacement is covered by the District's policy. FMLA-eligible employees will have FMLA run concurrently with PFML.",
            },
            {
              value: 'fmla',
              label: 'Family and Medical Leave Act (FMLA)',
              description:
                'A leave category established under federal law. FMLA is unpaid, unless you substitute ESST, personal leave, etc.',
            },
            {
              value: 'extended_unpaid',
              label: 'Extended Unpaid Leave of Absence',
              description:
                'May be approved at the discretion of administration; requires final approval by the School Board.',
            },
            {
              value: 'unsure',
              label: 'I need more information before I can answer this question',
            },
          ],
        },
      ],
    },
    {
      title: 'Extended unpaid leave — what happens next',
      showIf: [IF_NOTIFIED, { field: 'leaveType', equals: 'extended_unpaid' }],
      info: [
        'Extended unpaid leaves of absence must be approved by the Board of Education. Board approval follows the review of relevant factors by appropriate administrators — including relevant contract, handbook, and bargaining-agreement language; potential disruption to the student experience; and availability of a substitute.',
        'Check your contract or other employment agreement to determine whether additional steps are required, and continue to work with your direct supervisor to navigate the process.',
      ],
      fields: [],
    },
    {
      title: 'Minnesota Paid Leave — next steps',
      showIf: [IF_NOTIFIED, { field: 'leaveType', equals: 'pfml' }],
      info: [
        'You need to initiate your own PFML claim through New York Life — the District cannot process this step for staff. Do NOT initiate your leave on the state website.',
        "The District's paid-leave policy through New York Life replaces part of your wages at the same rate you would receive through the state program. You can estimate your payments with the state calculator: https://pl.mn.gov/resources/calculators/estimate-your-payments",
        'To start a claim, visit myNYLGBS.com or call 888-842-4462. You will need: Employer name — Independent School District #278 · Group number — MNP600551.',
        'Once your claim is started, complete the Minnesota PFML Claim Form and provide New York Life with the relevant medical certification or documentation (Parts B, C, or D). New York Life will then work with Orono Schools and keep the District apprised of your claim status. These details are also on the Staff Intranet.',
        'FMLA runs concurrently with PFML — one week of PFML used is one week of FMLA used. It remains your responsibility to keep the District informed of any changes to your leave status or planned return date.',
      ],
      fields: [],
    },
    {
      title: 'FMLA — certification and pay',
      showIf: [IF_NOTIFIED, { field: 'leaveType', equals: 'fmla' }],
      info: [
        'Take the appropriate FMLA form, found on the Staff Intranet (under the FMLA tab), to your provider, obtain proper certification, and return the form to Human Resources as soon as possible. The District cannot officially process your leave without the proper certification form, and will respond to you directly regarding the status of your request.',
        'FMLA is a form of unpaid leave — however, you may substitute ESST, personal leave, vacation time, etc. for the unpaid days, in order to be paid during your absence.',
      ],
      fields: [
        {
          id: 'leaveCategories',
          type: 'checkboxes',
          label: 'What district leave categories do you plan to use during your absence?',
          helper:
            'Check all that apply — you may be able to use these in combination, and selections can be adjusted later if necessary.',
          required: true,
          options: [
            { value: 'esst', label: 'Earned Sick and Safe Time (ESST or sick time)' },
            { value: 'personal', label: 'Personal leave' },
            { value: 'vacation', label: 'Vacation' },
            { value: 'floating_holiday', label: 'Floating holiday' },
            { value: 'unpaid', label: 'Unpaid leave / leave without pay' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'leaveCategoriesOther',
          type: 'text',
          label: 'Other leave category',
          required: true,
          showIf: { field: 'leaveCategories', equals: 'other' },
        },
      ],
    },
    {
      title: 'Not sure yet? That is fine',
      showIf: [IF_NOTIFIED, { field: 'leaveType', equals: 'unsure' }],
      info: [
        'Send the notification anyway — Human Resources will follow up with you directly to walk through the options and figure out which leave type fits your situation.',
      ],
      fields: [],
    },
    {
      title: 'Wrapping up',
      description:
        'Thank you for notifying Human Resources about your anticipated leave of absence. More information on leaves of absence is located on the Staff Intranet.',
      showIf: IF_NOTIFIED,
      fields: [
        {
          id: 'meetingRequested',
          type: 'radio',
          label:
            'Would you like to schedule a meeting with Human Resources to discuss the details of your leave?',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },
      ],
    },
  ],
};

/** Registry of live forms, keyed by form id. */
export const FORM_DEFINITIONS: Record<string, FormDefinition> = {
  [changeOfAddress.id]: changeOfAddress,
  [leaveOfAbsence.id]: leaveOfAbsence,
};

export function getFormDefinition(id: string): FormDefinition | null {
  return FORM_DEFINITIONS[id] ?? null;
}
