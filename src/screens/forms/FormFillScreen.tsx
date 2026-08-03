import { Link, useNavigate, useParams } from 'react-router';
import { FormRenderer } from '../../components/forms/FormRenderer';
import { getFormDefinition } from '../../lib/forms';

export function FormFillScreen() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const def = formId ? getFormDefinition(formId) : null;

  if (!def) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          That form doesn't exist (or isn't available yet).
        </p>
        <Link
          to="/forms"
          className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4"
        >
          Back to forms
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/forms"
        className="mb-5 inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
        style={{ borderColor: 'rgba(255,255,255,0.3)' }}
      >
        ← Back to forms
      </Link>

      <h1 className="text-xl font-bold text-white sm:text-2xl">{def.title}</h1>
      <p className="mt-1 mb-6 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {def.description}
      </p>

      <FormRenderer def={def} onSubmitted={(id) => navigate(`/forms/submissions/${id}`)} />
    </div>
  );
}
