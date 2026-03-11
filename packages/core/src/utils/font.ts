// Font Utilities Module
// Provides text normalization and font family helpers

import { type Font, type FontFamily, type TextContent, type TextRun, type NormalizedRun } from '../core/model/types.js';

/**
 * Supported font formats for @font-face CSS and theme validation.
 * Used by themeValidator (format check) and layoutHtml (CSS generation).
 */
export const FONT_FORMATS: Record<string, { mime: string; format: string }> = {
  '.woff2': { mime: 'font/woff2', format: 'woff2' },
  '.woff': { mime: 'font/woff', format: 'woff' },
  '.ttf': { mime: 'font/ttf', format: 'truetype' },
  '.otf': { mime: 'font/opentype', format: 'opentype' },
};

/**
 * Get the Font for a run's bold/italic flags from a FontFamily.
 * Falls back to regular when optional slots are missing.
 */
export function getFontForRun(fontFamily: FontFamily, bold?: boolean, italic?: boolean): Font {
  if (bold && italic) return fontFamily.boldItalic ?? fontFamily.bold ?? fontFamily.regular;
  if (bold) return fontFamily.bold ?? fontFamily.regular;
  if (italic) return fontFamily.italic ?? fontFamily.regular;
  return fontFamily.regular;
}

/**
 * Resolve the PPTX fontFace for a run's bold/italic state.
 * Uses Font.name when the font belongs to a different typeface
 * than its parent FontFamily (e.g., interLight's bold is "Inter").
 * Falls back to family.name when font.name is not set.
 */
export function resolveFontFace(family: FontFamily, bold?: boolean, italic?: boolean): string {
  const font = getFontForRun(family, bold, italic);
  return font.name ?? family.name;
}

/**
 * Duck-type check: is this value a FontFamily object?
 * Checks for required `name` string and `regular` property with `path` string.
 */
export function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === 'object' && value !== null &&
    'name' in value && typeof (value as any).name === 'string' &&
    'regular' in value && typeof (value as any).regular === 'object' &&
    (value as any).regular !== null &&
    typeof (value as any).regular.path === 'string';
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
