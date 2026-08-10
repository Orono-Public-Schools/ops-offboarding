import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth, useIsHR } from '../../lib/auth';
import {
  allFieldsForSubmission,
  createLeaveFromSubmission,
  updateSubmissionStatus,
  useSubmission,
  type FileRef,
  type Submission,
  type SubmissionStatus,
  type TableColumn,
  type TableRow,
} from '../../lib/forms';
import { useEmployees, type EmployeeDoc } from '../../lib/hr';
import { fileDownloadUrl } from '../../lib/storage';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { QuietLink } from '../../ds/components/core/QuietLink';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { StatusTrack } from '../../ds/components/records/StatusTrack';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { Field } from '../../ds/components/forms/Field';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';

/** Opens an attachment via a short-lived download URL; Storage rules let the
 *  submitter, HR, and IT read it. */
function AttachmentLink({ file }: { file: FileRef }) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  return (
    <QuietLink
      icon="download"
      onClick={async () => {
        setState('busy');
        try {
          const url = await fileDownloadUrl(file.path);
          window.open(url, '_blank', 'noopener');
          setState('idle');
        } catch (err) {
          console.error(err);
          setState('failed');
        }
      }}
    >
      {state === 'busy'
        ? 'Opening…'
        : state === 'failed'
          ? `${file.name} — could not open`
          : file.name}
    </QuietLink>
  );
}

function RowsTable({ rows, columns }: { rows: TableRow[]; columns?: TableColumn[] }) {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: 'left',
                  padding: '2px 14px 4px 0',
                  font: 'var(--type-field-label)',
                  letterSpacing: 'var(--tracking-wider)',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: '3px 14px 3px 0',
                    font: 'var(--type-body-sm)',
                    color: 'var(--dark)',
                    verticalAlign: 'top',
                  }}
                >
                  {r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
    case 'leave_created':
      return 'Leave record created';
    default:
      return action;
  }
}

/** Best guess at which employee record an LOA submission belongs to: their
 *  sign-in email, then the EE# they typed, then an exact name match. HR
 *  confirms or overrides the pick — the guess never creates anything. */
function matchEmployee(s: Submission, employees: EmployeeDoc[]): string {
  const email = s.submitterEmail.toLowerCase();
  const byEmail = employees.find((e) => (e.email ?? '').toLowerCase() === email);
  if (byEmail) return byEmail.id;
  const ee = Number(s.data.employeeId);
  if (Number.isFinite(ee) && ee > 0) {
    const byId = employees.find((e) => e.employeeId === ee);
    if (byId) return byId.id;
  }
  const name = s.submitterName.trim().toLowerCase();
  const byName = employees.find(
    (e) => `${e.firstName} ${e.lastName}`.trim().toLowerCase() === name,
  );
  return byName?.id ?? '';
}

function employeeOptionLabel(e: EmployeeDoc): string {
  const name =
    e.lastName && e.firstName ? `${e.lastName}, ${e.firstName}` : e.nameRaw || e.lastName;
  const extra = [e.employeeId ? `EE# ${e.employeeId}` : null, e.building]
    .filter(Boolean)
    .join(' · ');
  return extra ? `${name} — ${extra}` : name;
}

/** HR-only, LOA submissions: hands the notification off to the Leaves tab. */
function LeaveRecordCard({ submission }: { submission: Submission }) {
  const navigate = useNavigate();
  const employees = useEmployees(!submission.leaveId);
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submission.leaveId) {
    return (
      <Card eyebrow="Leave record" heading="On the Leaves tab" pad={16}>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          This notification already has a leave record — dates and status live there now.
        </p>
        <Button
          variant="secondary"
          onClick={() => navigate(`/hr/records/leaves/${submission.leaveId}`)}
        >
          Open the leave record
        </Button>
      </Card>
    );
  }

  const list = employees.items ?? [];
  const selected = choice ?? matchEmployee(submission, list);

  const create = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await createLeaveFromSubmission({ submissionId: submission.id, employeeRef: selected });
      // The live snapshot picks up leaveId and flips this card to the link.
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not create the leave record.');
      setBusy(false);
    }
  };

  return (
    <Card eyebrow="Leave record" heading="Start the leave record" pad={16}>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
        Copies the dates and reason category onto a new record under Leaves, linked back to this
        notification. Everything else lands in the record's notes.
      </p>
      {employees.loading ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Loading employees…
        </p>
      ) : employees.error ? (
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
          {employees.error}
        </p>
      ) : (
        <>
          <Field
            label="Employee"
            as="select"
            value={selected}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChoice(e.target.value)}
            options={[
              { value: '', label: 'Pick the employee…' },
              ...list.map((e) => ({ value: e.id, label: employeeOptionLabel(e) })),
            ]}
            help={
              selected
                ? undefined
                : 'No employee record matched this submitter — pick them by hand, or add them under New employees first.'
            }
          />
          <div className="mt-4 flex justify-end">
            <Button variant="primary" icon="plus" disabled={!selected || busy} onClick={create}>
              {busy ? 'Working…' : 'Create leave record'}
            </Button>
          </div>
        </>
      )}
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
  const { user } = useAuth();
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
  // HR reading someone else's submission came from the inbox; the submitter
  // (HR or not) came from their forms page.
  const hrView = isHR && s.submitterUid !== user?.uid;

  return (
    <>
      <ScreenHeader
        crumb={hrView ? 'HR inbox' : 'HR forms'}
        onBack={() => navigate(hrView ? '/hr' : '/forms')}
        title={s.formTitle}
        subtitle={denied ? 'This one came back — the note below says why.' : undefined}
        note={`${s.id} · filed ${formatTs(s.createdAt)}`}
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
          {allFieldsForSubmission(s).map((entry) => (
            <DetailRow
              key={entry.label}
              label={entry.label}
              value={
                entry.file ? (
                  <AttachmentLink file={entry.file} />
                ) : entry.rows ? (
                  <RowsTable rows={entry.rows} columns={entry.columns} />
                ) : (
                  entry.value
                )
              }
            />
          ))}
        </RowList>
      </Card>

      {isHR && s.formId === 'leaveOfAbsence' && (s.leaveId || !denied) && (
        <LeaveRecordCard submission={s} />
      )}

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
