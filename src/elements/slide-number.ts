// SLIDE_NUMBER Element Handler
// Layout and measurement logic for slide number nodes

import { NODE_TYPE, type SlideNumberNode, type TextNode, type PositionedNode } from '../core/nodes.js';
import { TEXT_STYLE } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { log } from '../utils/log.js';

// ============================================
// SYNTHETIC TEXT NODE FOR MEASUREMENT
// ============================================

/**
 * Maps SlideNumberNode instances to their synthetic TextNode for measurement.
 * Uses WeakMap so nodes can be garbage collected.
 */
const slideNumberSyntheticNodes = new WeakMap<SlideNumberNode, TextNode>();

/**
 * Get or create a synthetic TextNode for a SlideNumberNode.
 * Uses "999" as content to measure max reasonable slide number width.
 *
 * This allows the measurement pipeline to measure SlideNumberNode
 * by delegating to a TextNode, without the pipeline needing to know
 * the internal implementation details.
 */
export function getSyntheticTextNode(node: SlideNumberNode): TextNode {
  let synthetic = slideNumberSyntheticNodes.get(node);
  if (!synthetic) {
    synthetic = {
      type: NODE_TYPE.TEXT,
      content: '999',
      style: node.style ?? TEXT_STYLE.FOOTER,
    };
    slideNumberSyntheticNodes.set(node, synthetic);
  }
  return synthetic;
}

// ============================================
// SLIDE_NUMBER HANDLER
// ============================================

export const slideNumberHandler: ElementHandler<SlideNumberNode> = {
  nodeType: NODE_TYPE.SLIDE_NUMBER,

  /**
   * Compute slide number height using browser measurements.
   */
  getHeight(node: SlideNumberNode, _width: number, ctx: LayoutContext): number {
    const styleName = node.style ?? TEXT_STYLE.FOOTER;

    if (!ctx.measurements?.has(node)) {
      throw new Error(`No measurement for SlideNumberNode. Ensure slide is processed through TextMeasurementPipeline.`);
    }

    const result = ctx.measurements.get(node)!;
    log.layout.height('HEIGHT slideNumber style=%s -> %f', styleName, result.totalHeight);
    return result.totalHeight;
  },

  /**
   * Slide number is incompressible - min height equals height.
   */
  getMinHeight(node: SlideNumberNode, width: number, ctx: LayoutContext): number {
    return this.getHeight(node, width, ctx);
  },

  /**
   * Compute layout for SLIDE_NUMBER.
   * Same as TEXT - constrains height to bounds if overflow.
   */
  computeLayout(node: SlideNumberNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
    const height = this.getHeight(node, bounds.w, ctx);

    log.layout._('LAYOUT slideNumber bounds={x=%f y=%f w=%f h=%f} computedHeight=%f',
      bounds.x, bounds.y, bounds.w, bounds.h, height);

    // Constrain height to bounds.h if overflow (content will clip)
    const constrainedHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;
    log.layout._('  -> positioned {x=%f y=%f w=%f h=%f}%s',
      bounds.x, bounds.y, bounds.w, constrainedHeight,
      constrainedHeight < height ? ' (clipped)' : '');

    return {
      node,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: constrainedHeight,
    };
  },

  /**
   * Get intrinsic width from browser measurements.
   * Delegates to the internal synthetic TextNode's measurement.
   */
  getIntrinsicWidth(node: SlideNumberNode, _height: number, ctx: LayoutContext): number {
    if (!ctx.measurements?.has(node)) {
      throw new Error(`No measurement for SlideNumberNode. Ensure slide is processed through TextMeasurementPipeline.`);
    }
    const result = ctx.measurements.get(node)!;
    return result.contentWidth;
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(slideNumberHandler);
