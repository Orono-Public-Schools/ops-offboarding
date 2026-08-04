```jsx
<Button variant="submit" icon="send">Submit request</Button>
<Button variant="primary" iconRight="arrowRight">Continue</Button>
<Button variant="secondary">Save draft</Button>
<Button variant="destructive">Deny</Button>
<Button variant="ghost">Cancel</Button>
```

Exactly one `submit` per screen — it is the only red on the page. Action rows
stack `flex-col-reverse` on mobile so Cancel sits above the commit.

**Hover on filled variants** is a skewed wipe. The resting face is the panel —
the brand gradient on primary, solid `#ad2122` on submit — and it slides off to
the right over 400ms to reveal a brighter gradient underneath. Outline and
ghost variants keep their simple tint change — the wipe is what marks a filled
button as the committing action.
