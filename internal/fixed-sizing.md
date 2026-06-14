# Fixed Pixel Sizing for Containers

Adding `SIZE.FIXED` to the `Size` union for fixed-pixel container dimensions.

## Summary

Every layout framework (CSS flexbox, Figma auto-layout, SwiftUI/Flutter) supports three sizing modes: fill available space, hug content, and fixed pixels. tycoslide previously had only FILL and HUG. This design adds `SIZE.FIXED` as a third variant of `Size`, restoring a capability that was removed during the proportional-layouts work (Phase 3). The implementation surface is small: one type change, one function change, and zero renderer changes.

Motivating case: a footer row with a 21px logo, flexible spacer, flexible text, and a 29px page number column — all children have known pixel widths except the flexible middle.

---

## 1. The Type Change

### Before (types.ts:34-39)

```typescript
export const SIZE = {
  FILL: "fill",
  HUG: "hug",
} as const;

export type Size = (typeof SIZE)[keyof typeof SIZE];
```

### After

```typescript
export const SIZE = {
  FILL: "fill",
  HUG: "hug",
  FIXED: "fixed",
} as const;

export type Size = (typeof SIZE)[keyof typeof SIZE];
```

**DECIDED**: `SIZE.FIXED` is a third string literal in the `SIZE` const. The `Size` type remains a union of string literals — no bare `number` in the union. The pixel value is carried separately by the `weight` field on `ContainerNode` (the same field used for weighted FILL).

### Discriminant Logic

```typescript
if (size === SIZE.FIXED) {
  // Fixed pixels — exact dimension, value in node.weight
} else if (size === SIZE.FILL) {
  // Share available space (weight from ContainerNode.weight = flex-grow value)
} else {
  // SIZE.HUG — content-sized
}
```

**Unit**: Pixels. Matches all other spatial values in the system (padding, spacing, fontSize). Not inches — the PPTX renderer converts from pixels to inches at the rendering boundary via `pxToIn()`.

### Dual-Purpose `weight` Field

The `weight` field on `ContainerNode` serves two roles depending on the size value:

- When size is `SIZE.FILL`: `weight` = flex-grow value (default 1)
- When size is `SIZE.FIXED`: `weight` = pixel value

Limitation: if main axis is weighted FILL and cross axis is FIXED, the single weight field cannot carry both values. This combination does not arise in practice.

---

## 2. The Flex Algorithm — `flexSize()` (layoutHtml.tsx)

### Current Implementation

Three branches: FIXED, FILL, and else (HUG).

### FIXED Branch

- Main axis FIXED: `flex: 0 0 ${weight}px` (no grow, no shrink, exact basis). `weight` comes from `opts?.weight` which reads `node.weight`.
- Cross axis FIXED: explicit CSS `height` or `width` in pixels, using the `weight` value.

### Flex Allocation Order

When a row has mixed fixed + FILL children:

```
┌─────────────────────────────────────────────────────┐
│ parent row: width = 960px                           │
│                                                     │
│ ┌──21px──┐ ┌──────FILL(1)──────┐ ┌──29px──┐        │
│ │  logo  │ │   flexible text   │ │ page # │        │
│ └────────┘ └───────────────────┘ └────────┘        │
│                                                     │
│ Fixed claims: 21 + 29 = 50px                        │
│ FILL budget: 960 - 50 = 910px                       │
│ FILL(1) gets: 910px                                 │
└─────────────────────────────────────────────────────┘
```

CSS flexbox handles this natively: `flex: 0 0 21px` items claim their basis first, then `flex: 1 1 0` items divide the remainder by weight. No custom allocation code needed.

---

## 3. Existing Code That Handles FIXED

### `childContext()` (layoutHtml.tsx)

```typescript
const heightIsConstrained =
  node.height === SIZE.FIXED ? true
    : node.height === SIZE.HUG ? false
    : parent.heightIsConstrained;
```

A FIXED-height parent provides a definite height budget — `heightIsConstrained` becomes `true`. **Checks `=== SIZE.FIXED`.**

### `hasDefiniteCrossSize`

Returns `true` when height is `SIZE.FIXED` (since `SIZE.FIXED !== SIZE.HUG`). **No bare-number check.**

### `styleGrid()` (layoutHtml.tsx)

```typescript
if (node.height === SIZE.FILL || node.height === SIZE.FIXED) {
  styles.gridAutoRows = "1fr";
}
```

Handles fixed-height grids. **Checks `=== SIZE.FIXED`.**

### `styleContainer()` containment (layoutHtml.tsx)

Columns with non-HUG width get `container-type: inline-size`. A FIXED-width column is not HUG, so it gets containment correctly. **No changes needed.**

---

## 4. PPTX Renderer

Both `pptxRenderer.ts` and `pptxConfigBuilder.ts` read only `PositionedNode` (which has `x, y, width, height` as raw pixel numbers from the measurement pipeline). Neither file reads `Size` from node types.

**DECIDED**: Zero renderer changes needed.

---

## 5. Edge Cases

### 5a. All Children Fixed (No FILL Siblings)

Fixed children claim their pixels. Remaining space is unclaimed — CSS leaves it as empty space at the end (per `justify-content`). Standard CSS flexbox behavior. **No special handling.**

### 5b. Fixed Children Exceed Parent's Available Space

`flex: 0 0 Npx` means `flex-shrink: 0` — children will NOT shrink. Content overflows the parent. The existing `LayoutValidator` detects children exceeding parent bounds. **No special handling — overflow is a user error caught at validation time.**

### 5c. Single Fixed Child in a FILL Parent

The fixed child gets `flex: 0 0 Npx`, claims exactly N pixels regardless of parent size. Remaining space is unclaimed. **No special handling.**

### 5d. Fixed-Size Container with FILL Children Inside

The container gets `flex: 0 0 300px` in its parent. Inside, FILL children split the 300px by weight. `childContext()` sets `heightIsConstrained: true`. **No special handling — this is the fundamental use case.**

### 5e. Nested Fixed: Fixed Inside Fixed Inside FILL

Each fixed container claims its exact dimension. `heightIsConstrained` propagates correctly through the chain. **No special handling.**

### 5f. Fixed Width + FILL Height on Same Container (Mixed Axes)

Width is main axis → `flex: 0 0 300px`. Height is cross axis → `height: 100%` (FILL). Each axis resolves independently in `flexSize()`. **No special handling.**

### 5g. Fixed Size Zero

`flex: 0 0 0px` on main axis. Produces a zero-width element. Valid CSS. **Allow it.**

### 5h. Missing Weight

**DECIDED**: `validateFixedSize()` in `containers.ts` throws if `SIZE.FIXED` is used without an explicit `weight`. Validation is in the SDK factories (`row()`, `column()`), not in core's `flexSize()`. Core trusts its callers.

### 5i. Negative Numbers

**DECIDED**: Do NOT add runtime validation. The layout validator catches nonsensical bounds downstream. Adding a runtime check here would be inconsistent with padding/spacing (which also accept `number` without negative guards).

### 5j. Fixed Size + Weight Conflict on Same Container

When `size === SIZE.FIXED`, the `weight` field carries the pixel value. There is no conflict — FIXED consumes weight as pixels, not as a flex-grow factor.

### 5k. Cross-Axis Fixed: Row Child with `height: SIZE.FIXED, weight: 50`

The child gets `height: 50px` (cross-axis fixed). Siblings' heights are independent. The fixed-height child does NOT stretch. **No special handling.**

---

## 6. Test Plan

### 6a. Existing Tests

Tests in `packages/core/test/layoutHtml.test.ts` assert fixed sizing behavior using `SIZE.FIXED` + `weight`.

### 6b. Unit Tests

| Test | Description |
|------|-------------|
| Fixed main + FILL cross | `column({ width: SIZE.FIXED, weight: 300, height: SIZE.FILL })` in row → `flex:0 0 300px` + `height:100%` |
| Fixed cross only | `column({ height: SIZE.FIXED, weight: 50 })` in row → `height:50px`, main axis HUG |
| Mixed children | Row with `column({ width: SIZE.FIXED, weight: 100 })`, `column()`, `column({ width: SIZE.FIXED, weight: 200 })` → two fixed, one FILL |
| Zero width | `column({ width: SIZE.FIXED, weight: 0 })` in row → `flex:0 0 0px` |

### 6c. Regression

Existing FILL-only and HUG-only tests must continue passing unchanged.

---

## 7. Implementation Checklist

### File 1: `packages/core/src/core/model/types.ts`

- [x] Add `FIXED: "fixed"` to the `SIZE` const object
- [x] `Size` type remains `(typeof SIZE)[keyof typeof SIZE]` — no union with `number`
- [x] Update JSDoc on `Size` to document the three variants

### File 2: `packages/core/src/core/layout/layoutHtml.tsx`

- [x] Add `=== SIZE.FIXED` branch to `flexSize()`: emit `flex: 0 0 ${weight}px` using `opts?.weight`
- [x] Add cross-axis `=== SIZE.FIXED` branch: emit explicit `width` or `height` in pixels using `opts?.weight`
- [x] `childContext()` — updated to check `=== SIZE.FIXED` (not `typeof === "number"`)
- [x] `styleGrid()` — updated to check `=== SIZE.FIXED`
- [x] No changes to `styleContainer()` — containment rule already correct

### File 3: Tests (`packages/core/test/layoutHtml.test.ts`)

- [x] Test inputs use `{ width: SIZE.FIXED, weight: N }` syntax
- [x] Test expectations match pixel values from `weight`

### File 4: JSDoc updates (nodes.ts, containers.ts)

- [x] Update ContainerNode, StackNode, GridNode width/height JSDoc
- [x] Update RowParams, ColumnParams, StackParams width/height comments

### No PPTX renderer changes — confirmed.

### Implementation Order

1. Type change (types.ts) — add `FIXED` to `SIZE` const
2. `flexSize()` FIXED branch (layoutHtml.tsx) — the actual behavior change
3. Fix + add tests (layoutHtml.test.ts) — prove it works
4. Update JSDoc (nodes.ts, containers.ts) — documentation

### Usage

```typescript
column({ width: SIZE.FIXED, weight: 21 }, logo)   // fixed 21px wide
column({ width: SIZE.FILL })                       // flexible
row({ height: SIZE.FIXED, weight: 48 })            // fixed 48px tall
```

Total production code change: ~20 lines. Test code: ~40 lines.
