// TEXT Node Handler
// Consolidates all TEXT-related logic from compute-layout.ts, render.ts, measure.ts, and intrinsics.ts

import { NODE_TYPE, type TextNode, type PositionedNode } from '../core/nodes.js';
import type { Theme, TextStyleName, TextContent } from '../core/types.js';
import { TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import type { Canvas, TextFragment, TextFragmentOptions } from '../core/canvas.js';
import type { MeasurementRequests } from '../core/measure.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { getFontFromFamily, normalizeContent } from '../utils/font-utils.js';
import { log, contentPreview } from '../utils/log.js';

// ============================================
// TEXT RENDERING HELPERS
// ============================================

function buildTextFragments(
  content: TextContent,
  styleName: TextStyleName,
  theme: Theme,
  colorOverride?: string
): TextFragment[] {
  const style = theme.textStyles[styleName];
  const defaultColor = colorOverride ?? style.color ?? theme.colors.text;
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;

  const normalized = normalizeContent(content);
  return normalized.map(run => {
    const runWeight = run.weight ?? defaultWeight;
    const runFont = getFontFromFamily(style.fontFamily, runWeight);
    const options: TextFragmentOptions = {
      color: run.color ?? run.highlight?.text ?? defaultColor,
      fontFace: runFont.name,
    };
    if (run.highlight) options.highlight = run.highlight.bg;
    return { text: run.text, options };
  });
}

function renderText(
  canvas: Canvas,
  content: TextContent,
  styleName: TextStyleName,
  theme: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  hAlign?: string,
  vAlign?: string,
  colorOverride?: string
): void {
  const style = theme.textStyles[styleName];
  const defaultFont = getFontFromFamily(style.fontFamily, style.defaultWeight ?? FONT_WEIGHT.NORMAL);
  const fragments = buildTextFragments(content, styleName, theme, colorOverride);

  log.render.text('renderText style=%s x=%f y=%f w=%f h=%f align=%s/%s "%s"',
    styleName, x, y, w, h, hAlign ?? 'left', vAlign ?? 'top', contentPreview(content));

  canvas.addText(fragments, {
    x, y, w, h,
    fontSize: style.fontSize,
    fontFace: defaultFont.name,
    color: colorOverride ?? style.color ?? theme.colors.text,
    margin: 0,
    wrap: true,
    lineSpacingMultiple: 1.0,
    align: (hAlign as any) ?? HALIGN.LEFT,
    valign: (vAlign as any) ?? VALIGN.TOP,
  });
}

// ============================================
// MEASUREMENT HELPERS
// ============================================

function textToString(content: TextContent): string {
  if (typeof content === 'string') return content;
  return content.map(run => typeof run === 'string' ? run : run.text).join('');
}

function makeTextKey(styleName: TextStyleName, availableWidth: number, content: TextContent): string {
  return `text|${styleName}|${availableWidth.toFixed(4)}|${textToString(content)}`;
}

function makeStyleKey(styleName: TextStyleName): string {
  return `style|${styleName}`;
}

// ============================================
// TEXT HANDLER
// ============================================

export const textHandler: ElementHandler<TextNode> = {
  nodeType: NODE_TYPE.TEXT,

  /**
   * Compute text height based on line count and line height.
   */
  getHeight(node: TextNode, width: number, ctx: LayoutContext): number {
    const styleName = node.style ?? TEXT_STYLE.BODY;
    const style = ctx.theme.textStyles[styleName];
    const lineHeight = ctx.measurer.getStyleLineHeight(style);
    const lines = ctx.measurer.estimateLines(node.content, style, width);
    const height = lineHeight * lines;
    log.layout.text('HEIGHT text style=%s width=%f lineHeight=%f lines=%d -> %f "%s"',
      styleName, width, lineHeight, lines, height, contentPreview(node.content));
    return height;
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
   * Render text to canvas.
   */
  render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
    const textNode = positioned.node as TextNode;
    log.render.text('RENDER text x=%f y=%f w=%f h=%f "%s"',
      positioned.x, positioned.y, positioned.width, positioned.height, contentPreview(textNode.content));
    renderText(
      canvas,
      textNode.content,
      textNode.style ?? TEXT_STYLE.BODY,
      theme,
      positioned.x, positioned.y, positioned.width, positioned.height,
      textNode.hAlign,
      textNode.vAlign,
      textNode.color
    );
  },

  /**
   * Collect text measurement requests for browser-based measurement.
   */
  collectMeasurements(node: TextNode, bounds: Bounds, theme: Theme): MeasurementRequests {
    const styleName = node.style ?? TEXT_STYLE.BODY;
    const textId = makeTextKey(styleName, bounds.w, node.content);
    const styleId = makeStyleKey(styleName);

    return {
      text: [{
        id: textId,
        content: node.content,
        style: theme.textStyles[styleName],
        availableWidth: bounds.w,
      }],
      styles: [{
        id: styleId,
        style: theme.textStyles[styleName],
      }],
    };
  },

  /**
   * Get intrinsic width of text content.
   */
  getIntrinsicWidth(node: TextNode, _height: number, ctx: LayoutContext): number {
    const styleName = node.style ?? TEXT_STYLE.BODY;
    const style = ctx.theme.textStyles[styleName];
    return ctx.measurer.getContentWidth(node.content, style);
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(textHandler);
