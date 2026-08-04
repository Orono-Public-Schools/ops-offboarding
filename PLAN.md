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
- [ ] **Later — styling button-up pass:** sweep for rough edges once real usage surfaces them (mobile nav collapse, custom date picker per the handoff's open asks, remove now-unused legacy tokens from `src/index.css`, empty-state/copy polish)

### Phase 2 — HR side
- [ ] Capture the real sheet's tabs/columns → design `employees` schema
- [ ] One-time sheet import; HR dashboard (employee list, record view, statuses)
- [ ] HR-only Firestore rules + callables

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
