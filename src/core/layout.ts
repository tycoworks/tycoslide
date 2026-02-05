// Grid Layout — Row and Column implementations on grid primitives
// Uses stackV/stackH/splitRatio underneath. Public API: row(), column(), expand().

import {
  GAP,
  DIRECTION,
  ALIGN,
  HALIGN,
  VALIGN,
  type Theme,
  type Component,
  type Drawer,
  Bounds,
  type GapSize,
  type Justify,
  type Align,
  type AlignContext,
  type HorizontalAlignment,
  type VerticalAlignment,
} from './types.js';
import { stackV, stackH, splitRatio, fitHeights, snapUp, snapDown, SPLIT_DIRECTION, type StackJustify } from './grid.js';
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
  if (gap === GAP.TIGHT) return theme.spacing.gapTight;
  if (gap === GAP.LOOSE) return theme.spacing.gapLoose;
  return 0;  // GAP.NONE
}

// ============================================
// ALIGNMENT UTILITIES
// ============================================

/**
 * Calculate offset for positioning content within a container.
 * Works for both horizontal (left/center/right) and vertical (top/middle/bottom) alignment.
 * @param total - Container size
 * @param content - Content size
 * @param align - Alignment value (HALIGN or VALIGN)
 * @returns Offset from container start
 */
export function alignOffset(total: number, content: number, align?: string): number {
  if (align === HALIGN.LEFT || align === VALIGN.TOP) return 0;
  if (align === HALIGN.RIGHT || align === VALIGN.BOTTOM) return total - content;
  return (total - content) / 2;  // CENTER/MIDDLE or undefined
}

// Convert Align (START/CENTER/END) to spatial alignment types
const alignToHAlign: Record<Align, HorizontalAlignment> = {
  [ALIGN.START]: HALIGN.LEFT,
  [ALIGN.CENTER]: HALIGN.CENTER,
  [ALIGN.END]: HALIGN.RIGHT,
};

const alignToVAlign: Record<Align, VerticalAlignment> = {
  [ALIGN.START]: VALIGN.TOP,
  [ALIGN.CENTER]: VALIGN.MIDDLE,
  [ALIGN.END]: VALIGN.BOTTOM,
};

/** Shared prepare logic for GridColumn and GridRow. */
function prepareLayout(
  children: Component[], slots: Bounds[], direction: typeof DIRECTION[keyof typeof DIRECTION], align: Align,
): Drawer {
  // Translate direction + cross-axis align into explicit hAlign/vAlign
  const alignContext: AlignContext = direction === DIRECTION.ROW
    ? { vAlign: alignToVAlign[align], parentDirection: direction }
    : { hAlign: alignToHAlign[align], parentDirection: direction };
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
// GROUP — semantic grouping with breathing room
// ============================================

class Group implements Component {
  constructor(
    private inner: Component,
    private padding: number,
    private unit: number,
  ) {}

  getHeight(w: number) {
    return this.inner.getHeight(w - this.padding * 2) + this.padding * 2;
  }
  getMinHeight(w: number) {
    return this.inner.getMinHeight(w - this.padding * 2);
  }
  getWidth(h: number) { return this.inner.getWidth(h); }

  prepare(bounds: Bounds, ac?: AlignContext): Drawer {
    const innerW = bounds.w - this.padding * 2;
    const childMin = this.inner.getMinHeight(innerW);
    const excess = bounds.h - childMin;
    const rawVPad = Math.max(0, Math.min(this.padding, excess / 2));
    const vPad = Math.floor(rawVPad / this.unit) * this.unit;
    const ratio = this.padding > 0 ? vPad / this.padding : 0;
    const hPad = this.padding * ratio;
    log('Group: bounds=%fx%f padding=%f childMin=%f excess=%f vPad=%f hPad=%f',
      bounds.w, bounds.h, this.padding, childMin, excess, vPad, hPad);
    const inner = new Bounds(
      bounds.x + hPad,
      bounds.y + vPad,
      bounds.w - hPad * 2,
      bounds.h - vPad * 2,
    );
    return this.inner.prepare(inner, ac);
  }
}

/**
 * group() — Semantic grouping with optional padding and grid layout.
 *
 * Single component mode (gap interpreted as padding):
 *   group(theme, component)                      — wrap component (no padding)
 *   group(theme, { gap: GAP.NORMAL }, component) — wrap with gap as padding
 *
 * Multi-component mode (auto-row):
 *   group(theme, c1, c2, c3)                     — auto-row children
 *   group(theme, { gap: GAP.SMALL }, c1, c2)    — with options
 *
 * Grid mode:
 *   group(theme, 3, c1, c2, c3, c4, c5, c6)     — 3 columns, auto-rows
 *   group(theme, 2, { gap: GAP.SMALL }, c1..c4) — 2 columns with options
 */
export function group(theme: Theme, columns: number, options: LayoutOptions, ...children: Component[]): Component;
export function group(theme: Theme, columns: number, ...children: Component[]): Component;
export function group(theme: Theme, options: LayoutOptions, ...children: Component[]): Component;
export function group(theme: Theme, ...children: Component[]): Component;
export function group(theme: Theme, ...args: any[]): Component {
  const { unit } = theme.spacing;

  // Parse arguments manually (group has unique shape: columns | options | children)
  let columns: number | undefined;
  let options: LayoutOptions = {};
  let children: Component[];

  if (typeof args[0] === 'number') {
    // Grid mode: first arg is column count
    columns = args[0];
    if (args[1] && typeof args[1] === 'object' && !('prepare' in args[1])) {
      options = args[1] as LayoutOptions;
      children = args.slice(2) as Component[];
    } else {
      children = args.slice(1) as Component[];
    }
  } else if (args[0] && typeof args[0] === 'object' && !('prepare' in args[0])) {
    // Options first: group({ gap: ... }, c1, c2)
    options = args[0] as LayoutOptions;
    children = args.slice(1) as Component[];
  } else {
    // All children: group(c1, c2, c3)
    children = args as Component[];
  }

  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.CENTER;

  // Grid mode: chunk into rows
  if (columns !== undefined) {
    const rows: Component[][] = [];
    for (let i = 0; i < children.length; i += columns) {
      rows.push(children.slice(i, i + columns));
    }
    const rowComponents = rows.map(rowItems =>
      new GridRow(rowItems, undefined, gap, align)
    );
    const grid = rows.length === 1
      ? rowComponents[0]
      : new GridColumn(rowComponents, undefined, gap, align);

    log('group grid: columns=%d items=%d rows=%d gap=%f',
      columns, children.length, rows.length, gap);
    return grid;
  }

  // Single component mode: gap interpreted as padding (default: 0)
  if (children.length === 1) {
    const padding = options.gap !== undefined ? gap : 0;
    log('group single: padding=%f', padding);
    return new Group(children[0], padding, unit);
  }

  // Multi-component mode: auto-row
  log('group auto-row: %d items gap=%f', children.length, gap);
  return new GridRow(children, undefined, gap, align);
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
    private unit?: number,
  ) {}

  private measure(width: number, min: boolean): number {
    if (this.explicitHeight !== undefined) return this.explicitHeight;
    const heights = this.children.map(c => min ? c.getMinHeight(width) : c.getHeight(width));
    const totalGap = this.gap * Math.max(0, this.children.length - 1);
    return heights.reduce((sum, h) => sum + h, 0) + totalGap;
  }

  getHeight(width: number): number { return this.measure(width, false); }
  getMinHeight(width: number): number { return this.measure(width, true); }

  getWidth(height: number): number {
    // Column stacks vertically — width is max of children's widths
    return Math.max(...this.children.map(c => c.getWidth(height)));
  }

  getSlots(bounds: Bounds): Bounds[] {
    const h = this.explicitHeight !== undefined ? Math.min(bounds.h, this.explicitHeight) : bounds.h;

    if (this.proportions) {
      const contentHeights = this.children.map((c, i) => {
        if (this.proportions![i] !== 0) return 0;
        const raw = c.getHeight(bounds.w);
        return this.unit ? snapUp(raw, this.unit) : raw;
      });
      const finalHeights = resolveProportions(this.proportions, contentHeights, h, this.gap);
      return stackV(bounds, finalHeights, this.gap, { justify: this.justify }, this.unit);
    }

    // Content-sized: measure, snap up, fit compressible children, snap down (floored at min), stack
    const raw = this.children.map(c => c.getHeight(bounds.w));
    const heights = this.unit ? raw.map(v => snapUp(v, this.unit!)) : raw;
    const minHeights = this.children.map(c => c.getMinHeight(bounds.w));
    const fitted = fitHeights(heights, h, this.gap, minHeights);
    // Snap down to grid, but never below minHeight (to avoid content overflow)
    const snapped = this.unit
      ? fitted.map((v, i) => Math.max(snapDown(v, this.unit!), minHeights[i]))
      : fitted;
    return stackV(bounds, snapped, this.gap, { justify: this.justify }, this.unit);
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
    private unit?: number,
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

  getWidth(height: number): number {
    // Row stacks horizontally — width is sum of children's widths + gaps
    const totalGap = this.gap * Math.max(0, this.children.length - 1);
    return this.children.reduce((sum, c) => sum + c.getWidth(height), 0) + totalGap;
  }

  getSlots(bounds: Bounds): Bounds[] {
    if (this.proportions) {
      const hasContentSized = this.proportions.some(p => p === 0);

      if (hasContentSized) {
        const contentWidths = this.children.map((c, i) => {
          if (this.proportions![i] === 0) return c.getWidth(bounds.h);
          return 0;
        });
        const finalWidths = resolveProportions(this.proportions, contentWidths, bounds.w, this.gap);
        return stackH(bounds, finalWidths, this.gap, { justify: this.justify }, this.unit);
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

  return new GridRow(children, proportions, gap, align, options.height, options.justify as StackJustify, theme.spacing.unit);
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

  return new GridColumn(children, proportions, gap, align, options.height, options.justify as StackJustify, theme.spacing.unit);
}

