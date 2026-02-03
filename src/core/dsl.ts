// DSL — Factory functions for creating themed components
// This is the primary authoring API. Component classes live in components/;
// layout containers live in layout.ts.

import {
  TEXT_STYLE,
  type Theme,
  type Component,
  type TextContent,
} from './types.js';
import { Text, type TextProps } from '../components/text.js';
import { Image } from '../components/image.js';
import { List, LIST_TYPE, type ListProps } from '../components/list.js';
import { Table, type TableData, type TableProps } from '../components/table.js';
import { Divider, type DividerProps } from '../components/divider.js';
import { Card, type CardProps } from '../components/card.js';
import { SlideNumber, type SlideNumberProps } from '../components/slide-number.js';
import { row, column, group, type LayoutOptions } from './layout.js';

// Re-export layout factories
export { row, column, group, type LayoutOptions } from './layout.js';

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

export function card(theme: Theme, title: string, description: string): Card;
export function card(theme: Theme, props?: CardProps): Card;
export function card(theme: Theme, titleOrProps?: string | CardProps, description?: string): Card {
  if (typeof titleOrProps === 'string') {
    return new Card(theme, { title: titleOrProps, description: description! });
  }
  return new Card(theme, titleOrProps ?? {});
}

// ============================================
// SLIDE NUMBER FACTORY
// ============================================

export function slideNumber(theme: Theme, props: SlideNumberProps = {}): SlideNumber {
  return new SlideNumber(theme, props);
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
  slideNumber(props?: SlideNumberProps): SlideNumber;
  card(title: string, description: string): Card;
  card(props?: CardProps): Card;
  group(columns: number, options: LayoutOptions, ...children: Component[]): Component;
  group(columns: number, ...children: Component[]): Component;
  group(options: LayoutOptions, ...children: Component[]): Component;
  group(...children: Component[]): Component;
  row(proportions: number[], children: Component[], options?: LayoutOptions): Component;
  row(options: LayoutOptions, ...children: Component[]): Component;
  row(...children: Component[]): Component;
  column(proportions: number[], children: Component[], options?: LayoutOptions): Component;
  column(options: LayoutOptions, ...children: Component[]): Component;
  column(...children: Component[]): Component;
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
    slideNumber: (props?) => slideNumber(theme, props),
    card: ((...args: any[]) => (card as Function)(theme, ...args)) as DSL['card'],
    group: ((first: Component | number, ...rest: any[]) => (group as Function)(theme, first, ...rest)) as DSL['group'],
    row: ((...args: any[]) => row(theme, ...args)) as DSL['row'],
    column: ((...args: any[]) => column(theme, ...args)) as DSL['column'],
  };
}
