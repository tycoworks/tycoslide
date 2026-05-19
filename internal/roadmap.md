# tycoslide Roadmap

Now / Next / Later.

---

## Now

- [ ] Change positioning / remove slide naming
- [x] Create & Edit Skill (AI authoring in markdown dialect) — design doc: `internal/skill-authoring.md`

---

## Next

### Skills

- [ ] Theme Bootstrap Skill (AI extracts from PPTX/Figma)

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

- [ ] Page numbers render as "999" placeholder instead of actual slide index
- [ ] Right-aligned bullet points (pptxgenjs)
- [ ] Showcase title jumping
- [ ] PptxGenJS shape rendering (stack + shape missing)

## Feature Gaps

- [ ] Asset resolution: `$icons.x` refs in manifest are advertise-only — CLI build has no runtime wiring to resolve them to file paths

