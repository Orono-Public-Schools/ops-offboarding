import { Link } from 'react-router';

export function TaskPageHeader() {
  return (
    <Link
      to="/"
      className="mb-5 inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
      style={{ borderColor: 'rgba(255,255,255,0.3)' }}
    >
      ← Back to dashboard
    </Link>
  );
}
