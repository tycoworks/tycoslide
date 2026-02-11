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
  SizeValue,
  BorderStyle,
} from './types.js';

// ============================================
// NODE TYPE ENUM
// ============================================

export const NODE_TYPE = {
  // Content primitives
  TEXT: 'text',
  IMAGE: 'image',
  LINE: 'line',
  SLIDE_NUMBER: 'slideNumber',
  TABLE: 'table',  // Native pptxgenjs table element
  // Layout primitives
  ROW: 'row',
  COLUMN: 'column',
  STACK: 'stack',  // Z-order composition: children overlap at same position
  // Visual primitive
  RECTANGLE: 'rectangle',
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

/** Table-level style configuration */
export interface TableStyleProps {
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderWidth?: number;
  headerBackground?: string;
  headerTextStyle?: TextStyleName;
  cellBackground?: string;
  cellTextStyle?: TextStyleName;
  cellPadding?: number;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

/** Native table element - renders directly via slide.addTable() */
export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  rows: TableCellData[][];
  columnWidths?: number[];       // Proportional widths (normalized internally)
  headerRows?: number;           // Number of header rows (default: 0)
  headerColumns?: number;        // Number of header columns (default: 0)
  style?: TableStyleProps;
}

// ============================================
// CONTAINER NODES
// ============================================

export interface RowNode {
  type: typeof NODE_TYPE.ROW;
  children: ElementNode[];      // Post-expansion: always primitives (DSL accepts SlideContent)
  width?: number | SizeValue;   // inches (number) or SIZE.FILL to take remaining space (when inside another Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL to fill available height
  gap?: GapSize;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;  // justify-content: flex-start (left), center, flex-end (right)
  padding?: number;             // inches - internal padding on all sides
}

export interface ColumnNode {
  type: typeof NODE_TYPE.COLUMN;
  children: ElementNode[];      // Post-expansion: always primitives (DSL accepts SlideContent)
  width?: number | SizeValue;   // inches (number) or SIZE.FILL to take remaining space (when inside Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL to take remaining space (when inside Column)
  gap?: GapSize;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding?: number;             // inches - internal padding on all sides
}

/** Stack is a z-order container: all children occupy the same bounds, rendered in order */
export interface StackNode {
  type: typeof NODE_TYPE.STACK;
  children: ElementNode[];  // Post-expansion: [0] first (back), [n-1] last (front)
  width?: number | SizeValue;   // inches or SIZE.FILL
  height?: number | SizeValue;  // inches or SIZE.FILL
}

// ============================================
// VISUAL PRIMITIVE
// ============================================

/** Border configuration for Rectangle - can be all sides or selective */
export interface RectangleBorder {
  color?: string;
  width?: number;
  top?: boolean;     // If false, no top border (default: true when border specified)
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

/** Rectangle is a pure visual shape with fill, border, and radius */
export interface RectangleNode {
  type: typeof NODE_TYPE.RECTANGLE;
  fill?: { color: string; opacity?: number };
  border?: RectangleBorder;
  cornerRadius?: number;
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
  | SlideNumberNode
  | TableNode
  | RowNode
  | ColumnNode
  | StackNode
  | RectangleNode;

/** Content that can appear in slides and containers - primitives or components */
export type SlideContent = ElementNode | ComponentNode;

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
