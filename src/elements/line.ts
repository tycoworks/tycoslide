// LINE Element Handler
// Layout logic for line nodes (direction-aware)

import { NODE_TYPE, type LineNode, type PositionedNode } from '../core/nodes.js';
import { DIRECTION } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { ptToIn } from '../utils/text.js';
import { log } from '../utils/log.js';

// ============================================
// LINE HANDLER
// ============================================

export const lineHandler: ElementHandler<LineNode> = {
  nodeType: NODE_TYPE.LINE,

  /**
   * Line height is minimal - just the border width in inches.
   */
  getHeight(_node: LineNode, _width: number, ctx: LayoutContext): number {
    const height = ptToIn(ctx.theme.borders.width);
    log.layout.height('HEIGHT line -> %f', height);
    return height;
  },

  /**
   * Line is incompressible - min height equals height.
   */
  getMinHeight(node: LineNode, width: number, ctx: LayoutContext): number {
    return this.getHeight(node, width, ctx);
  },

  /**
   * Compute layout for LINE.
   * Context-aware: vertical in Row, horizontal in Column.
   */
  computeLayout(node: LineNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
    const strokeHeight = ptToIn(ctx.theme.borders.width);

    if (ctx.parentDirection === DIRECTION.ROW) {
      // Vertical line in Row - spans row height
      const lineHeight = bounds.h > 0 ? bounds.h : strokeHeight;
      log.layout._('  -> positioned vertical line {x=%f y=%f w=%f h=%f}',
        bounds.x, bounds.y, strokeHeight, lineHeight);
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: strokeHeight,
        height: lineHeight,
      };
    } else {
      // Horizontal line in Column (default) - spans column width
      log.layout._('  -> positioned horizontal line {x=%f y=%f w=%f h=%f}',
        bounds.x, bounds.y, bounds.w, strokeHeight);
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: strokeHeight,
      };
    }
  },

  /**
   * Intrinsic width for LINE - minimal, just border width.
   */
  getIntrinsicWidth(_node: LineNode, _height: number, ctx: LayoutContext): number {
    return ptToIn(ctx.theme.borders.width);
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(lineHandler);
