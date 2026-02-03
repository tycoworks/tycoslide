// Grid Module
// Pure rectangle subdivision — deterministic, layout-in sizing.
// No Yoga, no Box dependency. Input: Bounds + spec → Bounds[].

import { Bounds } from './bounds.js';
import { log } from '../utils/log.js';

// ============================================
// TYPES
// ============================================

/** Justify controls positioning of items along the stacking axis. */
export const STACK_JUSTIFY = {
  START: 'start',
  CENTER: 'center',
  END: 'end',
} as const;

export type StackJustify = typeof STACK_JUSTIFY[keyof typeof STACK_JUSTIFY];

/** Direction for splitRatio. */
export const SPLIT_DIRECTION = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal',
} as const;

type SplitDirection = typeof SPLIT_DIRECTION[keyof typeof SPLIT_DIRECTION];

/** Options for stackV / stackH. */
interface StackOptions {
  justify?: StackJustify;  // default: STACK_JUSTIFY.START
}

// ============================================
// SNAP
// ============================================

/**
 * Round a value up to the next multiple of unit.
 * Used to snap content estimates to the grid quantum.
 *
 *   snapUp(0.28, 0.125) → 0.375   (3 units)
 *   snapUp(0.5, 0.125)  → 0.5     (already aligned)
 */
export function snapUp(value: number, unit: number): number {
  return Math.ceil(value / unit) * unit;
}

/**
 * Round a value down to the nearest multiple of unit.
 * Used after fitHeights to restore grid alignment while staying within bounds.
 *
 *   snapDown(0.241, 0.125) → 0.125   (1 unit)
 *   snapDown(0.250, 0.125) → 0.250   (2 units, already aligned)
 *   snapDown(0.374, 0.125) → 0.250   (2 units)
 */
export function snapDown(value: number, unit: number): number {
  return Math.floor(value / unit) * unit;
}

// ============================================
// FIT FUNCTIONS
// ============================================

/**
 * Adjust sizes to fit within available space.
 * Each item shrinks proportionally to its compressible budget
 * (the difference between its natural height and its minimum height).
 * Items with no budget (minHeight === height) are incompressible.
 *
 *   // Image: natural 3.0, min 0.0 (fully compressible)
 *   // Text items: natural = min (incompressible)
 *   fitHeights([3.0, 0.4, 0.3], 2.5, 0.1, [0.0, 0.4, 0.3])
 *   → [1.6, 0.4, 0.3]  (image shrinks, text preserved, 2 gaps)
 *
 * If everything fits, returns sizes unchanged.
 * If no minHeights provided, all items are fully compressible (min = 0).
 */
export function fitHeights(
  heights: number[],
  available: number,
  gap = 0,
  minHeights?: number[],
): number[] {
  const n = heights.length;
  const totalGap = gap * Math.max(0, n - 1);
  const totalUsed = heights.reduce((sum, h) => sum + h, 0) + totalGap;

  // Fits already — return as-is
  if (totalUsed <= available + 1e-9) return heights;

  const excess = totalUsed - available;

  // Compute each item's shrinkable budget
  const budgets = heights.map((h, i) => {
    const min = minHeights ? (minHeights[i] ?? 0) : 0;
    return Math.max(0, h - min);
  });
  const totalBudget = budgets.reduce((sum, b) => sum + b, 0);

  // Nothing can shrink — return unchanged
  if (totalBudget <= 0) return heights;

  // Shrink proportionally, clamped to each item's budget
  const scale = Math.min(1, excess / totalBudget);
  return heights.map((h, i) => h - budgets[i] * scale);
}

// ============================================
// STACK FUNCTIONS
// ============================================

/**
 * Internal axis-generic stack implementation.
 * Places items along one axis at pre-measured sizes with justify support.
 * Throws if total sizes + gaps exceed the available dimension.
 */
function stack(
  bounds: Bounds,
  sizes: number[],
  gap: number,
  direction: SplitDirection,
  options?: StackOptions,
  unit?: number,
): Bounds[] {
  const isVertical = direction === SPLIT_DIRECTION.VERTICAL;
  const axis = isVertical ? 'height' : 'width';
  const available = isVertical ? bounds.h : bounds.w;

  const n = sizes.length;
  const totalGap = gap * Math.max(0, n - 1);
  const totalUsed = sizes.reduce((sum, s) => sum + s, 0) + totalGap;

  if (totalUsed > available + 1e-9) {
    throw new Error(
      `stack overflow (${axis}): items need ${totalUsed.toFixed(4)}" but ${axis} is ${available.toFixed(4)}"`,
    );
  }

  const makeBounds = isVertical
    ? (pos: number, size: number) => new Bounds(bounds.x, bounds.y + pos, bounds.w, size)
    : (pos: number, size: number) => new Bounds(bounds.x + pos, bounds.y, size, bounds.h);

  const justify = options?.justify ?? STACK_JUSTIFY.START;
  const freeSpace = available - totalUsed;

  let offset: number;
  let rawOffset: number;
  if (justify === STACK_JUSTIFY.CENTER) {
    rawOffset = freeSpace / 2;
    // Snap centering offset down to grid to keep Y positions aligned
    offset = unit ? snapDown(rawOffset, unit) : rawOffset;
  } else if (justify === STACK_JUSTIFY.END) {
    rawOffset = freeSpace;
    // Snap end offset down to grid
    offset = unit ? snapDown(rawOffset, unit) : rawOffset;
  } else {
    rawOffset = 0;
    offset = 0;
  }

  const snapped = unit && rawOffset !== offset;
  log('stack %s: justify=%s n=%d available=%f used=%f free=%f rawOffset=%f offset=%f%s sizes=%s',
    axis, justify, n, available, totalUsed, freeSpace, rawOffset, offset,
    snapped ? ` (snapped from ${rawOffset.toFixed(4)})` : '',
    JSON.stringify(sizes.map(s => s.toFixed(3))));

  return sizes.map((size, i) => {
    const b = makeBounds(offset, size);
    offset += size + (i < n - 1 ? gap : 0);
    return b;
  });
}

/**
 * Stack items vertically at absolute heights, top-to-bottom.
 * Throws if total heights + gaps exceed bounds.h.
 *
 *   const [titleBounds, bodyBounds] = stackV(bounds, [titleH, bodyH], gap);
 */
export function stackV(bounds: Bounds, heights: number[], gap = 0, options?: StackOptions, unit?: number): Bounds[] {
  return stack(bounds, heights, gap, SPLIT_DIRECTION.VERTICAL, options, unit);
}

/**
 * Stack items horizontally at absolute widths, left-to-right.
 * Throws if total widths + gaps exceed bounds.w.
 *
 *   const [iconBounds, textBounds] = stackH(bounds, [iconW, textW], gap);
 */
export function stackH(bounds: Bounds, widths: number[], gap = 0, options?: StackOptions, unit?: number): Bounds[] {
  return stack(bounds, widths, gap, SPLIT_DIRECTION.HORIZONTAL, options, unit);
}

// ============================================
// SPLIT FUNCTIONS
// ============================================

/**
 * Split a Bounds along an axis by proportional ratios.
 * Ratios are normalized (e.g., [1, 2] → 1/3 and 2/3).
 * A ratio of 0 means that slot gets 0 size.
 *
 *   splitRatio(bounds, [1, 2], SPLIT_DIRECTION.VERTICAL, 0.125)
 *   → top gets 1/3 of height, bottom gets 2/3, with 0.125" gap
 *
 *   splitRatio(bounds, [0, 1], SPLIT_DIRECTION.HORIZONTAL)
 *   → left gets 0 width, right gets full width
 */
export function splitRatio(
  bounds: Bounds,
  ratios: number[],
  direction: SplitDirection = SPLIT_DIRECTION.VERTICAL,
  gap = 0,
): Bounds[] {
  const n = ratios.length;
  const totalGap = gap * Math.max(0, n - 1);
  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
  const isVertical = direction === SPLIT_DIRECTION.VERTICAL;
  const available = (isVertical ? bounds.h : bounds.w) - totalGap;

  let offset = 0;
  return ratios.map((ratio, i) => {
    const size = totalRatio > 0 ? available * (ratio / totalRatio) : 0;
    const cell = isVertical
      ? new Bounds(bounds.x, bounds.y + offset, bounds.w, size)
      : new Bounds(bounds.x + offset, bounds.y, size, bounds.h);
    offset += size + (i < n - 1 ? gap : 0);
    return cell;
  });
}
