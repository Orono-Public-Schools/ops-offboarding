Use `<Field as="select">` — it renders this component and keeps the label, help,
and error in the same place as every other field.

```jsx
<Field label="Building" as="select" options={['Schumann Elementary', 'Orono Middle School']} />
<Select options={buildings} value={b} onChange={(e) => setB(e.target.value)} placeholder="Choose a building" />
```

The panel is a card, not a menu: 12px radius, the hover shadow, 6px padding, rows
at 10/12. It overhangs the field by 8px on each side so the row tint has room to
breathe. Native `<select>` is not used anywhere — this exists so a dropdown does
not break the ruled-field language on its one interactive moment.
