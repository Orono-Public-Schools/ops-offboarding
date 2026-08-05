import { useState } from 'react';
import { useNavigate } from 'react-router';
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, employeeFormFields } from './EmployeeForm';
import { createEmployee } from '../../lib/hr';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { ChoiceRow } from '../../ds/components/forms/ChoiceRow';
import { PageTitle } from '../../ds/components/navigation/PageTitle';

export function EmployeeNew() {
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY_EMPLOYEE_FORM);
  const [assignId, setAssignId] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!values.firstName.trim() && !values.lastName.trim()) {
      setError('A name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fields = employeeFormFields(values);
      const res = await createEmployee({
        ...fields,
        assignId: assignId && !fields.employeeId,
      });
      navigate(`/hr/employees/${res.data.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the employee.');
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="Employees"
        title="New employee"
        subtitle="Creates the registry record — checklists and leaves attach to it afterward."
      />
      <Card eyebrow="Profile" heading="Who is this?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <EmployeeForm values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
          {!values.employeeId.trim() && (
            <ChoiceRow
              type="checkbox"
              title="Assign the next EE# automatically"
              description="Uses the counter seeded from the sheet's highest ID."
              checked={assignId}
              onChange={() => setAssignId((v) => !v)}
            />
          )}
          {error && (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="submit" icon="save" disabled={busy} onClick={save}>
              {busy ? 'Creating…' : 'Create employee'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => navigate('/hr/employees')}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
