# tycoslide Roadmap

Now / Next / Later.

---

## Now

### Token System Smells

- [ ] **Font walking** — walking token bags to extract fonts. Needs investigation.
- [ ] **lineHeightMultiplier / bulletIndentPt on TextStyle** — currently required on every text style in format configs. Test whether these can be removed or defaulted — they were added to match HTML text wrapping but may not be needed.

---

## Next

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

