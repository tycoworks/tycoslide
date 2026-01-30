// Layout — Row and Column containers
// Layout containers arrange children spatially. They need theme for gap resolution
// but import zero component classes — that boundary is enforced by this module split.

import {
  DIRECTION,
  GAP,
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
import { box, Box } from './box.js';

// ============================================
// LAYOUT OPTIONS
// ============================================

export interface LayoutOptions {
  gap?: GapSize;   // default: GAP.NORMAL
  align?: Align;
  justify?: Justify;
  flex?: number;   // flex-grow for the layout container itself
}

function resolveGap(gap: GapSize | undefined, theme: Theme): number {
  if (gap === undefined || gap === GAP.NORMAL) return theme.spacing.gap;
  if (gap === GAP.SMALL) return theme.spacing.gapSmall;
  return 0;  // GAP.NONE
}

// ============================================
// ROW — Horizontal arrangement
// ============================================

export class RowLayout implements Component {
  private _box?: Box;

  constructor(
    private children: Component[],
    private proportions: number[],
    private gap: number,
    private align: Align,
    private justify: Justify | undefined,
    private flex: number | undefined,
  ) {}

  private getBox(): Box {
    if (!this._box) {
      this._box = box({
        direction: DIRECTION.ROW,
        flex: this.flex,
        gap: this.gap,
        align: this.align,
        justify: this.justify,
        children: this.children.map((child, i) => {
          if (child instanceof Box) return child;
          return box({ flex: this.proportions[i], content: child });
        }),
      });
    }
    return this._box;
  }

  getMinimumHeight(width: number): number {
    return this.getBox().getMinimumHeight(width);
  }

  getMaximumHeight(width: number): number {
    return this.getBox().getMaximumHeight(width);
  }

  getMinimumWidth(height: number): number {
    return this.getBox().getMinimumWidth?.(height) ?? 0;
  }

  prepare(bounds: Bounds): Drawer {
    return this.getBox().prepare(bounds);
  }
}

// ============================================
// COLUMN — Vertical arrangement
// ============================================

export class ColumnLayout implements Component {
  private _box?: Box;

  constructor(
    private children: Component[],
    private proportions: number[] | undefined,
    private gap: number,
    private align: Align,
    private justify: Justify | undefined,
    private flex: number | undefined,
  ) {}

  private getBox(): Box {
    if (!this._box) {
      this._box = box({
        direction: DIRECTION.COLUMN,
        flex: this.flex,
        gap: this.gap,
        align: this.align,
        justify: this.justify,
        children: this.children.map((child, i) => {
          if (child instanceof Box) return child;
          if (this.proportions) {
            return box({ flex: this.proportions[i], content: child });
          }
          return box({ content: child });
        }),
      });
    }
    return this._box;
  }

  getMinimumHeight(width: number): number {
    return this.getBox().getMinimumHeight(width);
  }

  getMaximumHeight(width: number): number {
    return this.getBox().getMaximumHeight(width);
  }

  getMinimumWidth(height: number): number {
    return this.getBox().getMinimumWidth?.(height) ?? 0;
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    return this.getBox().prepare(bounds, alignContext);
  }
}

// ============================================
// ROW/COLUMN FACTORIES
// ============================================

/**
 * row() — Arrange children horizontally.
 *
 * Equal widths:
 *   row(theme, card1, card2, card3)
 *
 * Equal widths with options:
 *   row(theme, { gap: 'small' }, card1, card2, card3)
 *
 * Proportional widths:
 *   row(theme, [1, 2], [image, column])
 */
export function row(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): RowLayout;
export function row(theme: Theme, options: LayoutOptions, ...children: Component[]): RowLayout;
export function row(theme: Theme, ...children: Component[]): RowLayout;
export function row(theme: Theme, ...args: any[]): RowLayout {
  let children: Component[];
  let proportions: number[];
  let options: LayoutOptions = {};

  if (Array.isArray(args[0])) {
    // Proportional: row(theme, [1, 2], [child1, child2], options?)
    proportions = args[0] as number[];
    children = args[1] as Component[];
    if (args[2]) options = args[2] as LayoutOptions;
  } else if (args[0] && !('prepare' in args[0])) {
    // Options-first: row(theme, { gap: 'small' }, child1, child2)
    options = args[0] as LayoutOptions;
    children = args.slice(1) as Component[];
    proportions = children.map(() => 1);
  } else {
    // Children only: row(theme, child1, child2)
    children = args as Component[];
    proportions = children.map(() => 1);
  }

  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.STRETCH;
  const justify = options.justify;
  const flex = options.flex;

  return new RowLayout(children, proportions, gap, align, justify, flex);
}

/**
 * column() — Arrange children vertically.
 * Children are content-sized by default. Use expand() to fill available space.
 *
 *   column(theme, title, subtitle, cardRow)
 *   column(theme, { gap: 'small' }, title, expand(cardRow))
 *
 * Proportional heights:
 *   column(theme, [1, 2], [header, content])
 */
export function column(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): ColumnLayout;
export function column(theme: Theme, options: LayoutOptions, ...children: Component[]): ColumnLayout;
export function column(theme: Theme, ...children: Component[]): ColumnLayout;
export function column(theme: Theme, ...args: any[]): ColumnLayout {
  let children: Component[];
  let proportions: number[] | undefined;
  let options: LayoutOptions = {};

  if (Array.isArray(args[0])) {
    // Proportional: column(theme, [1, 2], [child1, child2], options?)
    proportions = args[0] as number[];
    children = args[1] as Component[];
    if (args[2]) options = args[2] as LayoutOptions;
  } else if (args[0] && !('prepare' in args[0])) {
    // Options-first: column(theme, { justify: JUSTIFY.CENTER }, child1, child2)
    options = args[0] as LayoutOptions;
    children = args.slice(1) as Component[];
  } else {
    // Children only: column(theme, child1, child2)
    children = args as Component[];
  }

  const gap = resolveGap(options.gap, theme);
  const align = options.align ?? ALIGN.STRETCH;
  const justify = options.justify;
  const flex = options.flex;

  return new ColumnLayout(children, proportions, gap, align, justify, flex);
}

