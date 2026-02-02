// Font Utilities Module
// Provides text measurement and rich text processing using fontkit

import { openSync, type Font as FontkitFont } from 'fontkit';
import { ptToIn } from './units.js';
import { FONT_WEIGHT, type Font, type FontFamily, type FontWeight, type TextStyle, type TextContent, type TextRun, type NormalizedRun } from '../core/types.js';

const fontCache: Map<string, FontkitFont> = new Map();

function loadFont(fontPath: string): FontkitFont {
  let font = fontCache.get(fontPath);
  if (!font) {
    font = openSync(fontPath);
    fontCache.set(fontPath, font);
  }
  return font;
}

/**
 * Get the Font for a given weight from a FontFamily
 * Throws if requested weight is not defined
 */
export function getFontFromFamily(fontFamily: FontFamily, weight: FontWeight): Font {
  const font = fontFamily[weight];
  if (!font) {
    throw new Error(`Font weight '${weight}' is not defined in this font family`);
  }
  return font;
}

/**
 * Measure text width in inches
 */
export function measureText(text: string, fontPath: string, fontSize: number): number {
  const font = loadFont(fontPath);
  const run = font.layout(text);
  const widthInFontUnits = run.advanceWidth;
  const widthInPoints = (widthInFontUnits / font.unitsPerEm) * fontSize;
  return ptToIn(widthInPoints);
}

/**
 * Get actual line height in inches based on font metrics (ascent + descent + lineGap)
 */
export function getLineHeight(fontPath: string, fontSize: number): number {
  const font = loadFont(fontPath);
  // descent is typically negative, so we use Math.abs
  const lineHeightUnits = font.ascent + Math.abs(font.descent) + font.lineGap;
  const lineHeightPoints = (lineHeightUnits / font.unitsPerEm) * fontSize;
  return ptToIn(lineHeightPoints);
}

// ============================================
// TEXT STYLE HELPERS
// ============================================

/**
 * Get the line height in inches for a TextStyle
 */
export function getStyleLineHeight(style: TextStyle): number {
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
  const defaultFont = getFontFromFamily(style.fontFamily, defaultWeight);
  return getLineHeight(defaultFont.path, style.fontSize);
}

/**
 * Estimate the number of wrapped lines for content at a given width.
 * Uses total text width / available width — same heuristic PowerPoint uses.
 */
export function estimateLines(content: TextContent, style: TextStyle, availableWidth: number): number {
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
  const runs = normalizeContent(content);
  let totalWidth = 0;
  for (const run of runs) {
    const weight = run.weight ?? defaultWeight;
    const font = getFontFromFamily(style.fontFamily, weight);
    totalWidth += measureText(run.text, font.path, style.fontSize);
  }
  return Math.max(1, Math.ceil(totalWidth / availableWidth));
}

// ============================================
// RICH TEXT HELPERS
// ============================================

/**
 * Normalize TextContent to consistent NormalizedRun array
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
