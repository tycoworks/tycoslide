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
  type GroupNode,
  type BoxNode,
  type BoxBorder,
  type CardNode,
  type ListNode,
  type TableNode,
  type TableCellContent,
  type ElementNode,
} from './nodes.js';
import type {
  TextContent,
  TextStyleName,
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  Justify,
  BorderStyle,
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
  height?: number;              // inches - constrains cross-axis height (children scaled to fit)
  gap?: GapSize;
  vAlign?: VerticalAlignment;
}

export function row(props: RowProps, ...children: ElementNode[]): RowNode;
export function row(...children: ElementNode[]): RowNode;
export function row(...args: any[]): RowNode {
  let props: RowProps = {};
  let children: ElementNode[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.ROW,
    children,
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
  justify?: Justify;
  hAlign?: HorizontalAlignment;
}

export function column(props: ColumnProps, ...children: ElementNode[]): ColumnNode;
export function column(...children: ElementNode[]): ColumnNode;
export function column(...args: any[]): ColumnNode {
  let props: ColumnProps = {};
  let children: ElementNode[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.COLUMN,
    children,
    width: props.width,
    height: props.height,
    gap: props.gap,
    justify: props.justify,
    hAlign: props.hAlign,
  };
}

export interface GroupProps {
  columns?: number;
  gap?: GapSize;
}

export function group(props: GroupProps, ...children: ElementNode[]): GroupNode;
export function group(...children: ElementNode[]): GroupNode;
export function group(...args: any[]): GroupNode {
  let props: GroupProps = {};
  let children: ElementNode[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.GROUP,
    children,
    columns: props.columns,
    gap: props.gap,
  };
}

// ============================================
// BOX (visual primitive)
// ============================================

export interface BoxProps {
  fill?: { color: string; opacity?: number };
  border?: BoxBorder;
  cornerRadius?: number;
  padding?: number;
  width?: number | SizeValue;
  height?: number | SizeValue;
}

/** Box with props and optional single child */
export function box(props: BoxProps, child?: ElementNode): BoxNode;
/** Box with just a child (no props) */
export function box(child: ElementNode): BoxNode;
/** Empty box with props */
export function box(props: BoxProps): BoxNode;
export function box(propsOrChild?: BoxProps | ElementNode, maybeChild?: ElementNode): BoxNode {
  // Detect if first arg is a node (has 'type' property)
  if (propsOrChild && typeof propsOrChild === 'object' && 'type' in propsOrChild) {
    // box(child) - just a child, no props
    return {
      type: NODE_TYPE.BOX,
      child: propsOrChild as ElementNode,
    };
  }

  // box(props) or box(props, child)
  const props = (propsOrChild as BoxProps) ?? {};
  return {
    type: NODE_TYPE.BOX,
    child: maybeChild,
    fill: props.fill,
    border: props.border,
    cornerRadius: props.cornerRadius,
    padding: props.padding,
    width: props.width,
    height: props.height,
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
  children?: ElementNode[];
}

export function card(props: CardProps): CardNode {
  // If custom children provided, use them directly
  if (props.children) {
    return {
      type: NODE_TYPE.CARD,
      children: props.children,
      gap: props.gap,
      background: props.background,
      backgroundColor: props.backgroundColor,
      backgroundOpacity: props.backgroundOpacity,
      borderColor: props.borderColor,
      borderWidth: props.borderWidth,
      cornerRadius: props.cornerRadius,
      padding: props.padding,
    };
  }

  // Build children from image/title/description props
  const children: ElementNode[] = [];

  if (props.image) {
    children.push(image(props.image));
  }

  if (props.title) {
    children.push(text(props.title, {
      style: props.titleStyle ?? TEXT_STYLE.H4,
      color: props.titleColor,
    }));
  }

  if (props.description) {
    children.push(text(props.description, {
      style: props.descriptionStyle ?? TEXT_STYLE.SMALL,
      color: props.descriptionColor,
    }));
  }

  return {
    type: NODE_TYPE.CARD,
    children,
    gap: props.gap,
    background: props.background,
    backgroundColor: props.backgroundColor,
    backgroundOpacity: props.backgroundOpacity,
    borderColor: props.borderColor,
    borderWidth: props.borderWidth,
    cornerRadius: props.cornerRadius,
    padding: props.padding,
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

export function list(items: ListItemContent[], props?: ListProps): ListNode {
  return {
    type: NODE_TYPE.LIST,
    items,
    style: props?.style,
    ordered: props?.ordered,
    color: props?.color,
    markerColor: props?.markerColor,
  };
}

export function bulletList(items: ListItemContent[], props?: Omit<ListProps, 'ordered'>): ListNode {
  return list(items, { ...props, ordered: false });
}

export function numberedList(items: ListItemContent[], props?: Omit<ListProps, 'ordered'>): ListNode {
  return list(items, { ...props, ordered: true });
}

// ============================================
// TABLE
// ============================================

export interface TableProps {
  headerRow?: boolean;
  headerColumn?: boolean;
  borderStyle?: BorderStyle;
  headerBackground?: string;
  cellBackground?: string;
  columnWidths?: number[];
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export function table(data: TableCellContent[][], props?: TableProps): TableNode {
  return {
    type: NODE_TYPE.TABLE,
    data,
    headerRow: props?.headerRow,
    headerColumn: props?.headerColumn,
    borderStyle: props?.borderStyle,
    headerBackground: props?.headerBackground,
    cellBackground: props?.cellBackground,
    columnWidths: props?.columnWidths,
    hAlign: props?.hAlign,
    vAlign: props?.vAlign,
  };
}

