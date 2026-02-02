# tycoslide Architecture Vision

## The Problem

tycoslide grew from a Yoga-based flex layout engine. Yoga is a content-out system designed for scrollable web UIs. Slides are fixed-size canvases. The mismatch produced:

- A 438-line Box class reimplementing CSS flexbox (flex-grow, flex-shrink, justify, align, shrink-to-fit)
- Custom text line wrapping using fontkit to predict exactly where PowerPoint will break lines
- Content-out sizing where text measurement drives layout dimensions, producing different card heights on slides with the same structure
- A `contentBudget` hack to constrain the flex engine to a fraction of available space
- Overflow errors from float arithmetic accumulated through deeply nested Box trees

The root cause: **the layout model is continuous when it should be discrete.** Slides are grids, not web pages.

## The End State

### Three layers

```
┌─────────────────────────────────────────┐
│  Layer 3: Layouts (imperative draw)     │  Theme-specific slide templates
│  Layer 2: Components (measure + render) │  Text, Image, Card, Table, List
│  Layer 1: Grid (rectangle subdivision)  │  Bounds, slotGrid, stackV, splitRatio
└─────────────────────────────────────────┘
```

Each layer depends only on the one below it. No circular dependencies. No 438-line flex engine.

### Layer 1: Grid

Pure rectangle math. No content awareness. No classes.

**Existing primitives:**
- `Bounds` — immutable rectangle `{x, y, w, h}` with `inset(padding)`
- `slotGrid(bounds, {rows, cols, gap})` — uniform grid → `Bounds[]`
- `splitH(bounds, n, gap)` — equal horizontal columns
- `splitV(bounds, n, gap)` — equal vertical rows
- `splitRatio(bounds, ratios, direction, gap)` — proportional split

**New primitive:**
- `stackV(bounds, heights[], gap)` — place items at absolute heights top-to-bottom → `Bounds[]`
- `stackH(bounds, widths[], gap)` — place items at absolute widths left-to-right → `Bounds[]`

`stackV` takes pre-measured heights (numbers, not components). It returns a `Bounds` for each item. This is the bridge between measurement and grid — you measure content, then stack it into grid-aligned slots.

Grid functions take numbers and return `Bounds`. They have zero dependency on Component, Theme, or anything else.

### Layer 2: Components

Each component implements the `Component` interface:

```typescript
interface Component {
  prepare(bounds: Bounds): Drawer;    // render into this rectangle
  getHeight(width: number): number;   // estimate: how tall at this width?
}
```

**Key change: `getHeight` becomes an estimate, not an exact prediction.**

Today, `Text.getHeight()` does custom line wrapping with fontkit to predict the exact number of lines PowerPoint will render. This is fragile (our wrapping may not match PowerPoint's) and complex (~160 lines of word-boundary detection, segment measurement, and run splitting).

In the new model:
1. `getHeight()` returns a **rough estimate** — e.g., single-line height × estimated line count
2. The layout allocates a **grid-snapped slot** that rounds up to the nearest unit boundary
3. PowerPoint handles wrapping within that slot (`wrap: true`)
4. The grid snap provides breathing room, absorbing estimation error

This means:
- **Remove** custom line wrapping (`wrapText`, `splitRunsIntoLines`, `softBreakBefore`)
- **Remove** `wrap: false` from text rendering — let PowerPoint wrap
- **Keep** `getLineHeight()` — we still need to estimate single-line height
- **Keep** `measureText()` — useful for rough width estimation
- **Simplify** `Text.prepare()` — just pass content and bounds to PowerPoint

### Layer 3: Layouts

Imperative draw callbacks that combine Grid + Components. No Box tree.

Every layout follows the same pattern:

```typescript
function mySlide(title, content): Slide {
  return {
    master: CONTENT_MASTER,
    draw: (canvas, bounds) => {
      // 1. Measure content-sized elements
      const headerH = snapUp(headerComp.getHeight(bounds.w));

      // 2. Subdivide space with grid
      const [headerBounds, bodyBounds] = splitRatio(bounds, [headerH, 0], 'vertical', gap);
      const slots = slotGrid(bodyBounds, { rows: 2, cols: 3, gap });

      // 3. Render components into slots
      headerComp.prepare(headerBounds)(canvas);
      cards.forEach((c, i) => c.prepare(slots[i])(canvas));
    },
  };
}
```

The `cardGridSlide` function in layouts.ts already follows this pattern exactly.

## The Unit System

### Base unit

The theme defines a base unit. For Materialize: `unit = 0.125"` (1/8 inch).

The slide geometry is already unit-aligned:
- Slide: 80 × 45 units (10" × 5.625")
- Content area: 72 × 37 units (after 4-unit margin)
- Gap: 1 unit
- Card padding: 1 unit

### What gets snapped to units

**Structural dimensions** — everything that defines the grid:
- Margins, gaps, padding
- Slot heights and widths
- Header/body/footer allocations
- Card grid rows and columns

### What gets estimated then snapped

**Content allocations** — measured, then rounded up to the nearest unit:
- Text box heights: `snapUp(text.getHeight(width))` → next unit boundary
- Header regions: measure title, snap up
- Intro text regions: estimate lines, snap up

The `snapUp` function:
```typescript
function snapUp(inches: number, unit: number): number {
  return Math.ceil(inches / unit) * unit;
}
```

This is where the breathing room comes from. A title that measures 0.28" gets snapped to 0.375" (3 units). PowerPoint has room to wrap slightly differently than our estimate without overflowing.

### Grid size vs gap

These are separate concepts:
- **Grid unit** — the quantum for all structural dimensions (0.125")
- **Gap** — the semantic spacing between elements (1 unit = 0.125")
- **Gap small** — tighter spacing (0.5 units = 0.0625", or could be 1 unit if equal)

Gap is defined *in terms of* units, but it's a named value in the theme — you write `gap` not `1 * unit`. The unit is the underlying quantum; gap is a semantic role.

### Theme spacing with units

```typescript
spacing: {
  unit: 0.125,              // base grid quantum (1/8")
  margin: 4,                // in units → 0.5"
  gap: 1,                   // in units → 0.125"
  gapSmall: 1,              // in units → 0.125" (or 0.5 for half-unit)
  cellPadding: 0.5,         // in units → 0.0625"
}
```

Or keep inches and add unit:
```typescript
spacing: {
  unit: 0.125,
  margin: 0.5,
  gap: 0.125,
  gapSmall: 0.125,
  cellPadding: 0.0625,
}
```

The second approach avoids a breaking change. Layouts that want unit math use `theme.spacing.unit`.

## What Goes Away

| Thing | Lines | Why it's not needed |
|-------|-------|-------------------|
| `Box` class | 438 | Grid-based row/column replaces it |
| `layout.ts` (current implementation) | 129 | Reimplemented on grid primitives |
| `expand()` | 5 | Flex-grow concept → proportions in row/column |
| `wrapText()` | 52 | PowerPoint wraps text |
| `splitRunsIntoLines()` | 53 | No custom wrapping = no run splitting |
| `measureTextHeight()` | 8 | Replaced by estimate + snap |
| `softBreakBefore` logic | ~20 | PowerPoint handles line breaks |
| `AlignContext` plumbing | ~30 | Grid handles justify/align directly |
| **Total removed** | **~735** | |

## What Stays

| Thing | Why |
|-------|-----|
| `Bounds` | Rectangle primitive — used everywhere |
| `Grid` (slotGrid, splitV, splitH, splitRatio + new stackV) | Core layout engine |
| `Component` interface (prepare, getHeight) | Components need to render and estimate size |
| `Text` (simplified) | Renders text, estimates height, no custom wrapping |
| `Image` | Renders images with aspect ratio |
| `Card` (simplified) | Uses stackV internally instead of Box |
| `Table` (simplified) | Uses slotGrid + stackV instead of Box |
| `List` (simplified) | Same simplification as Text |
| `Canvas`, `Renderer`, `Presentation` | Rendering pipeline unchanged |
| `DSL` (simplified) | Factory functions, minus row/column/expand |
| `Theme` type (+ unit) | Add unit field, everything else unchanged |
| `Master` | Slide master system unchanged |
| `getLineHeight()` | Needed for height estimation |
| `measureText()` | Useful for width estimation |
| `fontkit` dependency | Still need font metrics for estimation |

## What Changes in Card

Card currently builds a Box tree with flex-shrink logic. In the new model:

```typescript
prepare(bounds: Bounds): Drawer {
  const inner = bounds.inset(padding);
  const heights = this.children.map(c => c.getHeight(inner.w));
  const slots = stackV(inner, heights, gapSmall);

  return (canvas) => {
    // draw background chrome
    if (showBackground) canvas.addShape(ROUND_RECT, { ... });
    // render each child into its slot
    this.children.forEach((c, i) => c.prepare(slots[i])(canvas));
  };
}
```

No Box. No flex-shrink. No tree traversal. Card measures its children, stacks them with grid, renders them.

## What Changes in Text

Text currently does custom line wrapping and inserts soft breaks:

**Before (current):**
1. `wrapText()` — measure each word with fontkit, find break points
2. `splitRunsIntoLines()` — split rich text runs across wrapped lines
3. Render with `wrap: false` and `softBreakBefore` between lines

**After:**
1. `getHeight()` — estimate: `lineHeight * estimatedLines` (snap up to grid)
2. Render with `wrap: true` — PowerPoint handles wrapping

The estimate doesn't need to be exact. It needs to be *conservative* (never underestimate). `snapUp` to the grid unit provides the margin of safety.

For height estimation without custom wrapping:
```typescript
getHeight(width: number): number {
  const lineH = getLineHeight(fontPath, fontSize);
  const textWidth = measureText(plainText, fontPath, fontSize);
  const estimatedLines = Math.ceil(textWidth / width);
  return lineH * estimatedLines;
  // caller will snapUp() this to the grid
}
```

This is ~5 lines replacing ~100 lines of wrapping logic.

## Migration Path (Incremental)

Each phase is independently shippable. Box continues working throughout — nothing breaks until we choose to delete it.

### Phase 1: Grid foundations ← non-breaking additions
- Add `unit` to `Theme.spacing` type
- Add `snapUp(value, unit)` to grid.ts
- Add `stackV(bounds, heights[], gap, options?)` / `stackH` to grid.ts
- Add `justify` and `align` options to grid functions
- All new code, nothing changes

### Phase 2: Grid-based row/column ← new implementations alongside Box
- New `GridRow` and `GridColumn` Components that implement `Component` interface
- Use `stackH`/`stackV`/`splitRatio` internally
- Support proportions, justify, align — same API as current row/column
- Coexist with Box-based row/column — layouts opt in one at a time

### Phase 3: Simplify Text and List ← remove custom wrapping
- Remove `wrapText`, `splitRunsIntoLines`, `softBreakBefore`
- `Text.getHeight()` → conservative estimate (measure width, compute lines, snap up)
- `Text.prepare()` → render with `wrap: true`, let PowerPoint handle wrapping
- Same simplification for List
- Validate: showcase renders correctly with PowerPoint wrapping

### Phase 4: Rewrite Card and Table internals ← remove Box dependency
- Card: `stackV` for image + title + description
- Table: `slotGrid` for cell grid, `stackV` for row stacking
- Card and Table no longer import Box

### Phase 5: Migrate all layouts to grid ← already started with cardGridSlide
- Each layout uses grid-based row/column or imperative draw callbacks
- `cardGridSlide` is the reference implementation
- Migrate: titleSlide, sectionSlide, contentSlide, imageSlide, etc.

### Phase 6: Delete Box ← cleanup
- Remove Box class, old layout.ts row/column factories, expand()
- Remove unused types if no longer referenced (AlignContext, etc.)
- Clean up DSL exports

## Design Principles

1. **Discrete, not continuous.** All structural dimensions snap to the grid unit. No fractional positioning.

2. **Estimate, don't predict.** Text height is estimated and snapped up. PowerPoint handles the precise rendering. The grid provides breathing room.

3. **Structure determines size.** The grid defines slots. Content fills slots. Content never influences slot dimensions.

4. **Arithmetic you can verify by hand.** A developer should be able to count units on paper and confirm the layout is correct. No iterative solvers.

5. **Let PowerPoint do its job.** PowerPoint is good at text wrapping, font rendering, and line breaking. We position boxes; PowerPoint fills them.

## Decisions

### Snapping: callers snap, components estimate
Components return raw estimates from `getHeight()`. Callers (layouts, grid helpers) snap up to the grid unit. This keeps components theme-unaware for measurement. If snapped content exceeds available space, the system throws an overflow error — strict enforcement. Content that doesn't fit is an authoring problem; the system surfaces it immediately rather than silently clipping.

### Row/column: keep the API, reimplement on grid
`row()` and `column()` remain as authoring primitives. The implementation changes from Box trees to grid-based Components:
- `column(a, b, c)` → Component that uses `stackV` internally
- `row(a, b, c)` → Component that uses `stackH` internally
- `column([1, 2], [a, b])` → Component that uses `splitRatio` internally

Same composability. Same API. Grid underneath instead of flexbox.

### Justify and align: grid-level options
`stackV`, `stackH`, and `slotGrid` accept `{ justify: 'center' }` as options. The offset math (~5 lines per mode) lives in the grid layer. This replaces Box's JUSTIFY and ALIGN constants with grid options.

### Overflow: strict errors
When content overflows its allocated bounds, throw an error (same as current Box behavior). No silent clipping. No shrink-to-fit. The grid is the contract; content must fit within it.

### Migration: incremental
Build grid-based row/column as new code alongside Box. Migrate layouts one at a time. Delete Box when nothing imports it. This avoids a risky big-bang rewrite.
