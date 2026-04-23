# OPS Offboarding — Plan

A Firebase web app that walks outgoing OPS staff through their offboarding tasks and gives IT a dashboard to monitor progress.

> See [project memory](../../../.claude/projects/c--Users-joel-mellor-Documents-Scripts-OPS-Offboarding/memory/project_overview.md) for locked decisions. This doc covers architecture, data model, and Phase 1 work breakdown.

---

## 1. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite + Tailwind, Firebase Hosting)        │
│  - Firebase Auth (Google SSO, restricted to orono.k12.mn.us)│
│  - Calls Cloud Functions over HTTPS with Firebase ID token  │
└──────────────────────────┬──────────────────────────────────┘
                           │
       ┌───────────────────┼────────────────────┐
       │                                        │
       ▼                                        ▼
┌──────────────────────┐              ┌──────────────────────┐
│ User-scoped Cloud Fns│              │ Admin Cloud Fns      │
│ (uses USER's OAuth   │              │ (uses service acct + │
│  access token)       │              │  domain-wide deleg.) │
│                      │              │                      │
│ - List/move Drive    │              │ - List groups user   │
│ - Set OOO            │              │   owns/belongs to    │
│ - Set Gmail forward  │              │ - Force ownership    │
│ - List user's groups │              │   transfer if needed │
│ - Calendar event ops │              │ - Surface dept info  │
└──────────┬───────────┘              └──────────┬───────────┘
           │                                     │
           └─────────────┬───────────────────────┘
                         ▼
              ┌─────────────────────┐
              │ Firestore           │
              │ - offboardings      │
              │ - fileScan cache    │
              │ - auditLog          │
              └─────────────────────┘
```

### Stack
- **Frontend:** React + Vite + Tailwind, deployed via Firebase Hosting. (Defaulting here — pushback welcome if you'd rather use Vue, Svelte, or Next.)
- **Backend:** Cloud Functions for Firebase (2nd gen, Node.js). Splits into two function groups so the admin/service-account code is isolated.
- **DB:** Firestore in Native mode.
- **Auth:** Firebase Auth with Google provider, `hd` parameter pinned to `orono.k12.mn.us`.
- **Google APIs used:** Drive v3, Gmail v1, Calendar v3, Sites v1, Admin SDK Directory (groups + users).

### Two-token model (the key idea)
Every backend request carries the Firebase ID token. For user-scoped functions, the frontend *also* passes the user's Google OAuth access token (granted at sign-in via additional scopes). For admin functions, the function loads the service account JSON from Secret Manager and impersonates `admin@orono.k12.mn.us` (or whatever super-admin you designate) via JWT.

### OAuth scopes requested at sign-in
Minimum to make Phase 1 work:
- `https://www.googleapis.com/auth/drive` — Drive file management
- `https://www.googleapis.com/auth/gmail.settings.basic` — out-of-office
- `https://www.googleapis.com/auth/calendar` — event ownership transfer
- `https://www.googleapis.com/auth/admin.directory.group.readonly` — list groups they own (some users won't have this; admin function fallback needed)

We'll show a clear "why we need each of these" screen before the consent dialog.

---

## 2. Firestore data model

```
offboardings/{offboardingId}              ← one per leaving employee
  uid:              string                ← Firebase Auth UID
  email:            string                ← user's @orono.k12.mn.us
  displayName:      string
  department:       string | null
  supervisor:       string | null         ← email
  successorEmail:   string | null         ← chosen once, reused everywhere
  lastDay:          timestamp
  status:           "in_progress" | "completed" | "archived"
  startedAt:        timestamp
  updatedAt:        timestamp
  completedAt:      timestamp | null

  tasks: {                                ← embedded map, one entry per task type
    drivePersonal:    { status, completedAt, summary }
    driveTeam:        { status, completedAt, summary }
    groupsOwnership:  { status, completedAt, transferredCount }
    outOfOffice:      { status, completedAt, message, startDate, endDate }
    calendarTransfer: { status, completedAt, transferredCount }
    gmailForwarding:  { status, completedAt, forwardTo, delegate }
    sitesOwnership:   { status, completedAt, transferredCount }
    contactsExport:   { status, completedAt }
    deviceReturn:     { status, items: [...] }
    knowledgeTransfer:{ status, completedAt, docUrl }
    sharedCredentials:{ status, completedAt }
  }
  // status values: "not_started" | "in_progress" | "completed" | "skipped" | "blocked"

offboardings/{id}/fileScan/{fileId}       ← cached Drive scan, refreshed on demand
  fileId, name, mimeType, sizeBytes
  ownedByUser:     bool
  inMyDrive:       bool                   ← true = at risk
  inSharedDrive:   string | null          ← shared drive ID if applicable
  collaborators:   [{ email, role }]
  lastModified:    timestamp
  riskScore:       number                 ← derived: collaborator count + recency
  decision:        "personal" | "moveToShared" | "transfer" | "delete" | "pending"
  decisionTarget:  string | null          ← shared drive ID or successor email
  movedAt:         timestamp | null

offboardings/{id}/auditLog/{logId}        ← append-only
  ts, actor (uid), action, target, before, after, success, errorMsg

successors/{email}                        ← lookup cache for the picker
  displayName, department, title, photoUrl
```

### Why this shape
- Tasks as an embedded map (not subcollection) → one Firestore read renders the whole dashboard row.
- File scan as subcollection → can grow to thousands of files without bloating the parent doc.
- Audit log as subcollection → append-only, easy to export for HR.

### Security rules sketch
- `offboardings/{id}`: readable by `request.auth.uid == resource.data.uid` *or* by users in an `it_admins` claim.
- `fileScan/*`, `auditLog/*`: same.
- Writes: from Cloud Functions only (rules deny all client writes to these collections; client calls go through callable functions for validation).

---

## 3. Cloud Function endpoints (Phase 1)

**User-scoped (callable, requires user's OAuth token in payload):**
| Function | Purpose |
|---|---|
| `startOffboarding` | Create the `offboardings` doc, store user metadata. |
| `setSuccessor(email)` | Validate successor exists in domain, store on doc. |
| `scanDrive` | Walk user's Drive, write `fileScan` subcollection, compute riskScores. Long-running → use Cloud Tasks or Pub/Sub for chunking. |
| `previewMove(fileId, targetSharedDriveId)` | Return who will gain/lose access if moved. **No mutation.** |
| `executeMove(fileId, targetSharedDriveId)` | Perform the move, write audit entry. |
| `listOwnedGroups` | Return groups where user is owner. |
| `transferGroupOwnership(groupId, newOwnerEmail)` | Add new owner, demote/remove user. |
| `setOutOfOffice({message, startDate, endDate})` | Set Gmail vacation responder. |
| `markTaskComplete(taskKey)` | Manual override for "done" / "skipped" / "blocked". |

**Admin-scoped (callable, requires `it_admins` custom claim):**
| Function | Purpose |
|---|---|
| `adminListAllOffboardings` | Powers the IT dashboard. |
| `adminForceOwnershipTransfer(fileId, newOwner)` | Used when user can't or won't. |
| `adminListGroupsContaining(email)` | Domain-wide search via Admin SDK (catches groups user doesn't own but is in). |
| `adminGenerateAuditExport(offboardingId)` | PDF/JSON summary for HR. |

---

## 4. Phase 1 work breakdown

Rough sequencing, each step is mergeable on its own:

1. **Project bootstrap**
   - Create Firebase project, enable Hosting/Auth/Firestore/Functions/Secret Manager
   - GCP project: enable Drive, Gmail, Calendar, Admin SDK APIs
   - Service account + domain-wide delegation in Workspace admin console
   - Repo scaffold: Vite app, functions dir, firebase.json, .firebaserc

2. **Auth flow**
   - Google sign-in with `hd=orono.k12.mn.us`
   - Request additional OAuth scopes; store access token client-side (refresh handling)
   - "Why we need these permissions" pre-consent screen
   - `it_admins` custom claim setup script

3. **Data layer**
   - Firestore security rules
   - `startOffboarding` callable + the welcome flow that calls it

4. **Successor selection**
   - Picker that searches domain users via Admin SDK
   - `setSuccessor` callable

5. **Drive scan + Files-at-Risk view**
   - `scanDrive` chunked job
   - UI: sortable list, filter by risk, file preview thumbnails
   - Status indicator while scan runs (Firestore listener)

6. **Drive move flow with preview**
   - `previewMove` and `executeMove` callables
   - UI: select target shared drive, see access-impact diff, confirm
   - Bulk-action mode (select N files, apply same decision)

7. **Group ownership audit**
   - `listOwnedGroups` + admin-side `adminListGroupsContaining` for completeness
   - UI: list groups, per-group successor picker (defaults to chosen successor), one-click transfer
   - `transferGroupOwnership` callable

8. **Out-of-office setup**
   - Template gallery (auto-fills last day, successor, account-deactivation date)
   - Preview pane
   - `setOutOfOffice` callable

9. **Progress dashboard (employee view)**
   - Task tiles with status + last-updated
   - "Resume where you left off"
   - Completion summary screen + printable receipt

10. **Admin dashboard (IT view)**
    - Table of all in-progress offboardings, % complete, days-until-last-day
    - Drill-in to see per-task status + audit log
    - Reminder-email button (optional Phase 1 vs Phase 2)

11. **Audit log**
    - Wire every mutating function to write an `auditLog` entry
    - `adminGenerateAuditExport` for HR (Phase 2 if tight on time)

12. **Polish**
    - Empty/short-circuit modes ("you have nothing to do here")
    - Error toasts, retry on token refresh
    - Smoke test the full flow end-to-end with a test account

---

## 5. Decisions log (confirmed 2026-04-23)

1. **Frontend:** React + Vite + Tailwind.
2. **Firebase project:** new, dedicated project (keeps blast radius isolated).
3. **Workspace admin setup:** Joel has super-admin and will configure the service account + domain-wide delegation himself.
4. **HR view:** out of scope for now. (Audit-log export still in scope as a future-friendly building block.)
5. **Entry point:** self-serve via a URL shared by IT. First sign-in creates the user's `offboardings` doc. Add a brief "are you sure you're leaving?" confirmation on the welcome screen so accidental visits don't create stray records.
6. **Account deactivation timing:** "shortly after last day," not a precise date.
   - OOO end date: default to "no end date" (responder runs until account is deactivated). Let user override.
   - "Files will be deleted" warning copy: phrase as "after your account is deactivated by HR (typically shortly after your last day)" rather than a specific date.
   - Provide a clearly visible "I need more time / I got locked out" help blurb explaining how to request an extension or contact IT, since users *will* hit this.

---

## 6. First work chunk

Steps 1–3 of the breakdown form a self-contained foundation. Concretely, the first PR/branch:

- Initialize repo: `package.json`, Vite + React + Tailwind scaffold, `firebase.json`, `.firebaserc`, `functions/` workspace (Node 20)
- Create the new Firebase project (Joel's task; needs his console)
- Enable Hosting, Auth (Google provider, restrict to `orono.k12.mn.us`), Firestore, Functions, Secret Manager
- Enable in GCP: Drive, Gmail, Calendar, Admin SDK Directory APIs
- Service account with domain-wide delegation (Joel does this in Workspace admin)
- Drop in initial Firestore security rules (deny-all client writes to `offboardings`/`fileScan`/`auditLog`; reads gated by uid match or `it_admins` claim)
- Implement sign-in flow with the additional OAuth scopes + the "why we need these permissions" pre-consent screen
- `startOffboarding` callable + welcome screen with the "are you sure?" confirmation

After that lands, we can move on to successor selection (step 4) and the Drive scan (step 5), which is where the real product value starts showing up.
