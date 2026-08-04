The page header, on every screen. `PageTitle` is retained only for surfaces
outside the shell.

```jsx
<DayHeader
  weekday="Mon" day={2} month="March"
  title="Two of your requests are moving"
  subtitle="Nothing needs you today. Everything else here waits until you do."
  railPct={68} railLeft="Day 118 of 174" railRight="56 school days left"
/>
```

Never write a greeting into `title` — the headline is the most useful true fact
about the person's record that day ("Two of your requests are moving", "Nothing
is waiting on you", "Your leave request is with benefits"). The calendar cap is
navy; only the today-dot on the rail is red, as a "you are here" mark.

Every screen fills the rail with the progression that screen is about, and names
it in `railLeft`/`railRight`: the school year on home, the step you're on in a
form, working days to a last day in offboarding, the month's queue in the inbox.
A screen with no progression should not use a rail — but so far every one has had
one, and the shared shape is what makes the four headers read as one product.

One rail per screen, and never a second horizontal progress read near it — two
bars at similar fills are indistinguishable at a glance even when they measure
different things. If a screen has both a count and a duration, the rail takes the
count and the duration goes in its right-hand caption.
