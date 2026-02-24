// Declarative Node Types
// Pure data structures representing slide content

import type {
  TextContent,
  TextStyleName,
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  HighlightPair,
  ArrowType,
  DashType,
  ShapeName,
  SizeValue,
  BorderStyle,
  Direction,

} from './types.js';

// ============================================
// NODE TYPE ENUM
// ============================================

export const NODE_TYPE = {
  // Content primitives
  TEXT: 'text',
  IMAGE: 'image',
  SLIDE_NUMBER: 'slideNumber',
  TABLE: 'table',  // Native pptxgenjs table element
  // Layout primitives
  CONTAINER: 'container',  // Flex container (row or column, determined by direction)
  STACK: 'stack',  // Z-order composition: children overlap at same position
  // Visual primitives
  LINE: 'line',    // Stroke-only separator (zero cross-axis)
  SHAPE: 'shape',  // Area shapes: fill, border, cornerRadius
  // Higher-level abstraction (expands to primitives)
  COMPONENT: 'component',
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
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
  lineHeightMultiplier?: number;  // Overrides style's lineHeightMultiplier
}

export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  alt?: string;
}

export interface LineNode {
  type: typeof NODE_TYPE.LINE;
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

/** Border configuration for area shapes - can be all sides or selective */
export interface ShapeBorder {
  color?: string;
  width?: number;
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

/** Area shape node: fill, border, cornerRadius (rectangles, ellipses, triangles, etc.) */
export interface ShapeNode {
  type: typeof NODE_TYPE.SHAPE;
  shape: ShapeName;
  fill?: { color: string; opacity?: number };
  border?: ShapeBorder;
  cornerRadius?: number;
}

export interface SlideNumberNode {
  type: typeof NODE_TYPE.SLIDE_NUMBER;
  style?: TextStyleName;
  color?: string;
  hAlign: HorizontalAlignment;
}

// ============================================
// TABLE NODE (native pptxgenjs table)
// ============================================

/** Individual table cell data */
export interface TableCellData {
  content: TextContent;
  color?: string;
  colspan?: number;
  rowspan?: number;
  fill?: string;
  textStyle?: TextStyleName;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export const TABLE_TOKEN = {
  BORDER_STYLE: 'borderStyle',
  BORDER_COLOR: 'borderColor',
  BORDER_WIDTH: 'borderWidth',
  HEADER_BACKGROUND: 'headerBackground',
  HEADER_BACKGROUND_OPACITY: 'headerBackgroundOpacity',
  HEADER_TEXT_STYLE: 'headerTextStyle',
  CELL_BACKGROUND: 'cellBackground',
  CELL_BACKGROUND_OPACITY: 'cellBackgroundOpacity',
  CELL_TEXT_STYLE: 'cellTextStyle',
  CELL_PADDING: 'cellPadding',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
} as const;

/** Table-level style configuration */
export interface TableTokens {
  [TABLE_TOKEN.BORDER_STYLE]: BorderStyle;
  [TABLE_TOKEN.BORDER_COLOR]: string;
  [TABLE_TOKEN.BORDER_WIDTH]: number;
  [TABLE_TOKEN.HEADER_BACKGROUND]: string;
  [TABLE_TOKEN.HEADER_BACKGROUND_OPACITY]: number;
  [TABLE_TOKEN.HEADER_TEXT_STYLE]: TextStyleName;
  [TABLE_TOKEN.CELL_BACKGROUND]: string;
  [TABLE_TOKEN.CELL_BACKGROUND_OPACITY]: number;
  [TABLE_TOKEN.CELL_TEXT_STYLE]: TextStyleName;
  [TABLE_TOKEN.CELL_PADDING]: number;
  [TABLE_TOKEN.HALIGN]: HorizontalAlignment;
  [TABLE_TOKEN.VALIGN]: VerticalAlignment;
}

/** Native table element - renders directly via slide.addTable() */
export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  rows: TableCellData[][];
  headerRows?: number;           // Number of header rows (default: 0)
  headerColumns?: number;        // Number of header columns (default: 0)
  style?: TableTokens;
}

// ============================================
// CONTAINER NODES
// ============================================

export interface ContainerNode {
  type: typeof NODE_TYPE.CONTAINER;
  direction: Direction;           // 'row' or 'column' — determines flex-direction
  children: ElementNode[];        // Post-expansion: always primitives
  width: number | SizeValue;      // inches (number), SIZE.FILL (share space), or SIZE.HUG (content-sized)
  height: number | SizeValue;     // inches (number), SIZE.FILL (share space), or SIZE.HUG (content-sized)
  gap?: GapSize;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding?: number;               // inches - internal padding on all sides
}

/** Stack is a z-order container: all children occupy the same bounds, rendered in order */
export interface StackNode {
  type: typeof NODE_TYPE.STACK;
  children: ElementNode[];  // Post-expansion: [0] first (back), [n-1] last (front)
  width: number | SizeValue;    // inches, SIZE.FILL, or SIZE.HUG
  height: number | SizeValue;   // inches, SIZE.FILL, or SIZE.HUG
}


// ============================================
// COMPONENT NODE (higher-level abstraction)
// ============================================

/**
 * A component node before expansion.
 * Components are higher-level abstractions (card, list, table) that expand
 * into primitive ElementNodes at Presentation.add() time.
 */
export interface ComponentNode<TProps = unknown> {
  type: typeof NODE_TYPE.COMPONENT;
  componentName: string;
  props: TProps;
}

// ============================================
// UNION TYPES
// ============================================

/** Primitive layout nodes - what layout/render systems work with */
export type ElementNode =
  | TextNode
  | ImageNode
  | LineNode
  | ShapeNode
  | SlideNumberNode
  | TableNode
  | ContainerNode
  | StackNode;

/** Content that can appear in slides and containers - primitives or components */
export type SlideNode = ElementNode | ComponentNode;

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
