# Layout System Design

## Goals

1. **Structural determinism** — Same template structure produces same element dimensions, regardless of content. Two 3-card slides have identical card slot sizes even with different images and text.

2. **Grid-based thinking** — The slide is a fixed canvas divided into slots. The grid determines sizes; content fits within slots. Layout is "layout-in" (structure determines size), not "content-out" (content determines size).

3. **Text preservation** — Text never shrinks or clips. Images absorb all compression within a slot.

4. **No manual tuning** — Slot sizes derive from the grid specification and theme constants (gap, margin), not from content measurement or hardcoded values.

5. **Simplicity** — No native dependencies. No unit conversion layers. Layout is transparent arithmetic on inches. A developer can trace any dimension by hand.

## Architecture

### Two levels

**Slide level: Grid (arithmetic).** Divide the content bounds into slots. Pure rectangle subdivision — no content measurement. Deterministic by construction.

**Slot level: Box (arithmetic).** Stack children within a slot. Measure text (`getHeight`), give images the remaining space. Simple column/row stacking with gaps.

Both levels are arithmetic. No Yoga. No flex solver. The `Component` interface (`getHeight`, `getMinHeight`, `prepare`, `Bounds`) is unchanged.

### Why not Yoga?

Yoga is a content-out flex engine designed for scrollable web UIs. Slides are fixed-size canvases. The mismatch shows up as:

- Continuous height variance across slides with the same structure (the original problem)
- Unit conversion rounding requiring epsilon tolerances (YOGA_EPSILON = 0.035")
- A native C++ dependency for operations that are trivial arithmetic
- 420 lines of wrapper code to adapt a web layout engine to a print layout context

Every Yoga operation used in the current codebase maps to simple arithmetic:

| Yoga operation | Arithmetic equivalent |
|---------------|----------------------|
| flexShrink (image absorbs compression) | `imageH = slotH - textH - gaps` |
| Cross-axis stretch | `childW = containerW` |
| Gap distribution | `usable = available - (N-1) * gap` |
| Proportional flex | `childW = (ratio / totalRatio) * available` |
| Measure functions | Call `getHeight(width)` directly |
| SPACE_EVENLY | `spacing = freeSpace / (N + 1)` |

Text, Image, and List already compute their own sizes without Yoga. Card and Table use Yoga via Box, but only for single-unknown problems (one shrinkable image in a column of fixed-height text).

## Grid System

### Core primitive

```typescript
function slotGrid(bounds: Bounds, spec: GridSpec): Bounds[]
```

Given a rectangle and a grid specification, returns an array of slot rectangles. Pure function. No side effects. No content measurement.

```typescript
interface GridSpec {
  columns: number;      // equal-width column count
  rows: number;         // equal-height row count
  gap: number;          // uniform gap in inches
  columnGap?: number;   // override horizontal gap
  rowGap?: number;      // override vertical gap
}
```

### Helper primitives

```typescript
// Split bounds vertically: content-sized top + remainder bottom
function splitV(bounds: Bounds, topHeight: number, gap: number): [Bounds, Bounds]

// Split bounds horizontally: content-sized left + remainder right
function splitH(bounds: Bounds, leftWidth: number, gap: number): [Bounds, Bounds]

// Split bounds by proportional ratios with gaps
function splitRatio(bounds: Bounds, ratios: number[], gap: number, direction: 'row' | 'column'): Bounds[]
```

### Usage in layout templates

```
cardSlide("Title", "EYEBROW", "Intro", [card1, card2, card3])

  1. splitV(contentBounds, headerHeight, gapSmall)
     → [headerBounds, bodyBounds]

  2. slotGrid(bodyBounds, { columns: 3, rows: 1, gap })
     → [slot1, slot2, slot3]

  3. card1.prepare(slot1), card2.prepare(slot2), card3.prepare(slot3)
```

The header height is measured from content (`eyebrow.getHeight() + gap + h3.getHeight()`). The card slots are pure grid arithmetic. Cards fit themselves into their slots using Box.

### What the grid gives us

- **Cross-slide consistency** — `slotGrid` with the same inputs always returns identical `Bounds[]`. Content cannot influence slot sizes. This is the primary goal, achieved as a free consequence of the model.

- **Breathing room** — After `splitV` allocates the header, the body bounds are the remaining space. The grid fills a portion of it; SPACE_EVENLY-style distribution is just arithmetic on the leftover.

- **Content-type-specific layouts** — Different templates use different grid specs. `cardSlide` uses a grid. `imageSlide` gives the image the full body bounds. `bulletSlide` stacks text without a grid. Each template is a function that calls the right primitives.

## Box (Arithmetic)

### What Box becomes

Box is a simple container that stacks children vertically or horizontally within given bounds, respecting gaps and shrink priorities. ~60-80 lines replacing the current ~420.

**Column layout algorithm:**

1. Measure each child: `naturalH[i] = child.getHeight(width)`
2. Sum: `totalNatural = sum(naturalH) + (N-1) * gap`
3. If fits: position top-to-bottom with gaps
4. If overflows: compute excess, subtract from shrinkable children (those with `flexShrink > 0`), floored at `getMinHeight()`
5. If children have flex-grow: distribute remaining space proportionally

**Row layout algorithm:** Same on the horizontal axis.

### What stays the same

The `Component` interface is unchanged:

```typescript
interface Component {
  getHeight(width: number): number;
  getMinHeight?(width: number): number;
  getWidth?(height: number): number;
  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer;
}
```

Text, Image, List, Card, Table — all keep their existing measurement and rendering logic. They receive `Bounds` and don't care whether those bounds came from a grid, a Box, or were hardcoded.

### What goes away

- `yoga-layout` dependency (native C++)
- `yoga-utils.ts` (unit conversion, node management)
- `contentBudget` two-pass system (the grid replaces it)
- YOGA_EPSILON overflow tolerance (no rounding mismatch without unit conversion)
- `checkOverflow` (arithmetic doesn't accumulate rounding errors)

## Migration Path

### Strategy: Replace Box internals, keep the interface

Box's public API (`getHeight`, `getMinHeight`, `prepare`, `getChildBounds`) stays identical. Only the implementation changes from Yoga to arithmetic. This means:

- **Card, Table** — zero changes. They call `box(...)` and get a Box back. The Box works the same way.
- **Layout factories (row, column)** — zero changes. They create Boxes. The Boxes work the same way.
- **Layout templates** — migrate incrementally from nested Box trees to grid + Box.
- **Tests** — existing Box/layout tests become the regression suite. If the arithmetic Box produces the same results, tests pass.

### Steps

**Phase 1: Arithmetic Box**

Replace Box internals with arithmetic. Keep the same file (`box.ts`), same class, same public API. Delete `yoga-utils.ts`. Remove `yoga-layout` dependency.

Validation: all existing tests pass. The showcase generates identically (or with sub-epsilon differences from removing Yoga rounding).

**Phase 2: Grid module**

Add `grid.ts` with `slotGrid`, `splitV`, `splitH`, `splitRatio`. Pure functions, easy to test in isolation.

Validation: unit tests for grid arithmetic.

**Phase 3: Migrate layout templates**

Rewrite layout templates (in the Materialize theme) to use grid primitives instead of deeply nested Box trees. This is where the structural determinism goal is realized.

Before:
```
column([0, 1], [header, column({ contentBudget: 0.65, justify: SPACE_EVENLY }, intro, row(cards))])
```

After:
```
const [headerBounds, bodyBounds] = splitV(contentBounds, headerH, gap)
const slots = slotGrid(bodyBounds, { columns: 3, rows: 1, gap })
// render header into headerBounds, cards into slots
```

Validation: showcase generates with consistent card heights across slides.

### What does NOT change

- Component interface
- Text, Image, List, Divider, SlideNumber components
- Canvas, Renderer, Presentation
- The DSL factory functions (text, h3, eyebrow, image, card, etc.)
- The theme structure
- The master structure

## Open Questions

1. **Breathing room mechanism** — Without contentBudget, how does the grid ensure ~35% whitespace? Options: (a) the grid spec itself defines the content area as a fraction of bounds, (b) `splitV` with a measured content region and the remainder is whitespace, (c) leave it to template authors to size the grid appropriately.

2. **Grid quantum / snapping** — Should slot sizes snap to a grid unit (e.g., 0.25")? The grid is already deterministic without snapping, but snapping to a visible grid could improve visual rhythm. This is optional and can be added later.

3. **SPACE_EVENLY equivalent** — Current card slides use SPACE_EVENLY to distribute whitespace around content groups. With the grid model, is this handled by (a) explicit whitespace rows in the grid spec, (b) centering content within a larger bounds, or (c) not needed because the grid itself provides the structure?

---

## Decision Log

### Yoga as layout engine — removing

Yoga is a content-out flexbox engine for scrollable web UIs. Slides are fixed canvases. Every Yoga operation used in tycoslide maps to trivial arithmetic. The native dependency, unit conversion layer, and epsilon tolerance add complexity without value. Components already implement their own measurement (`getHeight`, `getMinHeight`) — Yoga's measure protocol just calls these same methods through an indirection layer.

### contentBudget two-pass — removing

Pre-Yoga constraint system that scaled children to fit within a budget fraction. Replaced by the grid model, which determines slot sizes from structure rather than scaling content sizes.

### Post-layout height snapping — rejected

Quantize computed bounds after layout. Unsafe in fixed containers — any upward snap accumulates overflow. Not needed with grid (slot sizes are deterministic without snapping).

### Pre-layout input snapping — rejected

Quantize `getHeight()` inputs before layout. Double-quantization with Yoga's point grid. Not needed with grid (no Yoga means no competing quantization).

### Arithmetic Layout class (v1) — rejected, then reconsidered

First attempt replaced Yoga with ~350 lines reimplementing 6/7 flex operations. Rejected as "a worse Yoga." The new approach is different: the grid handles structure (not flex), and the arithmetic Box handles only intra-slot stacking (~60-80 lines). This is not reimplementing Yoga — it's recognizing that the problem was never a flex problem.

### contentBudget wrapper node — rejected

Grouped children under a wrapper node. Broke SPACE_EVENLY. Moot with grid model.

### Card-specific computed heights — superseded

`computeCardRowHeight()` in layout templates. Solved the right problem (deterministic sizing from structure) at the wrong level (card-specific, not general). The grid system generalizes this: `slotGrid` computes deterministic slot sizes for any template.
