Sits under a request title wherever someone is following their own submission.

```jsx
<StatusTrack stages={['Filed', 'Received', 'With benefits', 'Complete']} current={2} />
<StatusTrack stages={['Filed', 'Received', 'Board review', 'Complete']} current={1} tone="primary" />
```

Name stages for what actually happens to the request, not for internal system
states. Keep it to 3–5; past that the labels collide. `tone="accent"` is the one
sanctioned decorative use of red in the system — it marks *where you are*.

On a flooded (navy) surface pass `invert` — the done ramp flips to white and the
current node brightens to `#ff8a80`, since `#ad2122` has too little contrast
against the flood to carry meaning. Available for any future dark-ground surface; nothing in the portal uses it today.
