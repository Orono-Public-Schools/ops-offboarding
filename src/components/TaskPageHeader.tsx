import { Link } from 'react-router';
import { Icon } from '../ds/components/core/Icon';

/**
 * Drill-in back control for the task pages. Sits on the gradient shell, so it
 * uses the on-dark outline formula (white text, 10% fill, 30% border).
 */
export function TaskPageHeader() {
  return (
    <Link
      to="/offboarding"
      className="mb-5 inline-flex h-10 items-center gap-2 px-4 transition hover:-translate-y-px active:scale-[0.98]"
      style={{
        font: 'var(--type-button)',
        color: 'var(--on-dark)',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: 'var(--radius-button)',
      }}
    >
      <Icon name="arrowRight" size={16} style={{ transform: 'rotate(180deg)' }} />
      Back to checklist
    </Link>
  );
}
