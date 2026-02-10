// Font Utilities Module
// Provides text normalization and font family helpers

import { FONT_WEIGHT, TEXT_STYLE, type Font, type FontFamily, type FontWeight, type TextContent, type TextRun, type NormalizedRun, type Theme, type TextStyle, type TextStyleName } from '../core/types.js';

// Re-export unit conversions from centralized module
export { POINTS_PER_INCH, ptToIn, inToPt } from './units.js';

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

/** Resolve line height: node override > style override > theme default */
export function resolveLineHeight(
  nodeMultiplier: number | undefined,
  style: TextStyle,
  theme: Theme,
): number {
  return nodeMultiplier ?? style.lineHeightMultiplier ?? theme.spacing.lineSpacing;
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
