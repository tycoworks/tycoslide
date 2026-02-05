// DSL — Factory functions for creating themed components
// This is the primary authoring API. Component classes live in components/;
// layout containers live in layout.ts.

import {
  TEXT_STYLE,
  type Theme,
  type Component,
  type TextContent,
} from './types.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import { fontkitMeasurer } from '../utils/fontkit-measurer.js';
import { Text, type TextProps } from '../components/text.js';
import { Image } from '../components/image.js';
import { List, LIST_TYPE, type ListProps } from '../components/list.js';
import { Table, type TableData, type TableProps } from '../components/table.js';
import { Line, type LineProps } from '../components/line.js';
import { Card, type CardProps } from '../components/card.js';
import { SlideNumber, type SlideNumberProps } from '../components/slide-number.js';
import { Diagram, diagram as diagramFactory, DIAGRAM_DIRECTION, type DiagramDirection, type DiagramProps } from '../components/diagram.js';
import { row, column, group, type LayoutOptions } from './layout.js';

// Re-export layout factories
export { row, column, group, type LayoutOptions } from './layout.js';

// ============================================
// TEXT FACTORIES
// ============================================

export function text(theme: Theme, measurer: TextMeasurer, content: TextContent, props?: TextProps): Text {
  return new Text(theme, measurer, content, props);
}

export const h1 = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.H1 });
export const h2 = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.H2 });
export const h3 = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.H3 });
export const h4 = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.H4 });
export const body = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.BODY });
export const small = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.SMALL });
export const eyebrow = (theme: Theme, measurer: TextMeasurer, content: string) => text(theme, measurer, content, { style: TEXT_STYLE.EYEBROW });

// ============================================
// IMAGE FACTORY
// ============================================

export function image(theme: Theme, path: string): Image {
  return new Image(theme, path);
}

// ============================================
// LIST FACTORIES
// ============================================

export function list(theme: Theme, measurer: TextMeasurer, items: TextContent[], props?: ListProps): List {
  return new List(theme, measurer, items, props);
}

export function bulletList(theme: Theme, measurer: TextMeasurer, items: TextContent[], props?: ListProps): List {
  return new List(theme, measurer, items, { ...props, type: LIST_TYPE.BULLET });
}

export function numberedList(theme: Theme, measurer: TextMeasurer, items: TextContent[], props?: ListProps): List {
  return new List(theme, measurer, items, { ...props, type: LIST_TYPE.NUMBER });
}

// ============================================
// TABLE FACTORY
// ============================================

export function table(theme: Theme, measurer: TextMeasurer, data: TableData, props: TableProps = {}): Table {
  return new Table(theme, measurer, data, props);
}

// ============================================
// LINE FACTORY
// ============================================

export function line(theme: Theme, props: LineProps = {}): Line {
  return new Line(theme, props);
}

// ============================================
// CARD FACTORY
// ============================================

export function card(theme: Theme, measurer: TextMeasurer, title: string, description: string): Card;
export function card(theme: Theme, measurer: TextMeasurer, props?: CardProps): Card;
export function card(theme: Theme, measurer: TextMeasurer, titleOrProps?: string | CardProps, description?: string): Card {
  if (typeof titleOrProps === 'string') {
    return new Card(theme, measurer, { title: titleOrProps, description: description! });
  }
  return new Card(theme, measurer, titleOrProps ?? {});
}

// ============================================
// SLIDE NUMBER FACTORY
// ============================================

export function slideNumber(theme: Theme, measurer: TextMeasurer, props: SlideNumberProps = {}): SlideNumber {
  return new SlideNumber(theme, measurer, props);
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
  line(props?: LineProps): Line;
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
  diagram(direction?: DiagramDirection, props?: DiagramProps): Diagram;
}

/**
 * Create a theme-bound DSL instance.
 * Returns an object with all factory functions pre-applied with the given theme.
 *
 *   const { text, h1, row, column, card } = createDSL(theme);
 *   pres.add(contentSlide('Title', 'EYEBROW', row(card({...}), card({...}))));
 */
export function createDSL(theme: Theme, measurer: TextMeasurer = fontkitMeasurer): DSL {
  return {
    text: (content, props?) => text(theme, measurer, content, props),
    h1: (content) => h1(theme, measurer, content),
    h2: (content) => h2(theme, measurer, content),
    h3: (content) => h3(theme, measurer, content),
    h4: (content) => h4(theme, measurer, content),
    body: (content) => body(theme, measurer, content),
    small: (content) => small(theme, measurer, content),
    eyebrow: (content) => eyebrow(theme, measurer, content),
    image: (path) => image(theme, path),
    list: (items, props?) => list(theme, measurer, items, props),
    bulletList: (items, props?) => bulletList(theme, measurer, items, props),
    numberedList: (items, props?) => numberedList(theme, measurer, items, props),
    table: (data, props?) => table(theme, measurer, data, props),
    line: (props?) => line(theme, props),
    slideNumber: (props?) => slideNumber(theme, measurer, props),
    card: ((...args: any[]) => (card as Function)(theme, measurer, ...args)) as DSL['card'],
    group: ((first: Component | number, ...rest: any[]) => (group as Function)(theme, first, ...rest)) as DSL['group'],
    row: ((...args: any[]) => row(theme, ...args)) as DSL['row'],
    column: ((...args: any[]) => column(theme, ...args)) as DSL['column'],
    diagram: (direction?, props?) => diagramFactory(theme, direction ?? DIAGRAM_DIRECTION.LEFT_TO_RIGHT, props),
  };
}
