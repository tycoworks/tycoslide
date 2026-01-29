// DSL — Factory functions for creating themed components
// This is the primary authoring API. Classes live in components/; factories live here.

import {
  DIRECTION,
  JUSTIFY,
  ALIGN,
  TEXT_STYLE,
  type Theme,
  type Component,
  type Drawer,
  type Bounds,
  type Justify,
  type Align,
  type AlignContext,
  type TextContent,
} from './types.js';
import { box, Box } from './box.js';
import { Text, type TextProps } from '../components/text.js';
import { Image } from '../components/image.js';
import { List, LIST_TYPE, type ListProps } from '../components/list.js';
import { Table, type TableData, type TableProps } from '../components/table.js';
import { Divider, type DividerProps } from '../components/divider.js';
import { Card, type CardProps } from '../components/card.js';

// Re-export box from core
export { box } from './box.js';

// ============================================
// TEXT FACTORIES
// ============================================

export function text(theme: Theme, content: TextContent, props?: TextProps): Text {
  return new Text(theme, content, props);
}

export const h1 = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.H1 });
export const h2 = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.H2 });
export const h3 = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.H3 });
export const h4 = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.H4 });
export const body = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.BODY });
export const small = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.SMALL });
export const eyebrow = (theme: Theme, content: string) => text(theme, content, { style: TEXT_STYLE.EYEBROW });

// ============================================
// IMAGE FACTORY
// ============================================

export function image(theme: Theme, path: string): Image {
  return new Image(theme, path);
}

// ============================================
// LIST FACTORIES
// ============================================

export function list(theme: Theme, items: TextContent[], props?: ListProps): List {
  return new List(theme, items, props);
}

export function bulletList(theme: Theme, items: TextContent[], props?: ListProps): List {
  return new List(theme, items, { ...props, type: LIST_TYPE.BULLET });
}

export function numberedList(theme: Theme, items: TextContent[], props?: ListProps): List {
  return new List(theme, items, { ...props, type: LIST_TYPE.NUMBER });
}

// ============================================
// TABLE FACTORY
// ============================================

export function table(theme: Theme, data: TableData, props: TableProps = {}): Table {
  return new Table(theme, data, props);
}

// ============================================
// DIVIDER FACTORY
// ============================================

export function divider(theme: Theme, props: DividerProps = {}): Divider {
  return new Divider(theme, props);
}

// ============================================
// CARD FACTORY
// ============================================

export function card(theme: Theme, props: CardProps = {}): Card {
  return new Card(theme, props);
}

// ============================================
// LAYOUT OPTIONS
// ============================================

export interface LayoutOptions {
  gap?: 'normal' | 'small' | 'none' | number;  // default: 'normal'
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'space-between' | 'space-evenly';
}

function resolveGap(gap: LayoutOptions['gap'], theme: Theme): number {
  if (gap === undefined || gap === 'normal') return theme.spacing.gap;
  if (gap === 'small') return theme.spacing.gapSmall;
  if (gap === 'none') return 0;
  return gap;  // raw number = inches
}

function resolveAlign(align: LayoutOptions['align']): Align {
  if (align === 'start') return ALIGN.START;
  if (align === 'center') return ALIGN.CENTER;
  if (align === 'end') return ALIGN.END;
  return ALIGN.STRETCH;  // default
}

function resolveJustify(justify: LayoutOptions['justify']): Justify | undefined {
  if (justify === 'center') return JUSTIFY.CENTER;
  if (justify === 'space-between') return JUSTIFY.SPACE_BETWEEN;
  if (justify === 'space-evenly') return JUSTIFY.SPACE_EVENLY;
  return undefined;  // default (start)
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
  ) {}

  private getBox(): Box {
    if (!this._box) {
      this._box = box({
        flex: 1,  // rows fill available space by default
        direction: DIRECTION.ROW,
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

  getMaximumHeight(_width: number): number {
    return Infinity;  // rows always expand to fill available space
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
    private gap: number,
    private align: Align,
    private justify: Justify | undefined,
  ) {}

  private getBox(): Box {
    if (!this._box) {
      this._box = box({
        direction: DIRECTION.COLUMN,
        gap: this.gap,
        align: this.align,
        justify: this.justify,
        children: this.children.map(child => {
          if (child instanceof Box) return child;
          // Auto-expand: children with infinite maxHeight get flex: 1
          const expandable = child.getMaximumHeight?.(Infinity) === Infinity;
          return box({
            flex: expandable ? 1 : undefined,
            content: child,
          });
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
 * Proportional widths:
 *   row(theme, [1, 2], [image, column])
 *
 * With options:
 *   row(theme, card1, card2, { gap: 'small' })
 */
export function row(theme: Theme, ...args: unknown[]): RowLayout {
  let children: Component[];
  let proportions: number[];
  let options: LayoutOptions = {};

  if (Array.isArray(args[0]) && typeof args[0][0] === 'number') {
    proportions = args[0] as number[];
    children = args[1] as Component[];
    if (args[2]) options = args[2] as LayoutOptions;
  } else {
    const last = args[args.length - 1];
    if (last && typeof last === 'object' && !isComponent(last)) {
      options = last as LayoutOptions;
      children = args.slice(0, -1) as Component[];
    } else {
      children = args as Component[];
    }
    proportions = children.map(() => 1);
  }

  const gap = resolveGap(options.gap, theme);
  const align = resolveAlign(options.align);
  const justify = resolveJustify(options.justify);

  return new RowLayout(children, proportions, gap, align, justify);
}

/**
 * column() — Arrange children vertically.
 * Expandable children (maxHeight = Infinity) auto-expand to fill space.
 *
 *   column(theme, title, subtitle, cardRow)
 *   column(theme, title, cardRow, { justify: 'center', gap: 'small' })
 */
export function column(theme: Theme, ...args: unknown[]): ColumnLayout {
  let children: Component[];
  let options: LayoutOptions = {};

  const last = args[args.length - 1];
  if (last && typeof last === 'object' && !isComponent(last)) {
    options = last as LayoutOptions;
    children = args.slice(0, -1) as Component[];
  } else {
    children = args as Component[];
  }

  const gap = resolveGap(options.gap, theme);
  const align = resolveAlign(options.align);
  const justify = resolveJustify(options.justify);

  return new ColumnLayout(children, gap, align, justify);
}

/**
 * Check if a value is a Component (has a prepare method)
 */
function isComponent(value: unknown): value is Component {
  return typeof value === 'object' && value !== null && 'prepare' in value;
}

// ============================================
// DSL FACTORY
// ============================================

/**
 * A theme-bound DSL instance. All factory functions have the theme pre-applied.
 */
export interface DSL {
  text(content: TextContent, props?: TextProps): Text;
  h1(content: string): Text;
  h2(content: string): Text;
  h3(content: string): Text;
  h4(content: string): Text;
  body(content: string): Text;
  small(content: string): Text;
  eyebrow(content: string): Text;
  image(path: string): Image;
  list(items: TextContent[], props?: ListProps): List;
  bulletList(items: TextContent[], props?: ListProps): List;
  numberedList(items: TextContent[], props?: ListProps): List;
  table(data: TableData, props?: TableProps): Table;
  divider(props?: DividerProps): Divider;
  card(props?: CardProps): Card;
  row(...args: unknown[]): RowLayout;
  column(...args: unknown[]): ColumnLayout;
}

/**
 * Create a theme-bound DSL instance.
 * Returns an object with all factory functions pre-applied with the given theme.
 *
 *   const { text, h1, row, column, card } = createDSL(theme);
 *   pres.add(contentSlide('Title', 'EYEBROW', row(card({...}), card({...}))));
 */
export function createDSL(theme: Theme): DSL {
  return {
    text: (content, props?) => text(theme, content, props),
    h1: (content) => h1(theme, content),
    h2: (content) => h2(theme, content),
    h3: (content) => h3(theme, content),
    h4: (content) => h4(theme, content),
    body: (content) => body(theme, content),
    small: (content) => small(theme, content),
    eyebrow: (content) => eyebrow(theme, content),
    image: (path) => image(theme, path),
    list: (items, props?) => list(theme, items, props),
    bulletList: (items, props?) => bulletList(theme, items, props),
    numberedList: (items, props?) => numberedList(theme, items, props),
    table: (data, props?) => table(theme, data, props),
    divider: (props?) => divider(theme, props),
    card: (props?) => card(theme, props),
    row: (...args) => row(theme, ...args),
    column: (...args) => column(theme, ...args),
  };
}
