# tycoslide Roadmap

Now / Next / Later.

---

## Now

### Multi-Format Themes

Single theme package, multiple output formats — 16:9 presentations, US letter fact sheets, A4 documents. Shared brand identity, format-specific dimensions, typography, spacing, and layout tokens. See [multi-format-themes.md](multi-format-themes.md).

### Theme Bootstrap Skill

AI skill that bootstraps themes from existing materials — scans PPTX slides, PDFs, or Figma exports, extracts structural skeletons (layout geometry, spacing, font sizes, colors), and generates draft TypeScript layout definitions. Combines the theme building CLI concept with PPTX/Figma extraction. Reduces theme authoring from "write from scratch" to "review and refine."

### Create & Edit Skill

Collateral authoring skill for Claude Code. Teaches AI tycoslide's markdown dialect, layout selection, composition rules (via sequences), error translation, and build workflow. See [skills.md](skills.md).

---

## Next

### Sequence-Based Composition

Slide sequences as a compositional primitive — reusable patterns of 3-7 slides forming coherent rhetorical units (Problem-Solution-Proof, Feature Tour, Case Study, etc.). The missing abstraction between individual layouts and complete decks. See [sequences.md](sequences.md).

### Integration Tests

DSL input → full pipeline (expand → measure → layout) → assert element positions/sizes. Geometric assertions, not pixel-perfect screenshots. Deterministic because Playwright measurement with embedded fonts is reproducible.

### Inline Code

`` `code` `` within paragraphs renders as monospace font + optional background highlight. Needs per-run font override — separate from fenced code blocks (which use Shiki-based code component).

### Color Token Validation

`assertHexColor()` validation at token boundaries to catch malformed values (missing `#`, wrong length, CSS named colors).

### Card Image Placement

Support image on the left side (horizontal card layout), not just top.

### PPTX Groups

Composite components (cards) should be grouped in PPTX output. Blocked by pptxgenjs not supporting groups natively.

### Rotation

Rotation property on shapes, images, and potentially text. Needs investigation into how rotated elements interact with the measurement pipeline.

---

## Later

### HTML Live Preview

Hot-reloading preview server and potential VS Code extension for faster iteration during development.

### Charts

Chart components for data visualization (bar, line, pie). pptxgenjs has native chart support — wrap as tycoslide components with theme-aware colors.

### Real Mermaid

Currently mermaid diagrams render as images. Explore native PPTX shapes for better quality and editability.

---

## Bugs

- **Right-aligned bullet points** — pptxgenjs renders right-aligned text in bullet points incorrectly. Edge case.
