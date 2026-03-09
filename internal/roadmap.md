# tycoslide Roadmap

Now / Next / Later — unified from todo, review, and roadmap docs.

---

## Now

Before launch. Must be done before telling the world.

### tycoworks Theme & Showcase

Rebrand `theme-default` as the tycoworks theme — a real brand-aligned theme that demonstrates what tycoslide enables. No generic "default" theme; the whole point is you build your own. The tycoworks theme is the only shipped example and doubles as the showcase. Layouts are done (19 across all tiers). Showcase deck needs updating to demonstrate new components (mermaid, code) and layouts not yet shown. Align tokens to website?

### Integration Tests

DSL input → full pipeline (expand → measure → layout) → assert element positions/sizes. Not pixel-perfect screenshot comparison, but geometric assertions: "this text node is at (x, y) with size (w, h)". Deterministic because Playwright measurement with embedded fonts is reproducible. The showcase deck doubles as a test fixture. Covers the orchestration layers (presentation, pipeline, pptxRenderer) through their real public API boundary — unit testing those individually would just test wiring.

### Publish to npm

Publish all three packages (`tycoslide`, `tycoslide-components`, `tycoslide-theme-default`) to npm. End-to-end install experience: `npm install tycoslide tycoslide-theme-default`, create a markdown file, `npx tycoslide build deck.md`, get a .pptx. Starter template or `npm create tycoslide` scaffolding so new users have a working example immediately.

---

## Next

Immediate next priorities after launch.

### Distribution & Integrations

tycoslide as a compilation target for other tools. frontend-slides (https://github.com/zarazhangrui/frontend-slides, 8.7k stars) generates HTML presentation decks from natural language descriptions — could it compile to tycoslide markdown instead, producing editable .pptx output? Explore what an integration would look like: tycoslide as a backend for AI-driven presentation tools that currently produce throwaway HTML.

### Claude Code Skill

Build a tycoslide skill for Claude Code — users describe a presentation and the skill generates a markdown deck. Reference: Slidev skill (https://github.com/slidevjs/slidev/tree/main/skills/slidev). Study frontend-slides' progressive disclosure pattern (concise core file, supporting docs loaded on demand) and their style selection UX (3 visual previews before generating).

### Inline Code

`` `code` `` within a paragraph renders as plain text in the same body font. Distinct from fenced code blocks which use the Shiki-based code component. For inline code, want monospace font + optional background highlight. pptxgenjs supports per-fragment `fontFace` and `highlight`. Moderate: need to decide where inline code font comes from (code component token? theme-level monospace font?). Needs per-run font override — separate effort from other inline formatting.

### Open Font Weights

Instead of the 3 hardcoded.

### Color Token Validation

Add `assertHexColor()` validation at token boundaries to catch malformed values (missing `#`, wrong length, CSS named colors).

### Charts

Chart components for data visualization (bar, line, pie, etc.). pptxgenjs has native chart support — wrap it as a tycoslide component with theme-aware colors. High demand for sales and analytics decks.

### Shadows

Shadow support on shapes and images. Standard business deck polish. pptxgenjs has native shadow options.

### Shape Rotation

Rotation property on shapes and images. Needed for decorative elements. pptxgenjs supports `rotate` on all shape types.

### Card Image Placement

Cards currently only show images at the top. Add support for image on the left side (horizontal card layout).

### PPTX Groups

Composite components (cards) currently render all shapes individually. They should be grouped in PPTX output. Blocked by pptxgenjs not supporting groups natively — may need to work around or contribute upstream.

### Theme Building CLI

Make it easier to bootstrap themes. `tycoslide theme-init --from-dtcg tokens.json` consumes W3C DTCG JSON and emits a TypeScript theme scaffold. One-time codegen, not runtime. Document the recommended multi-size theme file structure (shared palette/fonts/components, size-specific spacing/textStyles). Or scrapes website / existing presentations.

### Dark Mode

Per-slide color modes. Each slide specifies `mode: 'dark' | 'light'`. Theme defines complete component variant sets per mode.

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

---

## Philosophy

- **No design opinions in core.** Design decisions come from themes and layouts upstream. tycoslide enforces what the theme author specifies, nothing more.
- **Show, don't default.** No generic "default" theme — the whole point is building your own. The shipped tycoworks theme is a showcase of what brand alignment looks like, not a starting point to customize.
- **TypeScript themes, not JSON.** Themes are TypeScript for font path resolution, typed constants, and compile-time safety. DTCG JSON is an authoring input consumed by a CLI scaffold tool, not a runtime format.