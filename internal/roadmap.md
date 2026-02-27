# tycoslide Roadmap

Now / Next / Later — unified from todo, review, and roadmap docs.

---

## Now

Before launch. Must be done before telling the world.

### Default Theme & Showcase

The big piece. A polished default theme with good colors, layouts, and a showcase deck that demonstrates everything tycoslide can do. The `layout-research.md` file informs layout decisions.

### Blockquote Mdast Type

Markdown `>` blockquote syntax doesn't produce quote components. Need to register a blockquote handler in the markdown compilation pipeline so `>` maps to the quote component.

### Test Coverage

Zero-coverage files that need tests:

- `pptxRenderer.ts` (316 lines) — final output stage
- `pipeline.ts` (164 lines) — layout orchestration
- `presentation.ts` (278 lines) — public API
- `themeLoader.ts` — zero dedicated tests
- Unit conversion functions (`pxToIn`, `inToPx`, `inToPt`, `ptToIn`)

### Default Theme Layouts

Missing layouts for the default theme, organized by priority:

**Tier 1 — every deck needs these:**
- Big Number / Fact — oversized stat + label. Universal in business decks
- Standalone Quote — clean pull quote + attribution (simpler than customerStory)
- End / Thank You — closing slide, mirrors title/cover
- Blank / Full Canvas — no chrome at all (current image layout has header bar)

**Tier 2 — common patterns:**
- Image Left / Image Right — dedicated param-based image+prose half-split (twoColumn handles this via markdown slots, but a param-based version is cleaner)
- Comparison — two columns with individual headers (pros/cons, before/after)
- Title Only — title bar + empty canvas for diagrams

**Tier 3 — nice to have:**
- Intro / Bio — person photo + name/title/bio
- Picture with Caption — image + caption text below
- Asymmetric Split — 1/3 + 2/3 or similar uneven columns
- Credits / Team — grid of names/roles

### Integration Tests

DSL input → full pipeline (expand → measure → layout) → assert element positions/sizes. Not pixel-perfect screenshot comparison, but geometric assertions: "this text node is at (x, y) with size (w, h)". Deterministic because Playwright measurement with embedded fonts is reproducible. The showcase deck doubles as a test fixture.

### Render Hook (Escape Hatch)

A `(slide, bounds)` callback in component definitions that gives theme authors scoped access to the pptxgenjs slide object during PPTX rendering. Covers anything pptxgenjs supports that tycoslide doesn't wrap. For things pptxgenjs can't do (animations, grouping, raw XML), document post-processing the .pptx ZIP as an external option.

---

## Next

Immediate next priorities after launch.

### Charts

Chart components for data visualization (bar, line, pie, etc.). pptxgenjs has native chart support — wrap it as a tycoslide component with theme-aware colors. High demand for sales and analytics decks.

### Hyperlinks

Hyperlinks on text, images, and shapes. pptxgenjs already supports this — just needs plumbing through the component system and DSL.

### Shadows

Shadow support on shapes and images. Standard business deck polish. pptxgenjs has native shadow options.

### Shape Rotation

Rotation property on shapes and images. Needed for decorative elements. pptxgenjs supports `rotate` on all shape types.

### Code Component

Syntax-highlighted code blocks in slides. Important for technical audiences.

### Card Image Placement

Cards currently only show images at the top. Add support for image on the left side (horizontal card layout).

### PPTX Groups

Composite components (cards) currently render all shapes individually. They should be grouped in PPTX output. Blocked by pptxgenjs not supporting groups natively — may need to work around or contribute upstream.

### Theme Building CLI

Make it easier to bootstrap themes. `tycoslide theme-init --from-dtcg tokens.json` consumes W3C DTCG JSON and emits a TypeScript theme scaffold. One-time codegen, not runtime. Document the recommended multi-size theme file structure (shared palette/fonts/components, size-specific spacing/textStyles).

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
- **The default theme must be good enough.** Chicken-and-egg: people need to see a great theme before investing in building their own. The default theme is a showcase, not a constraint.
- **TypeScript themes, not JSON.** Themes are TypeScript for font path resolution, typed constants, and compile-time safety. DTCG JSON is an authoring input consumed by a CLI scaffold tool, not a runtime format.
