import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { google } from 'googleapis';

import { REGION, requireAuthedDomainUser } from './shared';
import { EMPLOYEE_ID_COUNTER_DOC, reconcileGoogleAccounts } from './hr';
import {
  buildImportPlan,
  finalStatus,
  TAB_MATCHERS,
  type PendingEmployee,
  type TabKey,
} from './shared-gen/hr/importParse';
import { isChecklistComplete, PROCESS_SPECS } from './shared-gen/hr/catalog';
import { currentFiscalYearLabel, fiscalYearLabel, nameMatchKeys } from './shared-gen/hr/util';

// HR's master workbook ("<year> New EE Checklist"), shared read-only with the
// compute service account. Tabs are matched by pattern so yearly renames and
// reordering don't break the import.
const HR_MASTER_SHEET_ID = '1AHpraAF9mjO_hEgAGw5aBFMDTCe3Mk9DtUZlsgXOiEg';

async function fetchWorkbook(): Promise<{
  tabs: Partial<Record<TabKey, unknown[][]>>;
  found: string[];
  missing: TabKey[];
}> {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  let titles: string[];
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: HR_MASTER_SHEET_ID,
      fields: 'sheets.properties.title',
    });
    titles = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? '').filter(Boolean);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new HttpsError(
      'internal',
      `Sheets API error: ${msg}. Check that the master sheet is shared with the function's service account.`,
    );
  }

  const matched: Array<{ key: TabKey; title: string }> = [];
  for (const { key, match } of TAB_MATCHERS) {
    const title = titles.find((t) => match(t));
    if (title && !matched.some((m) => m.title === title)) matched.push({ key, title });
  }

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: HR_MASTER_SHEET_ID,
    ranges: matched.map((m) => `'${m.title.replace(/'/g, "''")}'`),
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });

  const tabs: Partial<Record<TabKey, unknown[][]>> = {};
  (res.data.valueRanges ?? []).forEach((vr, i) => {
    tabs[matched[i].key] = (vr.values as unknown[][]) ?? [];
  });
  return {
    tabs,
    found: matched.map((m) => m.title),
    missing: TAB_MATCHERS.map((m) => m.key).filter((k) => !(k in tabs)),
  };
}

/** Stable identity for a sheet person across preview → import: EE# when
 *  present, otherwise their normalized name. */
function candidateKey(emp: PendingEmployee): string {
  if (emp.employeeId !== null) return `ee:${emp.employeeId}`;
  return `n:${nameMatchKeys(emp.nameRaw)[0] ?? emp.nameRaw.toLowerCase()}`;
}

/** Who's already in the portal, matchable the same way the sheet merges
 *  identities: EE# first, then name in either order. */
async function existingMatcher(): Promise<(emp: PendingEmployee) => boolean> {
  const db = getFirestore();
  const snap = await db.collection('employees').get();
  const byEe = new Set<number>();
  const byName = new Set<string>();
  for (const doc of snap.docs) {
    const e = doc.data() as {
      employeeId?: number | null;
      nameRaw?: string;
      firstName?: string;
      lastName?: string;
    };
    if (e.employeeId) byEe.add(Number(e.employeeId));
    for (const raw of [e.nameRaw, `${e.firstName ?? ''} ${e.lastName ?? ''}`]) {
      if (!raw?.trim()) continue;
      for (const k of nameMatchKeys(raw)) byName.add(k);
    }
  }
  return (emp) => {
    if (emp.employeeId !== null && byEe.has(emp.employeeId)) return true;
    return nameMatchKeys(emp.nameRaw).some((k) => byName.has(k));
  };
}

export const importHrMasterSheet = onCall(
  { region: REGION, timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    const actor = requireAuthedDomainUser(request);
    const token = (request.auth?.token ?? {}) as Record<string, unknown>;
    if (token.hr !== true && token.it_admin !== true) {
      throw new HttpsError('permission-denied', 'HR access required.');
    }
    const data = (request.data ?? {}) as { mode?: string; include?: unknown };
    const mode = data.mode;
    if (mode !== 'dryRun' && mode !== 'commit') {
      throw new HttpsError('invalid-argument', 'mode must be "dryRun" or "commit".');
    }

    const { tabs, found, missing } = await fetchWorkbook();
    const todayIso = new Date().toISOString().slice(0, 10);
    const plan = buildImportPlan(tabs, todayIso);
    const isExisting = await existingMatcher();

    // The import only ever ADDS people. Anyone already in the portal is left
    // exactly as they are — no updates, no replacements.
    const candidates = plan.employees.filter((e) => !isExisting(e));
    const skippedExisting = plan.employees.length - candidates.length;

    const recordCount = (list: PendingEmployee[], c: 'processes' | 'leaves' | 'changes') =>
      list.reduce((n, e) => n + e.records.filter((r) => r.collection === c).length, 0);

    const report = {
      mode,
      tabsFound: found,
      tabsMissing: missing,
      counts: {
        candidates: candidates.length,
        skippedExisting,
        processes: recordCount(candidates, 'processes'),
        leaves: recordCount(candidates, 'leaves'),
        changes: recordCount(candidates, 'changes'),
        byTab: plan.byTab,
      },
      candidates: candidates.map((e) => ({
        key: candidateKey(e),
        name: e.nameRaw,
        employeeId: e.employeeId,
        position: e.position ?? e.description,
        building: e.building,
        startDate: e.startDate,
        status: finalStatus(e, todayIso),
        kind: e.kind,
        records: e.records.length,
      })),
      warnings: plan.warnings,
      maxEmployeeId: plan.maxEmployeeId,
    };

    if (mode === 'dryRun') return report;

    if (!Array.isArray(data.include) || data.include.some((k) => typeof k !== 'string')) {
      throw new HttpsError(
        'invalid-argument',
        'commit requires include: string[] of candidate keys.',
      );
    }
    const include = new Set(data.include as string[]);
    const selected = candidates.filter((e) => include.has(candidateKey(e)));

    const db = getFirestore();
    const batchId = `imp-${Date.now().toString(36)}`;
    const writer = db.bulkWriter();
    const now = FieldValue.serverTimestamp();
    for (const emp of selected) {
      const ref = db.collection('employees').doc();
      const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.nameRaw;
      writer.set(ref, {
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        nameRaw: emp.nameRaw,
        email: emp.email,
        status: finalStatus(emp, todayIso),
        kind: emp.kind,
        building: emp.building,
        position: emp.position,
        reportsTo: emp.reportsTo,
        startDate: emp.startDate,
        endDate: emp.endDate,
        description: emp.description,
        notes: emp.notes,
        source: 'import',
        importBatchId: batchId,
        createdAt: now,
        createdBy: actor.email,
        updatedAt: now,
        updatedBy: actor.email,
      });
      writer.set(ref.collection('history').doc(), {
        ts: now,
        actor: actor.uid,
        actorEmail: actor.email,
        action: 'imported',
        changes: [],
      });

      for (const rec of emp.records) {
        const base = {
          employeeRef: ref.id,
          employeeName: name,
          employeeIdNum: emp.employeeId,
          building: rec.building ?? emp.building,
          position: rec.position ?? emp.position,
          details: rec.details,
          notes: rec.notes,
          source: 'import',
          importBatchId: batchId,
          createdAt: now,
          createdBy: actor.email,
          updatedAt: now,
          updatedBy: actor.email,
        };
        if (rec.collection === 'processes') {
          const allDone = isChecklistComplete(PROCESS_SPECS[rec.type], rec.tasks);
          const basis =
            rec.details.startDate || rec.details.termDate || rec.details.boardDate || null;
          writer.set(db.collection('processes').doc(), {
            ...base,
            type: rec.type,
            status: allDone ? 'complete' : 'open',
            reportsTo: rec.reportsTo ?? emp.reportsTo,
            fiscalYear: fiscalYearLabel(basis) ?? currentFiscalYearLabel(new Date()),
            tasks: rec.tasks,
          });
        } else if (rec.collection === 'leaves') {
          writer.set(db.collection('leaves').doc(), {
            ...base,
            status: rec.status,
            statusRaw: rec.statusRaw,
            reason: rec.reason,
            tasks: {},
          });
        } else {
          writer.set(db.collection('changes').doc(), {
            ...base,
            type: rec.type,
            submissionId: null,
            tasks: rec.tasks,
          });
        }
      }
    }
    await writer.close();

    // Seed the EE# counter — never lower it.
    await db.runTransaction(async (tx) => {
      const counterRef = db.collection('appSettings').doc(EMPLOYEE_ID_COUNTER_DOC);
      const snap = await tx.get(counterRef);
      const existing = snap.exists ? Number(snap.get('nextId')) || 0 : 0;
      tx.set(counterRef, { nextId: Math.max(existing, plan.maxEmployeeId + 1) }, { merge: true });
    });

    await db
      .collection('appSettings')
      .doc('hrImport')
      .set({
        lastRunAt: now,
        batchId,
        mode,
        by: actor.email,
        imported: selected.length,
        skippedExisting,
        notSelected: candidates.length - selected.length,
      });

    // Newly imported hires whose Google account already exists get their
    // employee email filled right away instead of waiting for the nightly sync.
    const reconciled = await reconcileGoogleAccounts();

    return { ...report, batchId, imported: selected.length, reconciled };
  },
);
