// Text Component
// Renders text with theme-aware defaults, supports rich text with per-run styling

import { VALIGN, FONT_WEIGHT, TEXT_STYLE, DIRECTION, ALIGN, type Component, type Drawer, type Bounds, type Theme, type TextStyle, type TextStyleName, type TextAlignment, type VerticalAlignment, type FontWeight, type TextContent, type AlignContext, type Align } from '../core/types.js';
import { getLineHeight, wrapText, getFontFromFamily, normalizeContent, buildSegments, splitRunsIntoLines } from '../utils/font-utils.js';
import type { TextFragment, TextFragmentOptions } from '../core/canvas.js';

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

  getMinimumHeight(width: number): number {
    const style = this.getStyle();
    const defaultWeight: FontWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const defaultFont = getFontFromFamily(style.fontFamily, defaultWeight);
    const lineHeight = getLineHeight(defaultFont.path, style.fontSize);
    const lines = this.wrapContent(style, defaultWeight, width);
    return lineHeight * lines.length;
  }

  /**
   * Wrap content using correct fonts for each segment
   */
  private wrapContent(style: TextStyle, defaultWeight: FontWeight, width: number): string[] {
    if (typeof this.content === 'string') {
      const font = getFontFromFamily(style.fontFamily, defaultWeight);
      return wrapText(this.content, font.path, style.fontSize, width);
    }

    // Rich text - build segments with correct font paths
    const runs = normalizeContent(this.content);
    const segments = buildSegments(runs, style.fontFamily, defaultWeight);
    return wrapText(segments, style.fontSize, width);
  }

  getMaximumHeight(width: number): number {
    return this.getMinimumHeight(width);  // Text is fixed height
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

    // Get wrapped lines using correct fonts for measurement
    const lines = this.wrapContent(style, defaultWeight, bounds.w);

    // Build styled content with wrapping
    // Normalize to runs and split across wrapped lines (works for both string and array)
    const normalized = normalizeContent(this.content);
    const lineRuns = splitRunsIntoLines(normalized, lines);
    const pptxContent: TextFragment[] = [];

    for (let lineIndex = 0; lineIndex < lineRuns.length; lineIndex++) {
      const runsInLine = lineRuns[lineIndex];
      for (let runIndex = 0; runIndex < runsInLine.length; runIndex++) {
        const run = runsInLine[runIndex];
        const runWeight = run.weight ?? defaultWeight;
        const runFont = getFontFromFamily(style.fontFamily, runWeight);

        const options: TextFragmentOptions = {
          color: run.color ?? run.highlight?.text ?? defaultColor,
          fontFace: runFont.name,
        };
        if (run.highlight) options.highlight = run.highlight.bg;
        // First run of each line after the first gets softBreakBefore
        if (lineIndex > 0 && runIndex === 0) {
          options.softBreakBefore = true;
        }
        pptxContent.push({ text: run.text, options });
      }
    }

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
        wrap: false,
        lineSpacingMultiple: 1.0,
        align,
        valign,
      });
    };
  }
}
