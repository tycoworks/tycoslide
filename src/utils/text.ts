// Font Utilities Module
// Provides text normalization and font family helpers

import { FONT_WEIGHT, type Font, type FontFamily, type FontWeight, type TextContent, type TextRun, type NormalizedRun } from '../core/types.js';

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
