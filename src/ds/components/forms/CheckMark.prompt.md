Used by `ChoiceRow type="checkbox"` and `ChecklistItem` — reach for those first
rather than placing this directly.

```jsx
<CheckMark checked={done} />
<CheckMark waiting size={20} />
```

The flip runs 320ms on a slight overshoot. Radio marks do NOT flip — they scale
their dot up — so the two input types stay distinguishable by motion as well as
by shape.
