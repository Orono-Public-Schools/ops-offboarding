Lucide glyphs inlined. Always 14–20px, always inheriting text color — never a colored icon on a tinted square.

```jsx
<Icon name="send" size={16} />
<Icon name="clock" size={14} style={{ opacity: 0.7 }} />
```

Need a glyph that isn't here? Add its Lucide path to `PATHS` rather than pulling in the whole set.
