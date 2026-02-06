// RECTANGLE Node Handler
// Consolidates all RECTANGLE-related logic from compute-layout.ts and render.ts

import { NODE_TYPE, type RectangleNode, type PositionedNode } from '../nodes.js';
import type { Theme } from '../types.js';
import { SHAPE } from '../types.js';
import type { Bounds } from '../bounds.js';
import type { Canvas } from '../canvas.js';
import { nodeHandlerRegistry, type NodeHandler, type LayoutContext } from './registry.js';
import { log } from '../../utils/log.js';

// ============================================
// RECTANGLE HANDLER
// ============================================

export const rectangleHandler: NodeHandler<RectangleNode> = {
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
   * Render rectangle to canvas.
   */
  render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
    const rectNode = positioned.node as RectangleNode;

    log.render.shape('RENDER rectangle x=%f y=%f w=%f h=%f',
      positioned.x, positioned.y, positioned.width, positioned.height);

    // Draw the shape if fill or border is specified
    if (rectNode.fill || rectNode.border) {
      const shapeType = rectNode.cornerRadius ? SHAPE.ROUND_RECT : SHAPE.RECT;

      // Build shape options
      const shapeOpts: Parameters<typeof canvas.addShape>[1] = {
        x: positioned.x,
        y: positioned.y,
        w: positioned.width,
        h: positioned.height,
      };

      // Fill
      if (rectNode.fill) {
        shapeOpts.fill = {
          color: rectNode.fill.color,
          transparency: rectNode.fill.opacity !== undefined ? 100 - rectNode.fill.opacity : 0,
        };
      }

      // Border - check if any sides are explicitly disabled
      if (rectNode.border) {
        const border = rectNode.border;
        const allSides = border.top !== false && border.right !== false &&
                         border.bottom !== false && border.left !== false;

        if (allSides) {
          // All sides - use standard line
          shapeOpts.line = {
            color: border.color ?? theme.colors.secondary,
            width: border.width ?? theme.borders.width,
          };
        }
        // Per-side borders would need separate line shapes - not yet implemented
      }

      // Corner radius
      if (rectNode.cornerRadius) {
        shapeOpts.rectRadius = rectNode.cornerRadius;
      }

      canvas.addShape(shapeType, shapeOpts);
    }
    // Rectangle is a pure visual shape - no children to render
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
nodeHandlerRegistry.register(rectangleHandler);
