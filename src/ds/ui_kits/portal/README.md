# OronoHR portal — UI kit

Four click-through screens on the dark shell, composed from `/components`.
Open `index.html` and use the tab bar.

| Screen | File | What it shows |
| --- | --- | --- |
| Portal home | `PortalHome.jsx` | White title block on the gradient, open-requests card with named stage tracks, six module tiles that flood navy on hover (one with segmented progress, one disabled) |
| Leave of absence | `LeaveForm.jsx` | Progress card, three form-section cards, fields with read-only and select states, choice rows, action row with the single red submit |
| Offboarding | `Offboarding.jsx` | Progress card, six checklist rows across all three box states, an "after your last day" detail card |
| HR inbox | `Inbox.jsx` | Search field, filtered row list, all six status badges, detail column with an inset read-only card and the decision row |

Two people recur across screens: **Marisol Reyes**, a grade 4 teacher filing
parental leave and working an offboarding checklist, and **Dana Whitcomb**, the
benefits coordinator working the inbox.

Screens import primitives by relative path. In the browser `ds-namespace.js`
resolves them — using the compiled bundle when it exists, otherwise transpiling
the sources directly — so the kit runs from a plain file open with no build step.
