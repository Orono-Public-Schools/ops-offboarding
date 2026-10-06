import { useState } from 'react';
import {
  allFieldsForSubmission,
  getFormDefinition,
  isFieldVisible,
  isSectionVisible,
  type FileRef,
  type FormData,
  type FormField,
  type Submission,
  type TableColumn,
  type TableRow,
} from '../../lib/forms';
import { isIsoDate, isoToMdy } from '../../../shared/hr/util';
import { fileDownloadUrl } from '../../lib/storage';
import { QuietLink } from '../../ds/components/core/QuietLink';

/**
 * The "Composed" details treatment (design review 2026-08-11, option D2):
 * the form's own sections group the answers into a facts grid — label over
 * value, several to a row — and per-form compositions fuse related fields
 * into human blocks (street/city/state/zip becomes one postal address).
 */

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

// ---------------------------------------------------------------------------
// Per-form compositions

type Composition = {
  title: string;
  /** Field ids this block absorbs — they leave the generic grid. */
  consumes: string[];
  /** Multiline string (rendered pre-line) or null to fall back to the grid. */
  render: (data: FormData) => string | null;
};

const str = (data: FormData, id: string) =>
  typeof data[id] === 'string' ? (data[id] as string).trim() : '';

const COMPOSITIONS: Record<string, Composition[]> = {
  changeOfAddress: [
    {
      title: 'New address',
      consumes: ['street1', 'street2', 'city', 'state', 'zip'],
      render: (d) => {
        const line1 = [str(d, 'street1'), str(d, 'street2')].filter(Boolean).join(', ');
        const line2 = [str(d, 'city'), [str(d, 'state'), str(d, 'zip')].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(', ');
        if (!line1 && !line2) return null;
        return [line1, line2].filter(Boolean).join('\n');
      },
    },
  ],
};

// ---------------------------------------------------------------------------

type Fact = { label: string; value: React.ReactNode; wide?: boolean };
type Block =
  | { key: string; title: string; facts: Fact[] }
  | { key: string; title: string; body: React.ReactNode };

function factFor(field: FormField, data: FormData): Fact | null {
  const raw = data[field.id];
  if (raw === undefined || raw === '') return null;
  const labelOf = (v: string) => field.options?.find((o) => o.value === v)?.label ?? v;

  if (field.type === 'file') {
    if (typeof raw !== 'object' || Array.isArray(raw)) return null;
    return { label: field.label, value: <AttachmentLink file={raw as FileRef} /> };
  }
  if (field.type === 'table') {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return {
      label: field.label,
      value: <RowsTable rows={raw as TableRow[]} columns={field.columns} />,
      wide: true,
    };
  }
  if (field.type === 'checkbox') {
    return { label: field.label, value: raw === true ? 'Yes' : 'No' };
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return { label: field.label, value: (raw as string[]).map(labelOf).join(', '), wide: true };
  }
  const text = labelOf(String(raw));
  if (field.type === 'date' && isIsoDate(text)) {
    return { label: field.label, value: isoToMdy(text) };
  }
  if (field.type === 'textarea') {
    return {
      label: field.label,
      value: <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>,
      wide: true,
    };
  }
  return { label: field.label, value: text };
}

function buildBlocks(s: Submission): Block[] {
  const def = getFormDefinition(s.formId);
  const blocks: Block[] = [];

  if (!def) {
    // Definition since removed — flat grid of whatever was stored.
    const facts = allFieldsForSubmission(s).map((e) => ({ label: e.label, value: e.value }));
    if (facts.length) blocks.push({ key: 'legacy', title: 'Details', facts });
  } else {
    const comps = COMPOSITIONS[s.formId] ?? [];
    const consumed = new Set(comps.flatMap((c) => c.consumes));
    // A composition appears where its first field's section appears.
    const compAt = new Map<number, Composition[]>();
    for (const comp of comps) {
      const idx = def.sections.findIndex((sec) =>
        sec.fields.some((f) => f.id === comp.consumes[0]),
      );
      const at = idx < 0 ? 0 : idx;
      compAt.set(at, [...(compAt.get(at) ?? []), comp]);
    }

    def.sections.forEach((section, i) => {
      const sectionVisible = isSectionVisible(section, s.data);
      if (sectionVisible) {
        for (const comp of compAt.get(i) ?? []) {
          const body = comp.render(s.data);
          if (body !== null) {
            blocks.push({
              key: `comp-${comp.title}`,
              title: comp.title,
              body: (
                <p
                  style={{
                    font: '400 15px/1.55 var(--font-sans)',
                    color: 'var(--dark)',
                    whiteSpace: 'pre-line',
                    margin: 0,
                  }}
                >
                  {body}
                </p>
              ),
            });
          }
        }
        const facts = section.fields
          .filter((f) => !consumed.has(f.id) && isFieldVisible(f, s.data))
          .map((f) => factFor(f, s.data))
          .filter((f): f is Fact => f !== null);
        if (facts.length) {
          blocks.push({ key: `sec-${i}`, title: section.title ?? 'Details', facts });
        }
      }
    });
  }

  blocks.push({
    key: 'filed-by',
    title: 'Filed by',
    body: (
      <p style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--dark)', margin: 0 }}>
        {s.submitterName} <span style={{ color: 'var(--text-muted)' }}>· {s.submitterEmail}</span>
      </p>
    ),
  });
  return blocks;
}

const groupTitle: React.CSSProperties = {
  font: '600 12px/1 var(--font-sans)',
  letterSpacing: 'var(--tracking-wider)',
  textTransform: 'uppercase',
  color: 'var(--secondary)',
  margin: '0 0 10px',
};

const factLabel: React.CSSProperties = {
  font: '600 10.5px/1.4 var(--font-sans)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

export function SubmissionFacts({ submission }: { submission: Submission }) {
  const blocks = buildBlocks(submission);
  return (
    <div>
      {blocks.map((block, i) => (
        <div
          key={block.key}
          style={
            i === 0
              ? undefined
              : { marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--divider)' }
          }
        >
          <p style={groupTitle}>{block.title}</p>
          {'facts' in block ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '16px 24px',
              }}
            >
              {block.facts.map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    minWidth: 0,
                    gridColumn: f.wide ? '1 / -1' : undefined,
                  }}
                >
                  <span style={factLabel}>{f.label}</span>
                  <span style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--dark)' }}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            block.body
          )}
        </div>
      ))}
    </div>
  );
}
