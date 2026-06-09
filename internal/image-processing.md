# Image Processing Pipeline

SVG auto-rasterization for PPTX. Tint via duotone on raster images.

## Summary

Images in tycoslide come from diverse sources: local files, URLs, npm packages (like `@material-symbols/svg-400`), and theme asset catalogs. The pipeline handles all of them uniformly — no separate "icon" concept, no special component. Icons are just images that happen to be SVGs.

The one problem: modern PowerPoint renders SVGs directly, ignoring the raster fallback and its `<a:duotone>`. So tinting SVGs via duotone is invisible in PowerPoint. The fix: auto-rasterize SVGs to PNG before PPTX embedding. Duotone then works because PowerPoint sees a PNG, not an SVG.

---

## Key Decisions

### clrRepl is dead

`<a:clrRepl>` (color replace) is a dead part of the OOXML specification. Duotone (`<a:duotone>`) entirely replaced it. All colorization uses duotone. This is confirmed through extensive research.

### No separate icon component

Three architects unanimously agreed. Icons go through the existing Image component. The distinction is asset discovery (the catalog names icons for AI/LLM use), not rendering. A Material Symbols SVG is no different from a local SVG logo — same node type, same rendering path.

### No `createIconSet()` utility

The original proposal was an SDK utility where theme authors declare a curated icon set from an npm package. Rejected in favor of the simpler approach: theme authors register SVGs in the existing `AssetCatalog`, and the pipeline auto-rasterizes as needed. No new concepts, no new APIs.

### Tint stays on ImageNode

`tint?: string` on ImageNode is the single token for colorization. Two rendering paths (for now):
- **PPTX**: duotone on rasterized PNG (works because we auto-rasterize SVGs)
- **HTML**: CSS `mask-image` + `background-color`

The HTML tint path may become irrelevant — see "Preview Pivot Interaction" below.

### SVGs rasterize faithfully, duotone applies color

Rasterize the SVG as-is (preserving its original colors — typically black for icons). Duotone in PPTX applies the tint color. This preserves PowerPoint editability: a user can select the image and change the duotone color without re-exporting from markdown.

---

## Architecture

### Current pipeline

```
ImageNode.src (file path — SVG, PNG, JPG, URL)
  → layoutHtml.tsx: load into HTML, measure via Playwright
  → pptxConfigBuilder.ts: addImage({ path, ... })
  → pptxgenjs: embeds image into PPTX
```

Problem: if `src` is an SVG, pptxgenjs stores it as SVG + raster fallback. Modern PowerPoint renders the SVG directly, ignoring `<a:duotone>` on the raster fallback. Tint is invisible.

### New pipeline

```
ImageNode.src (file path — SVG, PNG, JPG, URL)
  → layoutHtml.tsx: load into HTML, measure via Playwright
  → PPTX renderer: if SVG, rasterize to PNG at 2x positioned dimensions
  → pptxConfigBuilder.ts: addImage({ path: rasterizedPng, ... })
  → pptxgenjs: embeds raster PNG, duotone applies correctly
```

One conditional added. HTML path unchanged. Photos/PNGs pass through untouched.

### Where rasterization happens

In the PPTX renderer, after layout measurement and before `buildImageConfig()`. At this point we know the positioned pixel dimensions. Rasterize at 2x for sharpness.

Use Playwright (already running for measurement). No new dependency. `page.setContent()` with the SVG at target dimensions, `element.screenshot({ type: 'png' })`.

Cache by `(src, width, height)` to avoid re-rasterizing the same SVG at the same size.

---

## Token Design

```typescript
// Already implemented on ImageNode (nodes.ts)
export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  fit: Fit;              // CONTAIN (default), COVER, STRETCH
  alt?: string;
  shadow?: ShadowEffect;
  tint?: string;         // colorize via duotone (PPTX) / mask-image (HTML)
}
```

```typescript
// Already implemented on ImageTokens (image.ts)
export interface ImageTokens {
  fit: Fit;
  tint?: string;
  shadow?: ShadowEffect;
  padding?: number;
}
```

### PPTX rendering

| Token | PPTX mechanism | Notes |
|-------|---------------|-------|
| none | Standard image embed | Default passthrough |
| `tint` | `<a:duotone>` inside `<a:blip>` | Native OOXML. Applies to raster images (auto-rasterized SVGs or original PNGs). Editable in PowerPoint. |
| `fit: COVER` | pptxgenjs `sizing: { type: 'cover' }` | Image fills the box, cropped |
| `shadow` | pptxgenjs shadow options | Already implemented |

### HTML rendering

| Token | CSS | Notes |
|-------|-----|-------|
| none | `object-fit: contain` | Default |
| `tint` | `mask-image: url(src); background-color: {tint}` | CSS mask colorization |
| `fit: COVER` | `object-fit: cover` | Browser-native crop |
| `shadow` | `filter: drop-shadow(...)` | Already implemented |

---

## Preview Pivot Interaction

`internal/preview-pivot.md` describes stripping HTML to a wireframe (layout measurement only — no colors, shadows, decoration) and using LibreOffice for visual preview.

If the preview pivot lands:
- HTML becomes wireframe-only. CSS `mask-image` tinting is removed along with all other visual CSS.
- The only tint path is duotone on rasterized PNG in PPTX.
- SVG auto-rasterization becomes even more important — it's the ONLY rendering path for SVGs.

This simplifies the design: one rendering authority (PPTX via pptxgenjs), one colorization mechanism (duotone), one rasterization target (PNG from Playwright).

---

## Asset Catalog Integration

### No catalog changes needed

The AssetCatalog maps names to file paths with documentation. It does not know about rendering. `$icons.shield` resolves to a file path — SVG or PNG — and the pipeline handles the rest.

### Theme author workflow

Designer gives you 30 icons from Material Symbols. You register them in `assets.ts`:

```typescript
export const assets = new AssetCatalog(import.meta.url, {
  icons: {
    shield: {
      path: require.resolve("@material-symbols/svg-400/outlined/shield.svg"),
      documentation: {
        description: "Shield with checkmark for security or trust",
        whenToUse: "Security features, compliance, trust signals",
      },
    },
    rocket_launch: {
      path: require.resolve("@material-symbols/svg-400/outlined/rocket_launch.svg"),
      documentation: {
        description: "Rocket launching for growth or momentum",
        whenToUse: "Growth metrics, product launches, momentum",
      },
    },
    // ... 20-40 icons curated from the design template
  },
});
```

### Markdown syntax unchanged

```markdown
image: $icons.shield
```

Same `$category.name` resolution. The template's tokens determine tint color. The markdown author does not know or care about SVG vs PNG.

### Multi-format motivation

One SVG source per icon. Each format/template sets `tint` from its palette:

```typescript
// Light background template
tokens: { image: { fit: FIT.CONTAIN, tint: palette.accent } }

// Dark background template
tokens: { image: { fit: FIT.CONTAIN, tint: palette.background } }
```

Same icon, different colors, zero asset duplication.

---

## Implementation Plan

### Phase 1: SVG Auto-Rasterization (PPTX only)

The minimum viable change. ~40 lines.

| File | Change |
|------|--------|
| `packages/core/src/utils/image.ts` | Add `rasterizeSvg(src, width, height, page): Promise<Buffer>` using Playwright |
| `packages/core/src/core/rendering/pptxConfigBuilder.ts` | In image config builder, detect SVG source, call `rasterizeSvg()`, swap path to rasterized PNG |

What does NOT change: ImageNode, ImageTokens, components, HTML rendering, measurement, asset catalog.

### Phase 2: Theme icon migration

| File | Change |
|------|--------|
| `packages/theme-default/package.json` | Add `@material-symbols/svg-400` dependency |
| `packages/theme-default/src/assets.ts` | Point icon entries at SVG source files instead of pre-rasterized PNGs |
| `packages/theme-default/assets/icons/` | Delete pre-rasterized PNGs (no longer needed) |

### Phase 3: Tint cleanup (after preview pivot)

When the preview pivot lands and HTML becomes wireframe-only:
- Remove CSS `mask-image` tinting from `layoutHtml.tsx`
- Remove `tint` from HTML rendering path entirely
- Duotone in PPTX becomes the single tint mechanism

---

## Editability

Markdown is the source of truth. PPTX edits are the escape hatch — "like SSHing into production during an incident."

| Element | Strategy |
|---------|----------|
| Text, shapes, tables | Native OOXML (reps fix typos, update numbers) |
| Icons | Rasterized PNG + duotone. Editable: user can change duotone color in PowerPoint |
| Code blocks, mermaid | Rasterized (nobody edits syntax-highlighted code in PowerPoint) |
| Photographs | Native image passthrough (original quality preserved) |

Future: `tycoslide diff` — detect PPTX edits and reconcile back to markdown.

---

## Open Questions

1. **Rasterization cache**: In-memory per-build, or on-disk for cross-build persistence? Start with in-memory.
2. **SVG detection**: File extension (`.svg`) or content sniffing (`<svg` header)? Extension is simpler; sniffing catches edge cases. Start with extension.
3. **Large SVGs**: Complex illustrations at small render sizes may lose detail. 2x multiplier should handle this. Add opt-out later only if someone needs it (YAGNI).
4. **SVGs with external references**: Fonts, linked images will render broken. Document that SVGs must be self-contained. This is already true for pptxgenjs embedding.

## Resolved Questions

1. **clrRepl vs duotone**: Duotone. clrRepl is dead.
2. **Separate icon component**: No. Icons are images.
3. **createIconSet() API**: No. Asset catalog + auto-rasterization.
4. **Rasterization tool**: Playwright (already running, no new dependency).
5. **Bake color vs duotone**: Duotone. Preserves PowerPoint editability.
6. **Universal rasterization (all images)**: Not yet. Start with SVG-only. Universal rasterization (screenshot all images from the browser) may come later as part of the preview pivot, but is a separate concern.
7. **Icon font approach**: Blocked. Ligatures are globally disabled in layoutHtml.tsx for text measurement accuracy. SVG is the correct source format.
