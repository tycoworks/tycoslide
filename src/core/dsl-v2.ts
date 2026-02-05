// Declarative DSL
// Simple factory functions that return pure data nodes

import {
  NODE_TYPE,
  DIAGRAM_LAYOUT,
  type TextNode,
  type ImageNode,
  type LineNode,
  type SlideNumberNode,
  type RowNode,
  type ColumnNode,
  type GroupNode,
  type CardNode,
  type ListNode,
  type TableNode,
  type DiagramNode,
  type DiagramLayout,
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
  NodeStyle,
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
  maxWidth?: number;
  maxHeight?: number;
}

export function image(src: string, props?: ImageProps): ImageNode {
  return {
    type: NODE_TYPE.IMAGE,
    src,
    alt: props?.alt,
    maxWidth: props?.maxWidth,
    maxHeight: props?.maxHeight,
  };
}

// ============================================
// LINE
// ============================================

export function line(): LineNode {
  return { type: NODE_TYPE.LINE };
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
  proportions?: number[];
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
    proportions: props.proportions,
    gap: props.gap,
    vAlign: props.vAlign,
  };
}

export interface ColumnProps {
  proportions?: number[];
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
    proportions: props.proportions,
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
// CARD
// ============================================

export interface CardProps {
  image?: string;
  icon?: string;
  title?: string;
  titleColor?: string;
  description?: string;
  descriptionColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export function card(props: CardProps): CardNode {
  return {
    type: NODE_TYPE.CARD,
    ...props,
  };
}

// ============================================
// LIST
// ============================================

export interface ListProps {
  style?: TextStyleName;
  ordered?: boolean;
  color?: string;
}

export function list(items: TextContent[], props?: ListProps): ListNode {
  return {
    type: NODE_TYPE.LIST,
    items,
    style: props?.style,
    ordered: props?.ordered,
    color: props?.color,
  };
}

export function bulletList(items: TextContent[], props?: Omit<ListProps, 'ordered'>): ListNode {
  return list(items, { ...props, ordered: false });
}

export function numberedList(items: TextContent[], props?: Omit<ListProps, 'ordered'>): ListNode {
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
}

export function table(data: TextContent[][], props?: TableProps): TableNode {
  return {
    type: NODE_TYPE.TABLE,
    data,
    headerRow: props?.headerRow,
    headerColumn: props?.headerColumn,
    borderStyle: props?.borderStyle,
    headerBackground: props?.headerBackground,
    cellBackground: props?.cellBackground,
  };
}

// ============================================
// DIAGRAM
// ============================================

export interface DiagramBoxProps {
  label: string;
  style?: NodeStyle;
}

export interface DiagramProps {
  direction?: DiagramLayout;
}

export function diagram(nodes: DiagramBoxProps[], props?: DiagramProps): DiagramNode {
  return {
    type: NODE_TYPE.DIAGRAM,
    nodes,
    direction: props?.direction,
  };
}
