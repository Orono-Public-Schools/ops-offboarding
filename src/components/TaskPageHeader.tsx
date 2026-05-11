import { Link, useOutletContext } from 'react-router';
import { taskKeysForDoc, type TaskKey } from '../lib/offboarding';
import type { OutletCtx } from '../App';

type Props = { currentKey: TaskKey };

export function TaskPageHeader({ currentKey }: Props) {
  const { doc } = useOutletContext<OutletCtx>();
  const keys = taskKeysForDoc(doc);
  const idx = keys.indexOf(currentKey);

  const nextKey =
    idx >= 0
      ? keys.slice(idx + 1).find((k) => {
          const status = doc.tasks[k]?.status ?? 'not_started';
          return status !== 'completed' && status !== 'skipped';
        })
      : undefined;

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs font-semibold transition hover:text-white"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        ← Back to dashboard
      </Link>
      {nextKey && (
        <Link
          to={`/tasks/${nextKey}`}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-px hover:bg-white/10 active:scale-[0.98]"
          style={{ borderColor: 'rgba(255,255,255,0.4)' }}
        >
          Next task →
        </Link>
      )}
    </div>
  );
}
