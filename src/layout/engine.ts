// Layout Engine
// Public API for layout computation
//
// All node-type-specific logic is in elements/ - this file delegates.
// Validation is handled by LayoutValidator (see validator.ts)

// Side-effect import: register element handlers
import '../elements/index.js';

import { type ElementNode, type PositionedNode } from '../core/nodes.js';
import type { Theme, Direction } from '../core/types.js';
import { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type LayoutOptions } from '../core/element-registry.js';
import type { MeasurementResults } from './pipeline.js';

// Re-export validator for convenience
export { LayoutValidator } from './validator.js';
export type {
  ValidationResult,
  OverflowViolation,
  OverlapViolation,
  BoundsViolation,
  SlideBounds,
} from './validator.js';
export {
  LayoutOverflowError,
  LayoutOverlapError,
  LayoutBoundsError,
} from './validator.js';

// Re-export LayoutOptions from element-registry (canonical location)
export type { LayoutOptions } from '../core/element-registry.js';

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
 *
 * Note: Validation is handled separately by LayoutValidator.
 * Call validator.validateOrThrow() after layout to check for errors.
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
    return positioned;
  }

  throw new Error(`No handler registered for node type: ${node.type}`);
}
