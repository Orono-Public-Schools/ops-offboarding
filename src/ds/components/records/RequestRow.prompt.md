```jsx
<RequestRow
  title="Leave of absence"
  kind="Form 30-A · Case 26-0142 · filed 4 days ago"
  status={<StatusBadge state="processing" />}
  track={<StatusTrack stages={['Filed', 'Received', 'With benefits', 'Complete']} current={2} />}
  onClick={open}
/>
```

For the person's own requests. HR-side queue rows are `InboxRow` instead — that
one is dense and scannable, this one is explanatory.

Clickable rows use the same hover as the "Your last two weeks" module card: the
row rises 4px onto white with a shadow and a tinted border, and the corner arrow
tab resolves in. Nothing recolors, so the stage track keeps its meaning — the
navy flood is for cards that are only a door.
