```jsx
<ChecklistItem state="waiting" title="Return classroom keys" owner="With Facilities" icon="key" due="By Jun 5" />
<ChecklistItem state="done" title="Final timesheet approved" />
```

Use `waiting` when the task has left the person's hands, and say who holds it.

Ticking a task flips the box on its Y axis to an inked face over 320ms, then the
title greys and strikes through. It is the same `CheckMark` as a form checkbox, so
finishing a checklist item and ticking a consent box feel identical.
