// DSL — Factory functions for creating themed components
// This is the primary authoring API. Component classes live in components/;
// layout containers live in layout.ts; box primitives live in box.ts.

import {
  TEXT_STYLE,
  type Theme,
  type Component,
  type TextContent,
} from './types.js';
import { expand, Box } from './box.js';
import { Text, type TextProps } from '../components/text.js';
import { Image } from '../components/image.js';
import { List, LIST_TYPE, type ListProps } from '../components/list.js';
import { Table, type TableData, type TableProps } from '../components/table.js';
import { Divider, type DividerProps } from '../components/divider.js';
import { Card, type CardProps } from '../components/card.js';
import { row, column, RowLayout, ColumnLayout, type LayoutOptions } from './layout.js';

// Re-export box primitives and layout containers
export { box, expand } from './box.js';
export { row, column, RowLayout, ColumnLayout, type LayoutOptions } from './layout.js';

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
  expand(component: Component): Box;
  row(proportions: number[], children: Component[], options?: LayoutOptions): RowLayout;
  row(options: LayoutOptions, ...children: Component[]): RowLayout;
  row(...children: Component[]): RowLayout;
  column(options: LayoutOptions, ...children: Component[]): ColumnLayout;
  column(...children: Component[]): ColumnLayout;
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
    expand: (component) => expand(component),
    row: ((...args: any[]) => row(theme, ...args)) as DSL['row'],
    column: ((...args: any[]) => column(theme, ...args)) as DSL['column'],
  };
}
