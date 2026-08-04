import { Link, useOutletContext } from 'react-router';
import { Icon } from '../ds/components/core/Icon';
import { taskKeysForDoc, type TaskKey } from '../lib/offboarding';
import type { OutletCtx } from '../App';

type Props = { currentKey: TaskKey; className?: string };

/** ds primary button rendered as a Link — skips completed and skipped tasks. */
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
      to={`/offboarding/tasks/${nextKey}`}
      className={`inline-flex h-10 items-center justify-center gap-2 px-4 transition hover:-translate-y-px active:scale-[0.98] ${className}`.trim()}
      style={{
        font: 'var(--type-button)',
        color: '#fff',
        background: 'var(--gradient-primary)',
        borderRadius: 'var(--radius-button)',
        boxShadow: 'var(--shadow-primary)',
      }}
    >
      Next task
      <Icon name="arrowRight" size={16} />
    </Link>
  );
}
