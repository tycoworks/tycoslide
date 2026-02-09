// Element Handler Registry
// Interface definitions, registry singleton, and convenience functions

import type { ElementNode, NodeType, PositionedNode } from './nodes.js';
import type { Theme, Direction } from './types.js';
import type { Bounds } from './bounds.js';
import type { LayoutOptions } from '../layout/engine.js';
import type { MeasurementResults } from '../layout/pipeline.js';

// ============================================
// LAYOUT CONTEXT
// ============================================

/**
 * Context bundle for layout computation.
 * Contains theme and text measurements for all elements.
 */
export interface LayoutContext {
  theme: Theme;
  /** Text measurement results (required - from browser measurement) */
  measurements: MeasurementResults;
  /** Parent container direction - used by LINE for orientation */
  parentDirection?: Direction;
  /** Layout options for overflow handling */
  options?: LayoutOptions;
}

// ============================================
// HANDLER INTERFACE
// ============================================

/**
 * A ElementHandler encapsulates all behavior for a single node type.
 *
 * This consolidates logic that was previously scattered across multiple files.
 * Each node type (TEXT, IMAGE, LINE, ROW, COLUMN, etc.) has its own handler
 * that implements these methods, keeping all related logic in one place.
 */
export interface ElementHandler<T extends ElementNode = ElementNode> {
  /** The node type this handler processes */
  readonly nodeType: NodeType;

  /**
   * Compute the natural height of the node at the given width.
   * Called during layout to determine intrinsic sizing.
   */
  getHeight(node: T, width: number, ctx: LayoutContext): number;

  /**
   * Compute the minimum (incompressible) height.
   * Used for compression in overflow scenarios.
   * Defaults to getHeight() if not implemented.
   */
  getMinHeight?(node: T, width: number, ctx: LayoutContext): number;

  /**
   * Compute layout for this node within the given bounds.
   * Returns a PositionedNode with absolute coordinates.
   */
  computeLayout(node: T, bounds: Bounds, ctx: LayoutContext): PositionedNode;

  /**
   * Compute the intrinsic width at a given height.
   * All element handlers must implement this.
   */
  getIntrinsicWidth(node: T, height: number, ctx: LayoutContext): number;
}

// ============================================
// REGISTRY CLASS
// ============================================

/**
 * Registry for ElementHandler instances.
 *
 * Handlers register themselves (typically at module load time),
 * and layout/render code delegates to the appropriate handler.
 */
class ElementHandlerRegistry {
  private handlers = new Map<NodeType, ElementHandler>();

  /**
   * Register a handler for a node type.
   * @throws Error if handler already registered for this type
   */
  register<T extends ElementNode>(handler: ElementHandler<T>): void {
    if (this.handlers.has(handler.nodeType)) {
      throw new Error(`Handler already registered for node type: ${handler.nodeType}`);
    }
    this.handlers.set(handler.nodeType, handler as ElementHandler);
  }

  /**
   * Check if a handler is registered for a node type.
   */
  has(nodeType: NodeType): boolean {
    return this.handlers.has(nodeType);
  }

  /**
   * Get a handler by node type.
   */
  get<T extends ElementNode>(nodeType: NodeType): ElementHandler<T> | undefined {
    return this.handlers.get(nodeType) as ElementHandler<T> | undefined;
  }

  /**
   * Get a handler, throwing if not found.
   */
  getOrThrow<T extends ElementNode>(nodeType: NodeType): ElementHandler<T> {
    const handler = this.get<T>(nodeType);
    if (!handler) {
      throw new Error(`No handler registered for node type: ${nodeType}`);
    }
    return handler;
  }

  // ============================================
  // CONVENIENCE DELEGATION METHODS
  // ============================================

  /**
   * Get height for a node, delegating to its handler.
   * Returns undefined if no handler registered (allows fallback).
   */
  getHeight(node: ElementNode, width: number, ctx: LayoutContext): number | undefined {
    const handler = this.get(node.type);
    if (!handler) return undefined;
    return handler.getHeight(node, width, ctx);
  }

  /**
   * Get minimum height for a node, delegating to its handler.
   * Falls back to getHeight if getMinHeight not implemented.
   */
  getMinHeight(node: ElementNode, width: number, ctx: LayoutContext): number | undefined {
    const handler = this.get(node.type);
    if (!handler) return undefined;
    if (handler.getMinHeight) {
      return handler.getMinHeight(node, width, ctx);
    }
    return handler.getHeight(node, width, ctx);
  }

  /**
   * Compute layout for a node, delegating to its handler.
   * Returns undefined if no handler registered.
   */
  computeLayout(node: ElementNode, bounds: Bounds, ctx: LayoutContext): PositionedNode | undefined {
    const handler = this.get(node.type);
    if (!handler) return undefined;
    return handler.computeLayout(node, bounds, ctx);
  }

  /**
   * Get intrinsic width for a node, delegating to its handler.
   * Returns undefined if no handler registered (allows fallback).
   */
  getIntrinsicWidth(node: ElementNode, height: number, ctx: LayoutContext): number | undefined {
    const handler = this.get(node.type);
    if (!handler) return undefined;
    return handler.getIntrinsicWidth(node, height, ctx);
  }

  /**
   * Clear all registered handlers.
   * Useful for testing.
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get all registered node types.
   */
  getRegisteredTypes(): NodeType[] {
    return Array.from(this.handlers.keys());
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Global node handler registry.
 * Handlers register themselves at module load time.
 */
export const elementHandlerRegistry = new ElementHandlerRegistry();

// ============================================
// PUBLIC API FUNCTIONS
// ============================================

/**
 * Get intrinsic width of a node at a given height constraint.
 * Used when a Row has a SIZE.FILL child and flex siblings need their natural width.
 *
 * @param node - The element node to measure
 * @param constraintHeight - Height constraint (used for aspect ratio calculations)
 * @param ctx - Layout context with theme and measurer
 * @returns Intrinsic width in inches, or 0 if node has no intrinsic width
 */
export function getIntrinsicWidth(
  node: ElementNode,
  constraintHeight: number,
  ctx: LayoutContext
): number {
  return elementHandlerRegistry.getIntrinsicWidth(node, constraintHeight, ctx) ?? 0;
}
