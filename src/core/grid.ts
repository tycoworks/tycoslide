// Grid Module
// Pure rectangle subdivision — deterministic, layout-in sizing.
// No Yoga, no Box dependency. Input: Bounds + spec → Bounds[].

import { Bounds } from './bounds.js';

// ============================================
// TYPES
// ============================================

/** Grid specification: rows × columns with optional gap. */
interface GridSpec {
  rows: number;
  cols: number;
  gap?: number;       // gap between cells in inches (default: 0)
  rowGap?: number;    // override gap for rows
  colGap?: number;    // override gap for columns
}

/** Justify controls positioning of items along the stacking axis. */
export const STACK_JUSTIFY = {
  START: 'start',
  CENTER: 'center',
  END: 'end',
  SPACE_BETWEEN: 'space-between',
  SPACE_EVENLY: 'space-evenly',
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
function snapUp(value: number, unit: number): number {
  return Math.ceil(value / unit) * unit;
}

// ============================================
// SLOT GRID
// ============================================

/**
 * Divide a Bounds into a uniform grid of cells.
 * Returns Bounds[] in row-major order (left-to-right, top-to-bottom).
 *
 *   slotGrid(bounds, { rows: 2, cols: 3, gap: 0.125 })
 *   → 6 cells, each (boundsW - 2*gap) / 3 wide, (boundsH - gap) / 2 tall
 */
function slotGrid(bounds: Bounds, spec: GridSpec): Bounds[] {
  const { rows, cols } = spec;
  const rGap = spec.rowGap ?? spec.gap ?? 0;
  const cGap = spec.colGap ?? spec.gap ?? 0;

  const totalColGap = cGap * Math.max(0, cols - 1);
  const totalRowGap = rGap * Math.max(0, rows - 1);
  const cellW = (bounds.w - totalColGap) / cols;
  const cellH = (bounds.h - totalRowGap) / rows;

  const cells: Bounds[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(new Bounds(
        bounds.x + c * (cellW + cGap),
        bounds.y + r * (cellH + rGap),
        cellW,
        cellH,
      ));
    }
  }
  return cells;
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

  if (justify === STACK_JUSTIFY.SPACE_EVENLY) {
    // Spacers replace gaps — compute from total content only, not freeSpace
    const totalSizes = sizes.reduce((sum, s) => sum + s, 0);
    const spacer = (available - totalSizes) / (n + 1);
    if (spacer >= gap) {
      // Enough free space — distribute evenly
      let pos = spacer;
      return sizes.map((size) => {
        const b = makeBounds(pos, size);
        pos += size + spacer;
        return b;
      });
    } else {
      // Not enough — use gap between items, center the block
      const totalWithGaps = sizes.reduce((sum, s) => sum + s, 0) + gap * Math.max(0, n - 1);
      const offset = Math.max(0, (available - totalWithGaps) / 2);
      let pos = offset;
      return sizes.map((size, i) => {
        const b = makeBounds(pos, size);
        pos += size + (i < n - 1 ? gap : 0);
        return b;
      });
    }
  }

  if (justify === STACK_JUSTIFY.SPACE_BETWEEN) {
    const between = n > 1 ? freeSpace / (n - 1) : 0;
    let pos = 0;
    return sizes.map((size, i) => {
      const b = makeBounds(pos, size);
      pos += size + (i < n - 1 ? between : 0);
      return b;
    });
  }

  let offset: number;
  if (justify === STACK_JUSTIFY.CENTER) {
    offset = freeSpace / 2;
  } else if (justify === STACK_JUSTIFY.END) {
    offset = freeSpace;
  } else {
    offset = 0;
  }

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
export function stackV(bounds: Bounds, heights: number[], gap = 0, options?: StackOptions): Bounds[] {
  return stack(bounds, heights, gap, SPLIT_DIRECTION.VERTICAL, options);
}

/**
 * Stack items horizontally at absolute widths, left-to-right.
 * Throws if total widths + gaps exceed bounds.w.
 *
 *   const [iconBounds, textBounds] = stackH(bounds, [iconW, textW], gap);
 */
export function stackH(bounds: Bounds, widths: number[], gap = 0, options?: StackOptions): Bounds[] {
  return stack(bounds, widths, gap, SPLIT_DIRECTION.HORIZONTAL, options);
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
