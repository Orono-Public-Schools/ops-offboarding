For choices that need a sentence of explanation — leave types, coverage confirmations, notification preferences.

```jsx
<ChoiceRow type="radio" name="leave" title="Parental leave" description="Birth, adoption, or foster placement." meta="up to 12 weeks" checked />
<ChoiceRow type="switch" title="Email my personal address too" checked={on} onChange={...} />
```

Selection is a small physical event: the row grows 2px top and bottom on a spring
curve, the mark scales up from zero, and a single ring fires outward from the dot
(700ms, then gone — it never loops or pulses on idle). Selection is always navy;
red is not used here.
