// Font Utilities Module
// Provides text normalization and font family helpers

import { FONT_WEIGHT, type Font, type FontFamily, type FontWeight, type TextContent, type TextRun, type NormalizedRun, type Theme, type TextStyle, type TextStyleName } from '../core/model/types.js';

/**
 * Get the Font for a given weight from a FontFamily.
 * Throws if requested weight is not defined.
 */
export function getFontFromFamily(fontFamily: FontFamily, weight: FontWeight): Font {
  const font = fontFamily[weight];
  if (!font) {
    throw new Error(`Font weight '${weight}' is not defined in this font family`);
  }
  return font;
}

// ============================================
// FONT WEIGHT
// ============================================

/** CSS numeric font weight for a FontWeight constant */
const FONT_WEIGHT_NUMERIC: Record<string, number> = {
  [FONT_WEIGHT.LIGHT]: 300,
  [FONT_WEIGHT.NORMAL]: 400,
  [FONT_WEIGHT.BOLD]: 700,
};

export function fontWeightToNumeric(weight: FontWeight): number {
  return FONT_WEIGHT_NUMERIC[weight] ?? 400;
}

// ============================================
// TEXT STYLE RESOLUTION
// ============================================

/**
 * Paragraph gap ratio: spacing between paragraphs as a multiple of fontSize.
 *
 * CSS default: <p> elements have margin-top/bottom of 1em.
 * 1em === computed font-size (CSS Values Level 4, §5.1.1).
 * Therefore paragraphGap = fontSize × 1.0.
 *
 * Unlike line-height: normal (which varies per font's OS/2 metrics and must
 * be measured in the browser), this is a CSS specification constant — not a
 * font metric. We express it as a named function for API consistency with
 * fontNormalRatios and to document the assumption in one place.
 */
export function getParagraphGapRatio(): number {
  return 1.0;
}

/** Resolve line height: node override > style override > theme default (bulletSpacing for bullet text) */
export function resolveLineHeight(
  nodeMultiplier: number | undefined,
  style: TextStyle,
  theme: Theme,
  hasBullets?: boolean,
): number {
  const themeDefault = hasBullets ? theme.spacing.bulletSpacing : theme.spacing.lineSpacing;
  return nodeMultiplier ?? style.lineHeightMultiplier ?? themeDefault;
}

// ============================================
// RICH TEXT HELPERS
// ============================================

/**
 * Normalize TextContent to consistent NormalizedRun array.
 * Handles both string and TextRun[] inputs.
 */
export function normalizeContent(content: TextContent): NormalizedRun[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }
  return content.map((run: TextRun) => {
    if (typeof run === 'string') {
      return { text: run };
    }
    return run;
  });
}
