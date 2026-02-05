// Declarative Node Types
// Pure data structures representing slide content

import type {
  TextContent,
  TextStyleName,
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  Justify,
  BorderStyle,
  HighlightPair,
  ArrowType,
  DashType,
  NodeStyle,
} from './types.js';

// ============================================
// NODE TYPE ENUM
// ============================================

export const NODE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  LINE: 'line',
  SLIDE_NUMBER: 'slideNumber',
  ROW: 'row',
  COLUMN: 'column',
  GROUP: 'group',
  CARD: 'card',
  LIST: 'list',
  TABLE: 'table',
  DIAGRAM: 'diagram',
} as const;

export type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE];

// ============================================
// BASE NODE TYPES
// ============================================

export interface TextNode {
  type: typeof NODE_TYPE.TEXT;
  content: TextContent;
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  alt?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export interface LineNode {
  type: typeof NODE_TYPE.LINE;
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

export interface SlideNumberNode {
  type: typeof NODE_TYPE.SLIDE_NUMBER;
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
}

// ============================================
// CONTAINER NODES
// ============================================

export interface RowNode {
  type: typeof NODE_TYPE.ROW;
  children: ElementNode[];
  proportions?: number[];
  gap?: GapSize;
  vAlign?: VerticalAlignment;
}

export interface ColumnNode {
  type: typeof NODE_TYPE.COLUMN;
  children: ElementNode[];
  proportions?: number[];
  gap?: GapSize;
  justify?: Justify;
  hAlign?: HorizontalAlignment;
}

export interface GroupNode {
  type: typeof NODE_TYPE.GROUP;
  children: ElementNode[];
  gap?: GapSize;
  columns?: number;
}

// ============================================
// COMPOSITE NODES
// ============================================

export interface CardNode {
  type: typeof NODE_TYPE.CARD;
  image?: string;
  icon?: string;
  title?: string;
  titleColor?: string;
  description?: string;
  descriptionColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export interface ListNode {
  type: typeof NODE_TYPE.LIST;
  items: TextContent[];
  style?: TextStyleName;
  ordered?: boolean;
  color?: string;
}

export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  data: TextContent[][];
  headerRow?: boolean;
  headerColumn?: boolean;
  borderStyle?: BorderStyle;
  headerBackground?: string;
  cellBackground?: string;
}

// ============================================
// DIAGRAM NODES
// ============================================

export interface DiagramBoxNode {
  label: string;
  style?: NodeStyle;
}

export interface DiagramEdge {
  from: number;
  to: number;
  label?: string;
}

export const DIAGRAM_LAYOUT = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const;

export type DiagramLayout = typeof DIAGRAM_LAYOUT[keyof typeof DIAGRAM_LAYOUT];

export interface DiagramNode {
  type: typeof NODE_TYPE.DIAGRAM;
  nodes: DiagramBoxNode[];
  edges?: DiagramEdge[];
  direction?: DiagramLayout;
}

// ============================================
// UNION TYPE
// ============================================

export type ElementNode =
  | TextNode
  | ImageNode
  | LineNode
  | SlideNumberNode
  | RowNode
  | ColumnNode
  | GroupNode
  | CardNode
  | ListNode
  | TableNode
  | DiagramNode;

// ============================================
// SLIDE (DECLARATIVE VERSION)
// ============================================

export interface DeclarativeSlide {
  master?: string;           // Master name (resolved at render time)
  background?: string;       // Background image path
  notes?: string;            // Speaker notes
  content: ElementNode;      // Root element (typically a Column)
}

// ============================================
// POSITIONED NODE (after layout)
// ============================================

export interface PositionedNode {
  node: ElementNode;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: PositionedNode[];
}
