The status of any request, anywhere one appears.

```jsx
<StatusBadge state="processing" />
<StatusBadge state="denied" size="sm" />
```

`paid` (green) is only for terminal money states — never use green for "approved" or "done", which are `completed` in the dark anchor.
