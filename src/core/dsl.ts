// Declarative DSL
// Simple factory functions that return pure data nodes

import {
  NODE_TYPE,
  type TextNode,
  type ImageNode,
  type LineNode,
  type SlideNumberNode,
  type RowNode,
  type ColumnNode,
  type StackNode,
  type RectangleNode,
  type RectangleBorder,
  type ElementNode,
  type SlideContent,
  type ComponentNode,
} from './nodes.js';
import type {
  TextContent,
  TextStyleName,
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  ArrowType,
  DashType,
  SizeValue,
} from './types.js';
import { TEXT_STYLE } from './types.js';

// ============================================
// TEXT
// ============================================

export interface TextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export function text(content: TextContent, props?: TextProps): TextNode {
  return {
    type: NODE_TYPE.TEXT,
    content,
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign,
    vAlign: props?.vAlign,
  };
}

// Convenience functions for common text styles
export function h1(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.H1 });
}

export function h2(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.H2 });
}

export function h3(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.H3 });
}

export function h4(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.H4 });
}

export function body(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.BODY });
}

export function small(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.SMALL });
}

export function eyebrow(content: TextContent, props?: Omit<TextProps, 'style'>): TextNode {
  return text(content, { ...props, style: TEXT_STYLE.EYEBROW });
}

// ============================================
// IMAGE
// ============================================

export interface ImageProps {
  alt?: string;
}

export function image(src: string, props?: ImageProps): ImageNode {
  return {
    type: NODE_TYPE.IMAGE,
    src,
    alt: props?.alt,
  };
}

// ============================================
// LINE
// ============================================

export interface LineProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

export function line(props?: LineProps): LineNode {
  return {
    type: NODE_TYPE.LINE,
    color: props?.color,
    width: props?.width,
    dashType: props?.dashType,
    beginArrow: props?.beginArrow,
    endArrow: props?.endArrow,
  };
}

// ============================================
// SLIDE NUMBER
// ============================================

export function slideNumber(props?: { style?: TextStyleName; color?: string; hAlign?: HorizontalAlignment }): SlideNumberNode {
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign,
  };
}

// ============================================
// CONTAINERS
// ============================================

export interface RowProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL (when inside another Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL to fill container height
  gap?: GapSize;
  vAlign?: VerticalAlignment;
}

export function row(props: RowProps, ...children: SlideContent[]): RowNode;
export function row(...children: SlideContent[]): RowNode;
export function row(...args: any[]): RowNode {
  let props: RowProps = {};
  let children: SlideContent[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.ROW,
    children: children as ElementNode[],  // Safe: expanded before layout
    width: props.width,
    height: props.height,
    gap: props.gap,
    vAlign: props.vAlign,
  };
}

export interface ColumnProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL (when inside Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL (when inside Column)
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number;             // inches - internal padding on all sides
}

export function column(props: ColumnProps, ...children: SlideContent[]): ColumnNode;
export function column(...children: SlideContent[]): ColumnNode;
export function column(...args: any[]): ColumnNode {
  let props: ColumnProps = {};
  let children: SlideContent[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.COLUMN,
    children: children as ElementNode[],  // Safe: expanded before layout
    width: props.width,
    height: props.height,
    gap: props.gap,
    vAlign: props.vAlign,
    hAlign: props.hAlign,
    padding: props.padding,
  };
}

// ============================================
// STACK (z-order composition)
// ============================================

/**
 * Stack is a z-order container: all children occupy the same bounds.
 * Children are rendered in array order: [0] first (back), [n-1] last (front).
 *
 * Use Stack to overlay elements, e.g. grid lines behind content:
 * ```
 * stack(
 *   gridLines,   // rendered first (behind)
 *   content      // rendered last (in front)
 * )
 * ```
 */
export function stack(...children: SlideContent[]): StackNode {
  return {
    type: NODE_TYPE.STACK,
    children: children as ElementNode[],  // Safe: expanded before layout
  };
}

// ============================================
// RECTANGLE (visual primitive - pure shape, no children)
// ============================================

export interface RectangleProps {
  fill?: { color: string; opacity?: number };
  border?: RectangleBorder;
  cornerRadius?: number;
}

/** Rectangle is a pure visual shape - use stack() to layer content on top */
export function rectangle(props?: RectangleProps): RectangleNode {
  return {
    type: NODE_TYPE.RECTANGLE,
    fill: props?.fill,
    border: props?.border,
    cornerRadius: props?.cornerRadius,
  };
}

// ============================================
// CARD
// ============================================

export interface CardProps {
  image?: string;
  icon?: string;
  title?: string;
  titleStyle?: TextStyleName;
  titleColor?: string;
  description?: string;
  descriptionStyle?: TextStyleName;
  descriptionColor?: string;
  background?: boolean;          // Whether to show background (default: true)
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  padding?: number;
  gap?: GapSize;
  /** Custom children - if provided, overrides image/title/description */
  children?: SlideContent[];
}

export function card(props: CardProps): ComponentNode<CardProps> {
  return {
    type: 'component',
    componentName: 'card',
    props,
  };
}

// ============================================
// LIST
// ============================================

export interface ListProps {
  style?: TextStyleName;
  ordered?: boolean;
  color?: string;
  markerColor?: string;
}

/** List items can be plain text, styled runs, or TextNode */
export type ListItemContent = TextContent | TextNode;

/** Full list props including items for ComponentNode */
interface ListComponentProps extends ListProps {
  items: ListItemContent[];
}

export function list(items: ListItemContent[], props?: ListProps): ComponentNode<ListComponentProps> {
  return {
    type: 'component',
    componentName: 'list',
    props: { ...props, items },
  };
}

export function bulletList(items: ListItemContent[], props?: Omit<ListProps, 'ordered'>): ComponentNode<ListComponentProps> {
  return list(items, { ...props, ordered: false });
}

export function numberedList(items: ListItemContent[], props?: Omit<ListProps, 'ordered'>): ComponentNode<ListComponentProps> {
  return list(items, { ...props, ordered: true });
}

// ============================================
// TABLE
// ============================================

import type { BorderStyle, HorizontalAlignment as HAlign, VerticalAlignment as VAlign } from './types.js';

/** Table cell can be plain text, styled runs, or a TextNode */
export type TableCellContent = TextContent | TextNode;

export interface TableProps {
  /** First row is header (different styling) */
  headerRow?: boolean;
  /** First column is header (different styling) */
  headerColumn?: boolean;
  /** Border style for grid lines */
  borderStyle?: BorderStyle;
  /** Background color for header cells */
  headerBackground?: string;
  /** Background color for regular cells */
  cellBackground?: string;
  /** Explicit column widths (proportional) */
  columnWidths?: number[];
  /** Horizontal alignment for cell text */
  hAlign?: HAlign;
  /** Vertical alignment for cell text */
  vAlign?: VAlign;
  /** Text style for cells */
  textStyle?: TextStyleName;
  /** Text style for header cells */
  headerTextStyle?: TextStyleName;
}

/** Full table props including data for ComponentNode */
interface TableComponentProps extends TableProps {
  data: TableCellContent[][];
}

export function table(data: TableCellContent[][], props?: TableProps): ComponentNode<TableComponentProps> {
  return {
    type: 'component',
    componentName: 'table',
    props: { ...props, data },
  };
}

