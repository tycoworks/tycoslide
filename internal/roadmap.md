# tycoslide Roadmap

Now / Next / Later — unified from todo, review, and roadmap docs.

---

## Now

Before launch. Must be done before telling the world.

### Default Theme & Showcase

The big piece. A polished default theme with good colors, layouts, and a showcase deck that demonstrates everything tycoslide can do. The `layout-research.md` file informs layout decisions.

### Blockquote Mdast Type

Markdown `>` blockquote syntax doesn't produce quote components. Need to register a blockquote handler in the markdown compilation pipeline so `>` maps to the quote component.

### Review Masters & Footer

Verify the footer concept lives only in theme masters, not in core. Currently `FOOTER_HEIGHT_RATIO` and `getFooterBounds()` in `presentation.ts` hardcode footer layout. Footer is purely a master concern. Fix: `Master.getContent()` should return `masterBounds` in addition to `contentBounds`. Delete the footer plumbing from core.

### Test Coverage

Zero-coverage files that need tests:

- `pptxRenderer.ts` (316 lines) — final output stage
- `pipeline.ts` (164 lines) — layout orchestration
- `presentation.ts` (278 lines) — public API
- `themeLoader.ts` — zero dedicated tests
- Unit conversion functions (`pxToIn`, `inToPx`, `inToPt`, `ptToIn`)

### Code Quality

- Split `types.ts` (503 lines) into `types.ts`, `shapes.ts`, `tokens.ts`, `theme.ts`
- Standardize test assert imports (3 patterns currently)
- Standardize `test()` vs `it()` (pick one)
- Extract `layoutHtml.test.ts` inline mock to shared `mockTheme()`
- Replace magic strings in tests with typed constants — `components.test.ts` uses string literals like `'body'`, `'full'`, `'small'` in assertions instead of `TEXT_STYLE.BODY`, `BORDER_STYLE.FULL`, `TEXT_STYLE.SMALL`. Same rule as the `Component` enum: never use string literals when typed constants exist.
- **headerColumns not checked in layoutHtml** — `getTableCellNodes` in `layoutHtml.tsx` only checks `headerRows`, not `headerColumns`. Header column cells get `cellTextStyle` instead of `headerTextStyle` in HTML measurement, while `pptxConfigBuilder` handles it correctly. Low impact unless header/cell text styles differ significantly.
- **Generic `ContainerNode<C>` for pre-expansion type safety** — `ContainerNode.children` is typed `ElementNode[]` but during expand they're actually `SlideNode[]`, forcing 4 casts (3 in `containers.ts`, 1 double-cast in `slotCompiler.ts`). Fix: add generic parameter `ContainerNode<C extends SlideNode = ElementNode>` so producers use `ContainerNode<SlideNode>` and consumers use the default. `expandTree()` becomes the single honest conversion point. 5 files touched, 0 consumer changes.

---

## Next

Immediate next priorities after launch.

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
