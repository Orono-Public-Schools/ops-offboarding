Multi-step progress — checklists, multi-page forms.

```jsx
<ProgressBar total={6} done={2} />
<ProgressBar total={4} done={4} label="All steps complete" />
```

Keep `total` at or under about 10; past that drop to a single-segment track by passing `total={1}`.
