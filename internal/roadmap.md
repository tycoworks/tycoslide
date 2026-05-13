# tycoslide Roadmap

Now / Next / Later.

---

## Now

### Token System Migration

Spatial/visual token split. Single `layoutTokens` → two independent axes.

Key decisions:
- **Palette** (not ColorScheme) — 10 semantic color roles
- **Brand** — identity (fonts + light/dark Palettes)
- **Format** — spatial config (dimensions, spacing, text styles)
- **Layout** (renamed from LayoutDefinition)
- No masters (background on template, chrome composed into layout)
- No componentOverrides — design system should be expressive enough
- Token mapper stays in theme-default first, graduate to SDK later
- TEXT_STYLE renames: TITLE→QUOTE, SMALL→CAPTION, EYEBROW removed
- All component tokens passed to every layout (already works today)

### Defaults Cleanup (Phase 0)

- [ ] Make `spacing` optional on Row/Column/Grid (default 0)
- [ ] Make `spacingMode` default explicit
- [ ] Remove white background fallback (throw if missing)
- [ ] Shape: use DEFAULTS constants instead of inline

### Multi-Format Themes

In progress on `multi-format-themes` branch.

---

## Next

### Token System Smells

- [ ] **Remove resolveTokens from core** — SDK concern leaked into core. Only used by label for heading depth selection via depth-keyed map. With fixed TEXT_STYLE headings, label can receive flat tokens — no depth map hack needed.
- [ ] **Font walking** — walking token bags to extract fonts. Needs investigation.
- [ ] **Heading handling cleanup** — old open vocabulary replaced by fixed set. Residual complexity.
- [ ] **lineHeightMultiplier / bulletIndentPt on TextStyle** — currently required on every text style in format configs. Test whether these can be removed or defaulted — they were added to match HTML text wrapping but may not be needed.

### Layout Bugs

- [ ] `stat.backgroundWidth: 6` → SIZE.FILL
- [ ] `transform.overlaySize: 0.9` → SIZE.FILL
- [ ] `cards perRow` formula → token-driven
- [ ] `chrome.ts` bottomSpacer `margin/4` → tokenize

### Code Quality

- [ ] Audit post-unification simplifications (dead types)
- [ ] Factsheet master tokens simplification (too many explicit tokens)

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

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| No masters | Background on template, chrome composed into layout |
| No componentOverrides | Design system should be expressive enough |
| Palette not ColorScheme | Single-word noun, consistent naming |
| Token mapper in theme-default | Work out pattern first, graduate to SDK later |
| All tokens to every layout | Slot system requires it |
| LAYER system kept | More compositional. Re-evaluate later. |
| resolveTokens removal | Not needed with fixed headings |
