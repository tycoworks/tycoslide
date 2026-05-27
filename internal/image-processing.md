# Image Processing Pipeline

Universal image rasterization via Canvas — all images go through HTML+CSS rendering.

## Summary

All images in tycoslide are rasterized through the existing `Canvas.renderHtml()` pipeline. The browser is the single rendering authority. Images are already loaded into HTML for layout measurement — screenshotting them is a crop of data that's already there, not a new operation. This eliminates format-specific branching (SVG vs PNG vs JPG), unifies visual processing (colorization, cover/crop, shadow), and removes the duplicate positioning logic between the browser's `object-fit` and the PPTX renderer's `containFit`.

---

## Why Universal

### Images are already in the browser

The measurement pipeline loads every image into HTML for layout (`layoutHtml.tsx`). The browser decodes, renders, and positions them. Today, that rendered result is thrown away — the PPTX renderer re-reads the original file and re-computes positioning via `containFit`. Universal rasterization captures the browser's rendered result directly, eliminating the redundant second pass.

### One code path, zero format branching

| Before (conditional) | After (universal) |
|----------------------|-------------------|
| SVG → must rasterize (Keynote/Slides compatibility) | All images → screenshot from measurement HTML |
| PNG/JPG + `color` token → rasterize via Canvas | CSS processing tokens applied uniformly |
| PNG/JPG, no tokens → passthrough to pptxgenjs | No special cases |
| 3 branches, format detection | 1 branch, no format detection |

### CSS is the single rendering authority

Visual effects expressed once in CSS, not reimplemented in the PPTX config builder:

| Effect | CSS | Works for all formats |
|--------|-----|----------------------|
| Colorization | `mask-image` + `background-color` | Yes |
| Cover/crop | `object-fit: cover` | Yes |
| Shadow | `filter: drop-shadow(...)` | Yes |
| Rounded corners | `border-radius` + `overflow: hidden` | Yes |
| Filters | `filter: blur() grayscale()` | Yes |

### Quality is sufficient

Playwright screenshots at 2x device pixel ratio. A full-bleed photograph on a 960px-wide slide renders at ~1920px — more than enough for projected slides and printed collateral. PowerPoint itself downscales large images for display.

### Editability: escape hatch, not feature

Markdown is the source of truth. PPTX edits are the field emergency — like SSHing into production during an incident. The pragmatic line:

| Element | Strategy | Why |
|---------|----------|-----|
| Text, shapes, tables | Native OOXML | Reps fix typos, update numbers. High edit value, free to implement. |
| Icons (PNG) | Native OOXML via `<a:clrRepl>` | 2 lines of XML, preserves recolorability. Cheap native wins. |
| Icons (SVG) | Rasterize to PNG, then `<a:clrRepl>` | SVGs lack universal PPTX/Keynote support. Rasterize for compat, recolor natively. |
| Code blocks, mermaid | Rasterize | Nobody edits syntax-highlighted code in PowerPoint. Hard to make native. |
| Photographs | Native image + `containFit` placement | No processing needed, original quality preserved. |

Future investment: `tycoslide diff` — detect PPTX edits and reconcile back to markdown (Terraform-style drift management).

---

## Architecture

### Current pipeline (before)

```
ImageNode.src (file path)
  → layoutHtml.tsx: load into HTML, measure via object-fit:contain
  → pptxConfigBuilder.ts: re-read file, re-compute containFit positioning
  → pptxgenjs: addImage({ path })
```

Two rendering authorities. Browser computes one position, `containFit` computes another. If they disagree: misalignment bug.

### New pipeline (after)

```
ImageNode.src (file path)
  → layoutHtml.tsx: load into HTML, apply CSS tokens (color, cover, shadow)
  → measurement pass: screenshot each image element from the rendered page
  → ImageNode.src rewritten to rasterized PNG path
  → pptxConfigBuilder.ts: addImage({ path }) with pre-fitted image
  → containFit becomes no-op (image already IS the fitted result)
```

One rendering authority. The browser is the source of truth.

### Where rasterization happens

After the measurement pass in `measurement.ts`, the browser page has every image rendered at correct size and position. For each `ImageNode`, use `element.screenshot()` to capture the positioned image element. Save to `outputDir/images/`. Rewrite `ImageNode.src` to the screenshot path.

Zero new Playwright pages. Zero new navigations. The images are already there.

---

## Token Design

```typescript
export const FIT = { CONTAIN: "contain", COVER: "cover" } as const;
export type Fit = (typeof FIT)[keyof typeof FIT];

export interface ImageTokens {
  shadow?: ShadowEffect;
  padding?: number;
  color?: string;       // colorize icon to this color
  fit?: Fit;            // contain (default) or cover
}
```

Tokens flow through ImageNode fields to two rendering paths:

### PPTX rendering (native OOXML)

| Token | PPTX mechanism | Notes |
|-------|---------------|-------|
| none | `containFit()` placement adjustment | Default. Adjusts x/y/w/h to preserve aspect ratio. |
| `color` | `<a:clrRepl><a:srgbClr val="..."/></a:clrRepl>` | Native OOXML. Spec guarantees alpha preservation. Keeps icon recolorable in PowerPoint. |
| `fit: "cover"` | Full positioned bounds (no containFit) | Image fills the box, cropped by pptxgenjs `sizing: { type: 'cover' }`. |
| `shadow` | pptxgenjs shadow options | Already implemented. |

### HTML rendering (measurement + rasterized elements)

| Token | CSS applied | Use case |
|-------|------------|----------|
| none | `object-fit: contain` (default) | Photographs, diagrams |
| `color` | `mask-image: url(src); background-color: {color}` | Icons, logos — CSS mask for HTML preview |
| `fit: "cover"` | `object-fit: cover` | Hero images, card thumbnails |
| `shadow` | `filter: drop-shadow(...)` | Any image with shadow |

### Icon colorization: `<a:clrRepl>` (OOXML native)

The OOXML `<a:clrRepl>` element replaces all colors with a target color while preserving alpha. This is what PowerPoint uses internally for its "Recolor" feature. The XML is trivial:

```xml
<a:blip r:embed="rId5">
  <a:clrRepl>
    <a:srgbClr val="FF6600"/>
  </a:clrRepl>
</a:blip>
```

For SVG icons: rasterize to black-on-transparent PNG first (SVGs lack universal PPTX/Keynote support), then apply `<a:clrRepl>`. The icon remains recolorable in PowerPoint.

CSS `mask-image` colorization is used for HTML preview rendering only.

---

## Asset Catalog Integration

### No catalog changes

The AssetCatalog maps names to file paths with documentation. It does not know about rendering. `$icons.shield` resolves to a file path — SVG or PNG — and the universal pipeline handles it.

### Theme author registers icons

```typescript
export const assets = new AssetCatalog(import.meta.url, {
  icons: {
    shield: {
      path: require.resolve("@material-design-icons/svg/filled/shield.svg"),
      documentation: {
        description: "Shield with checkmark for security or trust",
        whenToUse: "Security features, compliance, trust signals",
      },
    },
  },
});
```

Icons come from `@material-design-icons/svg` (same library as current pre-rasterized PNGs, just SVG source files instead). Theme authors curate 20-40 icons with descriptions for AI skill discovery.

### Markdown syntax unchanged

```markdown
image: $icons.shield
```

Same `$category.name` resolution. The template's tokens determine processing. The markdown author does not know or care about the underlying format.

---

## Multi-Format Motivation

Pre-rasterized PNGs require separate assets per color variant (N icons × M color contexts). Runtime colorization: ship one source file per icon. Each format/template sets `color` from its palette.

```typescript
// Light background template
tokens: { image: { color: palette.heading } }

// Dark background template
tokens: { image: { color: palette.background } }
```

Same icon, different colors, zero asset duplication.

---

## Implementation Plan

### Phase 1: Universal Rasterization + Colorization

| Area | Change |
|------|--------|
| `packages/core/src/core/layout/` | After measurement, screenshot each image element. Rewrite ImageNode.src to rasterized path. |
| `packages/sdk/src/components/image.ts` | Add `color` and `fit` to ImageTokens. Apply as CSS in the image's HTML element. |
| `packages/core/src/core/layout/layoutHtml.tsx` | `styleImage()` reads tokens from ImageNode to apply CSS (mask-image for color, object-fit for cover). |
| `packages/core/src/core/rendering/pptxConfigBuilder.ts` | `containFit` becomes no-op — rasterized images are already fitted. |
| `packages/theme-default/src/assets.ts` | Swap pre-rasterized PNG icons for SVG source files from @material-design-icons/svg. |
| `packages/theme-default/src/formats/` | Set `color` token on icon-using templates. |

### Token flow

Tokens need to reach the layout HTML. Current flow: `ImageNode` has no token storage — tokens are consumed in the component render function. For universal rasterization, the image's CSS needs to know about `color` and `fit`. Options:

1. **Add optional fields to ImageNode** — `color?: string`, `fit?: "cover"`. Layout HTML reads them to apply CSS. Clean, explicit.
2. **Apply tokens in component render, pass processed HTML** — component builds the HTML fragment, layout just embeds it. Matches mermaid/code pattern but diverges from how images currently work.

Option 1 is simpler. ImageNode gains two optional fields:

```typescript
export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  alt?: string;
  shadow?: ShadowEffect;
  color?: string;     // colorize via CSS mask-image
  fit?: "cover";      // CSS object-fit override
}
```

### What does NOT change

- `AssetCatalog` — unchanged
- `document compiler` — unchanged
- `Markdown syntax` — unchanged
- `Canvas.renderHtml()` — not used directly for images (they go through the measurement pipeline instead)

### Migration path for theme-default

1. Add `@material-design-icons/svg` as dependency (SVG source files)
2. Update asset catalog to point at SVGs instead of pre-rasterized PNGs
3. Set `color` tokens on templates that use icons
4. Remove pre-rasterized PNG files from `assets/icons/`
5. Remove `logoWhite.png` / `logomarkWhite.png` — use single logo + `color` token

---

## Key Design Principles

1. **The browser is the single rendering authority.** All images go through HTML+CSS. No dual positioning logic.
2. **Tokens control visual processing.** `color`, `fit`, `shadow` — all CSS, all applied uniformly regardless of source format.
3. **No format detection.** The pipeline does not branch on SVG vs PNG vs JPG. The browser handles all formats.
4. **One slot, any content.** Template slots accept photographs, icons, and logos interchangeably. Tokens determine processing.
5. **Measurement and rasterization are the same pass.** Images are already in the browser for measurement. Screenshotting is a crop of existing data.

---

## Open Questions

1. **Screenshot format**: PNG for everything, or JPEG for non-transparent images? PNG is simpler. JPEG saves file size for photographs. Start with PNG.
2. **Rasterization size for icons**: Small SVG icons (24×24 viewBox) need to be rendered at a reasonable pixel size for sharpness. The layout engine's `resolveImageSizing()` determines display size — but the source SVG viewBox is tiny. May need a minimum rasterization size or a size hint in the token.
3. **Cover/crop aspect ratio**: When `fit: "cover"`, the crop region depends on the container's aspect ratio, which is known at measurement time. The element screenshot captures exactly the right crop.

## Resolved Questions

4. **pptxgenjs native sizing**: The published `@tycoworks/pptxgenjs@4.0.3` has a stale build — the `getImageSizeFromBase64` fix exists in source (`gen-xml.ts`) but was not included in the dist artifacts. Need to rebuild and publish 4.0.4. The fix reads actual image pixel dimensions so `ImageSizingXml.contain/cover` compute correct `<a:srcRect>`. Meanwhile, `containFit()` in tycoslide handles contain placement correctly.
5. **Icon colorization**: Use `<a:clrRepl>` (native OOXML), not CSS `mask-image` rasterization. The spec explicitly guarantees alpha preservation. 2 lines of XML inside `<a:blip>`. Keeps icons recolorable in PowerPoint. CSS `mask-image` is for HTML preview only.
6. **Fit enum**: Use a proper const enum (`FIT.CONTAIN`, `FIT.COVER`), not string literals. Consistent with `DASH`, `STRIKE`, `UNDERLINE` patterns.
7. **Editability philosophy**: Native OOXML where it is free (text, shapes, tables) or cheap (icons via `<a:clrRepl>`). Rasterize where native is hard (code blocks, mermaid). Editability is an escape hatch for field emergencies, not a product feature to maximize. Future: drift reconciliation (`tycoslide diff`) over richer editability.
