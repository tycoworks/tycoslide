# HTML-First Layout Architecture

## Status: Implemented (CSS rules in progress)

The math layout engine has been deleted. The browser (Playwright + CSS flexbox) is the single source of truth for ALL layout positions. The pipeline generates HTML, the browser computes positions, and `LayoutPipeline.computeLayout()` constructs `PositionedNode` trees directly from browser measurements.

## Architecture

```
Slides -> Expand components
       -> Pre-process images (read dimensions, compute aspect ratios)  [TODO]
       -> Generate layout HTML (CSS flexbox)
       -> Browser measures ALL positions (x, y, width, height)
       -> buildPositionedTree() constructs PositionedNode trees
       -> PPTX renderer
```

### Key Files

| File | Role |
|------|------|
| `layout/layoutHtml.tsx` | **The layout engine** - maps nodes to CSS flexbox HTML |
| `layout/measurement.ts` | Extracts `{x, y, width, height}` from browser via Playwright |
| `layout/pipeline.ts` | `LayoutPipeline` - coordinates measurement and builds positioned trees |
| `presentation.ts` | Orchestrates: collect, expand, measure, position, render |

### How Nodes Map to HTML

The `nodeToJsx()` function in `layoutHtml.tsx` switches on `node.type` and renders each node as a CSS-styled `<div>`:

| Node Type | HTML Component | CSS Strategy |
|-----------|---------------|-------------|
| `TEXT` | `<LayoutText>` | Font family/size, line-height, white-space: pre-wrap |
| `IMAGE` | `<LayoutImage>` | aspect-ratio, contain within parent |
| `LINE` | `<LayoutLine>` | 1px on main axis, stretch on cross axis |
| `RECTANGLE` | `<LayoutRectangle>` | Fills parent bounds (width/height: 100%) |
| `ROW` | `<LayoutContainer direction="row">` | flex-direction: row, gap, align |
| `COLUMN` | `<LayoutContainer direction="column">` | flex-direction: column, gap, align |
| `STACK` | `<LayoutStack>` | CSS Grid overlay (grid-template: 1fr / 1fr) |
| `TABLE` | CSS Grid | grid-template-columns with proportional widths |
| `SLIDE_NUMBER` | `<LayoutSlideNumber>` | Text "999" for max-width measurement |

## Layout Rules

These rules were encoded in the deleted math engine and must be replicated in CSS.

### Element Rules

#### IMAGE

1. **Real aspect ratio**: Read actual image dimensions with `image-size` library. Never use a hardcoded default.
2. **Contain behavior**: Image fits within BOTH width AND height constraints of its parent, preserving aspect ratio. Whichever constraint is tighter wins. This is `object-fit: contain` behavior.
3. **maxScaleFactor**: Image must not upscale beyond its native resolution. `maxHeight = (pixelHeight / SCREEN_DPI) * theme.spacing.maxScaleFactor`. Apply as `max-width` and `max-height` CSS properties.
4. **Fully compressible**: Image can shrink to 0 (`flex-shrink: 1`, `min-height: 0`).
5. **Width fills parent by default**: In a column, image fills available width. Height derived from aspect ratio.
6. **Height constrained in rows**: In a row with fixed height, image takes the row's height. Width derived from aspect ratio.

**Pre-processing required**: Before HTML generation, read image file dimensions and compute:
- `aspectRatio = pixelWidth / pixelHeight`
- `maxWidthInches = (pixelWidth / SCREEN_DPI) * maxScaleFactor`
- `maxHeightInches = (pixelHeight / SCREEN_DPI) * maxScaleFactor`

Store on `ImageNode` (add `aspectRatio?: number` field) or pass via a separate map.

#### TEXT

1. **Height from browser**: CSS flexbox computes text height based on font, line-height, and available width. No JS needed.
2. **Incompressible**: Text should not shrink below its measured height (`flex-shrink: 0` or `min-height` equal to content height).
3. **Fills width**: `width: 100%` to fill container width (prevents centering in flex parent).
4. **Clips on overflow**: If text would exceed bounds, it clips (handled by container overflow).

#### LINE

1. **Direction-aware**:
   - In a **column** (flex-direction: column): horizontal separator. `width: 100%; height: borderWidth`.
   - In a **row** (flex-direction: row): vertical separator. `height: 100%; width: borderWidth`.
2. **Incompressible**: `flex-shrink: 0`.
3. **CSS approach**: `flex: 0 0 auto` with `align-self: stretch` handles cross-axis spanning. Set explicit main-axis dimension to border width.

#### RECTANGLE

1. **No intrinsic size**: Rectangle has zero natural dimensions.
2. **Fills parent bounds**: `width: 100%; height: 100%`.
3. **Fully compressible**: Can shrink to 0.
4. **Primary use**: Background layer in Stack (card backgrounds). The Stack's grid forces the rectangle to match the content layer's size.

#### SLIDE_NUMBER

1. **Measured as text**: Uses "999" as placeholder content for max-width measurement.
2. **Styled with footer text style**: Uses theme's FOOTER text style.
3. **Incompressible**: Like text.

### Container Rules

#### ROW (flex-direction: row)

1. **Height = max child height**: Unless explicit `height` is set or `SIZE.FILL`.
2. **Child widths**:
   - Default (no width specified): Equal flex distribution (`flex: 1 1 0`).
   - `SIZE.FILL`: Takes all remaining space after fixed/intrinsic children (`flex: 1 1 0`).
   - Explicit number: Fixed width in inches (`flex: 0 0 Npx`).
   - Multiple `SIZE.FILL`: Share remaining space equally (CSS flexbox handles this naturally with `flex: 1 1 0` on each).
3. **vAlign**: Positions children vertically within row height.
   - `TOP` (default): `align-items: flex-start`
   - `MIDDLE`: `align-items: center`
   - `BOTTOM`: `align-items: flex-end`
4. **hAlign**: Positions children horizontally (for non-stretching layouts).
   - `LEFT` (default): `justify-content: flex-start`
   - `CENTER`: `justify-content: center`
   - `RIGHT`: `justify-content: flex-end`
5. **Gap**: Space between children (`gap: Npx`).
6. **Padding**: Internal padding on all sides.

#### COLUMN (flex-direction: column)

1. **Child heights**:
   - Default: Intrinsic height (content-determined). No flex properties needed.
   - `SIZE.FILL`: Takes remaining space (`flex: 1 1 0`).
   - Explicit number: Fixed height in inches.
   - Multiple `SIZE.FILL`: Share remaining space equally.
2. **Compression**: When total content exceeds available space, CSS `flex-shrink` proportionally compresses children. Incompressible children (text, lines) use `flex-shrink: 0`. Compressible children (images) use `flex-shrink: 1`.
3. **vAlign**: Positions content group within column.
   - `TOP` (default): `justify-content: flex-start`
   - `MIDDLE`: `justify-content: center`
   - `BOTTOM`: `justify-content: flex-end`
   - Content must never be positioned above parent bounds (CSS handles this naturally).
4. **hAlign**: Controls cross-axis alignment of children.
   - `LEFT` (default): `align-items: stretch` (children fill width - matches PPTX behavior).
   - `CENTER`: `align-items: center` (children use intrinsic width).
   - `RIGHT`: `align-items: flex-end`.
   - **Special case for images**: When a column has `hAlign: CENTER` or `RIGHT`, images narrower than the column should be centered/right-aligned. Use `align-self` on the image div.
5. **Gap**: Space between children.
6. **Padding**: Internal padding on all sides.

#### STACK (CSS Grid overlay)

1. **Height = max child height**: Grid with `1fr / 1fr` template naturally sizes to largest child.
2. **All children overlap**: Each child occupies the same grid cell (`grid-area: 1 / 1 / 2 / 2`).
3. **Render order**: First child is back (z-order), last is front.
4. **Flex participation**: Stack must participate in parent flex layout (`flex: 1 1 0; min-width: 0; min-height: 0` when inside a row/column).
5. **No gap or padding**: Stack has no spacing properties.

## What Was Deleted

| File | Lines | What It Did |
|------|-------|-------------|
| `elements/container.ts` | 607 | `distributeFlexSpace`, row/column/stack layout, compression |
| `elements/text.ts` | 87 | Text height/layout using measurements |
| `elements/image.ts` | 103 | Image sizing with aspect ratio and maxScaleFactor |
| `elements/line.ts` | 81 | Direction-aware line sizing |
| `elements/rectangle.ts` | 64 | Rectangle fills-bounds logic |
| `elements/slide-number.ts` | 113 | Slide number sizing + synthetic node |
| `layout/engine.ts` | 99 | Handler dispatch (getNodeHeight, computeLayout) |
| `core/element-registry.ts` | 224 | Handler registry and interface |
| **Total** | **~1,378** | **Math layout engine** |

## Why CSS Handles Most of This

| Old JS Logic | CSS Equivalent |
|-------------|----------------|
| `distributeFlexSpace` (80 lines) | `flex: 1 1 0` + `flex-shrink` |
| `computeRowLayout` (50 lines) | `flex-direction: row` with gap |
| `computeColumnLayout` (60 lines) | `flex-direction: column` with gap |
| Stack layout (20 lines) | `display: grid; grid-template: 1fr / 1fr` |
| Container getHeight (60 lines) | Browser computes automatically |
| Compression algorithm (30 lines) | `flex-shrink` proportional compression |
| vAlign/hAlign positioning | `justify-content` / `align-items` |

## What CSS Cannot Do (Requires Pre-processing)

| Gap | Lines Needed | Where |
|-----|-------------|-------|
| Read image dimensions from disk | ~20 | New pre-processing step before HTML generation |
| Compute maxScaleFactor constraints | ~5 | Same pre-processing step |
| Pass aspect ratio to LayoutImage | ~5 | `layoutHtml.tsx` IMAGE case |
| Pass parent direction to LayoutLine | ~5 | `layoutHtml.tsx` nodeToJsx parameter |
| **Total** | **~35** | |

## Current Gaps (TODO)

1. **Image aspect ratio**: `LayoutImage` uses hardcoded `1.5` instead of real aspect ratio. Need pre-processing step.
2. **Image contain behavior**: CSS needs `max-height: 100%` or parent-direction-aware sizing.
3. **maxScaleFactor**: Not implemented in CSS. Need `max-width`/`max-height` from pre-computed values.
4. **Line direction**: `LayoutLine` always renders as `flex: 0 0 1px`. Needs parent direction context.
5. **Rectangle sizing**: `LayoutRectangle` renders as empty div. Needs `width: 100%; height: 100%`.
6. **Stack flex participation**: `LayoutStack` has no flex properties for participating in parent layout.
