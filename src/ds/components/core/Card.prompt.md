Everything that isn't a page title, tab bar, or empty state lives in one of these.

```jsx
<Card eyebrow="Requests" heading="Two are moving right now" headingRight={<StatusBadge state="processing" />}>
  …
</Card>
```

The heading renders in a tinted `#f8f9fb` strip across the top of the card, divided from the body by a 1px `#e2e5ea` line. Pass `variant="plain"` for a small card where the strip is too much weight.

Cards are spaced 24px apart. Never add a border, never nest a card inside a card — use `inset` panels for read-only blocks instead.

The card does not clip its contents — an open `Select` panel has to escape the
bottom edge — so the heading strip rounds its own top corners. If you add
something that needs clipping, clip it on that element, not on the card.

Card headings are a two-part unit: an uppercase `eyebrow` naming the category,
then a sentence-case `heading` that says something true about what is inside
("Two are moving right now", not "Your open requests"). Uppercase letterspacing
still carries the official signal, but it sits on the label, so four stacked
cards read as a page rather than four shouts. Omit `eyebrow` only on small
utility cards inside a screen someone is already reading.

On a form, the eyebrow numbers the step (`Step 2 of 3`) and the title asks the
question ("Why you're taking leave"). Never repeat a fact the page header already
states — a header that says "Twelve requests waiting" and a card that says "Twelve
people are waiting on you" is the same sentence twice, 40px apart. The header
carries the count; the card names what is in the list.
