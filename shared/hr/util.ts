/**
 * Parsing helpers for HR data. The master workbook mixes real dates with
 * text ("TBD", "Signed", "Winter 2026") and names in both "Last, First" and
 * "First Last" — these normalize what's clean and preserve what isn't.
 */

/** Google Sheets / Excel serial date (days since 1899-12-30) → YYYY-MM-DD. */
export function serialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 200000) return null;
  const ms = Math.round((serial - 25569) * 86_400_000); // 25569 = days to 1970-01-01
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Best-effort date normalization for a sheet cell. Numbers are treated as
 * serials; strings matching M/D/YYYY or YYYY-MM-DD become ISO; anything else
 * (including "TBD") comes back as the trimmed raw text. Null when empty.
 */
export function normalizeSheetDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return serialToIso(value) ?? String(value);
  const raw = String(value).trim();
  if (!raw) return null;
  const mdY = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdY) {
    const [, m, d, y] = mdY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

export function isIsoDate(value: string | null | undefined): boolean {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Fiscal-year label with a July 1 boundary: 2026-08-19 → "2026-27". */
export function fiscalYearLabel(iso: string | null): string | null {
  if (!isIsoDate(iso)) return null;
  const year = Number(iso!.slice(0, 4));
  const month = Number(iso!.slice(5, 7));
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function currentFiscalYearLabel(now: Date): string {
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * Split a raw name cell into first/last. "Last, First" is unambiguous; for
 * "First [Middle] Last" the final token is taken as the last name. Callers
 * keep the raw string alongside for fidelity.
 */
export function parseName(raw: string): { firstName: string; lastName: string } {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { firstName: '', lastName: '' };
  const comma = cleaned.indexOf(',');
  if (comma > 0) {
    return {
      lastName: cleaned.slice(0, comma).trim(),
      firstName: cleaned.slice(comma + 1).trim(),
    };
  }
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/**
 * Identity-match keys for a name: lowercase, punctuation stripped, in both
 * "first last" and "last first" orders — so "Tahir, Fuad" and "Fuad Tahir"
 * collide regardless of which format each tab used.
 */
export function nameMatchKeys(raw: string): string[] {
  const norm = raw
    .toLowerCase()
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!norm) return [];
  const { firstName, lastName } = parseName(raw);
  const a = `${firstName} ${lastName}`
    .toLowerCase()
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const b = `${lastName} ${firstName}`
    .toLowerCase()
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(new Set([norm, a, b].filter(Boolean)));
}
