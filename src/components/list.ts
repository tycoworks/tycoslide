// List Component
// Renders a bulleted or numbered list with theme-aware defaults, supports rich text items

import { VALIGN, FONT_WEIGHT, DIRECTION, ALIGN, type Component, type Drawer, type Bounds, type Theme, type TextStyle, type TextContent, type FontWeight, type VerticalAlignment, type AlignContext, type Align } from '../core/types.js';
import { getLineHeight, wrapText, getFontFromFamily, normalizeContent, buildSegments, splitRunsIntoLines } from '../utils/font-utils.js';
import type { TextFragment, TextFragmentOptions } from '../core/canvas.js';

export const LIST_TYPE = {
  BULLET: 'bullet',
  NUMBER: 'number',
} as const;

export type ListType = typeof LIST_TYPE[keyof typeof LIST_TYPE];

export interface ListProps {
  type?: ListType;
  textStyle?: TextStyle;
  color?: string;
  markerColor?: string;
}

export class List implements Component {
  constructor(private theme: Theme, private items: TextContent[], private props: ListProps = {}) {}

  private wrapItem(item: TextContent, style: TextStyle, defaultWeight: FontWeight, width: number): string[] {
    if (typeof item === 'string') {
      const font = getFontFromFamily(style.fontFamily, defaultWeight);
      return wrapText(item, font.path, style.fontSize, width);
    }

    // Rich text - build segments with correct font paths
    const runs = normalizeContent(item);
    const segments = buildSegments(runs, style.fontFamily, defaultWeight);
    return wrapText(segments, style.fontSize, width);
  }

  getMinimumHeight(width: number): number {
    const textStyle = this.props.textStyle ?? this.theme.textStyles.body;
    const defaultWeight = textStyle.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const defaultFont = getFontFromFamily(textStyle.fontFamily, defaultWeight);
    const bulletSpacing = this.theme.spacing.bulletSpacing;
    const lineHeight = getLineHeight(defaultFont.path, textStyle.fontSize);

    // Count total lines including wrapped continuations
    let totalLines = 0;
    for (const item of this.items) {
      const lines = this.wrapItem(item, textStyle, defaultWeight, width);
      totalLines += lines.length;
    }

    return lineHeight * bulletSpacing * totalLines;
  }

  getMaximumHeight(width: number): number {
    return this.getMinimumHeight(width);  // List is fixed height
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const listType = this.props.type ?? LIST_TYPE.BULLET;
    const textStyle = this.props.textStyle ?? this.theme.textStyles.body;
    const defaultWeight = textStyle.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const defaultColor = this.props.color ?? this.theme.colors.text;
    const markerColor = this.props.markerColor ?? this.theme.colors.textMuted;
    const bulletSpacing = this.theme.spacing.bulletSpacing;

    // Map cross-axis alignment to valign when parent direction is ROW
    let valign: VerticalAlignment = VALIGN.TOP;
    if (alignContext?.direction === DIRECTION.ROW) {
      const valignMap: Record<Align, VerticalAlignment> = {
        [ALIGN.START]: VALIGN.TOP,
        [ALIGN.CENTER]: VALIGN.MIDDLE,
        [ALIGN.END]: VALIGN.BOTTOM,
        [ALIGN.STRETCH]: VALIGN.TOP,
      };
      valign = valignMap[alignContext.align];
    }

    // Pre-wrap each item using fontkit
    const textObjects: TextFragment[] = [];

    for (const item of this.items) {
      const lines = this.wrapItem(item, textStyle, defaultWeight, bounds.w);

      // Normalize to runs and split across wrapped lines
      // Works for both plain strings and rich text arrays
      const normalized = normalizeContent(item);
      const lineRuns = splitRunsIntoLines(normalized, lines);

      for (let lineIndex = 0; lineIndex < lineRuns.length; lineIndex++) {
        const runsInLine = lineRuns[lineIndex];
        const isFirstLine = lineIndex === 0;

        for (let runIndex = 0; runIndex < runsInLine.length; runIndex++) {
          const run = runsInLine[runIndex];
          const runWeight = run.weight ?? defaultWeight;
          const runFont = getFontFromFamily(textStyle.fontFamily, runWeight);

          const options: TextFragmentOptions = {
            color: run.color ?? run.highlight?.text ?? defaultColor,
            fontSize: textStyle.fontSize,
            fontFace: runFont.name,
          };

          if (run.highlight) options.highlight = run.highlight.bg;

          // First run of first line gets bullet
          if (isFirstLine && runIndex === 0) {
            options.bullet = listType === LIST_TYPE.NUMBER
              ? { type: LIST_TYPE.NUMBER, color: markerColor }
              : { color: markerColor };
          }
          // First run of continuation lines gets soft break
          if (!isFirstLine && runIndex === 0) {
            options.softBreakBefore = true;
          }

          textObjects.push({ text: run.text, options });
        }
      }
    }

    return (canvas) => {
      canvas.addText(textObjects, {
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        margin: 0,
        wrap: false,
        lineSpacingMultiple: bulletSpacing,
        valign,
      });
    };
  }
}
