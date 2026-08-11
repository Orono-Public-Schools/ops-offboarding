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
- **Roles via custom claims** (reworked 2026-08-10, tiered same day): four roles in two
  branches, **one role per person** (a grant moves someone; setUserRole clears other role
  claims). HR branch: `hr: 'staff'` (day-to-day HR, no import/deletions) → `hr: 'admin'`
  (+ sheet import, deletions, HR role management). Tech branch: `it_support` (offboarding
  dashboard + help requests, staff sync + directory — NEVER HR personnel data; MGDPA) →
  `it_admin` (everything, both branches). Legacy `hr: true` reads as admin level everywhere
  (functions `hrLevel()`/`isTechRole()`, firestore.rules `isHR()`/`isTech()`, client hooks
  incl. `useIsTech()`). Supervisors get no standing role — approval rights come from the
  frozen routing chain per submission (PaperPal pattern). Managed in the admin Access card
  (design-reviewed via artifact 8662dc24…): a ✓/✕ capability matrix over four columns,
  hover-reveal remove, zero red at rest; IT support sees the admin area with trimmed tabs.
  CLI backstop: `npm run grant-role -- email --role it_admin|it_support|hr_admin|hr_staff`.
  The admin Staff tab also carries a searchable staff directory (sync sheet has no
  department column — building shown).
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
(terminated > on_leave > prospective/active). **Additive and review-first** (reworked
2026-08-05): `dryRun` matches sheet people against existing employees and returns only the
NEW ones as candidates; `commit` takes `include: string[]` of candidate keys and imports
just those. Existing employees and records are never updated or deleted by an import.

- [x] Capture the real sheet's tabs/columns → design `employees` schema (above)
- [x] Shared HR schema + catalogues (`shared/hr/`: types, catalog, util, importParse)
- [x] Callables: employee CRUD + transactional EE# assignment, record create/update,
      task toggles, delete, importer (`functions/src/hr.ts`, `hrImport.ts`)
- [x] HR-only Firestore rules for the four collections
- [x] HR module UI (iterated with Joel 2026-08-05): sub-tabs mirror the workbook
      (Inbox · New employees · CE/Sub/Coaching · Offboarding · Leaves · Changes). The two
      people tabs are the **Dossier**: a sortable **Directory Rail** (Name · Position ·
      Bldg · Starts · Done columns, sticky header, default chronological) with the selected
      person's file always open beside it — facts row (incl. Google account + Replacing),
      grouped checklist with instant optimistic ticks, inline Edit mode (profile + board
      date/replacing/lunch PIN), and Remove employee (deleteEmployee callable cleans
      records + history). Main nav says "HR Portal"; PersonPlate photo slots off in HR.
- [x] Checklist model (per Joel): new-hire = 9 required boxes (payroll form, background,
      paperwork, I-9, Frontline, EF+, Vector, union, Synergy) + optional Health & Safety /
      Key / Lunch PIN in their own group (never counted); any task can be marked **N/A**
      (excluded from progress; complete = required all done-or-N/A). Contract-sent is a
      date detail. Dates display/type as **MM-DD-YYYY** (ISO stored underneath).
- [x] Automation: `reconcileGoogleAccounts` runs after every roster sync and import —
      matches employees to the synced Google directory (email → EE# → name), fills
      missing emails, checks the Gmail task where it still exists. `setHrTask` mirrors
      shared tasks (background check, I-9, …) between a person's new-hire and CE
      checklists so both tabs agree.
- [x] Parser verified locally against the real downloaded workbook (2026-08-05):
      69 employees / 39 checklists / 21 leaves / 9 changes, cross-tab merges correct
      ("Forney, Chris" ↔ "Chris Forney" by EE#), statuses derived (20 prospective /
      34 active / 10 on-leave / 5 terminated), max EE# 7420, one benign warning
      (NTO row "Murray, Daniel" has no new-hire row)
- [x] First real import ran 2026-08-05; section-header junk rows ("Human Resources",
      "Technology", legend notes) surfaced and the parser now skips them
- [ ] Joel: re-run Preview → review candidates → Import to bring in anyone still missing;
      spot-check against the sheet with HR
- [ ] **Later:** record-level import review — a new sheet row (LOA, change, termination)
      for an *already-imported* person is currently skipped with the person; surface those
      as record candidates in the same review UI
- [ ] **Later:** roster facet chips (design-review option B) layered on the Directory Rail
      if role/building questions outgrow sorting; mobile pass on the Dossier
      (design-option artifacts: new-employees section 0058d27a…, roster 9e01fac0…)

**Task assignment** (planned 2026-08-11, decisions locked with Joel): checklist
tasks get owners.
- `TaskState` gains `assignee` (email, null = unassigned) — shown on every
  checklist row (record detail + Dossier), set from a small assign control on
  the row. `setHrTask` grows an assignment path (or a sibling callable).
- **Assignable people: role holders who can open /hr** — `hr_staff`,
  `hr_admin`, `it_admin`. `it_support` is deliberately excluded for now: they
  can't read HR collections (MGDPA stance), so an assignment would be invisible
  to them. Later: bring them in via a scoped "your tasks" mirror or a rules
  carve-out — decide when a real case shows up.
- New `listAssignableStaff` callable (requireHr — `listRoleHolders` is
  admin-only, and hr_staff needs the picker too); same claims enumeration,
  trimmed payload.
- **Standing defaults per task key** in `appSettings/hrTaskDefaults`
  (`{ "new_hire.synergy": email, ... }`), managed from an admin card, applied
  at record creation everywhere records are born (manual create, importer,
  LOA-to-leave button), overridable per record.
- **"Assigned to you" surfacing:** a "Mine" chip on the record-list tabs plus
  an open-tasks-across-records card on the HR inbox. Client-side filtering —
  HR readers already stream the collections.
- **Assignment email rides the Trigger Email build** (below): one branded
  template serves "you've been assigned a task" and form-status notifications.
- [ ] Schema + assignment callable path + `listAssignableStaff`
- [ ] Assign control on checklist rows; Mine chip + inbox card
- [ ] Admin defaults card + apply-at-creation in all three creation paths
- [ ] Assignment emails, together with the notifications build

### Phase 3 — Form engine + first forms
- [x] Schema-driven form renderer + shared validator (definitions in `shared/forms/`, one
      source for client + callable). Engine supports: text/email/phone/date/select/radio/
      checkbox/textarea, multi-select `checkboxes` (string[]), field- AND section-level
      `showIf` (single or ANDed conditions, array values match by inclusion), info-only
      sections with linkified paragraphs, `blocking` sections (Send disabled client-side
      and validator refuses server-side), option descriptions, label-aware summaries.
- [x] Change of Address (pilot form)
- [x] Leave of Absence — Initial Notification (2026-08-06, ported from HR's Google Form):
      supervisor-notified gate, sites/job title/EE#, reason **category only** (MGDPA —
      no medical detail), dates, leave type with conditional PFML / FMLA / extended-unpaid
      explainer sections, FMLA pay-category picker (+Other), HR-meeting ask. Name/email
      come from sign-in. Deviations from the Google Form: name fields dropped (SSO),
      single-page conditional flow instead of paged sections.
- [x] Lane Change Application (2026-08-06, ported from Frontline + the Procedures PDF).
      Engine gained three more field types: `file` (Storage uploads under
      `uploads/{uid}/`, 15MB doc/image cap, submitter/HR/IT read, server verifies path
      ownership), `table` (repeating typed rows), `signature` (typed-name eSignature
      with consent text). Frontline's name/email/printed-name/Send-To fields dropped
      (sign-in covers them); HR sees attachments as download links + a real course table.
- [x] Firebase Storage enabled (2026-08-06) + rules deployed (writes: own
      `uploads/{uid}/` only, 15MB, doc/image types; reads: submitter/HR/IT)
- [ ] **Joel:** confirm the lane ladder (`LANES` in shared/forms/definitions.ts is a
      placeholder: BA…BA+30, MA…MA+30) against the Master Agreement / Frontline dropdown;
      also confirm Dr. Alger is still the transcripts contact
**Form audience** (planned 2026-08-11, decisions locked with Joel): per-form
visibility by role branch — Joel's call: tech shouldn't see every lane change,
even as it_admin.
- Each form definition carries a default `audience: ('hr' | 'tech')[]`; an
  admin-editable override lives in Firestore (`appSettings/formConfig`). All
  three current forms default to `['hr']`.
- The audience is **stamped onto the submission at submit** (PaperPal
  freeze-at-submit pattern), so rules enforce per-document: readable by the
  submitter, their future routing chain, and anyone whose branch is in the
  audience. Config changes affect new submissions only.
- Branch membership for submissions: hr = `hr: staff|admin|legacy true`;
  tech = `it_admin|it_support`. Note this *narrows* it_admin — for
  submissions only, it_admin no longer piggybacks on HR admin level. Records
  (employees/processes/leaves/changes) stay as today: HR branch + it_admin,
  it_support stays walled off (reconfirmed 2026-08-11).
- Status changes follow visibility: acting on a submission requires your
  branch in its audience.
- Inbox queries filter `where('audience', 'array-contains', branch)`;
  pre-audience submissions get a one-time backfill to `['hr']`.
- [ ] Audience defaults in definitions + stamp at submit + rules + backfill
- [ ] Inbox/query updates per branch
- [ ] Admin card for audience overrides (folds into the routing/visibility
      config UI below)

- [ ] Routing/approval: statuses `submitted → supervisor_approved → hr_processing → completed` (+ denied/revisions/cancelled), frozen chains, activity log (today: submitted/processing/completed/denied, HR-only status changes)
- [ ] LOA submission → `leaves` record: HR affordance to create the leave from the
      submission (today HR reads the inbox and keys the record by hand)
- [x] Email notifications (2026-08-11): submit + status callables queue `mail/`
      docs through PaperPal's branded template. Layered config, loose to tight:
      master switches + default address → per-form recipients/toggles
      (`appSettings/notifications`, HR-admin card on the inbox) → personal
      always/never per form (`notificationPrefs/{uid}`, own card on the inbox;
      "never" beats any list). Submitter status emails uniform on purpose.
      Settings live on the HR inbox, not /admin — HR admins can't reach /admin.
- [x] Self-managed mailer (2026-08-11): Firebase Extensions is being
      decommissioned (March 2027), so the Trigger Email extension was never
      installed. `sendQueuedMail` (functions/src/mailer.ts) is our own
      Firestore trigger on `mail/{id}` — nodemailer over SMTP, same doc
      contract, stamps `delivery.state` like the extension did. First
      Eventarc-based function in the project (first deploy can race agent
      provisioning — just retry). PaperPal still runs the real extension;
      port it onto this mailer before March 2027.
- [ ] **Joel:** create `noreply-hr@orono.k12.mn.us` (hide from GAL, exclude
      from offboarding sweeps), enable 2SV, mint an app password, then:
      `firebase functions:secrets:set SMTP_CONNECTION_URI` with
      `smtps://noreply-hr%40orono.k12.mn.us:APP_PASSWORD@smtp.gmail.com:465`
      (%40 for the @, app password without spaces), and redeploy:
      `firebase deploy --only functions:sendQueuedMail`. MAIL_FROM in
      functions/.env already matches. Until then queued mail errors
      harmlessly with an auth failure.
- [ ] PDF generation + Drive filing
- [ ] Remaining forms: contract change
- [ ] Admin config UI: form routing, visibility, active/inactive
- [ ] **Later:** lifecycle cleanup for orphaned uploads (drafts abandoned before submit)

### Phase 4 — Onboarding
- [ ] HR half: create onboarding record at hire (board date, contract sent, employee ID, IT account request)
- [ ] New-hire half: pending record matched by email at first sign-in → first-days checklist
- [ ] Move checklist definitions from code into Firestore

### Phase 5 — Retire the sheet
- [ ] Optional one-way export to Sheets during trust-building; then sheet goes read-only

## Historical note

The original offboarding-era plan (two-token model with DWD, drive scan, etc.) is in git history (`PLAN.md` before 2026-08). Reality diverged: DWD was never needed (user-OAuth covers everything), the Drive scan was replaced with guided destinations. See project memory for the full decision log.
