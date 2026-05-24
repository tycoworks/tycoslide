# Proportional Layout System

Phased plan for removing pixel dimensions from layout containers.

## Summary

tycoslide's layout system currently allows `number | SizeValue` on container width/height, letting pixel values leak into layout dimensions. This design eliminates pixel layout dimensions in three phases: (1) image display constraint via `maxHeight` on ImageNode, (2) weighted FILL via a separate `weight` param on containers, and (3) removal of pixel values from all container width/height fields, making `SizeValue` the only legal container dimension type.

The pixel-valued call sites in the codebase are narrowly scoped: **chrome.ts spacer columns** (4 sites), the **transform layout's `overlaySize`** (1 site), and the **footer row height** (spatial token, reclassified below). The migration surface is small.

---

## Three-Tier Sizing Model

| Category | Type | Pixels OK? | Examples |
|----------|------|-----------|----------|
| Layout dimensions (container w/h) | `SizeValue` only | No | Column width, row height |
| Content display constraints | `number` | Yes | fontSize, maxHeight, maxWidth |
| Spatial tokens (padding, spacing) | `number` | Yes | Margins, gaps, chrome padding |
| Visual chrome (strokes, radii) | `number` | Yes | Border width, corner radius |

---

## Phase 1: Image Display Constraint (`maxHeight`)

### Problem

A 256px logo file needs to display at 48px in a footer. Currently, the only way to constrain it is to put it inside a pixel-sized container: `column({ width: 48 }, image(...))`. With proportional layouts, containers cannot have pixel widths. We need a way to say "this image should be at most 48px tall" without the container dictating a fixed size.

### Design Decisions

**`maxHeight` only (no `maxWidth`):** `maxHeight` is a content display constraint (like fontSize on TextNode), not a layout dimension. Width follows from aspect ratio. No `maxWidth` because containers already govern horizontal space via FILL.

**Remove `width`/`height` from ImageNode:** These fields were always `SIZE.FILL` at construction and overridden by `resolveImageSizing()` based on parent context. They carry zero information. The layout engine already owns sizing decisions. `LineNode` is precedent — it also has no width/height.

**No `minHeight`:** `maxHeight` and `minHeight` are not symmetric. `maxHeight` constrains content (like fontSize). `minHeight` is a layout demand that causes flex overflow — a container concern, not a content concern. If a theme author needs to protect an image from squashing, they wrap it in a FILL container (the container system IS the minHeight mechanism). PPTX has no overflow clipping, so `minHeight` would cause images to escape their containers.

### Changes

#### `packages/core/src/core/model/nodes.ts` — ImageNode

```typescript
export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  alt?: string;
  shadow?: Shadow;
  maxHeight?: number;  // pixels — display height cap, width follows from aspect ratio
}
```

`width` and `height` removed. The layout engine determines sizing from parent context via `resolveImageSizing()`.

#### `packages/core/src/core/layout/layoutHtml.tsx` — resolveImageSizing()

Drop `node` parameter — becomes a pure function of parent context:

```typescript
function resolveImageSizing(parent: ParentCtx): { width: SizeValue; height: SizeValue } {
  const isRow = parent.direction === DIRECTION.ROW;
  return {
    width: isRow && parent.hasDefiniteCrossSize ? SIZE.HUG : SIZE.FILL,
    height: isRow || parent.heightIsConstrained ? SIZE.FILL : SIZE.HUG,
  };
}
```

#### `packages/core/src/core/layout/layoutHtml.tsx` — styleImage()

For HUG-mode images, `maxHeight` caps the natural height:
```typescript
if (effHeight === SIZE.HUG) {
  const cap = node.maxHeight ?? dims?.height;
  if (cap) styles.maxHeight = `${cap}px`;
}
```

For FILL-mode images, `maxHeight` applies as a CSS cap:
```typescript
if (effHeight === SIZE.FILL && node.maxHeight) styles.maxHeight = `${node.maxHeight}px`;
```

Width follows from aspect ratio automatically (CSS preserves aspect ratio when only max-height is set on an img element).

#### `packages/core/src/core/rendering/pptxConfigBuilder.ts` — buildImageConfig()

Constrain the bounding box height before contain-fitting:
```typescript
let boxW = positioned.width;
let boxH = positioned.height;
if (imageNode.maxHeight && boxH > imageNode.maxHeight) boxH = imageNode.maxHeight;
// Width follows from aspect ratio via containFit()
```

#### `packages/sdk/src/components/image.ts` — ImageTokens

```typescript
export interface ImageTokens {
  shadow?: Shadow;
  padding?: number;
  maxHeight?: number;  // NEW: pixel cap, width follows from aspect ratio
}
```

Render function passes `maxHeight` through to ImageNode.

#### Token Parameterization

Image `maxHeight` flows through `ImageTokens`, which are part of the component token injection system. A format sets it:

```typescript
// presentation format
footerImage: { maxHeight: 18 },

// factsheet format
footerImage: { maxHeight: 12 },
```

This is the existing token parameterization pattern — no new mechanism needed.

#### Breaking Changes

None. `maxHeight` is an optional new field.

---

## Phase 2: Weighted FILL (separate `weight` param)

### Problem

A 60/40 two-column layout is currently impossible without pixel widths. `SIZE.FILL` gives equal shares. We need unequal proportional splits.

### Design Decision: Separate `weight` param on ContainerNode

Weight is a **relationship between siblings**, not a property of a single node. It's exactly how CSS `flex-grow` works. Rather than encoding weight inside SizeValue (ugly tagged strings or objects), weight lives as a separate field on ContainerNode.

**SizeValue stays `"fill" | "hug"` — unchanged.**

Why not encode in SizeValue:
- SizeValue is shared by 6 node types (TextNode, ImageNode, ShapeNode, SlideNumberNode, TableNode, LayoutNode). Weight only makes sense on containers in a flex parent.
- Tagged strings (`"fill:2"`) require string parsing in the hot path and are ugly
- Object types break reference equality and JSON serialization
- Keeping SizeValue simple avoids polluting unrelated node types

### Changes

#### `packages/core/src/core/model/nodes.ts` — ContainerNode

```typescript
export interface ContainerNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.CONTAINER;
  direction: Direction;
  children: C[];
  width: number | SizeValue;  // becomes SizeValue in Phase 3
  height: number | SizeValue; // becomes SizeValue in Phase 3
  weight: number;             // NEW: flex-grow weight (main axis). SDK defaults to 1.
  spacing: number;
  spacingMode: SpacingMode;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding: Insets;
  layer?: Layer;              // should also become required (separate task)
}
```

Core types have no optional fields for resolved values. The SDK sets `weight` to `params.weight ?? 1` in the render function, same pattern as `spacing ?? 0`, `vAlign ?? VALIGN.TOP`, etc.

#### `packages/core/src/core/layout/layoutHtml.tsx` — flexSize()

One-line change in the FILL branch:

```typescript
} else if (mainSize === SIZE.FILL) {
  const w = weight ?? 1;
  styles.flex = `${w} 1 0`;   // flex-grow: N for weighted share
  // min-width:0 etc. unchanged...
}
```

`flexSize()` gains an optional `weight` parameter:
```typescript
export function flexSize(
  width: number | SizeValue,
  height: number | SizeValue,
  parentDir: Direction,
  opts?: { shrinkable?: boolean; weight?: number },
): Record<string, string | number>
```

Call site passes `(node as ContainerNode).weight` through.

CSS mechanic: `flex: 2 1 0` gives 2 shares vs `flex: 1 1 0` giving 1 share. Native flexbox — no custom calculation.

#### `packages/sdk/src/components/containers.ts` — RowParams/ColumnParams

```typescript
export type RowParams = {
  width?: SizeValue;
  height?: SizeValue;
  weight?: number;    // NEW: flex-grow weight. Defaults to 1. Only meaningful when main-axis size is FILL.
  spacing?: number;
  // ...
};
// Same for ColumnParams
```

Render function resolves: `weight: params.weight ?? 1`

#### DSL Usage

```typescript
row({},
  column({ weight: 3 }, ...mainContent),   // 60% (width defaults to FILL)
  column({ weight: 2 }, ...sidebar),        // 40%
)

// Explicit form:
row({},
  column({ width: SIZE.FILL, weight: 3 }, ...main),
  column({ width: SIZE.FILL, weight: 2 }, ...side),
)
```

#### Contradictions

`width: SIZE.HUG, weight: 3` — weight is ignored when main axis is HUG, same as CSS `flex-grow` being meaningless on non-flex items. No type-system enforcement needed; the runtime check is benign.

#### PPTX Renderer Changes

None. The renderer works with `PositionedNode` trees where all dimensions have been resolved to absolute pixels by the layout pipeline.

#### Breaking Changes

None. `weight` is an optional new field. `SizeValue` is unchanged.

---

## Phase 3: Remove Pixels from Container Layouts

### Prerequisites

1. **Phase 1** (image maxHeight for footer logo)
2. **Phase 2** (weighted FILL for unequal splits)
3. **Chrome spacer refactor** (independent, can be done anytime)

### Chrome Spacer Refactor

**Before** (`chrome.ts:47-60`):
```typescript
const footerRow = row(
  { height: chrome.footerHeight, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER },
  column({ width: chrome.margin }),        // spacer
  image(chrome.footerLogo, chrome.footerImage),
  column({ width: chrome.footerSpacing }), // spacer
  label(chrome.footerText, chrome.footer),
  column({ width: chrome.footerSpacing }), // spacer
  slideNumber(chrome.slideNumber),
  column({ width: chrome.margin }),        // spacer
);
```

**After**:
```typescript
const footerRow = row(
  {
    height: SIZE.HUG,
    vAlign: VALIGN.MIDDLE,
    hAlign: HALIGN.CENTER,
    padding: new Insets(chrome.footerVPad, chrome.margin, chrome.footerVPad, chrome.margin),
    spacing: chrome.footerSpacing,
  },
  image(chrome.footerLogo, { ...chrome.footerImage, maxHeight: 18 }),
  label(chrome.footerText, chrome.footer),
  slideNumber(chrome.slideNumber),
);
```

Key changes:
1. Spacer columns → `padding` on the row + `spacing` between children
2. `height: chrome.footerHeight` → `height: SIZE.HUG` + vertical padding (decomposes layout dimension into content + spatial token)
3. Footer logo uses `maxHeight` (Phase 1) instead of relying on container height
4. `bottomSpacer` column → `padding` on outer column

### Transform Layout `overlaySize`

**Before** (`layouts.ts:358-367`):
```typescript
column({ width: tokens.overlaySize, height: tokens.overlaySize }, ...slots.overlay)
```

**After**:
```typescript
column({ width: SIZE.HUG, height: SIZE.HUG, padding: tokens.overlayPadding }, ...slots.overlay)
```

### Type Changes — Container Nodes

```typescript
export interface ContainerNode {
  width: SizeValue;   // WAS: number | SizeValue
  height: SizeValue;  // WAS: number | SizeValue
  // spacing, padding remain as number/Insets
}

export interface StackNode {
  width: SizeValue;   // WAS: number | SizeValue
  height: SizeValue;  // WAS: number | SizeValue
}

export interface GridNode {
  width: SizeValue;   // WAS: number | SizeValue
  height: SizeValue;  // WAS: number | SizeValue
}
```

### Layout Engine — flexSize() simplification

The `typeof mainSize === "number"` branch is removed entirely. Weight is read from the container node:

```typescript
export function flexSize(
  width: SizeValue,     // WAS: number | SizeValue
  height: SizeValue,    // WAS: number | SizeValue
  parentDir: Direction,
  opts?: { shrinkable?: boolean; weight?: number },
) {
  // Only two branches: FILL and HUG
  if (mainSize === SIZE.FILL) {
    const w = opts?.weight ?? 1;
    styles.flex = `${w} 1 0`;
    // ...
  } else {
    // HUG
    // ...
  }
}
```

### SDK Params — containers.ts

```typescript
export type RowParams = {
  width?: SizeValue;   // WAS: number | SizeValue
  height?: SizeValue;  // WAS: number | SizeValue
  spacing?: number;    // stays pixels
  padding?: number | Insets;  // stays pixels
};
// Same for ColumnParams, StackParams, GridParams
```

### Complete Migration Inventory

| File:Line | Current | Replacement |
|-----------|---------|-------------|
| `chrome.ts:49` | `height: chrome.footerHeight` | `height: SIZE.HUG` + vertical padding |
| `chrome.ts:53` | `column({ width: chrome.margin })` | `padding` on parent row |
| `chrome.ts:55,57` | `column({ width: chrome.footerSpacing })` | `spacing` on parent row |
| `chrome.ts:59` | `column({ width: chrome.margin })` | `padding` on parent row |
| `chrome.ts:63` | `column({ height: chrome.bottomPadding })` | `padding` on outer column |
| `layouts.ts:361-362` | `width/height: tokens.overlaySize` | `SIZE.HUG` + padding |

### Breaking Changes

**Breaking** for any code passing `number` to container `width`/`height`. The TypeScript compiler catches every violation.

---

## Implementation Order

### Phase 1 and Phase 2 are independent — can be done in either order or in parallel.

**Phase 1** (Image Sizing) — recommended first:
1. Add `maxHeight` to `ImageNode` (core)
2. Update `styleImage()` in layoutHtml.tsx
3. Update `buildImageConfig()` in pptxConfigBuilder.ts
4. Add to `ImageTokens` in SDK
5. Wire through in `image.ts` render function
6. Update footer image tokens in format files

**Phase 2** (Fill Weights):
1. Add `weight?: number` to `ContainerNode` (core)
2. Pass `weight` through `flexSize()` opts
3. Add `weight?: number` to `RowParams`/`ColumnParams` in SDK
4. Wire through in render functions
5. Export from SDK
6. No theme-default changes required (opt-in)

**Phase 3** (Remove Pixels) — depends on both Phase 1 and Phase 2:
1. Chrome spacer refactor (can start independently)
2. Transform layout `overlaySize` migration
3. Narrow container types to `SizeValue` only
4. Remove `number` branch from `flexSize()`
5. Update SDK params types
6. Fix tests
7. Build — compiler finds everything

---

## Key Design Principles

1. **Containers drive content** (Notion model). Images FILL their container. `maxHeight` is a display constraint, not the image dictating layout.
2. **Layout dimensions are proportional**. Only FILL (with optional weight) and HUG. No pixels.
3. **Weight is a sibling relationship**, not a SizeValue encoding. Lives on ContainerNode, ignored when main axis is HUG.
4. **SizeValue stays simple**: `"fill" | "hug"`. No tagged strings, no objects. Two values.
5. **Spatial tokens stay as pixels**. Padding, spacing, margins, fontSize, maxHeight — format-specific constants.
6. **The compiler is the enforcer**. `number` becomes unassignable to container width/height. Every violation is a compile error.
7. **Formats parameterize via tokens**. Image maxHeight, footer padding, spacing values — all flow through the existing token system. No new parameterization mechanism.
