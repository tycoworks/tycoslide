// LINE Node Handler
// Consolidates all LINE-related logic from compute-layout.ts, render.ts, and intrinsics.ts

import { NODE_TYPE, type LineNode, type PositionedNode } from '../core/nodes.js';
import type { Theme } from '../core/types.js';
import { SHAPE, DIRECTION } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import type { Canvas } from '../core/canvas.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { ptToIn } from '../utils/font-utils.js';
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
   * Render line to canvas.
   * Orientation detected from positioned dimensions.
   */
  render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
    const lineNode = positioned.node as LineNode;
    const color = lineNode.color ?? theme.colors.secondary;
    const width = lineNode.width ?? theme.borders.width;

    // Detect orientation from positioned dimensions
    // Vertical if height > width, horizontal otherwise
    const isVertical = positioned.height > positioned.width;

    if (isVertical) {
      log.render.shape('RENDER vertical line x=%f y=%f h=%f', positioned.x, positioned.y, positioned.height);
      canvas.addShape(SHAPE.LINE, {
        x: positioned.x,
        y: positioned.y,
        w: 0,
        h: positioned.height,
        line: { color, width },
      });
    } else {
      log.render.shape('RENDER horizontal line x=%f y=%f w=%f', positioned.x, positioned.y, positioned.width);
      canvas.addShape(SHAPE.LINE, {
        x: positioned.x,
        y: positioned.y,
        w: positioned.width,
        h: 0,
        line: { color, width },
      });
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
