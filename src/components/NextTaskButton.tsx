import { Link, useOutletContext } from 'react-router';
import { taskKeysForDoc, type TaskKey } from '../lib/offboarding';
import type { OutletCtx } from '../App';

type Props = { currentKey: TaskKey; className?: string };

export function NextTaskButton({ currentKey, className = '' }: Props) {
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

  if (!nextKey) return null;

  return (
    <Link
      to={`/tasks/${nextKey}`}
      className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:shadow-md active:scale-[0.98] ${className}`.trim()}
      style={{
        background: '#ffffff',
        color: '#1d2a5d',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      Next task →
    </Link>
  );
}
