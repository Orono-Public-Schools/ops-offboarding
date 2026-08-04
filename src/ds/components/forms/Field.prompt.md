```jsx
<Field label="New mailing address" help="Payroll and benefits mail both follow this." />
<Field label="Leave type" as="select" options={['Medical', 'Parental', 'Family']} />
<Field label="Last day" icon="calendar" error="Pick a date after today." />
<Field label="Name" defaultValue="Marisol Reyes" readOnly />
```

Two fields per row at desktop, one at mobile. Mark optional fields rather than starring required ones.

Fields are ruled, not boxed: the label sits over a hairline, and focus wipes a
2px navy rule in from the left (red when the field is in error, and the typed
value reddens too). Read-only fields are the exception — they take the inset fill
and drop the rule, so an answer you can't change never looks like an input.

Because the affordance is a rule rather than a box, keep fields on their own line
with 16–20px between them; two ruled fields packed side by side read as a table.
