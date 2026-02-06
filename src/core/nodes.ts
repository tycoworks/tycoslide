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
  SizeValue,
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
  // Layout primitives
  ROW: 'row',
  COLUMN: 'column',
  GROUP: 'group',
  // Visual primitive
  BOX: 'box',
  // Composites (will become expandable in future)
  CARD: 'card',
  LIST: 'list',
  TABLE: 'table',
  // Special (external rendering)
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
  width?: number | SizeValue;   // inches (number) or SIZE.FILL to take remaining space (when inside another Row)
  height?: number;              // inches - constrains cross-axis height (children scaled to fit)
  gap?: GapSize;
  vAlign?: VerticalAlignment;
}

export interface ColumnNode {
  type: typeof NODE_TYPE.COLUMN;
  children: ElementNode[];
  width?: number | SizeValue;   // inches (number) or SIZE.FILL to take remaining space (when inside Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL to take remaining space (when inside Column)
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
// VISUAL PRIMITIVE
// ============================================

/** Border configuration for Box - can be all sides or selective */
export interface BoxBorder {
  color?: string;
  width?: number;
  top?: boolean;     // If false, no top border (default: true when border specified)
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

/** Box is a visual container with fill, border, radius, and padding */
export interface BoxNode {
  type: typeof NODE_TYPE.BOX;
  child?: ElementNode;           // Single child (typically Column for multiple children)
  fill?: { color: string; opacity?: number };
  border?: BoxBorder;
  cornerRadius?: number;
  padding?: number;
  width?: number | SizeValue;
  height?: number | SizeValue;
}

// ============================================
// COMPOSITE NODES
// ============================================

/** Card is a container with children - the DSL builds children from props */
export interface CardNode {
  type: typeof NODE_TYPE.CARD;
  children: ElementNode[];
  gap?: GapSize;
  background?: boolean;          // Whether to show background (default: true)
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  padding?: number;
}

export interface ListNode {
  type: typeof NODE_TYPE.LIST;
  items: (TextContent | TextNode)[];
  style?: TextStyleName;
  ordered?: boolean;
  color?: string;
  markerColor?: string;
}

/** Table cell can be plain text, styled text runs, or a TextNode */
export type TableCellContent = TextContent | TextNode;

export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  data: TableCellContent[][];
  headerRow?: boolean;
  headerColumn?: boolean;
  borderStyle?: BorderStyle;
  headerBackground?: string;
  cellBackground?: string;
  columnWidths?: number[];
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

// ============================================
// DIAGRAM NODE (flowchart builder)
// ============================================

/** Diagram flow direction */
export const DIAGRAM_DIRECTION = {
  LEFT_TO_RIGHT: 'LR',
  RIGHT_TO_LEFT: 'RL',
  TOP_TO_BOTTOM: 'TB',
  BOTTOM_TO_TOP: 'BT',
} as const;
export type DiagramDirection = typeof DIAGRAM_DIRECTION[keyof typeof DIAGRAM_DIRECTION];

/** Diagram node shape */
export const NODE_SHAPE = {
  RECT: 'rect',
  ROUND: 'round',
  STADIUM: 'stadium',
  CYLINDER: 'cylinder',
  HEXAGON: 'hexagon',
  DIAMOND: 'diamond',
  PARALLELOGRAM: 'parallelogram',
  SUBROUTINE: 'subroutine',
} as const;
export type DiagramShape = typeof NODE_SHAPE[keyof typeof NODE_SHAPE];

/** A node in the diagram */
export interface DiagramNodeDef {
  id: string;
  label: string;
  shape: DiagramShape;
}

/** A subgraph grouping */
export interface DiagramSubgraphDef {
  id: string;
  label?: string;
  direction?: DiagramDirection;
  nodeIds: string[];
}

/** An edge between nodes */
export interface DiagramEdgeDef {
  from: string[];
  to: string[];
  label?: string;
}

/** Style class assignment */
export interface DiagramClassDef {
  nodeId: string;
  style: NodeStyle;
}

/** Diagram node - stores all builder state as pure data */
export interface DiagramNode {
  type: typeof NODE_TYPE.DIAGRAM;
  direction: DiagramDirection;
  nodes: DiagramNodeDef[];
  subgraphs: DiagramSubgraphDef[];
  edges: DiagramEdgeDef[];
  classes: DiagramClassDef[];
  scale?: number;
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
  | BoxNode
  | CardNode
  | ListNode
  | TableNode
  | DiagramNode;

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
