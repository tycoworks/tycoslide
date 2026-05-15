# tycoslide Roadmap

Now / Next / Later.

---

## Now

### Token System Smells

- [ ] **Remove resolveTokens from core** — SDK concern leaked into core. Only used by label for heading depth selection via depth-keyed map. With fixed TEXT_STYLE headings, label can receive flat tokens — no depth map hack needed.
- [ ] **Heading handling cleanup** — old open vocabulary replaced by fixed set. Residual complexity in core around arbitrary heading depths.
- [ ] **Font walking** — walking token bags to extract fonts. Needs investigation.
- [ ] **lineHeightMultiplier / bulletIndentPt on TextStyle** — currently required on every text style in format configs. Test whether these can be removed or defaulted — they were added to match HTML text wrapping but may not be needed.

---

## Next

### Layout Bugs

- [ ] `stat.backgroundWidth: 6` → SIZE.FILL
- [ ] `transform.overlaySize: 0.9` → SIZE.FILL
- [ ] `cards perRow` formula → token-driven

### Code Quality

- [ ] Audit post-unification simplifications (dead types)

### Skills

- [ ] Theme Bootstrap Skill (AI extracts from PPTX/Figma)
- [ ] Create & Edit Skill (AI authoring in markdown dialect)

### Sequence-Based Composition

Reusable 3-7 slide patterns. See `internal/sequences.md`.

### Integration Tests

DSL → pipeline → geometric assertions.

### Minor Features

- [ ] Inline code
- [ ] Color token validation
- [ ] Card image placement (horizontal)

---

## Later

- [ ] PPTX groups
- [ ] Rotation
- [ ] HTML live preview
- [ ] Charts (pptxgenjs native)
- [ ] Real Mermaid (native PPTX shapes)

---

## Bugs

- [ ] Right-aligned bullet points (pptxgenjs)
- [ ] Showcase title jumping
- [ ] PptxGenJS shape rendering (stack + shape missing)

---

## Done

### Token System Migration ✓

Spatial/visual token split. Palette + Brand + Format. No masters, no componentOverrides.

### Multi-Format Themes ✓

`multi-format-themes` branch. ThemeDefinition, ThemeFormat, resolveThemeFormat in SDK. Presentation format complete with showcase.

### Master/Layout Unification ✓

MasterDefinition eliminated. Chrome composers, layer system, splitByLayer. See `internal/master-layout-unification.md`.

### SDK Authoring API (deriveTokens) ✓

`visualTokens.ts`: deriveTokens(palette, format) → onLight/onDark/surfaces/primitives. Zero theme-specific concepts in SDK. Component tokens live in theme-default format files.

### Insets ✓

`Insets` class in core (bounds.ts). Per-side padding for containers. Chrome uses proper Insets instead of spacer hacks.

### Defaults Cleanup (partial) ✓

- [x] Make `spacingMode` default explicit
- [ ] Shape: use DEFAULTS constants instead of inline

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| No masters | Background on template, chrome composed into layout |
| No componentOverrides | Design system should be expressive enough |
| Palette not ColorScheme | Single-word noun, consistent naming |
| All tokens to every layout | Slot system requires it |
| LAYER system kept | More compositional. Re-evaluate later. |
| Insets class, not interface | Constructor handles normalization, consistent with Bounds |
| resolveTokens removal | Not needed with fixed headings |
