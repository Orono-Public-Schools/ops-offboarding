# OronoHR Design System

OronoHR is the internal HR portal for **Orono Public Schools**, Independent
School District 278, Minnesota. Staff — teachers, paras, custodians, nurses,
office staff — use it to file HR forms (change of address, leave of absence,
lane change, direct deposit), work through onboarding and offboarding
checklists, and follow what happened to a request. HR staff work the other
side: an inbox of submissions they process, deny, or complete.

## The style: dark shell, white cards

A **dark navy gradient page background** with **floating white cards** as the
only content surfaces. Nothing sits directly on the dark background except page
titles, the tab bar, and empty states. The effect is calm and official — paper
forms on a desk. One saturated brand accent (red) is reserved for the single
most important action on a screen.

## Sources

Authored from a written brief plus a style brief supplied by the user — no
repository, Figma file, logo asset, or font binaries were provided. Brand
anchors given: navy `#1d2a5d`, red `#ad2122` (Orono school colors).

Open asks are at the bottom of this file.

---

## Palette

| Role | Token | Hex |
| --- | --- | --- |
| Dark anchor — card headings, final status | `--dark` | `#1d2a5d` |
| Primary — primary buttons, focus rings, mid status | `--primary` | `#2d3f89` |
| Secondary — outline buttons, checkboxes, early status | `--secondary` | `#4356a9` |
| Light tint — accent backgrounds, selected rows | `--tint` | `#eaecf5` |
| Action accent — submit + destructive only | `--accent` | `#ad2122` |
| Terminal success — "paid" only | `--success` | `#059669` |

Gradients: `--gradient-primary` (135°, dark → primary) on primary buttons and
filled progress; `--gradient-accent` on the active tab only; `--gradient-page`
(160°, `#0a1230 → #131f45 → #172550`) on `body`, fixed attachment.

Neutrals, constant across brands: body `#334155`, muted `#64748b`, placeholder
`#94a3b8`, card `#ffffff`, inset `#f8f9fb`, input border `#e2e5ea`, divider
`rgba(180,185,195,0.25)`.

**On-dark:** white for titles, 60% for supporting copy, 50% for inactive tabs
and eyebrows, 8% for hover fills, 6% fill with a 1px dashed 15% border for
empty states.

---

## Typography

**Inter**, one family. Hierarchy comes from case, weight, and letterspacing —
not from size jumps.

- Page titles sit on the gradient in white: 24px/700 (20px at mobile).
  `--type-page-display` (34px/700) is the one step above, for a header whose whole
  job is a single live fact; `--type-micro` (10px/600 uppercase) is the floor, only
  for a label physically constrained by its container.
- **Card headings are the signature of this style:** 13px, 600, uppercase,
  `0.14em` tracking, in the dark anchor. Apply consistently to every card.
- **Field labels:** 11px, 600, uppercase, `0.09em` tracking, muted.
- Inside cards everything else is small and quiet: body 14px `#334155`,
  body-small 13px muted, caption 12px.

---

## Components

**Cards** — white, 12px radius, 16–20px padding, **no border**. Shadow is
layered and soft: `0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)`.
Cards space 24px apart, lift 2px on hover when clickable. Never nest a card in
a card; use `inset` panels for read-only blocks.

**Buttons** — 14px/600, radius 12px, hover `translateY(-1px)`, active
`scale(0.98)`, disabled `opacity: 0.6`, transitions 200–400ms.

| Variant | Treatment |
| --- | --- |
| `primary` | Brand gradient, white text, `0 2px 8px rgba(29,42,93,0.25)` |
| `submit` | Solid action red — the one commitment per screen, with playful icon motion on hover (send flies up-right, save slides right) |
| `secondary` | Outline formula: secondary text, 10% background, 30% border |
| `destructive` | Same formula in red |
| `ghost` | Text only, for cancel |

**Status badges** — pill, `px-2.5 py-1`, 12px/600. Formula: solid brand-family
color for text plus the same color at 12% for the background. The workflow
darkens through the ramp: draft (grey) → submitted (secondary) → processing
(primary) → completed (dark anchor). Red for denied; green only for terminal
success like paid.

**Forms** — inputs are white with a 1px `#e2e5ea` border, radius 8px, 14px text
in the dark anchor. Focus switches the border to primary and adds a 3px
`rgba(45,63,137,0.1)` ring. Read-only fields use the inset fill. Repeating rows
use hairline dividers with `12px` padding, first and last flush — no grey
wrapper box per row.

**Progress** is a segmented track, one segment per step, filled with the
primary gradient against the light tint, with a count and percentage caption.

**Stage tracks** (`StatusTrack`) name what happens to a request — Filed,
Received, With benefits, Complete — so a person can see where theirs sits
without emailing HR. Stages behind the current one are navy; the current node is
inked and ringed. It pairs with `RequestRow` on the portal home card.

**People** are a rounded photo slot plus name and role; with no photo the slot
is a soft hatched tint. Initials-in-a-circle is deliberately not offered.

---

## Layout

Centered column, max 1024px (`max-w-5xl`). Mobile-first page padding: 12/24px,
rising to 16/48px from `sm`. Spacing: 24px between cards, 16px within, 8px
tight. Form action rows are `flex-col-reverse` on mobile so Cancel sits above
the commit, right-aligned from `sm` up.

## Iconography

**Lucide**, 14–20px inline, 1.75 stroke, inheriting the current text color.
Paths are inlined in `components/core/Icon.jsx` so nothing depends on a CDN;
add a path there rather than pulling in the whole set. Icons are never given a
filled square badge. Emoji are never used.

## Motion

200ms for color, border, ring, and background; 400ms for submit icon motion and
progress fills. Easing `cubic-bezier(0.4, 0, 0.2, 1)` throughout.

**The skewed wipe** is the system's one signature move, on
`cubic-bezier(.3, 1, .8, 1)` over 400ms. Filled buttons rest as their gradient
panel and wipe it off to the right to reveal a brighter gradient. The active tab
does the same; an inactive tab's translucent panel sweeps in from the left.
Module cards flood navy from the corner. Request rows sweep a tinted panel in
from the left. Outline and ghost controls keep a plain tint change — the wipe is
what marks something as a real action.

---

## Voice

**Card headings are an eyebrow plus a sentence.** `REQUESTS` / "Two are moving
right now" — uppercase letterspacing keeps the official signal but sits on the
category label, so the heading is free to say something true. Four stacked
uppercase strips is what makes a portal read as a filing cabinet.

**The portal never greets you.** Every screen opens with the same `DayHeader`: a
tear-off desk calendar, the most useful true fact as the headline, and a rail
carrying whatever progression that screen is about — the school year on home, the
step you're on in a form, working days left in offboarding, the month's queue in
the inbox. Same shape on all four, always with today or now marked in red. No
"Good morning", and no screen-specific header layouts.

Second person, present tense, plainly spoken. Titles name the human thing
("Your last two weeks", not "Employee Separation Checklist"). Ledes lower the
stakes ("Six minutes, and you can stop halfway — we keep the draft"). Staff are
"you"; the district is "we". Denials are written by a person, never a form
letter. Uppercase is a *styling* choice on headings and labels only — body copy
and buttons stay sentence case.

---

## Guardrails

1. The action accent (red) appears only on submit and destructive controls, the
   sign-out control, the active tab, and **"you are here" markers** — the current
   node of a `StatusTrack`, today on a school-year rail, the live dot on a status
   pill. Never on a label, a heading, a category, or a decorative fill: a weekday
   cap, an icon chip, or a card edge in red means the design is wrong.
   (`tone="primary"` keeps a stage track navy where that exception isn't wanted.)
   On the navy shell red needs help: either a lightened tint (`#e98b8b`, the
   wordmark's) or a fill at 55%+ opacity, since flat `#ad2122` has too little
   contrast against the gradient.
2. No borders on cards — shadows do the separation. Subtle shadows only: no
   neumorphism, no heavy drops.
3. Hierarchy via uppercase, tracking, and weight — never font-size inflation.
4. Exact hex values are intentional. Use the tokens rather than approximating.

---

## Index

| Path | What's there |
| --- | --- |
| `styles.css` | Global entry — `@import` list only. Link this one file. |
| `tokens/` | `fonts`, `colors`, `typography`, `spacing`, `surfaces`, `motion`, `base` |
| `components/core/` | `Icon`, `Card`, `Button`, `StatusBadge`, `ProgressBar` |
| `components/forms/` | `Field`, `ChoiceRow`, `RowList` + `DetailRow`, `FormSection` |
| `components/navigation/` | `AppShell`, `AppBar`, `PageTitle`, `DayHeader`, `TabBar` |
| `components/records/` | `ModuleCard`, `RequestRow`, `StatusTrack`, `InboxRow`, `PersonPlate`, `ChecklistItem`, `EmptyState` |
| `ui_kits/portal/` | Four click-through portal screens — see its README |
| `guidelines/` | 11 specimen cards: Colors, Type, Layout, Surfaces, Motion, Guardrails — plus `card-options.html`, the option explorations |
| `ds-namespace.js` | Resolver so cards and the kit run with no build step |
| `SKILL.md` | Agent-skill entry point |

Every component ships `.jsx` + `.d.ts` + `.prompt.md`, and each directory has
one specimen card (`*.card.html`).

---

## Open asks

1. **Fonts.** Inter is loaded from Google Fonts per the style brief. If the
   district licenses something else, send binaries and we'll swap the
   `@font-face` rules.
2. **Logo.** No district mark was provided, so the wordmark is set type — Inter
   bold with "HR" tinted. Nothing was drawn or reconstructed.
3. **Staff photos.** The nameplate slot is a hatched placeholder. Confirm
   whether real photos will exist; if not, the slot stays as designed.
4. **Date picker.** The brief calls for a custom non-native picker. Fields
   currently use a text input with a calendar glyph — the picker itself is not
   built.
5. **Mobile.** Grids and action rows collapse correctly, but no phone-specific
   screens have been designed.
