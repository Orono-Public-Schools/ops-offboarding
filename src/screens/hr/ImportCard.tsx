import { useState } from 'react';
import {
  importHrMasterSheet,
  prettyDate,
  useHrImportStatus,
  type ImportReport,
} from '../../lib/hr';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { CheckMark } from '../../ds/components/forms/CheckMark';

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

/**
 * Review-first sheet import: Preview lists only people NOT yet in the portal
 * (matched by EE#, then name); you choose who comes in. Existing employees
 * are never modified.
 */
export function ImportCard({ defaultOpen }: { defaultOpen?: boolean }) {
  const status = useHrImportStatus();
  const [busy, setBusy] = useState<'dryRun' | 'commit' | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const preview = async () => {
    setBusy('dryRun');
    setError(null);
    try {
      const res = await importHrMasterSheet({ mode: 'dryRun' });
      setReport(res.data);
      setSelection(new Set(res.data.candidates.map((c) => c.key)));
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    setBusy('commit');
    setError(null);
    try {
      const res = await importHrMasterSheet({ mode: 'commit', include: [...selection] });
      setReport(res.data);
      setSelection(new Set());
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const toggle = (key: string) =>
    setSelection((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const candidates = report?.mode === 'dryRun' ? report.candidates : [];
  const allSelected = candidates.length > 0 && selection.size === candidates.length;

  return (
    <Card eyebrow="Import" heading="Master sheet import" collapsible defaultOpen={defaultOpen}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Reads HR's master workbook and finds people who aren't in the portal yet — you review the
          list and choose who to bring in. People already here are never changed by an import.
        </p>
        {status?.lastRunAt && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Last imported {status.lastRunAt.toDate().toLocaleString()} by {status.by}.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="search" disabled={busy !== null} onClick={preview}>
            {busy === 'dryRun' ? 'Reading the sheet…' : 'Preview import'}
          </Button>
          {candidates.length > 0 && (
            <Button
              variant="submit"
              icon="download"
              disabled={busy !== null || selection.size === 0}
              onClick={commit}
            >
              {busy === 'commit'
                ? 'Importing…'
                : `Import ${selection.size} ${selection.size === 1 ? 'person' : 'people'}`}
            </Button>
          )}
        </div>

        {error && (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>{error}</p>
        )}

        {report?.mode === 'commit' && (
          <p style={{ font: 'var(--type-body-sm)', fontWeight: 600, margin: 0 }}>
            Imported {report.imported ?? 0} {report.imported === 1 ? 'person' : 'people'}. The
            roster above is live.
          </p>
        )}

        {report?.mode === 'dryRun' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <p style={{ font: 'var(--type-body-sm)', fontWeight: 600, margin: 0 }}>
                {candidates.length === 0
                  ? 'Everyone in the sheet is already in the portal.'
                  : `${candidates.length} new ${candidates.length === 1 ? 'person' : 'people'} found`}
                {report.counts.skippedExisting > 0 &&
                  ` · ${report.counts.skippedExisting} already here, left untouched`}
              </p>
              {candidates.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelection(allSelected ? new Set() : new Set(candidates.map((c) => c.key)))
                  }
                >
                  {allSelected ? 'Select none' : 'Select all'}
                </Button>
              )}
            </div>

            {candidates.length > 0 && (
              <div
                style={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid var(--border-input)',
                  borderRadius: 10,
                }}
              >
                {candidates.map((c, i) => {
                  const on = selection.has(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => toggle(c.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckMark checked={on} size={16} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            font: '600 13px/1.35 var(--font-sans)',
                            color: 'var(--dark)',
                            display: 'block',
                          }}
                        >
                          {c.name}
                          {c.employeeId && (
                            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                              {' '}
                              · {c.employeeId}
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            font: '400 11.5px/1.4 var(--font-sans)',
                            color: 'var(--text-muted)',
                            display: 'block',
                          }}
                        >
                          {[
                            c.position,
                            c.building,
                            c.startDate ? `starts ${prettyDate(c.startDate)}` : null,
                            c.kind === 'ce_sub_coach' ? 'CE/Sub/Coaching' : null,
                            `${c.records} record${c.records === 1 ? '' : 's'}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {report.tabsMissing.length > 0 && (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
                Tabs not found: {report.tabsMissing.join(', ')}
              </p>
            )}
            {report.warnings.length > 0 && (
              <div
                style={{
                  maxHeight: 120,
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
