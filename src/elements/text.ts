// TEXT Element Handler
// Layout logic for text nodes (uses browser measurement)

import { NODE_TYPE, type TextNode, type PositionedNode } from '../core/nodes.js';
import { TEXT_STYLE } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { log, contentPreview } from '../utils/log.js';

// ============================================
// TEXT HANDLER
// ============================================

export const textHandler: ElementHandler<TextNode> = {
  nodeType: NODE_TYPE.TEXT,

  /**
   * Compute text height from measurements.
   * Throws if no measurement available.
   */
  getHeight(node: TextNode, width: number, ctx: LayoutContext): number {
    const styleName = node.style ?? TEXT_STYLE.BODY;

    if (!ctx.measurements?.has(node)) {
      throw new Error(`No measurement for TextNode "${contentPreview(node.content)}". Ensure slide is processed through TextMeasurementPipeline.`);
    }

    const result = ctx.measurements.get(node)!;
    log.layout.text('HEIGHT text style=%s width=%f -> %f "%s"',
      styleName, width, result.totalHeight, contentPreview(node.content));
    return result.totalHeight;
  },

  /**
   * Text is incompressible - min height equals height.
   */
  getMinHeight(node: TextNode, width: number, ctx: LayoutContext): number {
    return this.getHeight(node, width, ctx);
  },

  /**
   * Compute layout for TEXT.
   * Constrains height to bounds if overflow.
   */
  computeLayout(node: TextNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
    const height = this.getHeight(node, bounds.w, ctx);

    log.layout._('LAYOUT text bounds={x=%f y=%f w=%f h=%f} computedHeight=%f',
      bounds.x, bounds.y, bounds.w, bounds.h, height);

    // NOTE: Overflow checking is centralized in compute-layout.ts, not here.
    // This ensures consistent enforcement and avoids handlers forgetting to check.

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
   */
  getIntrinsicWidth(node: TextNode, _height: number, ctx: LayoutContext): number {
    if (!ctx.measurements?.has(node)) {
      throw new Error(`No measurement for TextNode "${contentPreview(node.content)}". Ensure slide is processed through TextMeasurementPipeline.`);
    }
    const result = ctx.measurements.get(node)!;
    return result.contentWidth;
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(textHandler);
