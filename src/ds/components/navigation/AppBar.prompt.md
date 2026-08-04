Sits at the very top of the shell, above the page title.

```jsx
<AppBar person={{ name: 'Marisol Reyes', role: 'Grade 4 · Schumann' }} />
```

The sign-out control is Orono red — it ends a session, so it reads as the one
consequential control in the bar. At rest it is a `#f6cdcd` glyph on a 55%
red fill, which reads clearly on the navy shell without competing with the active
tab; on hover it takes the full accent gradient and expands to reveal its label, so the action
names itself before it can be clicked. Reuse that pattern
for any icon-only control whose consequence isn't obvious from the glyph — keep
the resting square at 32px and animate the width on `--dur-fast`.
