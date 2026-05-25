// Declarative Node Types
// Pure data structures representing slide content

import type { Insets } from "./bounds.js";

import type {
  Dash,
  Direction,
  GridStyle,
  HorizontalAlignment,
  Shadow,
  Shape,
  Size,
  Spacing,
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
// RENDER LAYERS
// ============================================

/** Render layer target — determines whether a node is placed on the shared master or per-slide content. */
export const LAYER = {
  MASTER: "master",
  CONTENT: "content",
} as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];

// ============================================
// BASE NODE TYPES
// ============================================

export interface TextNode {
  type: typeof NODE_TYPE.TEXT;
  width: Size;
  height: Size;
  content: TextContent;
  style: TextStyleName;
  resolvedStyle: TextStyle; // pre-resolved from theme.textStyles[style]
  color: string;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
  lineHeight: number; // CSS-semantic: multiplier of fontSize (resolved value)
  bulletIndentPt: number; // resolved value (SDK defaults to fontSize * 1.5)
  linkColor: string; // token-driven hyperlink color (render-time)
  linkUnderline: boolean; // token-driven hyperlink underline (render-time)
  border?: Stroke;
  shadow?: ShadowEffect;
}

export interface ImageNode {
  type: typeof NODE_TYPE.IMAGE;
  src: string;
  alt?: string;
  shadow?: ShadowEffect;
}

export interface LineNode {
  type: typeof NODE_TYPE.LINE;
  direction: Direction;
  stroke: Stroke;
  shadow?: ShadowEffect;
}

/** Stroke configuration — shared by lines and shape borders.
 *  Width is in points (visual styling convention; layout geometry uses pixels). */
export interface Stroke {
  color: string;
  width: number;
  dashType: Dash;
}

/** Shadow configuration — shared across shapes, images, and text boxes */
export interface ShadowEffect {
  type: Shadow;
  color: string;
  opacity: number;
  blur: number;
  offset: number;
  angle: number;
}

/** Area shape node: fill, border, cornerRadius (rectangles, ellipses, triangles, etc.) */
export interface ShapeNode {
  type: typeof NODE_TYPE.SHAPE;
  width: Size;
  height: Size;
  shape: Shape;
  fill: { color: string; opacity: number };
  border?: Stroke;
  cornerRadius: number;
  shadow?: ShadowEffect;
}

export interface SlideNumberNode {
  type: typeof NODE_TYPE.SLIDE_NUMBER;
  width: Size;
  height: Size;
  style: TextStyleName;
  resolvedStyle: TextStyle; // pre-resolved from theme.textStyles[style]
  color: string;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
  number: number; // 1-based slide number, stamped by Presentation
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
  width: Size;
  height: Size;
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
  width: Size;
  height: Size;
  rows: TableCellData[][];
  // Style properties (resolved from theme tokens by component render)
  border?: Stroke; // outer border (same as shapes — present = has border)
  gridStyle: GridStyle; // HORIZONTAL | VERTICAL | BOTH | NONE
  gridStroke?: Stroke; // grid line appearance (independent, no fallback to border)
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
  width: Size; // SIZE.FILL (share space) or SIZE.HUG (content-sized)
  height: Size; // SIZE.FILL (share space) or SIZE.HUG (content-sized)
  weight: number; // flex-grow weight (main axis). SDK defaults to 1.
  spacing: number; // pixels — space between children (and edges when spacingMode is AROUND)
  spacingMode: Spacing; // BETWEEN: between children only; AROUND: between + edges
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding: Insets; // pixels - per-side internal padding (normalized at construction)
  layer?: Layer; // render target: master (shared/deduped) or content (per-slide)
}

/** Stack is a z-order container: all children occupy the same bounds, rendered in order */
export interface StackNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.STACK;
  children: C[]; // Pre-expansion: SlideNode[]; post-expansion: ElementNode[]
  width: Size; // SIZE.FILL or SIZE.HUG
  height: Size; // SIZE.FILL or SIZE.HUG
  layer?: Layer; // render target: master (shared/deduped) or content (per-slide)
}

/** Grid is a CSS Grid container: equal-width columns with cross-sibling height coordination */
export interface GridNode<C extends SlideNode = ElementNode> {
  type: typeof NODE_TYPE.GRID;
  children: C[]; // Pre-expansion: SlideNode[]; post-expansion: ElementNode[]
  columns: number; // number of equal-width columns
  spacing: number; // pixels — gap between cells
  width: Size; // SIZE.FILL or SIZE.HUG
  height: Size; // SIZE.FILL or SIZE.HUG
  layer?: Layer; // render target: master (shared/deduped) or content (per-slide)
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
  /** Render layer — propagated to the resolved element during renderTree(). */
  layer?: Layer;
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

/** Get the render layer of an element node (only layout nodes can have a layer). */
export function getLayer(node: ElementNode): Layer | undefined {
  return isLayoutNode(node) ? node.layer : undefined;
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
