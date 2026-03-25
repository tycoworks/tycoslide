// Declarative Node Types
// Pure data structures representing slide content

import type {
  BorderStyle,
  DashType,
  Direction,
  HorizontalAlignment,
  ShadowType,
  ShapeName,
  SizeValue,
  SpacingMode,
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
  GRID: "grid", // CSS Grid container: equal-width columns with cross-sibling coordination
  // Visual primitives
  LINE: "line", // Stroke-only separator (zero cross-axis)
  SHAPE: "shape", // Area shapes: fill, border, cornerRadius
  // Higher-level abstraction (renders to primitives)
  COMPONENT: "component",
} as const;

export type NodeType = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

// ============================================
// BASE NODE TYPES
// ============================================

export interface TextNode {
  type: typeof NODE_TYPE.TEXT;
  width: SizeValue;
  height: SizeValue;
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
  shadow?: Shadow;
}

export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  width: SizeValue;
  height: SizeValue;
  src: string;
  alt?: string;
  shadow?: Shadow;
}

export interface LineNode {
  type: typeof NODE_TYPE.LINE;
  direction: Direction;
  stroke: Stroke;
  shadow?: Shadow;
}

/** Stroke configuration — shared by lines and shape borders.
 *  Width is in points (visual styling convention; layout geometry uses inches). */
export interface Stroke {
  color: string;
  width: number;
  dashType: DashType;
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
  width: SizeValue;
  height: SizeValue;
  shape: ShapeName;
  fill: { color: string; opacity: number };
  border: Stroke;
  cornerRadius: number;
  shadow?: Shadow;
}

export interface SlideNumberNode {
  type: typeof NODE_TYPE.SLIDE_NUMBER;
  width: SizeValue;
  height: SizeValue;
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
/** User-facing input for table cells — optional fields resolved by render */
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

/** Fully-resolved table cell data — all fields pre-resolved by component render */
export interface TableCellData {
  content: TextContent;
  width: SizeValue;
  height: SizeValue;
  color: string; // pre-resolved: cell → token
  textStyle: TextStyleName; // pre-resolved: cell → header/cell default from table tokens
  resolvedStyle: TextStyle; // pre-resolved from theme.textStyles[textStyle]
  hAlign: HorizontalAlignment; // pre-resolved: cell → table default
  vAlign: VerticalAlignment; // pre-resolved: cell → table default
  linkColor: string; // pre-resolved from table token
  linkUnderline: boolean; // pre-resolved from table token
  colspan?: number;
  rowspan?: number;
  fill?: string;
}

/** Shared style for optional header zones (headerRow / headerCol) */
export interface TableHeaderStyle {
  textStyle: TextStyleName;
  textColor: string;
  background: string;
  backgroundOpacity: number;
  hAlign?: HorizontalAlignment;
}

/** Native table element - renders directly via slide.addTable() */
export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  width: SizeValue;
  height: SizeValue;
  rows: TableCellData[][];
  // Style properties (resolved from theme tokens by component render)
  borderStyle: BorderStyle;
  borderColor: string;
  borderWidth: number;
  // 3-zone backgrounds: presence indicates zone is active (like fill/border on ShapeNode)
  headerRow?: TableHeaderStyle;
  headerCol?: TableHeaderStyle;
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
  spacing: number; // inches — space between children (and edges when spacingMode is AROUND)
  spacingMode?: SpacingMode; // BETWEEN (default): between children only; AROUND: between + edges
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

/** Grid is a CSS Grid container: equal-width columns with cross-sibling height coordination */
export interface GridNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.GRID;
  children: C[]; // Pre-expansion: SlideNode[]; post-expansion: ElementNode[]
  columns: number; // number of equal-width columns
  spacing: number; // inches — gap between cells
  width: number | SizeValue; // inches, SIZE.FILL, or SIZE.HUG
  height: number | SizeValue; // inches, SIZE.FILL, or SIZE.HUG
}

// ============================================
// COMPONENT NODE (higher-level abstraction)
// ============================================

/**
 * A component node before rendering.
 * Components are higher-level abstractions (card, list, table) that render
 * into primitive ElementNodes at Presentation.add() time.
 *
 * Two separate channels:
 * - `params` — scalar configuration (language, etc.)
 * - `content` — the thing being rendered (body string, list items, children array, etc.)
 */
export interface ComponentNode<TParams = unknown, TContent = unknown> {
  type: typeof NODE_TYPE.COMPONENT;
  componentName: string;
  params: TParams;
  content: TContent;
  /** Visual tokens provided by parent (DSL) or slot injection. Separate from params/content. */
  tokens?: Record<string, unknown>;
}

// ============================================
// UNION TYPES
// ============================================

/** Container nodes that hold children — used for layout dispatch and recursion */
export type LayoutNode = ContainerNode | StackNode | GridNode;

/** Primitive layout nodes - what layout/render systems work with */
export type ElementNode = TextNode | ImageNode | LineNode | ShapeNode | SlideNumberNode | TableNode | LayoutNode;

/** Content that can appear in slides and containers - primitives, components, or pre-expansion containers */
export type SlideNode =
  | ElementNode
  | ComponentNode
  | ContainerNode<SlideNode>
  | StackNode<SlideNode>
  | GridNode<SlideNode>;

// ============================================
// DSL HELPER
// ============================================

/**
 * Create a component node.
 * Params hold configuration, content holds the thing being rendered,
 * tokens hold visual styling from the parent (separate to avoid naming conflicts).
 */
export function component<TParams, TContent = undefined>(
  name: string,
  params: TParams,
  content?: TContent,
  tokens?: Record<string, unknown> | object,
): ComponentNode<TParams, TContent> {
  const node: ComponentNode<TParams, TContent> = {
    type: NODE_TYPE.COMPONENT,
    componentName: name,
    params,
    content: content as TContent,
  };
  if (tokens) node.tokens = tokens as Record<string, unknown>;
  return node;
}

/**
 * Type guard to check if a node is a layout node (container, stack, or grid).
 */
export function isLayoutNode(node: ElementNode): node is LayoutNode {
  return node.type === NODE_TYPE.CONTAINER || node.type === NODE_TYPE.STACK || node.type === NODE_TYPE.GRID;
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
    "params" in node
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
