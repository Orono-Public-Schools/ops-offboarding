import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsHR } from '../../lib/auth';
import {
  allFieldsForSubmission,
  updateSubmissionStatus,
  useSubmission,
  type Submission,
  type SubmissionStatus,
} from '../../lib/forms';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { PageTitle } from '../../ds/components/navigation/PageTitle';
import { StatusTrack } from '../../ds/components/records/StatusTrack';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { Field } from '../../ds/components/forms/Field';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';

const STAGES = ['Filed', 'Received', 'Processing', 'Complete'];
const STAGE_FOR_STATUS: Record<string, number> = { submitted: 1, processing: 2, completed: 3 };

function formatTs(ts: { toDate: () => Date } | null): string {
  if (!ts) return '';
  return ts.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function actionLabel(action: string): string {
  switch (action) {
    case 'submitted':
      return 'Filed';
    case 'status_processing':
      return 'Picked up by HR';
    case 'status_completed':
      return 'Completed';
    case 'status_denied':
      return 'Denied';
    default:
      return action;
  }
}

function HrActions({ submission }: { submission: Submission }) {
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<SubmissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (status: SubmissionStatus) => {
    setError(null);
    setPending(status);
    try {
      await updateSubmissionStatus({ id: submission.id, status, note: note.trim() || null });
      setNote('');
    } catch (err) {
      console.error(err);
      setError('Could not update the submission. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Card eyebrow="Decision" heading="Move this request" pad={16}>
      <Field
        label="Note to the submitter"
        as="textarea"
        rows={2}
        value={note}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
        placeholder="Optional — lands in their activity trail, written by you."
        optional
      />
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {submission.status !== 'denied' && (
          <Button variant="destructive" disabled={pending !== null} onClick={() => act('denied')}>
            {pending === 'denied' ? 'Working…' : 'Deny'}
          </Button>
        )}
        {submission.status === 'submitted' && (
          <Button variant="secondary" disabled={pending !== null} onClick={() => act('processing')}>
            {pending === 'processing' ? 'Working…' : 'Pick up'}
          </Button>
        )}
        {submission.status !== 'completed' && (
          <Button
            variant="primary"
            icon="check"
            disabled={pending !== null}
            onClick={() => act('completed')}
          >
            {pending === 'completed' ? 'Working…' : 'Complete'}
          </Button>
        )}
      </div>
      {error && (
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--accent)',
            background: 'rgba(var(--accent-rgb), 0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            textAlign: 'center',
            margin: '12px 0 0',
          }}
        >
          {error}
        </p>
      )}
    </Card>
  );
}

export function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isHR = useIsHR();
  const state = useSubmission(id ?? null);

  if (state.loading) {
    return (
      <p
        style={{
          font: 'var(--type-body-sm)',
          color: 'var(--on-dark-faint)',
          textAlign: 'center',
          padding: '48px 0',
        }}
      >
        Loading…
      </p>
    );
  }
  if (state.error !== null) {
    return (
      <EmptyState
        icon="search"
        line="We can't find that request"
        note={state.error}
        action={
          <Button variant="secondary" onClick={() => navigate('/forms')}>
            Back to forms
          </Button>
        }
      />
    );
  }

  const s = state.submission;
  const denied = s.status === 'denied';

  return (
    <>
      <PageTitle
        eyebrow={`${s.id} · filed ${formatTs(s.createdAt)}`}
        title={s.formTitle}
        subtitle={denied ? 'This one came back — the note below says why.' : undefined}
        actions={<StatusBadge state={s.status} size="md" />}
      />

      {!denied && (
        <Card eyebrow="Where it sits" heading="The path this request takes" pad={16}>
          <StatusTrack stages={STAGES} current={STAGE_FOR_STATUS[s.status] ?? 1} />
        </Card>
      )}

      <Card eyebrow="Details" heading="What you told us" pad={16}>
        <RowList>
          <DetailRow label="Filed by" value={`${s.submitterName} · ${s.submitterEmail}`} />
          {allFieldsForSubmission(s).map(({ label, value }) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </RowList>
      </Card>

      {isHR && <HrActions submission={s} />}

      <Card eyebrow="Activity" heading="Everything that's happened" pad={16}>
        <RowList>
          {s.activityLog.map((entry, i) => (
            <DetailRow
              key={i}
              label={formatTs(entry.ts)}
              value={
                <>
                  <span style={{ font: 'var(--type-strong)' }}>{actionLabel(entry.action)}</span>
                  <span style={{ color: 'var(--text-muted)' }}> · {entry.actorEmail}</span>
                  {entry.note && (
                    <div
                      style={{
                        font: 'var(--type-body-sm)',
                        color: 'var(--text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {entry.note}
                    </div>
                  )}
                </>
              }
            />
          ))}
        </RowList>
      </Card>
    </>
  );
}
