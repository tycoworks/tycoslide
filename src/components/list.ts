// List Component
// Renders a bulleted or numbered list with theme-aware defaults, supports rich text items
// Height is estimated from font metrics; PowerPoint handles wrapping (wrap: true)

import { VALIGN, FONT_WEIGHT, type Component, type Drawer, type Bounds, type Theme, type TextStyle, type TextContent, type VerticalAlignment, type AlignContext } from '../core/types.js';
import { getFontFromFamily, normalizeContent, getStyleLineHeight, estimateLines, getContentWidth } from '../utils/font-utils.js';
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

  getHeight(width: number): number {
    const textStyle = this.props.textStyle ?? this.theme.textStyles.body;
    const lineHeight = getStyleLineHeight(textStyle);
    const bulletSpacing = this.theme.spacing.bulletSpacing;

    let totalLines = 0;
    for (const item of this.items) {
      totalLines += estimateLines(item, textStyle, width);
    }

    return lineHeight * bulletSpacing * totalLines;
  }

  getMinHeight(width: number): number { return this.getHeight(width); }

  getWidth(_height: number): number {
    const textStyle = this.props.textStyle ?? this.theme.textStyles.body;
    let maxWidth = 0;
    for (const item of this.items) {
      maxWidth = Math.max(maxWidth, getContentWidth(item, textStyle));
    }
    return maxWidth;
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const listType = this.props.type ?? LIST_TYPE.BULLET;
    const textStyle = this.props.textStyle ?? this.theme.textStyles.body;
    const defaultWeight = textStyle.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const defaultColor = this.props.color ?? this.theme.colors.text;
    const markerColor = this.props.markerColor ?? this.theme.colors.textMuted;
    const bulletSpacing = this.theme.spacing.bulletSpacing;

    // Vertical alignment from context
    const valign: VerticalAlignment = alignContext?.vAlign ?? VALIGN.TOP;

    // Build text fragments — each item is a bulleted paragraph
    // PowerPoint handles wrapping within each item
    const textObjects: TextFragment[] = [];

    for (const item of this.items) {
      const normalized = normalizeContent(item);

      for (let runIndex = 0; runIndex < normalized.length; runIndex++) {
        const run = normalized[runIndex];
        const runWeight = run.weight ?? defaultWeight;
        const runFont = getFontFromFamily(textStyle.fontFamily, runWeight);

        const options: TextFragmentOptions = {
          color: run.color ?? run.highlight?.text ?? defaultColor,
          fontSize: textStyle.fontSize,
          fontFace: runFont.name,
        };

        if (run.highlight) options.highlight = run.highlight.bg;

        // First run of each item gets bullet (starts a new paragraph)
        if (runIndex === 0) {
          options.bullet = listType === LIST_TYPE.NUMBER
            ? { type: LIST_TYPE.NUMBER, color: markerColor }
            : { color: markerColor };
        }

        textObjects.push({ text: run.text, options });
      }
    }

    return (canvas) => {
      canvas.addText(textObjects, {
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        margin: 0,
        wrap: true,
        lineSpacingMultiple: bulletSpacing,
        valign,
      });
    };
  }
}
