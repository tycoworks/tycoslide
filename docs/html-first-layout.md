# HTML-First Layout Architecture

## Status: Design (not yet implemented)

## Problem

TycoSlide currently has two layout paths:

1. **HTML measurement pipeline** - renders full slide structure to HTML with CSS flexbox, opens in Playwright, extracts text heights
2. **Math layout engine** - re-derives the same positions using a custom flex distribution algorithm (`container.ts`, 608 lines)

The math engine depends on browser measurements for text, then re-computes container positions that the browser already computed. This means:
- Two implementations of the same layout algorithm that must stay in sync
- ~600 lines of flex distribution code duplicating what CSS already does
- Potential divergence between browser-computed and math-computed positions

## Solution

Extract full `{x, y, width, height}` from the browser for ALL nodes, not just text heights. Construct `PositionedNode` trees directly from browser output. Delete the math layout engine.

## Current Flow

```
Slides → Expand components
       → Generate layout HTML (full flexbox structure)
       → Browser measures TEXT heights only
       → Math engine re-computes ALL positions using text heights
       → PositionedNode tree
       → PPTX renderer
```

## Proposed Flow

```
Slides → Expand components
       → Generate layout HTML (full flexbox structure)  [exists, minor changes]
       → Browser measures ALL positions                  [small change to extraction]
       → Build PositionedNode trees from browser rects   [new, ~100 lines]
       → PPTX renderer                                  [unchanged]
```

## What Changes

### measurement.ts - Extract full positions

Currently extracts `{width, height}` for text nodes. Change to extract `{x, y, width, height}` for ALL nodes with `data-node-id`.

```typescript
// Current (Phase 2 in measureLayout)
const measurements = await this.page.evaluate(() => {
  const results = [];
  document.querySelectorAll('[data-node-id]').forEach(el => {
    const rect = el.getBoundingClientRect();
    results.push({ nodeId: el.dataset.nodeId, width: rect.width, height: rect.height });
  });
  return results;
});

// Proposed - add x, y relative to slide root
const measurements = await this.page.evaluate(() => {
  const root = document.querySelector('.root')!;
  const rootRect = root.getBoundingClientRect();
  const results = [];
  document.querySelectorAll('[data-node-id]').forEach(el => {
    const rect = el.getBoundingClientRect();
    results.push({
      nodeId: el.dataset.nodeId,
      x: rect.left - rootRect.left,
      y: rect.top - rootRect.top,
      width: rect.width,
      height: rect.height,
    });
  });
  return results;
});
```

### New: LayoutMeasurement type gains position

```typescript
export interface LayoutMeasurement {
  x: number;            // NEW - inches, relative to slide content area
  y: number;            // NEW - inches, relative to slide content area
  computedWidth: number;
  computedHeight: number;
  intrinsicWidth: number;
}
```

### New: buildPositionedTree() function

A new function that walks the node tree and constructs `PositionedNode` using browser measurements instead of the math engine.

```typescript
function buildPositionedTree(
  node: ElementNode,
  measurements: FullLayoutResults,
  bounds: Bounds,
): PositionedNode {
  const m = measurements.get(node);
  if (!m) throw new Error(`No measurement for node type: ${node.type}`);

  const positioned: PositionedNode = {
    node,
    x: bounds.x + m.x,
    y: bounds.y + m.y,
    width: m.computedWidth,
    height: m.computedHeight,
  };

  // Recurse into containers
  if ('children' in node && Array.isArray(node.children)) {
    positioned.children = node.children.map(child =>
      buildPositionedTree(child, measurements, bounds)
    );
  }

  return positioned;
}
```

### html-measurement.tsx - Already has data-node-id on containers

All containers (Row, Column, Stack) already render with `data-node-id` attributes. The HTML generation is already complete for this purpose. No changes needed to the JSX components.

### pipeline.ts - New method: buildLayout()

Add a method that returns `PositionedNode` directly instead of just `MeasurementResults`.

```typescript
async buildLayout(theme: Theme): Promise<Map<ElementNode, PositionedNode>> {
  // Same browser measurement, but extract full positions
  // Build PositionedNode trees from browser rects
}
```

### presentation.ts - Use browser positions directly

```typescript
// Current (Phase 5)
positioned = computeLayout(expanded, bounds, this._theme, measurements);

// Proposed (Phase 5)
positioned = buildPositionedTree(expanded, fullMeasurements, bounds);
```

### What Gets Deleted

| File | Lines | What |
|------|-------|------|
| `elements/container.ts` | ~600 | `distributeFlexSpace`, row/column/stack layout, compression |
| `elements/text.ts` | ~87 | `getHeight`, `getMinHeight`, `computeLayout` (keep registration) |
| `elements/image.ts` | height estimation | `getHeight`, `computeLayout` |
| `elements/line.ts` | height estimation | `getHeight`, `computeLayout` |
| `elements/rectangle.ts` | height estimation | `getHeight`, `computeLayout` |
| `layout/engine.ts` | ~100 | `getNodeHeight`, `getMinNodeHeight`, `computeLayout` |
| `core/element-registry.ts` | partial | `getHeight`, `getMinHeight`, `computeLayout` methods |

**Estimated removal: ~800 lines**

### What Stays

| File | What | Why |
|------|------|-----|
| `html-measurement.tsx` | HTML generation | Still needed - this IS the layout engine now |
| `core/dsl.ts` | DSL functions | Unchanged |
| `core/nodes.ts` | Node types | Unchanged |
| `core/types.ts` | Theme, types | Unchanged |
| `core/pptx-renderer.ts` | PPTX rendering | Unchanged |
| `core/component-registry.ts` | Component expansion | Unchanged |
| `core/element-registry.ts` | Handler registry | Simplified - only needs PPTX render hooks |
| `presentation.ts` | Orchestration | Simplified |
| `layout/validator.ts` | Validation | May simplify - browser enforces bounds |

## Implementation Steps

### Step 1: Extend measurement extraction (LOW RISK)

- Add `x`, `y` to `LayoutMeasurement` (relative to `.root`)
- Modify `measurement.ts` Phase 2 to capture positions relative to root
- Add `bounds.x/y` offset to convert from root-relative to slide-absolute
- **All existing code continues to work** - math engine still runs, just ignores new fields

### Step 2: Build PositionedNode from browser measurements (MEDIUM RISK)

- Create `buildPositionedTree()` in new file `layout/browser-layout.ts`
- Wire into `presentation.ts` as alternative to `computeLayout()`
- Add `DEBUG_LAYOUT=browser` env flag to switch between paths
- Run both paths in parallel and compare outputs for validation

### Step 3: Validate with full showcase (LOW RISK)

- Generate showcase.pptx with both layout paths
- Compare positioned node trees for all slides
- Identify and fix any discrepancies
- Focus on: text wrapping, fill containers, compression, vAlign

### Step 4: Switch default to browser layout (MEDIUM RISK)

- Once validated, make browser layout the default
- Keep math engine behind `DEBUG_LAYOUT=math` flag
- Run full test suite

### Step 5: Remove math layout engine (CLEANUP)

- Delete `container.ts` flex distribution code
- Simplify element handlers to just PPTX rendering
- Simplify `element-registry.ts`
- Remove `getHeight/getMinHeight/computeLayout` from handler interface
- Update tests

### Step 6: Rename and reorganize (CLEANUP)

- `html-measurement.tsx` → consider renaming to `layout-renderer.tsx`
- `pipeline.ts` → simplify, it now returns PositionedNode directly
- `measurement.ts` → rename to `browser-layout.ts`
- Update imports

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Browser positions don't match expected PPTX output | Step 2-3: run both paths in parallel and compare |
| Sub-pixel rounding differences | Round to 4 decimal places (inches) |
| Tables use native pptxgenjs (not positioned) | Tables already bypass layout - no change needed |
| Diagrams render as images | Images get position from browser - works |
| Performance regression | Measure: browser already runs, just extracting more data |
| Platform-dependent rendering | Already a risk with text measurement - no change |

## Technology Decisions

### Keep Hono JSX for HTML generation

The architect recommended keeping Hono JSX (`renderToString`) over adopting Preact/Vue. Reasons:
- Minimal - just string generation, no virtual DOM
- Already works and is well-tested
- No framework opinions to fight
- The HTML is for measurement, not user-facing

### Keep Playwright for browser

Playwright is already a dependency and works well for headless measurement. No reason to switch.

## Future: HTML Preview

Once the browser layout is the source of truth, adding an HTML preview renderer becomes trivial:
- The measurement HTML, with styling additions, IS the preview
- Implement `Renderer` interface for HTML output
- Authors get instant visual feedback without generating PPTX
