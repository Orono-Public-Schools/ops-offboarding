import { Link } from 'react-router';

export function TaskPageHeader() {
  return (
    <Link
      to="/"
      className="mb-5 inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
      style={{ color: 'rgba(255,255,255,0.5)' }}
    >
      ← Back to dashboard
    </Link>
  );
}
