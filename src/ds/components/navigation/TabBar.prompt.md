Top-level navigation, sitting on the gradient under the title.

```jsx
<TabBar active={tab} onSelect={setTab} tabs={[
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 12 },
]} />
```

Both states use the same skewed wipe as filled buttons: the active tab's red
panel slides off to the right to reveal a brighter gradient, and an inactive
tab's translucent panel sweeps in from the left. Press scales to 0.98.
