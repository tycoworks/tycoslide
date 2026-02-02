// Text Component
// Renders text with theme-aware defaults, supports rich text with per-run styling
// Height is estimated from font metrics; PowerPoint handles wrapping (wrap: true)

import { VALIGN, FONT_WEIGHT, TEXT_STYLE, DIRECTION, ALIGN, type Component, type Drawer, type Bounds, type Theme, type TextStyle, type TextStyleName, type TextAlignment, type VerticalAlignment, type FontWeight, type TextContent, type AlignContext, type Align } from '../core/types.js';
import { getFontFromFamily, normalizeContent, getStyleLineHeight, estimateLines } from '../utils/font-utils.js';
import type { TextFragment, TextFragmentOptions } from '../core/canvas.js';
import { log } from '../utils/log.js';

// Re-export types for backward compatibility
export type { TextRun, TextContent } from '../core/types.js';

export interface TextProps {
  style?: TextStyleName;  // Always lookup by name from theme
  color?: string;
  align?: TextAlignment;
}

export class Text implements Component {
  constructor(private theme: Theme, private content: TextContent, private props: TextProps = {}) {}

  private getStyle(): TextStyle {
    return this.theme.textStyles[this.props.style ?? TEXT_STYLE.BODY];
  }

  getHeight(width: number): number {
    const style = this.getStyle();
    const lineHeight = getStyleLineHeight(style);
    const lines = estimateLines(this.content, style, width);
    const h = lineHeight * lines;
    log('text getHeight: w=%f lines=%d lineH=%f → h=%f', width, lines, lineHeight, h);
    return h;
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const style = this.getStyle();
    const defaultColor = this.props.color ?? style.color ?? this.theme.colors.text;
    const align = this.props.align;
    const defaultWeight: FontWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const defaultFont = getFontFromFamily(style.fontFamily, defaultWeight);

    // Map cross-axis alignment to valign when parent direction is ROW
    let valign: VerticalAlignment = VALIGN.TOP;
    if (alignContext?.direction === DIRECTION.ROW) {
      const valignMap: Record<Align, VerticalAlignment> = {
        [ALIGN.START]: VALIGN.TOP,
        [ALIGN.CENTER]: VALIGN.MIDDLE,
        [ALIGN.END]: VALIGN.BOTTOM,
      };
      valign = valignMap[alignContext.align];
    }

    // Build text fragments — no wrapping, no splitting across lines
    // PowerPoint handles wrapping with wrap: true
    const normalized = normalizeContent(this.content);
    const pptxContent: TextFragment[] = normalized.map(run => {
      const runWeight = run.weight ?? defaultWeight;
      const runFont = getFontFromFamily(style.fontFamily, runWeight);
      const options: TextFragmentOptions = {
        color: run.color ?? run.highlight?.text ?? defaultColor,
        fontFace: runFont.name,
      };
      if (run.highlight) options.highlight = run.highlight.bg;
      return { text: run.text, options };
    });

    return (canvas) => {
      canvas.addText(pptxContent, {
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        fontSize: style.fontSize,
        fontFace: defaultFont.name,
        color: defaultColor,
        margin: 0,
        wrap: true,
        lineSpacingMultiple: 1.0,
        align,
        valign,
      });
    };
  }
}
