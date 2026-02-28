# tycoslide Roadmap

Now / Next / Later — unified from todo, review, and roadmap docs.

---

## Now

Before launch. Must be done before telling the world.

### RenderService Naming

The `render.renderHtmlToImage()` nesting on `ExpansionContext` is right, but `RenderService` is the wrong name. Defer this decision until after the code component — a second consumer will clarify what the interface should be called.

### Theme Font Registry

Add `theme.fonts` — a named font registry (`Record<string, FontFamily>`) at the top level of `Theme`. Themes declare fonts by semantic role (body, mono, heading). `generateFontFaceCSS()` discovers and embeds all registered fonts as base64 data URIs. The code component's `fontFamily` token becomes a `FontFamily` object instead of a plain string, ensuring monospace fonts go through the same Playwright base64 loading pipeline as all other fonts. Ships a monospace font (e.g., Fira Code via `@fontsource/fira-code`) in the default theme. Currently the code component falls back to system `monospace`, which varies across environments.

### Quote vs QuoteCard

The current quote component is card-like (background, border, padding) — that's a client-specific design. Most quotes are simpler (pull quote + attribution, no card chrome). Investigate splitting: move the current card-style quote to the Materialize theme, replace the default quote component with a simpler implementation. The simpler quote also becomes the natural target for markdown `>` blockquote syntax.

### Scale CLI

Add `maxScaleFactor` as a CLI parameter. Currently set in the theme's `spacing.maxScaleFactor` and passed through to mermaid/image components. Should be overridable from the command line.

### tycoworks Theme & Showcase

Rebrand `theme-default` as the tycoworks theme — a real brand-aligned theme that demonstrates what tycoslide enables. No generic "default" theme; the whole point is you build your own. The tycoworks theme is the only shipped example and doubles as the showcase. Layouts are done (19 across all tiers). Showcase deck needs updating to demonstrate new components (mermaid, code) and layouts not yet shown. Align tokens to website?

### Test Coverage

Zero-coverage files that need tests:

- `pptxRenderer.ts` (316 lines) — final output stage
- `pipeline.ts` (164 lines) — layout orchestration
- `presentation.ts` (278 lines) — public API
- `themeLoader.ts` — zero dedicated tests
- Unit conversion functions (`pxToIn`, `inToPx`, `inToPt`, `ptToIn`)

### Update Docs

User-facing documentation has diverged from the codebase. Code component will be new, there's a new CLI option (scale), component token system has evolved. Investigate thoroughly and update.

### Integration Tests

DSL input → full pipeline (expand → measure → layout) → assert element positions/sizes. Not pixel-perfect screenshot comparison, but geometric assertions: "this text node is at (x, y) with size (w, h)". Deterministic because Playwright measurement with embedded fonts is reproducible. The showcase deck doubles as a test fixture.

---

## Next

Immediate next priorities after launch.

### Color Token Validation

Validate hex color format at token boundaries — catch `#FF0000` vs `FF0000` mismatches, CSS named colors, and other invalid formats. Needs a clean approach: heuristic validation, token type metadata, or point-of-use `assertHexColor()` utility.

### Charts

Chart components for data visualization (bar, line, pie, etc.). pptxgenjs has native chart support — wrap it as a tycoslide component with theme-aware colors. High demand for sales and analytics decks.

### Hyperlinks

Hyperlinks on text, images, and shapes. pptxgenjs already supports this — just needs plumbing through the component system and DSL.

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
