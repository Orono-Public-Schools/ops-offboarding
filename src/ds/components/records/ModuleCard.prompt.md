The portal home grid — three across at desktop, one at mobile.

```jsx
<ModuleCard icon="fileText" title="Change of address" description="Payroll and benefits update together." meta="4 min" onClick={open} />
<ModuleCard icon="logOut" title="Your last two weeks" total={6} done={2} onClick={open} />
<ModuleCard icon="mail" title="Direct deposit" hover="lift" onClick={open} />
```

Hover floods the card navy from the corner and inverts the text; a corner arrow
tab sits at 75% while resting. Pass `hover="lift"` for a calmer rise-and-shadow
instead — worth doing when a grid has many tiles and you only want one to flood.
Cards with `total` use lift automatically so the progress track stays readable.
