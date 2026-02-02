// Layout — Row and Column factories
// These factories arrange children spatially using Box. They need theme for gap
// resolution but import zero component classes — that boundary is enforced here.

import {
  DIRECTION,
  GAP,
  ALIGN,
  type Theme,
  type Component,
  type GapSize,
  type Justify,
  type Align,
} from './types.js';
import { box, Box } from './box.js';

// ============================================
// LAYOUT OPTIONS
// ============================================

export interface LayoutOptions {
  gap?: GapSize;   // default: GAP.NORMAL
  align?: Align;
  justify?: Justify;
  height?: number;     // explicit height in inches
  maxHeight?: number;  // cap on height in inches
}

function resolveGap(gap: GapSize | undefined, theme: Theme): number {
  if (gap === undefined || gap === GAP.NORMAL) return theme.spacing.gap;
  if (gap === GAP.SMALL) return theme.spacing.gapSmall;
  return 0;  // GAP.NONE
}

// ============================================
// SHARED LAYOUT IMPLEMENTATION
// ============================================

type Direction = typeof DIRECTION.ROW | typeof DIRECTION.COLUMN;

function layout(direction: Direction, equalFlex: boolean, theme: Theme, args: any[]): Box {
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

  // Row defaults to equal flex; column defaults to content-sized.
  // If any child already has flex (via expand()), skip equal-flex —
  // only flex children grow, the rest stay content-sized.
  if (!proportions && equalFlex) {
    const hasExpandedChild = children.some(c => c instanceof Box && c.flex !== undefined);
    if (!hasExpandedChild) {
      proportions = children.map(() => 1);
    }
  }

  return box({
    direction,
    gap: resolveGap(options.gap, theme),
    align: options.align ?? ALIGN.CENTER,
    justify: options.justify,
    height: options.height,
    maxHeight: options.maxHeight,
    children: children.map((child, i) => {
      if (child instanceof Box && child.flex !== undefined) return child;
      if (proportions) return box({ flex: proportions[i], content: child });
      return box({ content: child });
    }),
  });
}

// ============================================
// ROW/COLUMN FACTORIES
// ============================================

/**
 * row() — Arrange children horizontally. Returns a Box.
 * Children get equal widths by default.
 *
 *   row(theme, card1, card2, card3)
 *   row(theme, { gap: 'small' }, card1, card2, card3)
 *   row(theme, [1, 2], [image, column])
 */
export function row(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): Box;
export function row(theme: Theme, options: LayoutOptions, ...children: Component[]): Box;
export function row(theme: Theme, ...children: Component[]): Box;
export function row(theme: Theme, ...args: any[]): Box {
  return layout(DIRECTION.ROW, true, theme, args);
}

/**
 * column() — Arrange children vertically. Returns a Box.
 * Children are content-sized by default. Use expand() to fill available space.
 *
 *   column(theme, title, subtitle, cardRow)
 *   column(theme, { gap: 'small' }, title, expand(cardRow))
 *   column(theme, [1, 2], [header, content])
 */
export function column(theme: Theme, proportions: number[], children: Component[], options?: LayoutOptions): Box;
export function column(theme: Theme, options: LayoutOptions, ...children: Component[]): Box;
export function column(theme: Theme, ...children: Component[]): Box;
export function column(theme: Theme, ...args: any[]): Box {
  return layout(DIRECTION.COLUMN, false, theme, args);
}
