// Grid Layout — Row and Column implementations on grid primitives
// Uses stackV/stackH/splitRatio underneath. Public API: row(), column(), expand().

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
import { stackV, stackH, splitRatio, fitHeights, SPLIT_DIRECTION, type StackJustify } from './grid.js';
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

/** Shared prepare logic for GridColumn and GridRow. */
function prepareLayout(
  children: Component[], slots: Bounds[], direction: typeof DIRECTION[keyof typeof DIRECTION], align: Align,
): Drawer {
  const alignContext: AlignContext = { direction, align };
  const drawers = children.map((c, i) => c.prepare(slots[i], alignContext));
  return (canvas) => drawers.forEach(d => d(canvas));
}

/**
 * Resolve mixed proportions (0 = content-sized, >0 = flex) into final sizes.
 * Shared by GridColumn (heights) and GridRow (widths).
 */
function resolveProportions(
  proportions: number[],
  contentSizes: number[],
  available: number,
  gap: number,
): number[] {
  const n = proportions.length;
  const contentTotal = contentSizes.reduce((sum, s) => sum + s, 0);
  const totalGap = gap * Math.max(0, n - 1);
  const remaining = available - contentTotal - totalGap;
  const flexTotal = proportions.reduce((sum, p) => sum + p, 0);
  return proportions.map((p, i) => {
    if (p === 0) return contentSizes[i];
    return flexTotal > 0 ? remaining * (p / flexTotal) : 0;
  });
}

// ============================================
// EXPANDED MARKER
// ============================================

class Expanded implements Component {
  constructor(public inner: Component, public flex = 1) {}
  getHeight(w: number) { return this.inner.getHeight(w); }
  getMinHeight(w: number) { return this.inner.getMinHeight(w); }
  getWidth(h: number) { return this.inner.getWidth?.(h) ?? 0; }
  prepare(b: Bounds, ac?: AlignContext) { return this.inner.prepare(b, ac); }
}

export function expand(component: Component): Component {
  return new Expanded(component);
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
    private justify?: StackJustify,
  ) {}

  private measure(width: number, min: boolean): number {
    if (this.explicitHeight !== undefined) return this.explicitHeight;
    const heights = this.children.map(c => min ? c.getMinHeight(width) : c.getHeight(width));
    const totalGap = this.gap * Math.max(0, this.children.length - 1);
    return heights.reduce((sum, h) => sum + h, 0) + totalGap;
  }

  getHeight(width: number): number { return this.measure(width, false); }
  getMinHeight(width: number): number { return this.measure(width, true); }

  getSlots(bounds: Bounds): Bounds[] {
    const h = this.explicitHeight !== undefined ? Math.min(bounds.h, this.explicitHeight) : bounds.h;

    if (this.proportions) {
      const contentHeights = this.children.map((c, i) =>
        this.proportions![i] === 0 ? c.getHeight(bounds.w) : 0,
      );
      const finalHeights = resolveProportions(this.proportions, contentHeights, h, this.gap);
      return stackV(bounds, finalHeights, this.gap, { justify: this.justify });
    }

    // Content-sized: measure, fit compressible children, stack
    const heights = this.children.map(c => c.getHeight(bounds.w));
    const minHeights = this.children.map(c => c.getMinHeight(bounds.w));
    const fitted = fitHeights(heights, h, this.gap, minHeights);
    return stackV(bounds, fitted, this.gap, { justify: this.justify });
  }

  prepare(bounds: Bounds): Drawer {
    return prepareLayout(this.children, this.getSlots(bounds), DIRECTION.COLUMN, this.align);
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
    private justify?: StackJustify,
  ) {}

  private measure(width: number, min: boolean): number {
    if (this.explicitHeight !== undefined) return this.explicitHeight;
    const n = this.children.length;
    const totalGap = this.gap * Math.max(0, n - 1);
    const childWidth = (width - totalGap) / n;
    return Math.max(...this.children.map(c => min ? c.getMinHeight(childWidth) : c.getHeight(childWidth)));
  }

  getHeight(width: number): number { return this.measure(width, false); }
  getMinHeight(width: number): number { return this.measure(width, true); }

  getSlots(bounds: Bounds): Bounds[] {
    if (this.proportions) {
      const hasContentSized = this.proportions.some(p => p === 0);

      if (hasContentSized) {
        const contentWidths = this.children.map((c, i) => {
          if (this.proportions![i] === 0 && c.getWidth) return c.getWidth(bounds.h);
          if (this.proportions![i] === 0) return c.getHeight(bounds.h);
          return 0;
        });
        const finalWidths = resolveProportions(this.proportions, contentWidths, bounds.w, this.gap);
        return stackH(bounds, finalWidths, this.gap, { justify: this.justify });
      }

      // Pure proportional — use splitRatio
      return splitRatio(bounds, this.proportions, SPLIT_DIRECTION.HORIZONTAL, this.gap);
    }

    // Default: equal widths
    return splitRatio(
      bounds,
      this.children.map(() => 1),
      SPLIT_DIRECTION.HORIZONTAL,
      this.gap,
    );
  }

  prepare(bounds: Bounds): Drawer {
    return prepareLayout(this.children, this.getSlots(bounds), DIRECTION.ROW, this.align);
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

  // Auto-detect expand() markers and generate proportions
  if (!proportions) {
    const hasExpanded = children.some(c => c instanceof Expanded);
    if (hasExpanded) {
      proportions = children.map(c => c instanceof Expanded ? c.flex : 0);
      children = children.map(c => c instanceof Expanded ? c.inner : c);
    }
  }

  return { children, proportions, options };
}

/**
 * row() — Arrange children horizontally.
 * Children get equal widths by default.
 *
 *   row(theme, card1, card2, card3)
 *   row(theme, { gap: 'small' }, card1, card2, card3)
 *   row(theme, [1, 2], [image, column])
 */
export function row(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): GridRow;
export function row(theme: Theme, options: LayoutOptions, ...children: Component[]): GridRow;
export function row(theme: Theme, ...children: Component[]): GridRow;
export function row(theme: Theme, ...args: any[]): GridRow {
  const { children, proportions, options } = parseArgs(args);
  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.CENTER;

  log('row: children=%d proportions=%s gap=%f',
    children.length, proportions ? JSON.stringify(proportions) : 'equal', gap);

  return new GridRow(children, proportions, gap, align, options.height, options.justify as StackJustify);
}

/**
 * column() — Arrange children vertically.
 * Children are content-sized by default.
 *
 *   column(theme, title, subtitle, cardRow)
 *   column(theme, [0, 1], [header, content])
 *   column(theme, [1, 2], [top, bottom])
 */
export function column(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): GridColumn;
export function column(theme: Theme, options: LayoutOptions, ...children: Component[]): GridColumn;
export function column(theme: Theme, ...children: Component[]): GridColumn;
export function column(theme: Theme, ...args: any[]): GridColumn {
  const { children, proportions, options } = parseArgs(args);
  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.CENTER;

  log('column: children=%d proportions=%s gap=%f',
    children.length, proportions ? JSON.stringify(proportions) : 'content', gap);

  return new GridColumn(children, proportions, gap, align, options.height, options.justify as StackJustify);
}
