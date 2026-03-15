// Declarative Node Types
// Pure data structures representing slide content

import type {
  ArrowType,
  BorderStyle,
  DashType,
  Direction,
  HorizontalAlignment,
  ShadowType,
  ShapeName,
  SizeValue,
  TextContent,
  TextStyle,
  TextStyleName,
  VerticalAlignment,
} from "./types.js";

// ============================================
// NODE TYPE ENUM
// ============================================

export const NODE_TYPE = {
  // Content primitives
  TEXT: "text",
  IMAGE: "image",
  SLIDE_NUMBER: "slideNumber",
  TABLE: "table", // Native pptxgenjs table element
  // Layout primitives
  CONTAINER: "container", // Flex container (row or column, determined by direction)
  STACK: "stack", // Z-order composition: children overlap at same position
  // Visual primitives
  LINE: "line", // Stroke-only separator (zero cross-axis)
  SHAPE: "shape", // Area shapes: fill, border, cornerRadius
  // Higher-level abstraction (expands to primitives)
  COMPONENT: "component",
} as const;

export type NodeType = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

// ============================================
// BASE NODE TYPES
// ============================================

export interface TextNode {
  type: typeof NODE_TYPE.TEXT;
  content: TextContent;
  style: TextStyleName;
  resolvedStyle: TextStyle; // pre-resolved from theme.textStyles[style]
  color: string;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
  lineHeightMultiplier: number;
  bulletIndentPt: number;
  linkColor: string; // token-driven hyperlink color (render-time)
  linkUnderline: boolean; // token-driven hyperlink underline (render-time)
}

export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
}

export interface LineNode {
  type: typeof NODE_TYPE.LINE;
  color: string;
  width: number;
  dashType: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

/** Border configuration for area shapes. */
export interface ShapeBorder {
  color: string;
  width: number;
}

/** Shadow configuration — shared across shapes, images, and text boxes */
export interface Shadow {
  type: ShadowType;
  color: string;
  opacity: number;
  blur: number;
  offset: number;
  angle: number;
}

/** Area shape node: fill, border, cornerRadius (rectangles, ellipses, triangles, etc.) */
export interface ShapeNode {
  type: typeof NODE_TYPE.SHAPE;
  shape: ShapeName;
  fill: { color: string; opacity: number };
  border: ShapeBorder;
  cornerRadius: number;
  shadow?: Shadow;
}

export interface SlideNumberNode {
  type: typeof NODE_TYPE.SLIDE_NUMBER;
  style: TextStyleName;
  resolvedStyle: TextStyle; // pre-resolved from theme.textStyles[style]
  color: string;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
}

// ============================================
// TABLE NODE (native pptxgenjs table)
// ============================================

/** Individual table cell data */
/** User-facing input for table cells — optional fields resolved by expand */
export interface TableCellInput {
  content: TextContent;
  color?: string;
  textStyle?: TextStyleName;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  colspan?: number;
  rowspan?: number;
  fill?: string;
}

/** Fully-resolved table cell data — all fields pre-resolved by component expand */
export interface TableCellData {
  content: TextContent;
  color: string; // pre-resolved: cell → token
  textStyle: TextStyleName; // pre-resolved: cell → header/cell default from table tokens
  resolvedStyle: TextStyle; // pre-resolved from theme.textStyles[textStyle]
  hAlign: HorizontalAlignment; // pre-resolved: cell → table default
  vAlign: VerticalAlignment; // pre-resolved: cell → table default
  lineHeightMultiplier: number; // pre-resolved from table cellLineHeight token
  linkColor: string; // pre-resolved from table token
  linkUnderline: boolean; // pre-resolved from table token
  colspan?: number;
  rowspan?: number;
  fill?: string;
}

/** Native table element - renders directly via slide.addTable() */
export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  rows: TableCellData[][];
  headerRows?: number; // Number of header rows (default: 0)
  headerColumns?: number; // Number of header columns (default: 0)
  // Style properties (resolved from theme tokens by component expand)
  borderStyle: BorderStyle;
  borderColor: string;
  borderWidth: number;
  headerBackground: string;
  headerBackgroundOpacity: number;
  cellBackground: string;
  cellBackgroundOpacity: number;
  cellPadding: number;
}

// ============================================
// CONTAINER NODES
// ============================================

export interface ContainerNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.CONTAINER;
  direction: Direction; // 'row' or 'column' — determines flex-direction
  children: C[]; // Pre-expansion: SlideNode[]; post-expansion: ElementNode[]
  width: number | SizeValue; // inches (number), SIZE.FILL (share space), or SIZE.HUG (content-sized)
  height: number | SizeValue; // inches (number), SIZE.FILL (share space), or SIZE.HUG (content-sized)
  gap: number; // inches — pre-resolved from GapSize by component expand
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding?: number; // inches - internal padding on all sides
}

/** Stack is a z-order container: all children occupy the same bounds, rendered in order */
export interface StackNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.STACK;
  children: C[]; // Pre-expansion: SlideNode[]; post-expansion: ElementNode[]
  width: number | SizeValue; // inches, SIZE.FILL, or SIZE.HUG
  height: number | SizeValue; // inches, SIZE.FILL, or SIZE.HUG
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
  /** Visual tokens provided by parent (DSL) or slot injection. Separate from content props. */
  tokens?: Record<string, unknown>;
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

/** Content that can appear in slides and containers - primitives, components, or pre-expansion containers */
export type SlideNode = ElementNode | ComponentNode | ContainerNode<SlideNode> | StackNode<SlideNode>;

// ============================================
// DSL HELPER
// ============================================

/**
 * Create a component node.
 * Tokens are stored separately from props to avoid naming conflicts
 * (e.g., card has both props.title: string and tokens.title: TextTokens).
 */
export function component<TProps>(
  name: string,
  props: TProps,
  tokens?: Record<string, unknown> | object,
): ComponentNode<TProps> {
  const node: ComponentNode<TProps> = {
    type: NODE_TYPE.COMPONENT,
    componentName: name,
    props,
  };
  if (tokens) node.tokens = tokens as Record<string, unknown>;
  return node;
}

/**
 * Type guard to check if a node is a component node.
 */
export function isComponentNode(node: unknown): node is ComponentNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === NODE_TYPE.COMPONENT &&
    "componentName" in node &&
    "props" in node
  );
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
