For the "anything else" tier — links out, not actions.

```jsx
<QuietLink icon="download">Find my paystubs</QuietLink>
<QuietLink icon="fileText" href="/forms">See all 21 forms</QuietLink>
```

Stack them with 14px gaps rather than laying them in a row: stacked, each one is
a full-width target, which beats a chip on a phone. Never use one for a
committing action — that is `Button variant="submit"` — and never mix them into a
row of real buttons.
