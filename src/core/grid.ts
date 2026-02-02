// Grid Module
// Pure rectangle subdivision — deterministic, layout-in sizing.
// No Yoga, no Box dependency. Input: Bounds + spec → Bounds[].

import { Bounds } from './bounds.js';

// ============================================
// TYPES
// ============================================

/** Grid specification: rows × columns with optional gap. */
export interface GridSpec {
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
} as const;

export type StackJustify = typeof STACK_JUSTIFY[keyof typeof STACK_JUSTIFY];

/** Direction for splitRatio. */
export const SPLIT_DIRECTION = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal',
} as const;

export type SplitDirection = typeof SPLIT_DIRECTION[keyof typeof SPLIT_DIRECTION];

/** Options for stackV / stackH. */
export interface StackOptions {
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
export function slotGrid(bounds: Bounds, spec: GridSpec): Bounds[] {
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
// STACK FUNCTIONS
// ============================================

/**
 * Stack items vertically at absolute heights, top-to-bottom.
 * Unlike splitV (equal) or splitRatio (proportional), stackV takes
 * pre-measured heights — the bridge between content measurement and grid.
 *
 *   const titleH = snapUp(title.getHeight(bounds.w), unit);
 *   const bodyH  = bounds.h - titleH - gap;
 *   const [titleBounds, bodyBounds] = stackV(bounds, [titleH, bodyH], gap);
 *
 * Throws if total heights + gaps exceed bounds.h.
 */
export function stackV(
  bounds: Bounds,
  heights: number[],
  gap = 0,
  options?: StackOptions,
): Bounds[] {
  const n = heights.length;
  const totalGap = gap * Math.max(0, n - 1);
  const totalUsed = heights.reduce((sum, h) => sum + h, 0) + totalGap;

  if (totalUsed > bounds.h + 1e-9) {
    throw new Error(
      `stackV overflow: items need ${totalUsed.toFixed(4)}" but bounds.h is ${bounds.h.toFixed(4)}"`,
    );
  }

  const justify = options?.justify ?? STACK_JUSTIFY.START;
  let offset: number;
  if (justify === STACK_JUSTIFY.CENTER) {
    offset = (bounds.h - totalUsed) / 2;
  } else if (justify === STACK_JUSTIFY.END) {
    offset = bounds.h - totalUsed;
  } else {
    offset = 0;
  }

  return heights.map((h, i) => {
    const y = bounds.y + offset;
    offset += h + (i < n - 1 ? gap : 0);
    return new Bounds(bounds.x, y, bounds.w, h);
  });
}

/**
 * Stack items horizontally at absolute widths, left-to-right.
 * Horizontal counterpart of stackV.
 *
 *   const iconW = 0.5;
 *   const textW = bounds.w - iconW - gap;
 *   const [iconBounds, textBounds] = stackH(bounds, [iconW, textW], gap);
 *
 * Throws if total widths + gaps exceed bounds.w.
 */
export function stackH(
  bounds: Bounds,
  widths: number[],
  gap = 0,
  options?: StackOptions,
): Bounds[] {
  const n = widths.length;
  const totalGap = gap * Math.max(0, n - 1);
  const totalUsed = widths.reduce((sum, w) => sum + w, 0) + totalGap;

  if (totalUsed > bounds.w + 1e-9) {
    throw new Error(
      `stackH overflow: items need ${totalUsed.toFixed(4)}" but bounds.w is ${bounds.w.toFixed(4)}"`,
    );
  }

  const justify = options?.justify ?? STACK_JUSTIFY.START;
  let offset: number;
  if (justify === STACK_JUSTIFY.CENTER) {
    offset = (bounds.w - totalUsed) / 2;
  } else if (justify === STACK_JUSTIFY.END) {
    offset = bounds.w - totalUsed;
  } else {
    offset = 0;
  }

  return widths.map((w, i) => {
    const x = bounds.x + offset;
    offset += w + (i < n - 1 ? gap : 0);
    return new Bounds(x, bounds.y, w, bounds.h);
  });
}

// ============================================
// SPLIT FUNCTIONS
// ============================================

/**
 * Split a Bounds vertically into N equal rows.
 *
 *   splitV(bounds, 3, 0.125)  → 3 rows with 0.125" gap between
 */
export function splitV(bounds: Bounds, n: number, gap = 0): Bounds[] {
  const totalGap = gap * Math.max(0, n - 1);
  const cellH = (bounds.h - totalGap) / n;
  return Array.from({ length: n }, (_, i) =>
    new Bounds(bounds.x, bounds.y + i * (cellH + gap), bounds.w, cellH),
  );
}

/**
 * Split a Bounds horizontally into N equal columns.
 *
 *   splitH(bounds, 2, 0.125)  → 2 columns with 0.125" gap between
 */
export function splitH(bounds: Bounds, n: number, gap = 0): Bounds[] {
  const totalGap = gap * Math.max(0, n - 1);
  const cellW = (bounds.w - totalGap) / n;
  return Array.from({ length: n }, (_, i) =>
    new Bounds(bounds.x + i * (cellW + gap), bounds.y, cellW, bounds.h),
  );
}

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
