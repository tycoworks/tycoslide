# tycoslide Roadmap

Now / Next / Later — unified from todo, review, and roadmap docs.

---

## Now

Before launch. Must be done before telling the world.

---

## Next

Immediate next priorities after launch.

### Claude Code Skill

Build a tycoslide skill for Claude Code — users describe a presentation and the skill generates a markdown deck. Reference: Slidev skill (https://github.com/slidevjs/slidev/tree/main/skills/slidev). Study frontend-slides' progressive disclosure pattern (concise core file, supporting docs loaded on demand) and their style selection UX (3 visual previews before generating).

### Distribution & Integrations

tycoslide as a compilation target for other tools. frontend-slides (https://github.com/zarazhangrui/frontend-slides, 8.7k stars) generates HTML presentation decks from natural language descriptions — could it compile to tycoslide markdown instead, producing editable .pptx output? Explore what an integration would look like: tycoslide as a backend for AI-driven presentation tools that currently produce throwaway HTML.

### Integration Tests

DSL input → full pipeline (expand → measure → layout) → assert element positions/sizes. Not pixel-perfect screenshot comparison, but geometric assertions: "this text node is at (x, y) with size (w, h)". Deterministic because Playwright measurement with embedded fonts is reproducible. The showcase deck doubles as a test fixture. Covers the orchestration layers (presentation, pipeline, pptxRenderer) through their real public API boundary — unit testing those individually would just test wiring.

### Inline Code

`` `code` `` within a paragraph renders as plain text in the same body font. Distinct from fenced code blocks which use the Shiki-based code component. For inline code, want monospace font + optional background highlight. pptxgenjs supports per-fragment `fontFace` and `highlight`. Moderate: need to decide where inline code font comes from (code component token? theme-level monospace font?). Needs per-run font override — separate effort from other inline formatting.

### Color Token Validation

Add `assertHexColor()` validation at token boundaries to catch malformed values (missing `#`, wrong length, CSS named colors).

### Charts

Chart components for data visualization (bar, line, pie, etc.). pptxgenjs has native chart support — wrap it as a tycoslide component with theme-aware colors. High demand for sales and analytics decks.

### Rotation

Rotation property on shapes, images, and potentially text. pptxgenjs supports `rotate` on shapes, images, and text. Shapes and images are straightforward: `transform: rotate()` in HTML, `rotate` option in PPTX. Text rotation is more complex — interacts with auto-sizing, measurement pipeline, and container layout. CSS supports `transform: rotate()` on text elements but Playwright measurement with rotated text may produce unexpected bounding boxes. Needs investigation into whether rotated text affects layout flow or is purely decorative (post-layout transform).

### Card Image Placement

Cards currently only show images at the top. Add support for image on the left side (horizontal card layout).

### PPTX Groups

Composite components (cards) currently render all shapes individually. They should be grouped in PPTX output. Blocked by pptxgenjs not supporting groups natively — may need to work around or contribute upstream.

### Theme Building CLI

Make it easier to bootstrap themes. `tycoslide theme-init --from-dtcg tokens.json` consumes W3C DTCG JSON and emits a TypeScript theme scaffold. One-time codegen, not runtime. Document the recommended multi-size theme file structure (shared palette/fonts/components, size-specific spacing/textStyles). Or scrapes website / existing presentations.

### HTML Live Preview

Better developer experience for previewing slides. Bundle with debug HTML improvements — Chrome DevTools may already provide container visualization, reducing the need for custom red-line debug overlays. Explore preview server and VS Code extension.


---

## Later

Future exploration. No timeline.

### Portrait & Different Slide Sizes

Support portrait orientation, A4 format, and other sizes. Opens the door to content beyond presentations — documents, handouts, posters. Includes the multi-size theme pattern (shared base, size-specific spacing).

### Theme from PPTX or Figma

Detect and bootstrap themes from existing materials. Figma pipeline: Tokens Studio plugin syncs to GitHub as DTCG JSON, CLI scaffolds TypeScript theme. Deeper integration: extract Figma component structure (Auto Layout, variant properties) and map to tycoslide definitions.

### Real Mermaid

Currently mermaid diagrams render as images. Explore creating them as native PPTX shapes for better quality and editability.

---

## Bugs

Tracked separately from roadmap — different scope and size.

- **Right-aligned bullet points** — pptxgenjs renders right-aligned text in bullet points incorrectly. Edge case, unlikely to hit in practice.

