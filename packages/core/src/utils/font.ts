// Font Utilities Module
// Provides text normalization and font family helpers

import { FONT_WEIGHT, type Font, type FontFamily, type FontWeight, type TextContent, type TextRun, type NormalizedRun } from '../core/model/types.js';

/**
 * Get the Font for a given weight from a FontFamily.
 * Returns the Font object directly from the family.
 * Throws if requested weight is not defined.
 */
export function getFontFromFamily(fontFamily: FontFamily, weight: FontWeight): Font {
  const font = fontFamily[weight];
  if (!font) {
    throw new Error(`Font weight '${weight}' is not defined in font family '${fontFamily.normal.name}'`);
  }
  return font;
}

/**
 * Duck-type check: is this value a FontFamily object?
 * Checks for required `normal` property with `name` and `path` strings.
 */
export function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === 'object' && value !== null &&
    'normal' in value && typeof (value as any).normal === 'object' &&
    (value as any).normal !== null &&
    typeof (value as any).normal.name === 'string' &&
    typeof (value as any).normal.path === 'string';
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
