import { useNavigate, useParams } from 'react-router';
import { FormRenderer } from '../../components/forms/FormRenderer';
import { getFormDefinition } from '../../lib/forms';
import { Button } from '../../ds/components/core/Button';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { EmptyState } from '../../ds/components/records/EmptyState';

export function FormFillScreen() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const def = formId ? getFormDefinition(formId) : null;

  if (!def) {
    return (
      <EmptyState
        icon="fileText"
        line="That form isn't here"
        note="It may not be open yet, or the link is old."
        action={
          <Button variant="secondary" onClick={() => navigate('/forms')}>
            Back to forms
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageTitle
        eyebrow="HR forms"
        title={def.title}
        subtitle={`${def.description} Your draft saves as you type — you can stop halfway.`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/forms')}>
            Back
          </Button>
        }
      />
      <FormRenderer def={def} onSubmitted={(id) => navigate(`/forms/submissions/${id}`)} />
    </>
  );
}
