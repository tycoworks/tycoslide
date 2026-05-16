// Definitions
// Runtime types for the component and rendering system.
// Pure data — no global singletons.

import type { ElementNode, SlideNode } from "../model/nodes.js";
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
 * Runtime component contract — core only uses name and render.
 * SDK extends this with authoring-only fields (syntax, deserialize, params, children).
 */
export interface ComponentDefinition<TParams = unknown, TContent = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Render params + content into a node tree (may contain components that get further rendered) */
  render: (
    params: TParams,
    content: TContent,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}
