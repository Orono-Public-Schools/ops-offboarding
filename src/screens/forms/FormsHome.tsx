import { Link } from 'react-router';
import { useAuth } from '../../lib/auth';
import { FORM_DEFINITIONS, STATUS_BADGES, useMySubmissions } from '../../lib/forms';

export function FormsHome() {
  const { user } = useAuth();
  const subs = useMySubmissions(user?.uid ?? null);
  const forms = Object.values(FORM_DEFINITIONS);

  return (
    <div>
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
        style={{ borderColor: 'rgba(255,255,255,0.3)' }}
      >
        ← Back to portal
      </Link>

      <h1 className="text-xl font-bold text-white sm:text-2xl">HR Forms</h1>
      <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Submit a form to HR and track its status here.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5">
        {forms.map((f) => (
          <Link
            key={f.id}
            to={`/forms/${f.id}`}
            className="block rounded-xl p-4 transition hover:-translate-y-px sm:p-5"
            style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-ops-navy)' }}
              >
                {f.title}
              </h2>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-ops-blue)' }}>
                Start →
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              {f.description}
            </p>
          </Link>
        ))}
      </div>

      <h2
        className="mt-10 text-[11px] font-semibold tracking-wider uppercase"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        My submissions
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {subs.loading && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Loading…
          </p>
        )}
        {subs.error && (
          <p className="text-sm" style={{ color: '#fecaca' }}>
            {subs.error}
          </p>
        )}
        {subs.submissions?.length === 0 && (
          <div
            className="rounded-xl px-4 py-6 text-center text-sm"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px dashed rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            Nothing submitted yet.
          </div>
        )}
        {subs.submissions?.map((s) => {
          const badge = STATUS_BADGES[s.status];
          return (
            <Link
              key={s.id}
              to={`/forms/submissions/${s.id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition hover:-translate-y-px"
              style={{ background: '#ffffff', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-ops-navy)' }}>
                  {s.formTitle}
                  <span className="ml-2 font-normal" style={{ color: 'var(--color-ink-faint)' }}>
                    {s.id}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                  {s.summary} · {s.createdAt ? s.createdAt.toDate().toLocaleDateString() : ''}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
