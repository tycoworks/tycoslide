// Grid Layout — Row and Column implementations on grid primitives
// These replace Box-based row/column with stackV/stackH/splitRatio.
// Same authoring API, grid underneath instead of flexbox.

import {
  GAP,
  DIRECTION,
  ALIGN,
  type Theme,
  type Component,
  type Drawer,
  type Bounds,
  type GapSize,
  type Justify,
  type Align,
  type AlignContext,
} from './types.js';
import { stackV, stackH, splitRatio, SPLIT_DIRECTION, type StackJustify } from './grid.js';
import { log } from '../utils/log.js';

// ============================================
// LAYOUT OPTIONS (same as current layout.ts)
// ============================================

export interface LayoutOptions {
  gap?: GapSize;          // default: GAP.NORMAL
  align?: Align;
  justify?: Justify;
  height?: number;        // explicit height in inches
}

function resolveGap(gap: GapSize | undefined, theme: Theme): number {
  if (gap === undefined || gap === GAP.NORMAL) return theme.spacing.gap;
  if (gap === GAP.SMALL) return theme.spacing.gapSmall;
  return 0;  // GAP.NONE
}

// ============================================
// GRID COLUMN
// ============================================

/**
 * GridColumn stacks children vertically using grid primitives.
 *
 * Without proportions: each child gets its natural height via getHeight().
 * Items are positioned with stackV.
 *
 * With proportions: 0 means content-sized, non-zero means proportional
 * share of remaining space. E.g. [0, 1] = first child content-sized,
 * second child fills the rest.
 */
export class GridColumn implements Component {
  constructor(
    private children: Component[],
    private proportions: number[] | undefined,
    private gap: number,
    private align: Align,
    private explicitHeight?: number,
  ) {}

  getHeight(width: number): number {
    if (this.explicitHeight !== undefined) return this.explicitHeight;
    const heights = this.children.map(c => c.getHeight(width));
    const totalGap = this.gap * Math.max(0, this.children.length - 1);
    return heights.reduce((sum, h) => sum + h, 0) + totalGap;
  }

  prepare(bounds: Bounds): Drawer {
    const n = this.children.length;
    const alignContext: AlignContext = { direction: DIRECTION.COLUMN, align: this.align };
    let slots: Bounds[];

    if (this.proportions) {
      // Mixed content-sized + proportional layout
      const contentHeights = this.children.map((c, i) =>
        this.proportions![i] === 0 ? c.getHeight(bounds.w) : 0,
      );
      const contentTotal = contentHeights.reduce((sum, h) => sum + h, 0);
      const totalGap = this.gap * Math.max(0, n - 1);
      const remaining = bounds.h - contentTotal - totalGap;
      const flexTotal = this.proportions.reduce((sum, p) => sum + p, 0);

      const finalHeights = this.children.map((_, i) => {
        if (this.proportions![i] === 0) return contentHeights[i];
        return flexTotal > 0 ? remaining * (this.proportions![i] / flexTotal) : 0;
      });

      slots = stackV(bounds, finalHeights, this.gap);
    } else {
      // Content-sized: measure each child, stack top-to-bottom
      const heights = this.children.map(c => c.getHeight(bounds.w));
      slots = stackV(bounds, heights, this.gap);
    }

    const drawers = this.children.map((c, i) => c.prepare(slots[i], alignContext));
    return (canvas) => drawers.forEach(d => d(canvas));
  }
}

// ============================================
// GRID ROW
// ============================================

/**
 * GridRow stacks children horizontally using grid primitives.
 *
 * Default: equal widths for all children.
 * With proportions: same semantics as GridColumn but on horizontal axis.
 */
export class GridRow implements Component {
  constructor(
    private children: Component[],
    private proportions: number[] | undefined,
    private gap: number,
    private align: Align,
    private explicitHeight?: number,
  ) {}

  getHeight(width: number): number {
    if (this.explicitHeight !== undefined) return this.explicitHeight;
    const n = this.children.length;
    const totalGap = this.gap * Math.max(0, n - 1);
    const childWidth = (width - totalGap) / n;
    return Math.max(...this.children.map(c => c.getHeight(childWidth)));
  }

  prepare(bounds: Bounds): Drawer {
    const n = this.children.length;
    const alignContext: AlignContext = { direction: DIRECTION.ROW, align: this.align };
    let slots: Bounds[];

    if (this.proportions) {
      // Mixed content-sized + proportional layout
      const hasContentSized = this.proportions.some(p => p === 0);

      if (hasContentSized) {
        const contentWidths = this.children.map((c, i) => {
          if (this.proportions![i] === 0 && c.getWidth) return c.getWidth(bounds.h);
          if (this.proportions![i] === 0) return c.getHeight(bounds.h); // fallback estimate
          return 0;
        });
        const contentTotal = contentWidths.reduce((sum, w) => sum + w, 0);
        const totalGap = this.gap * Math.max(0, n - 1);
        const remaining = bounds.w - contentTotal - totalGap;
        const flexTotal = this.proportions.reduce((sum, p) => sum + p, 0);

        const finalWidths = this.children.map((_, i) => {
          if (this.proportions![i] === 0) return contentWidths[i];
          return flexTotal > 0 ? remaining * (this.proportions![i] / flexTotal) : 0;
        });

        slots = stackH(bounds, finalWidths, this.gap);
      } else {
        // Pure proportional — use splitRatio
        slots = splitRatio(bounds, this.proportions, SPLIT_DIRECTION.HORIZONTAL, this.gap);
      }
    } else {
      // Default: equal widths
      slots = splitRatio(
        bounds,
        this.children.map(() => 1),
        SPLIT_DIRECTION.HORIZONTAL,
        this.gap,
      );
    }

    const drawers = this.children.map((c, i) => c.prepare(slots[i], alignContext));
    return (canvas) => drawers.forEach(d => d(canvas));
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

type FactoryArgs = any[];

function parseArgs(args: FactoryArgs): {
  children: Component[];
  proportions?: number[];
  options: LayoutOptions;
} {
  let children: Component[];
  let proportions: number[] | undefined;
  let options: LayoutOptions = {};

  if (Array.isArray(args[0])) {
    proportions = args[0] as number[];
    children = args[1] as Component[];
    if (args[2]) options = args[2] as LayoutOptions;
  } else if (args[0] && !('prepare' in args[0])) {
    options = args[0] as LayoutOptions;
    children = args.slice(1) as Component[];
  } else {
    children = args as Component[];
  }

  return { children, proportions, options };
}

/**
 * gridRow() — Arrange children horizontally using grid primitives.
 * Same API as row(). Children get equal widths by default.
 *
 *   gridRow(theme, card1, card2, card3)
 *   gridRow(theme, { gap: 'small' }, card1, card2, card3)
 *   gridRow(theme, [1, 2], [image, column])
 */
export function gridRow(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): GridRow;
export function gridRow(theme: Theme, options: LayoutOptions, ...children: Component[]): GridRow;
export function gridRow(theme: Theme, ...children: Component[]): GridRow;
export function gridRow(theme: Theme, ...args: any[]): GridRow {
  const { children, proportions, options } = parseArgs(args);
  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.CENTER;

  log('gridRow: children=%d proportions=%s gap=%f',
    children.length, proportions ? JSON.stringify(proportions) : 'equal', gap);

  return new GridRow(children, proportions, gap, align, options.height);
}

/**
 * gridColumn() — Arrange children vertically using grid primitives.
 * Same API as column(). Children are content-sized by default.
 *
 *   gridColumn(theme, title, subtitle, cardRow)
 *   gridColumn(theme, [0, 1], [header, content])
 *   gridColumn(theme, [1, 2], [top, bottom])
 */
export function gridColumn(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): GridColumn;
export function gridColumn(theme: Theme, options: LayoutOptions, ...children: Component[]): GridColumn;
export function gridColumn(theme: Theme, ...children: Component[]): GridColumn;
export function gridColumn(theme: Theme, ...args: any[]): GridColumn {
  const { children, proportions, options } = parseArgs(args);
  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.CENTER;

  log('gridColumn: children=%d proportions=%s gap=%f',
    children.length, proportions ? JSON.stringify(proportions) : 'content', gap);

  return new GridColumn(children, proportions, gap, align, options.height);
}
