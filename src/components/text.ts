// Text Component
// Renders text with theme-aware defaults, supports rich text with per-run styling
// Height is estimated from font metrics; PowerPoint handles wrapping (wrap: true)

import { HALIGN, VALIGN, FONT_WEIGHT, TEXT_STYLE, type Component, type Drawer, type Bounds, type Theme, type TextStyle, type TextStyleName, type HorizontalAlignment, type VerticalAlignment, type FontWeight, type TextContent, type AlignContext } from '../core/types.js';
import { getFontFromFamily, normalizeContent } from '../utils/font-utils.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import type { TextFragment, TextFragmentOptions } from '../core/canvas.js';
import { log } from '../utils/log.js';

// Re-export types for backward compatibility
export type { TextRun, TextContent } from '../core/types.js';

export interface TextProps {
  style?: TextStyleName;  // Always lookup by name from theme
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export class Text implements Component {
  constructor(private theme: Theme, private measurer: TextMeasurer, private content: TextContent, private props: TextProps = {}) {}

  private getStyle(): TextStyle {
    return this.theme.textStyles[this.props.style ?? TEXT_STYLE.BODY];
  }

  getHeight(width: number): number {
    const style = this.getStyle();
    const lineHeight = this.measurer.getStyleLineHeight(style);
    const lines = this.measurer.estimateLines(this.content, style, width);
    const h = lineHeight * lines;
    log('text getHeight: w=%f lines=%d lineH=%f → h=%f', width, lines, lineHeight, h);
    return h;
  }

  getMinHeight(width: number): number { return this.getHeight(width); }

  getWidth(_height: number): number {
    return this.measurer.getContentWidth(this.content, this.getStyle());
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const style = this.getStyle();
    const preview = typeof this.content === 'string' ? this.content.slice(0, 20) : 'rich';
    log('text prepare "%s": bounds=[%f,%f %fx%f]', preview, bounds.x, bounds.y, bounds.w, bounds.h);
    const defaultColor = this.props.color ?? style.color ?? this.theme.colors.text;
    const defaultWeight: FontWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const defaultFont = getFontFromFamily(style.fontFamily, defaultWeight);

    // Text alignment: only from explicit props, default left (layout's cross-axis align is for positioning, not text)
    const align = this.props.hAlign ?? HALIGN.LEFT;
    const valign: VerticalAlignment = this.props.vAlign ?? alignContext?.vAlign ?? VALIGN.TOP;

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
