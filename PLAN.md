# OronoHR — Plan

An HR portal for Orono Public Schools staff, grown out of the OPS Offboarding app. Three pillars:

1. **Onboarding** — HR-initiated new-hire tracking + a first-days checklist for the new employee.
2. **HR Forms** — lane changes, contract changes, change of address, leave of absence, FMLA, etc., with routing/approval chains modeled on PaperPal.
3. **Offboarding** — the existing, shipped flow (unchanged in substance; rebranded and moved under `/offboarding`).

North star: **replace HR's master Google Sheet** (new employees, LOAs, terminations/retirements, contract changes, employee IDs, coaches, board dates, notes) with a proper employee database that only HR can see.

---

## Architecture decisions

- **Same repo, same Firebase project** (`ops-offboarding` — project IDs are immutable; invisible to users).
- **Hosting:** new site `oronohr.web.app` (target `app`), old site `ops-offboarding.web.app` (target `legacy`) kept serving the app during transition, then flipped to a redirect. Custom domain `hr.orono.k12.mn.us` planned once the rebrand ships. Remember at cutover: Firebase Auth authorized domains + `authDomain`, OAuth consent screen app name → "OronoHR".
- **Security posture carried over:** all writes via callables, Firestore rules deny-all for writes, per-action audit logs, domain-locked Google SSO.
- **Roles via custom claims:** `it_admin` (system admin + offboarding dashboard), `hr` (HR-only side), everyone else `staff`. Supervisors get no standing role — approval rights come from the frozen routing chain on each submission (PaperPal pattern). `useIsHR()` treats `it_admin` as HR-capable. Grant via `npm run grant-role -- email --role hr`.
- **Theme tokens** live in `src/index.css` (Tailwind v4 `@theme` + CSS vars) sourced from `.claude/skills/style/SKILL.md`. Brand hexes appear only there. Navy/blue primary, red reserved for destructive/danger.
- **Form schemas live in code** (versioned, typed, Zod-validated client + server); **routing/visibility/audience config lives in Firestore** (admin-editable). No drag-and-drop form builder.
- **Employee data model mirrors HR's sheet** (columns to be captured from the real sheet before building `employees`).
- Data-practices flags: MN Government Data Practices Act applies to personnel data; FMLA medical certifications stay OUT of the portal (track leave existence/dates/status only).

## Data model (target)

- `employees/{id}` — authoritative HR record (sheet replacement) + history subcollection. HR/IT read only.
- `submissions/{reqId}` — PaperPal-style envelope: `formType`, `formData`, frozen routing chain, signatures, `activityLog`, denormalized `summary`. Readable by submitter + people in its chain + HR.
- `processes/{id}` — onboarding/offboarding checklist instances (multiple per person over time). Offboarding's current `offboardings/{uid}` migrates here eventually; not urgent.
- `staff/{email}` — directory sync from Sheets (existing, unchanged).
- `appSettings/{key}` — keyed settings (existing, unchanged).

## What we reuse from PaperPal

Approval-flow state machine + `resolveRoutingChain` (chain frozen at submit), `RoutingChainPreview`, `activityLog` with field diffs, `SignatureField` / `DatePicker` / `StaffEmailAutocomplete`, `mail/` collection + Trigger Email extension with one branded template, pdfkit PDF generation + Drive filing, sandbox mode. Forms themselves are NOT copied (hand-coded pages don't scale) — build a schema-driven renderer that uses those field components.

## Phases

### Phase 1 — Foundations ✅ (done 2026-08-04)
- [x] `oronohr` hosting site + multi-site targets (`app`/`legacy`)
- [x] Rebrand: OronoHR name in shell/sign-in/title; package name; district icons (`OronoIcon.png` / `OronoBlueIcon.png`)
- [x] Shell decomposition: portal `HomeScreen` at `/`, offboarding as module under `/offboarding` (+ legacy `/tasks/*` redirects); app no longer gated on an offboarding doc existing
- [x] Roles: `hr` claim + `useIsHR()` + generalized grant script
- [x] Split `functions/src/index.ts` into domain modules
- [ ] Cutover (deliberately deferred): custom domain `hr.orono.k12.mn.us`, `authDomain` swap, consent-screen app name (console), legacy-site redirect

### Design system ✅ (done 2026-08-04)
- [x] Generated with claude.ai/design, handed off, vendored verbatim at `src/ds/` (its `readme.md` is the style spec)
- [x] Entire app migrated: shell/nav, sign-in (on-dark minimal), home (DayHeader + StatusTrack + ModuleCards), forms module, HR inbox, offboarding dashboard (ChecklistItem rows with working toggle + Open buttons + hover sweep, working-days-left rail), all task screens (white cards, one red commitment per screen), admin panel
- [x] Admin organized into sub-tabs (Staff & access default → Onboarding → Forms → Offboarding), URL-persisted, via new `TabBar tone="inverse"` (white active pill so red stays the main nav's)
- [x] Collapsible ds Cards (heading strip toggles, ModuleCard corner-arrow affordance, collapsed by default in admin; help-requests card auto-opens)
- [x] Rendering fixes in the vendored kit: single-layer card corners (no double-painted antialias sliver), ModuleCard flood seed rests at scale(0), Forms page brought onto the DayHeader pattern
- [ ] **Later — styling button-up pass:** sweep for rough edges once real usage surfaces them (mobile nav collapse, custom date picker per the handoff's open asks, remove now-unused legacy tokens from `src/index.css`, empty-state/copy polish)

### Phase 2 — HR side

Sheet captured 2026-08-04 ("2026-27 New EE Checklist", shared with the compute
service account, ID `1AHpraAF9mjO_hEgAGw5aBFMDTCe3Mk9DtUZlsgXOiEg`). Findings
from the real workbook: checkbox columns are true booleans but tabs carry
dozens of pre-filled all-false rows with no name (skip rows without a name);
dates are dirty ("TBD", "Signed", "???", "Winter 2026", ranges) so date fields
keep the raw string and an ISO value when parseable; EE# is sparse so it's an
indexed optional field, not the key; "Contract Changes" is two stacked tables
on one tab; names mix "Last, First" and "First Last"; extra tabs beyond the
original list: Address Change (4 old rows), stray ELVET Update column.

**Sheet → schema mapping**
- `2026-2027 New Employees` → `employees` + `processes` (type `new_hire`)
- `Terminated Employees` → employee status/endDate + `processes` (`termination`)
- `CESubCoaching` → employees (kind `ce_sub_coach`) + `processes` (`ce_onboarding`)
- `NTO` → orientation fields merged into the matching `new_hire` process; email onto the employee
- `Employee ID Assignments` → employeeId/description/startDate merged onto employees; seeds the EE# counter
- `LOA` → `leaves` (own collection so tab-level protection stays a one-line rule change later)
- `Contract Changes` → `changes` (types `building` / `position`)
- `Name Change` → `changes` (type `name`); `Address Change` → `changes` (type `address`)
- Fiscal year is a **field** derived from dates (July 1 boundary, e.g. "2026-27"), not a new
  sheet per year — kills the annual sheet-duplication chore.

**Collections** (all HR-only read, writes only via callables)
- `employees/{autoId}` — employeeId (EE#, optional int), first/last/nameRaw, email, status
  (`prospective|active|on_leave|terminated|inactive`), kind (`regular|ce_sub_coach`), building,
  position, reportsTo, start/endDate, description, notes, source (`import|manual`) +
  `history/` subcollection with field-diff entries (PaperPal pattern).
- `processes/{autoId}` — type (`new_hire|termination|ce_onboarding`), employeeRef + denormalized
  name/EE#, fiscalYear, status (`open|complete`), typed `details`, `tasks` map
  (`{done, doneAt, doneBy, note}` per catalogue key), notes.
- `leaves/{autoId}` — LOA tab fields; status + reason normalized enums with raw preserved.
  Reason category only — NO medical detail ever (MGDPA/FMLA stance).
- `changes/{autoId}` — type (`building|position|name|address`), from/to fields, small task
  checklist, `submissionId` link (Phase 3 forms will create these on approval).
- `appSettings/hrEmployeeIds` — `{ nextId }` counter, transactional EE# assignment;
  `appSettings/hrImport` — last import batch metadata.

**Task/field catalogues** live in `shared/hr/` (same pattern as `shared/forms`): per-type task
lists and detail-field specs drive both server validation and generic UI rendering.

**Importer** — `importHrMasterSheet` callable (HR-only): reads the shared sheet via the
service account, parses header-keyed (column reorder-proof), merges identities across tabs
(EE# first, then normalized name both orderings), derives employee status
(terminated > on_leave > prospective/active). `dryRun` mode returns a report (counts,
warnings, samples) without writing; `commit` replaces only `source:'import'` docs, so
portal-created records survive re-imports (portal *edits* to imported docs do not — stated in UI).

- [x] Capture the real sheet's tabs/columns → design `employees` schema (above)
- [x] Shared HR schema + catalogues (`shared/hr/`: types, catalog, util, importParse)
- [x] Callables: employee CRUD + transactional EE# assignment, record create/update,
      task toggles, delete, importer (`functions/src/hr.ts`, `hrImport.ts`)
- [x] HR-only Firestore rules for the four collections
- [x] HR module UI: sub-tabs (Inbox · Employees · Onboarding · Offboarding · Leaves · Changes)
      with live counts, employee list (search + status filter) + detail (edit, records
      timeline, history), generic record lists/detail with checklist toggles, import card
      with dry-run preview
- [x] Parser verified locally against the real downloaded workbook (2026-08-05):
      69 employees / 39 checklists / 21 leaves / 9 changes, cross-tab merges correct
      ("Forney, Chris" ↔ "Chris Forney" by EE#), statuses derived (20 prospective /
      34 active / 10 on-leave / 5 terminated), max EE# 7420, one benign warning
      (NTO row "Murray, Daniel" has no new-hire row)
- [ ] Joel: run the real import from the Employees tab (Preview → Import now), spot-check
      against the sheet with HR

### Phase 3 — Form engine + first forms
- [ ] Schema-driven form renderer (field types, validation, conditional visibility, sections) + Zod shared client/server
- [ ] Routing/approval: statuses `submitted → supervisor_approved → hr_processing → completed` (+ denied/revisions/cancelled), frozen chains, activity log
- [ ] Email notifications (Trigger Email extension), PDF generation + Drive filing
- [ ] Forms in order: change of address → lane change → contract change → LOA
- [ ] Admin config UI: form routing, visibility, active/inactive

### Phase 4 — Onboarding
- [ ] HR half: create onboarding record at hire (board date, contract sent, employee ID, IT account request)
- [ ] New-hire half: pending record matched by email at first sign-in → first-days checklist
- [ ] Move checklist definitions from code into Firestore

### Phase 5 — Retire the sheet
- [ ] Optional one-way export to Sheets during trust-building; then sheet goes read-only

## Historical note

The original offboarding-era plan (two-token model with DWD, drive scan, etc.) is in git history (`PLAN.md` before 2026-08). Reality diverged: DWD was never needed (user-OAuth covers everything), the Drive scan was replaced with guided destinations. See project memory for the full decision log.
