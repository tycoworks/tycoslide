// RECTANGLE Element Handler
// Layout logic for rectangle nodes

import { NODE_TYPE, type RectangleNode, type PositionedNode } from '../core/nodes.js';
import type { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { log } from '../utils/log.js';

// ============================================
// RECTANGLE HANDLER
// ============================================

export const rectangleHandler: ElementHandler<RectangleNode> = {
  nodeType: NODE_TYPE.RECTANGLE,

  /**
   * Rectangle is a pure visual shape - no intrinsic height, fills bounds.
   */
  getHeight(_node: RectangleNode, _width: number, _ctx: LayoutContext): number {
    log.layout.height('HEIGHT rectangle -> 0 (fills bounds)');
    return 0;
  },

  /**
   * Rectangle has no minimum height - fully compressible.
   */
  getMinHeight(_node: RectangleNode, _width: number, _ctx: LayoutContext): number {
    return 0;
  },

  /**
   * Compute layout for RECTANGLE.
   * Simply fills its bounds.
   */
  computeLayout(node: RectangleNode, bounds: Bounds, _ctx: LayoutContext): PositionedNode {
    const rectHeight = bounds.h > 0 ? bounds.h : 0;

    log.layout._('LAYOUT rectangle {x=%f y=%f w=%f h=%f}',
      bounds.x, bounds.y, bounds.w, rectHeight);

    return {
      node,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: rectHeight,
    };
  },

  /**
   * Rectangle has no intrinsic width - fills bounds.
   */
  getIntrinsicWidth(_node: RectangleNode, _height: number, _ctx: LayoutContext): number {
    return 0;
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(rectangleHandler);
