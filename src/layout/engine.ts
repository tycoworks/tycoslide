// Layout Module
// Public API for layout computation with overflow handling
//
// All node-type-specific logic is in elements/ - this file delegates.

// Side-effect import: register element handlers
import '../elements/index.js';

import { NODE_TYPE, type ElementNode, type PositionedNode } from '../core/nodes.js';
import type { Theme, Direction } from '../core/types.js';
import { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry } from '../core/element-registry.js';
import type { MeasurementResults } from './pipeline.js';

// ============================================
// LAYOUT OPTIONS & ERRORS
// ============================================

/**
 * Options for layout computation
 */
export interface LayoutOptions {
  /**
   * When true (default), throws LayoutOverflowError if content exceeds bounds.
   * When false, content is silently clipped.
   */
  strict?: boolean;
}

/**
 * Error thrown when content exceeds its container bounds.
 * Only thrown when strict mode is enabled.
 */
export class LayoutOverflowError extends Error {
  readonly nodeType: string;
  readonly availableHeight: number;
  readonly contentHeight: number;
  readonly overflow: number;
  readonly x: number;
  readonly y: number;

  constructor(options: {
    nodeType: string;
    availableHeight: number;
    contentHeight: number;
    x: number;
    y: number;
    message?: string;
  }) {
    const overflow = options.contentHeight - options.availableHeight;
    const defaultMessage = `Content overflow: ${options.nodeType} content (${options.contentHeight.toFixed(2)}") exceeds available height (${options.availableHeight.toFixed(2)}") by ${overflow.toFixed(2)}" at position (${options.x.toFixed(2)}, ${options.y.toFixed(2)})`;

    super(options.message ?? defaultMessage);
    this.name = 'LayoutOverflowError';
    this.nodeType = options.nodeType;
    this.availableHeight = options.availableHeight;
    this.contentHeight = options.contentHeight;
    this.overflow = overflow;
    this.x = options.x;
    this.y = options.y;
  }
}

/**
 * Check for overflow and throw if strict mode is enabled (default: true)
 */
export function checkOverflow(
  nodeType: string,
  contentHeight: number,
  availableHeight: number,
  x: number,
  y: number,
  options?: LayoutOptions
): void {
  const strict = options?.strict ?? true;
  if (strict && availableHeight > 0 && contentHeight > availableHeight) {
    throw new LayoutOverflowError({
      nodeType,
      availableHeight,
      contentHeight,
      x,
      y,
    });
  }
}

// ============================================
// HEIGHT COMPUTATION
// ============================================

/**
 * Compute the natural height of a node at the given width.
 * Delegates to the handler registry.
 */
export function getNodeHeight(
  node: ElementNode,
  width: number,
  theme: Theme,
  measurements: MeasurementResults
): number {
  const height = elementHandlerRegistry.getHeight(node, width, { theme, measurements });
  if (height !== undefined) {
    return height;
  }
  throw new Error(`No handler registered for node type: ${node.type}`);
}

/**
 * Compute the minimum height a node can be compressed to.
 * Delegates to the handler registry.
 */
export function getMinNodeHeight(
  node: ElementNode,
  width: number,
  theme: Theme,
  measurements: MeasurementResults
): number {
  const minHeight = elementHandlerRegistry.getMinHeight(node, width, { theme, measurements });
  if (minHeight !== undefined) {
    return minHeight;
  }
  throw new Error(`No handler registered for node type: ${node.type}`);
}

// ============================================
// LAYOUT COMPUTATION
// ============================================

/**
 * Compute layout for a node within the given bounds.
 * Delegates to the handler registry.
 * Applies centralized overflow checking for text-like content.
 */
export function computeLayout(
  node: ElementNode,
  bounds: Bounds,
  theme: Theme,
  measurements: MeasurementResults,
  parentDirection?: Direction,
  options?: LayoutOptions
): PositionedNode {
  const ctx = { theme, measurements, parentDirection, options };

  const positioned = elementHandlerRegistry.computeLayout(node, bounds, ctx);
  if (positioned !== undefined) {
    // Overflow checking is centralized here (not in handlers) for consistent enforcement
    // Only text-like content can overflow - images/diagrams scale to fit
    if (node.type === NODE_TYPE.TEXT || node.type === NODE_TYPE.SLIDE_NUMBER) {
      const height = elementHandlerRegistry.getHeight(node, bounds.w, ctx);
      if (height !== undefined) {
        checkOverflow(node.type, height, bounds.h, bounds.x, bounds.y, options);
      }
    }
    return positioned;
  }

  throw new Error(`No handler registered for node type: ${node.type}`);
}
