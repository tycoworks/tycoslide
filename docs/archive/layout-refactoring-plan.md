# Layout System Refactoring Plan

## Overview

Refactor compute-layout.ts to eliminate duplication and unify Row/Column under a single flex layout algorithm. The DSL keeps `row()` and `column()` as syntactic sugar.

## Problem Summary

| Issue | Lines Affected | Impact |
|-------|----------------|--------|
| Width distribution logic appears 3x | getNodeHeight:149-206, computeLayout:605-691, measure.ts:141-176 | ~180 lines duplicated |
| Row/Column are axis-swapped copies | ~200 lines each | Maintenance burden, bugs |
| Scattered intrinsic size knowledge | Multiple switch cases | Magic number risk |

## Architecture

### New Module: `src/core/layout/flex.ts`

Unified flex distribution algorithm used by both Row and Column:

```typescript
export type FlexDirection = 'horizontal' | 'vertical';

export interface FlexChild {
  fixedSize?: number;      // Explicit size in inches
  fillsRemaining?: boolean; // SIZE.FILL
  intrinsicSize?: number;  // For flex children (calculated)
}

export interface FlexResult {
  sizes: number[];
  fillIndex: number;  // -1 if none
}

/**
 * Distribute space among children along main axis.
 * Same algorithm for Row (horizontal) and Column (vertical).
 */
export function distributeFlexSpace(
  children: FlexChild[],
  availableSpace: number,
  gap: number
): FlexResult;
```

### New Module: `src/core/layout/intrinsics.ts`

Centralized intrinsic size calculation per node type:

```typescript
export interface LayoutContext {
  theme: Theme;
  measurer: TextMeasurer;
}

/**
 * Get intrinsic width of a node (used when Row has SIZE.FILL child).
 * Encapsulates all node-specific width knowledge.
 */
export function getIntrinsicWidth(
  node: ElementNode,
  constraintHeight: number,
  ctx: LayoutContext
): number;

/**
 * Get intrinsic height of a node.
 * Delegates to existing getNodeHeight but could be extended.
 */
export function getIntrinsicHeight(
  node: ElementNode,
  constraintWidth: number,
  ctx: LayoutContext
): number;
```

### Modified: `src/core/compute-layout.ts`

- Import and use `distributeFlexSpace()` for both Row and Column
- Import and use `getIntrinsicWidth()` instead of inline switch
- Row and Column cases become thin wrappers around shared flex logic
- Estimated reduction: ~300 lines

## Implementation Phases

### Phase 1: Extract `distributeFlexSpace()` (Low Risk)

**Files:**
- Create `src/core/layout/flex.ts`
- Create `src/core/layout/index.ts` (barrel export)
- Modify `src/core/compute-layout.ts` to import and use
- Modify `src/core/measure.ts` to import and use

**Changes:**
1. Extract the flex distribution algorithm (fill/fixed/flex logic)
2. Replace 3 call sites with single function call
3. All existing tests must pass unchanged

### Phase 2: Extract `getIntrinsicWidth()` (Low Risk)

**Files:**
- Create `src/core/layout/intrinsics.ts`
- Modify `src/core/compute-layout.ts` lines 636-672

**Changes:**
1. Move the node-type switch for intrinsic width into dedicated function
2. Encapsulates: IMAGE (aspect ratio), TEXT (measurer), SLIDE_NUMBER ("99"), LINE (border)
3. Prevents future magic numbers - this becomes the single source of truth

### Phase 3: Create `LayoutContext` type (Low Risk)

**Files:**
- Add to `src/core/layout/types.ts`
- Update function signatures in compute-layout.ts

**Changes:**
1. Bundle `theme` + `measurer` into single `LayoutContext` object
2. Cleaner function signatures
3. Foundation for future caching

### Phase 4: Unify Row/Column internally (Medium Risk)

**Files:**
- Modify `src/core/compute-layout.ts`
- Add `computeFlexLayout()` helper

**Changes:**
1. Create shared `computeFlexLayout(direction, node, bounds, ctx)` function
2. Row case calls `computeFlexLayout('horizontal', ...)`
3. Column case calls `computeFlexLayout('vertical', ...)`
4. Handles: gap, alignment, fill distribution, child positioning
5. Keep separate DSL functions `row()` and `column()` unchanged

### Phase 5: Update measure.ts (Low Risk)

**Files:**
- Modify `src/core/measure.ts`

**Changes:**
1. Use `distributeFlexSpace()` instead of duplicated logic
2. Ensure measurement collection uses same algorithm as layout

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/layout/flex.ts` | Flex distribution algorithm |
| `src/core/layout/intrinsics.ts` | Intrinsic size calculations |
| `src/core/layout/types.ts` | LayoutContext and shared types |
| `src/core/layout/index.ts` | Barrel exports |
| `test/layout/flex.test.ts` | Unit tests for flex distribution |
| `test/layout/intrinsics.test.ts` | Unit tests for intrinsic sizes |

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/compute-layout.ts` | Use new helpers, unify Row/Column |
| `src/core/measure.ts` | Use distributeFlexSpace() |

## API Stability

**No breaking changes:**
- `row()` and `column()` DSL functions unchanged
- Node types unchanged
- All existing slides work without modification

## Verification

1. **All 289 existing tests pass**: `npm test`
2. **Build succeeds**: `npm run build`
3. **Showcase renders correctly**: Rebuild and open in PowerPoint
4. **New unit tests**:
   - `distributeFlexSpace()` with fill, fixed, flex combinations
   - `getIntrinsicWidth()` for each node type
5. **Line count reduction**: compute-layout.ts should drop from ~920 to ~600 lines

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| 1-3 | Low | Pure extraction, no behavior change |
| 4 | Medium | Comprehensive test coverage before/after |
| 5 | Low | Simple replacement |

## Order of Operations

1. Phase 1: Extract flex distribution (eliminates 3x duplication)
2. Phase 2: Extract intrinsic width (prevents magic numbers)
3. Phase 3: LayoutContext (cleaner signatures)
4. Phase 4: Unify Row/Column (biggest win, ~200 lines)
5. Phase 5: Update measure.ts (consistency)

Each phase is independently committable and testable.
