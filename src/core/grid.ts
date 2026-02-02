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
 *   splitRatio(bounds, [1, 2], 'vertical', 0.125)
 *   → top gets 1/3 of height, bottom gets 2/3, with 0.125" gap
 *
 *   splitRatio(bounds, [0, 1], 'horizontal')
 *   → left gets 0 width, right gets full width
 */
export function splitRatio(
  bounds: Bounds,
  ratios: number[],
  direction: 'vertical' | 'horizontal' = 'vertical',
  gap = 0,
): Bounds[] {
  const n = ratios.length;
  const totalGap = gap * Math.max(0, n - 1);
  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
  const isVertical = direction === 'vertical';
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
