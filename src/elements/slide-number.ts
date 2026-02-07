// SLIDE_NUMBER Node Handler
// Consolidates all SLIDE_NUMBER-related logic from compute-layout.ts, render.ts, and intrinsics.ts

import { NODE_TYPE, type SlideNumberNode, type PositionedNode } from '../core/nodes.js';
import type { Theme } from '../core/types.js';
import { TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import type { Canvas } from '../core/canvas.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { getFontFromFamily } from '../utils/font-utils.js';
import { log } from '../utils/log.js';

// ============================================
// SLIDE_NUMBER HANDLER
// ============================================

export const slideNumberHandler: ElementHandler<SlideNumberNode> = {
  nodeType: NODE_TYPE.SLIDE_NUMBER,

  /**
   * Compute slide number height based on text style line height.
   */
  getHeight(node: SlideNumberNode, _width: number, ctx: LayoutContext): number {
    const styleName = node.style ?? TEXT_STYLE.FOOTER;
    const style = ctx.theme.textStyles[styleName];
    const height = ctx.measurer.getStyleLineHeight(style);
    log.layout.height('HEIGHT slideNumber style=%s -> %f', styleName, height);
    return height;
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
   * Render slide number to canvas.
   */
  render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
    const slideNumNode = positioned.node as SlideNumberNode;
    const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
    const style = theme.textStyles[styleName as keyof typeof theme.textStyles];
    const font = getFontFromFamily(style.fontFamily, FONT_WEIGHT.NORMAL);

    log.render.text('RENDER slideNumber x=%f y=%f w=%f h=%f',
      positioned.x, positioned.y, positioned.width, positioned.height);

    canvas.addSlideNumber({
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
      fontFace: font.name,
      fontSize: style.fontSize,
      color: slideNumNode.color ?? style.color ?? theme.colors.textMuted,
      align: slideNumNode.hAlign ?? HALIGN.RIGHT,
      valign: VALIGN.MIDDLE,
      margin: 0,
    });
  },

  /**
   * Get intrinsic width for slide number.
   * Uses "99" as reasonable max width.
   */
  getIntrinsicWidth(node: SlideNumberNode, _height: number, ctx: LayoutContext): number {
    const styleName = node.style ?? TEXT_STYLE.FOOTER;
    const style = ctx.theme.textStyles[styleName];
    return ctx.measurer.getContentWidth('99', style);
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(slideNumberHandler);
