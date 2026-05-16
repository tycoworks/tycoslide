// Definitions
// Runtime types for the component and rendering system.
// Pure data — no global singletons.

import type { ComponentNode, ElementNode, SlideNode } from "../model/nodes.js";
import type { SyntaxType } from "../model/syntax.js";
import type { Theme } from "../model/types.js";

// Re-export ComponentNode — required for declaration emit (defineComponent return type)
export type { ComponentNode } from "../model/nodes.js";
export { validateThemeFonts } from "./themeValidator.js";

// ============================================
// COMPONENT TYPES
// ============================================

/**
 * Browser-backed capabilities available to components during rendering.
 * Today: render HTML to PNG. Tomorrow: SVG, LaTeX, font metrics, etc.
 */
export interface Canvas {
  renderHtml(html: string, transparent?: boolean): Promise<string>;
}

/**
 * Context passed to component render functions.
 */
export interface RenderContext {
  theme: Theme;
  assets?: Record<string, unknown>;
  canvas: Canvas;
  /** Recursively render a component tree to primitives. Components call this for nested content. */
  renderTree: (node: SlideNode) => Promise<ElementNode>;
}

/**
 * Declares which syntax node types a component can compile from bare markdown.
 * Registered via the `syntax` field on `define()`.
 */
export interface SyntaxHandler {
  /** Syntax node types this component handles (e.g., SYNTAX.PARAGRAPH, SYNTAX.LIST) */
  nodeTypes: SyntaxType[];
  /** Transform a syntax node into a ComponentNode. Return null to skip. */
  compile: (node: any, source: string) => ComponentNode | null;
}

/**
 * A component definition describes how to render a component into primitives.
 * Render receives params and content as separate channels.
 */
export interface ComponentDefinition<TParams = unknown, TContent = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Optional param schema shape for directive attributes. */
  params?: Record<string, unknown>;
  /** Whether this component accepts children (SlideNode[]) as content. */
  children?: boolean;
  /** Render params + content into a node tree (may contain components that get further rendered) */
  render: (
    params: TParams,
    content: TContent,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
  /** Deserialize a :::name directive into a ComponentNode. Auto-generated for content components. */
  deserialize?: (attributes: Record<string, string | null | undefined>, body: string) => ComponentNode;
  /** Syntax handler — declares which bare markdown node types this component compiles. */
  syntax?: SyntaxHandler;
}
