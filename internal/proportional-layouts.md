# Proportional Layout System

Phased plan for removing pixel dimensions from layout containers.

## Summary

tycoslide's layout system currently allows `number | SizeValue` on container width/height, letting pixel values leak into layout dimensions. This design eliminates pixel layout dimensions in three phases: (1) image display constraint via `maxHeight` on ImageNode, (2) weighted FILL via a separate `weight` param on containers, and (3) removal of pixel values from all container width/height fields, making `SizeValue` the only legal container dimension type.

The pixel-valued call sites in the codebase are narrowly scoped: **chrome.ts spacer columns** (4 sites), the **transform layout's `overlaySize`** (1 site), and the **footer row height** (spatial token, reclassified below). The migration surface is small.

---

## Three-Tier Sizing Model

| Category | Type | Pixels OK? | Examples |
|----------|------|-----------|----------|
| Layout dimensions (container w/h) | `Size` only | No | Column width, row height |
| Content display constraints | `number` | Yes | fontSize, maxHeight, maxWidth |
| Spatial tokens (padding, spacing) | `number` | Yes | Margins, gaps, chrome padding |
| Visual chrome (strokes, radii) | `number` | Yes | Border width, corner radius |

---

## Phase 1: Image Simplification — COMPLETE

ImageNode was simplified: `width` and `height` fields removed (they were always `SIZE.FILL` and overridden by `resolveImageSizing()`). `maxHeight` was explored but removed — the layout engine determines sizing purely from parent context. `LineNode` is the precedent: content nodes that do not declare their own dimensions.

```typescript
export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  alt?: string;
  shadow?: ShadowEffect;
}
```

The layout engine determines sizing from parent context via `resolveImageSizing()` — a pure function of `ParentCtx`.

---

## Phase 2: Weighted FILL — COMPLETE

`weight` is a required field on `ContainerNode`. The SDK defaults it to `1` via `params.weight ?? 1`. `Size` (renamed from `SizeValue`) stays `"fill" | "hug"` — weight is separate because it is a sibling relationship, not a property of a single node.

```typescript
export interface ContainerNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.CONTAINER;
  direction: Direction;
  children: C[];
  width: Size;
  height: Size;
  weight: number;        // flex-grow weight (main axis). SDK defaults to 1.
  spacing: number;
  spacingMode: Spacing;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding: Insets;
  layer: Layer;          // render target: master or content
}
```

#### Layout engine

`flexSize()` passes weight through to CSS `flex-grow`:

```typescript
if (mainSize === SIZE.FILL) {
  const w = opts?.weight ?? 1;
  styles.flex = `${w} 1 0`;
}
```

#### SDK

`RowParams` and `ColumnParams` expose `weight?: number` (default: `1`).

```typescript
row({},
  column({ weight: 3 }, ...mainContent),   // 60%
  column({ weight: 2 }, ...sidebar),        // 40%
)
```

`weight` is ignored when main-axis size is HUG — same as CSS `flex-grow` on non-flex items.

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

### Type Changes — Container Nodes (DONE)

Container width/height narrowed from `number | Size` to `Size`. `layer` is required on spatial containers (ContainerNode, GridNode). StackNode has no layer — it is a z-order composition primitive that inherits layer from its parent.

Node taxonomy:
- `LayeredNode = ContainerNode | GridNode` — spatial containers that participate in layer splitting
- `LayoutNode = LayeredNode | StackNode` — all nodes with children

```typescript
// ContainerNode and GridNode: layer required, Size only
width: Size;    // WAS: number | Size
height: Size;   // WAS: number | Size
layer: Layer;   // required (was optional)

// StackNode: no layer (inherits from parent)
width: Size;
height: Size;
// no layer field
```

### Layout Engine — flexSize() simplification (DONE)

The `typeof mainSize === "number"` branch was removed. Only two branches remain: FILL and HUG.

```typescript
export function flexSize(
  width: Size,
  height: Size,
  parentDir: Direction,
  opts?: { shrinkable?: boolean; weight?: number },
)
```

### SDK Params — containers.ts (DONE)

```typescript
export type RowParams = {
  width?: Size;
  height?: Size;
  weight?: number;           // flex-grow weight, default 1
  spacing?: number;          // stays pixels
  padding?: number | Insets; // stays pixels
};
// Same for ColumnParams. StackParams has only width/height. GridParams has columns, spacing, height.
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

**Phase 1** (Image Simplification) — COMPLETE. ImageNode stripped to `{ type, src, alt?, shadow? }`.

**Phase 2** (Fill Weights) — COMPLETE. `weight` required on ContainerNode, SDK defaults to 1.

**Also completed (during Phase 2):**
- `layer` made required on ContainerNode and GridNode, removed from StackNode
- Node taxonomy: `LayeredNode = ContainerNode | GridNode`, `LayoutNode = LayeredNode | StackNode`
- Type renames: `SizeValue`→`Size`, `SpacingMode`→`Spacing`, `SPACING_MODE`→`SPACING`, `ShadowType`→`Shadow`, `SHADOW_TYPE`→`SHADOW`, `ShapeName`→`Shape`, `DashType`→`Dash`, `DASH_TYPE`→`DASH`, `StrikeType`→`Strike`, `STRIKE_TYPE`→`STRIKE`, `UnderlineStyle`→`Underline`, `UNDERLINE_STYLE`→`UNDERLINE`
- Chrome spacer columns refactored to padding/spacing

**Phase 3** (Remove Pixels) — remaining work:
1. Transform layout `overlaySize` migration
2. Narrow container types from `number | Size` to `Size` only (already done)
3. Remove `number` branch from `flexSize()` (already done)
4. Verify no remaining pixel-valued container w/h in theme code

---

## Key Design Principles

1. **Containers drive content** (Notion model). Images FILL their container. `maxHeight` is a display constraint, not the image dictating layout.
2. **Layout dimensions are proportional**. Only FILL (with optional weight) and HUG. No pixels.
3. **Weight is a sibling relationship**, not a SizeValue encoding. Lives on ContainerNode, ignored when main axis is HUG.
4. **Size stays simple**: `"fill" | "hug"`. No tagged strings, no objects. Two values.
5. **Spatial tokens stay as pixels**. Padding, spacing, margins, fontSize, maxHeight — format-specific constants.
6. **The compiler is the enforcer**. `number` becomes unassignable to container width/height. Every violation is a compile error.
7. **Formats parameterize via tokens**. Image maxHeight, footer padding, spacing values — all flow through the existing token system. No new parameterization mechanism.
