import { useState } from 'react';
import { importHrMasterSheet, useHrImportStatus, type ImportReport } from '../../lib/hr';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { RowList, DetailRow } from '../../ds/components/forms/RowList';

const TAB_LABELS: Record<string, string> = {
  newEmployees: 'New employees',
  idAssignments: 'Employee ID assignments',
  ceSub: 'CE / Sub / Coaching',
  nto: 'New teacher orientation',
  terminated: 'Terminated employees',
  loa: 'Leaves of absence',
  contractChanges: 'Contract changes',
  nameChange: 'Name changes',
  addressChange: 'Address changes',
};

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

export function ImportCard({ defaultOpen }: { defaultOpen?: boolean }) {
  const status = useHrImportStatus();
  const [busy, setBusy] = useState<'dryRun' | 'commit' | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: 'dryRun' | 'commit') => {
    setBusy(mode);
    setError(null);
    try {
      const res = await importHrMasterSheet({ mode });
      setReport(res.data);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card eyebrow="Import" heading="Master sheet import" collapsible defaultOpen={defaultOpen}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Reads HR's master workbook (New EE Checklist) and rebuilds the imported employees,
          checklists, leaves, and changes from it. Records added by hand in the portal are left
          alone — but portal edits <em>to previously imported records</em> are replaced by the
          sheet's version, so import while the sheet is still the source of truth.
        </p>
        {status?.lastRunAt && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Last imported {status.lastRunAt.toDate().toLocaleString()} by {status.by}.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="search"
            disabled={busy !== null}
            onClick={() => run('dryRun')}
          >
            {busy === 'dryRun' ? 'Reading the sheet…' : 'Preview import'}
          </Button>
          {report?.mode === 'dryRun' && (
            <Button
              variant="submit"
              icon="download"
              disabled={busy !== null}
              onClick={() => run('commit')}
            >
              {busy === 'commit' ? 'Importing…' : 'Import now'}
            </Button>
          )}
        </div>

        {error && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>{error}</p>
        )}

        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ font: 'var(--type-body-sm)', fontWeight: 600, margin: 0 }}>
              {report.mode === 'dryRun'
                ? 'Preview — nothing has been written yet.'
                : 'Imported. The lists above are live.'}
            </p>
            <RowList>
              <DetailRow label="Employees" value={String(report.counts.employees)} />
              <DetailRow label="Checklists" value={String(report.counts.processes)} />
              <DetailRow label="Leaves" value={String(report.counts.leaves)} />
              <DetailRow label="Changes" value={String(report.counts.changes)} />
              <DetailRow label="Highest EE#" value={String(report.maxEmployeeId || '—')} />
              {Object.entries(report.counts.byTab).map(([k, v]) => (
                <DetailRow key={k} label={TAB_LABELS[k] ?? k} value={`${v} rows`} />
              ))}
              {report.deleted && (
                <DetailRow
                  label="Replaced"
                  value={`${report.deleted.employees} employees, ${
                    report.deleted.processes + report.deleted.leaves + report.deleted.changes
                  } records from the previous import`}
                />
              )}
            </RowList>
            {report.tabsMissing.length > 0 && (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
                Tabs not found: {report.tabsMissing.join(', ')}
              </p>
            )}
            {report.warnings.length > 0 && (
              <div
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  font: 'var(--type-body-sm)',
                  color: 'var(--text-muted)',
                }}
              >
                {report.warnings.map((w, i) => (
                  <p key={i} style={{ margin: '0 0 4px' }}>
                    · {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
