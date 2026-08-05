import type { CSSProperties } from 'react';
import { Field } from '../../ds/components/forms/Field';
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUSES } from '../../lib/hr';

/** Everything as strings for form state; callables get trimmed values. */
export type EmployeeFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  kind: string;
  status: string;
  building: string;
  position: string;
  reportsTo: string;
  startDate: string;
  endDate: string;
  description: string;
  notes: string;
};

export const EMPTY_EMPLOYEE_FORM: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  employeeId: '',
  kind: 'regular',
  status: 'active',
  building: '',
  position: '',
  reportsTo: '',
  startDate: '',
  endDate: '',
  description: '',
  notes: '',
};

export function employeeToFormValues(e: {
  firstName: string;
  lastName: string;
  email: string | null;
  employeeId: number | null;
  kind: string;
  status: string;
  building: string | null;
  position: string | null;
  reportsTo: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  notes: string | null;
}): EmployeeFormValues {
  return {
    firstName: e.firstName ?? '',
    lastName: e.lastName ?? '',
    email: e.email ?? '',
    employeeId: e.employeeId ? String(e.employeeId) : '',
    kind: e.kind ?? 'regular',
    status: e.status ?? 'active',
    building: e.building ?? '',
    position: e.position ?? '',
    reportsTo: e.reportsTo ?? '',
    startDate: e.startDate ?? '',
    endDate: e.endDate ?? '',
    description: e.description ?? '',
    notes: e.notes ?? '',
  };
}

export function employeeFormFields(values: EmployeeFormValues): Record<string, unknown> {
  const s = (v: string) => v.trim() || null;
  return {
    firstName: s(values.firstName),
    lastName: s(values.lastName),
    email: s(values.email),
    employeeId: values.employeeId.trim() ? Number(values.employeeId.trim()) : null,
    kind: values.kind,
    status: values.status,
    building: s(values.building),
    position: s(values.position),
    reportsTo: s(values.reportsTo),
    startDate: s(values.startDate),
    endDate: s(values.endDate),
    description: s(values.description),
    notes: s(values.notes),
  };
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

export function EmployeeForm({
  values,
  onChange,
  showEmployeeId = true,
}: {
  values: EmployeeFormValues;
  onChange: (patch: Partial<EmployeeFormValues>) => void;
  showEmployeeId?: boolean;
}) {
  const set = (key: keyof EmployeeFormValues) => (e: { target: { value: string } }) =>
    onChange({ [key]: e.target.value });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={grid}>
        <Field label="First name" value={values.firstName} onChange={set('firstName')} />
        <Field label="Last name" value={values.lastName} onChange={set('lastName')} />
        <Field
          label="School email"
          optional
          value={values.email}
          onChange={set('email')}
          placeholder="name@orono.k12.mn.us"
        />
        {showEmployeeId && (
          <Field
            label="EE#"
            optional
            value={values.employeeId}
            onChange={set('employeeId')}
            help="Leave blank to assign later."
          />
        )}
      </div>
      <div style={grid}>
        <Field
          label="Type"
          as="select"
          value={values.kind}
          onChange={set('kind')}
          options={[
            { value: 'regular', label: 'Regular staff' },
            { value: 'ce_sub_coach', label: 'CE / Sub / Coaching' },
          ]}
        />
        <Field
          label="Status"
          as="select"
          value={values.status}
          onChange={set('status')}
          options={EMPLOYEE_STATUSES.map((s) => ({ value: s, label: EMPLOYEE_STATUS_LABELS[s] }))}
        />
        <Field label="Building" optional value={values.building} onChange={set('building')} />
        <Field label="Position" optional value={values.position} onChange={set('position')} />
      </div>
      <div style={grid}>
        <Field label="Reports to" optional value={values.reportsTo} onChange={set('reportsTo')} />
        <Field
          label="Start date"
          optional
          value={values.startDate}
          onChange={set('startDate')}
          placeholder="YYYY-MM-DD or TBD"
        />
        <Field
          label="End date"
          optional
          value={values.endDate}
          onChange={set('endDate')}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Description"
          optional
          value={values.description}
          onChange={set('description')}
          help="e.g. Head Girls Hockey Coach"
        />
      </div>
      <Field
        label="Notes"
        optional
        as="textarea"
        rows={3}
        value={values.notes}
        onChange={set('notes')}
      />
    </div>
  );
}
