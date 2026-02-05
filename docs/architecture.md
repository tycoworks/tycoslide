# tycoslide Architecture

## Three Layers

```
┌─────────────────────────────────────────┐
│  Layer 3: Layouts (imperative draw)     │  Theme-specific slide templates
│  Layer 2: Components (measure + render) │  Text, Image, Card, Table, List
│  Layer 1: Grid (rectangle subdivision)  │  Bounds, stackV, stackH, splitRatio
└─────────────────────────────────────────┘
```

Each layer depends only on the one below it. No circular dependencies.

### Layer 1: Grid

Pure rectangle math. No content awareness. No classes.

- `Bounds` — immutable rectangle `{x, y, w, h}` with `inset(padding)`
- `splitRatio(bounds, ratios, direction, gap)` — proportional split
- `stackV(bounds, heights[], gap, options?)` — place items at absolute heights → `Bounds[]`
- `stackH(bounds, widths[], gap, options?)` — place items at absolute widths → `Bounds[]`
- `fitHeights(heights, available, gap, minHeights?)` — compress items proportionally to fit

Grid functions take numbers and return `Bounds`. Zero dependency on Component or Theme.

### Layer 2: Components

```typescript
interface Component {
  getHeight(width: number): number;      // How tall at this width?
  getMinHeight(width: number): number;   // Minimum height (e.g., card without image)
  getWidth?(height: number): number;     // For intrinsic width (images in content-sized row slots)
  prepare(bounds: Bounds): Drawer;       // Render into this rectangle
}
```

| Component | `getHeight(width)` | `getMinHeight(width)` | Notes |
|-----------|-------------------|----------------------|-------|
| **Text** | Wrapped text height at `width` | Same as getHeight | Measured via fontkit |
| **Divider** | `theme.spacing.gapTight` | Same | Fixed |
| **List** | Sum of item heights at `width` | Same as getHeight | Deterministic |
| **Table** | Row heights at `width` | Same as getHeight | Deterministic |
| **Card** | `padding*2 + children heights + gaps` | Excludes optional image | Content-sized |
| **Image** | `min(width / aspectRatio, pixelHeight / minDisplayDPI)` | Same | DPI-capped natural height |
| **GridColumn** | Sum of children heights + gaps | Sum of children minHeights + gaps | Stacks vertically |
| **GridRow** | Max of children heights | Max of children minHeights | Side by side |

`getHeight()` is an estimate, not an exact prediction. PowerPoint handles wrapping within allocated slots. The grid snap (`snapUp`) provides breathing room, absorbing estimation error.

### Layer 3: Layouts

Imperative draw callbacks that combine Grid + Components:

```typescript
function mySlide(title, content): Slide {
  return {
    master: CONTENT_MASTER,
    draw: (canvas, bounds) => {
      const headerH = snapUp(headerComp.getHeight(bounds.w));
      const [headerBounds, bodyBounds] = splitRatio(bounds, [headerH, 0], 'vertical', gap);
      headerComp.prepare(headerBounds)(canvas);
      content.prepare(bodyBounds)(canvas);
    },
  };
}
```

## Layout System

**GridColumn** — vertical stacking with optional proportions `[0, 1]` for content-sized + flex slots
- Content-sized slots (proportion 0) use their natural height
- Flex slots (proportion > 0) share remaining space proportionally
- Supports `justify` (START, CENTER, END) and `align` (START, CENTER, END)

**GridRow** — horizontal stacking with optional proportions
- Content-sized slots (proportion 0) use `getWidth()` or natural size
- Flex slots (proportion > 0) share remaining space proportionally

**group(component, padding?)** — semantic grouping with compressible breathing room
- Wraps content with uniform inset padding on all sides
- Padding compresses gracefully when space is tight (snaps down to grid unit)
- Default padding is `unit * 2` (0.25" = GAP.NORMAL)
- Use to denote logically related content that should be treated as a unit

**fitHeights** compresses items proportionally when they overflow available space. Each item shrinks in proportion to its compressible budget (`getHeight - getMinHeight`). Incompressible items (text, dividers) are preserved; compressible items (images) absorb the reduction.

## The Unit System

The theme defines a base unit — the smallest spacing increment. All structural dimensions are multiples of this quantum.

### Spacing hierarchy

```
unit        = 0.125"   (1u)   base quantum
gapTight    = 1u       (0.125")  within components: eyebrow→title, card internals
gap         = 2u       (0.25")   between components: header→body, card rows
margin      = 4u       (0.5")    slide edge inset
cardPadding = 1u       (0.125")  inside card borders
cellPadding = 0.5u     (0.0625") inside table cells
footerH     = 2u       (0.25")   footer row height
```

**GAP enum** resolves to theme spacing values:
- `GAP.TIGHT` → `gapTight` (1u) — related items
- `GAP.NORMAL` → `gap` (2u) — structural separation

### What gets snapped

**Spacing** — margins, gaps, padding are grid-aligned by construction (defined as multiples of `unit` in the theme).

**Content heights** — measured then rounded up to the nearest unit via `snapUp(value, unit)` inside `GridColumn.getSlots()`. A title that measures 0.28" snaps to 0.375" (3 units), providing breathing room for PowerPoint wrapping. If snapped heights exceed available space, `fitHeights` compresses proportionally.

**Column widths are NOT snapped** — proportional width division produces precise fractional values. This matches Material Design practice: spacing snaps to the grid quantum, content areas flex to fill available space.

**`unit` must evenly divide both usable slide dimensions** — e.g., 0.125" divides 9.0" (72u) and 4.625" (37u) exactly. This ensures no unusable fractional remainder at slide edges.

### Theme spacing definition

```typescript
spacing: {
  unit: 0.125,          // base grid quantum (1/8")
  margin: 0.5,          // 4u — slide edge inset
  gap: 0.25,            // 2u — between components
  gapTight: 0.125,      // 1u — within components
  cellPadding: 0.0625,  // 0.5u — inside table cells
}
```

## Image Sizing

Images report their DPI-capped natural height:

```typescript
getHeight(width: number): number {
  const naturalHeight = width / this.aspectRatio;
  const maxFromQuality = this.pixelHeight / this.theme.spacing.minDisplayDPI;
  return Math.min(naturalHeight, maxFromQuality);
}
```

`minDisplayDPI` (default: 96) prevents blurry upscaling. A 64x64 icon at 96 DPI caps at 0.67".

## Design Principles

1. **Discrete, not continuous.** Content heights and spacing snap to the grid unit. Column widths are computed precisely via proportional division.

2. **Estimate, don't predict.** Text height is estimated and snapped up. PowerPoint handles the precise rendering. The grid provides breathing room.

3. **Structure determines size.** The grid defines slots. Content fills slots. Content never influences slot dimensions.

4. **Arithmetic you can verify by hand.** A developer should be able to count units on paper and confirm the layout is correct. No iterative solvers.

5. **Let PowerPoint do its job.** PowerPoint is good at text wrapping, font rendering, and line breaking. We position boxes; PowerPoint fills them.

## Key Decisions

**Snapping: callers snap, components estimate.** Components return raw estimates from `getHeight()`. `GridColumn.getSlots()` snaps content heights up to the grid unit before allocating space. If snapped heights exceed available space, `fitHeights` compresses proportionally — graceful degradation rather than strict errors.

**Row/column: composable API on grid primitives.** `row()` and `column()` are authoring primitives. `column(a, b, c)` uses `stackV` internally. `column([1, 2], [a, b])` uses `splitRatio`. Same composability, grid underneath.

**Overflow: strict errors.** Content that overflows its bounds throws an error. No silent clipping. No shrink-to-fit. The grid is the contract.

**Font sizes don't snap.** The grid controls structural spacing; text flows within containers. Font sizes are a brand/readability concern.
