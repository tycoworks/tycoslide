// Font Utilities Module
// Provides text measurement and rich text processing using fontkit

import { openSync, type Font as FontkitFont } from 'fontkit';
import { FONT_WEIGHT, type Font, type FontFamily, type FontWeight, type TextStyle, type TextContent, type TextRun, type NormalizedRun } from '../core/types.js';

// Unit conversion constants
export const POINTS_PER_INCH = 72;
export const ptToIn = (pt: number): number => pt / POINTS_PER_INCH;
export const inToPt = (inches: number): number => inches * POINTS_PER_INCH;

// Fontkit and PowerPoint measure text differently (kerning, hinting, platform).
// PACKING_EFFICIENCY represents how much of fontkit's predicted space PowerPoint uses.
// This constant is private - all usage goes through helper functions that enforce consistency.
const PACKING_EFFICIENCY = 0.75;
const SINGLE_LINE_THRESHOLD = 1.0;

/**
 * Apply packing buffer for height estimation.
 * Shrinks available width to account for PowerPoint's tighter rendering.
 */
export function applyPackingForHeight(availableWidth: number): number {
  return availableWidth * PACKING_EFFICIENCY;
}

/**
 * Apply packing buffer for width reporting.
 * Expands measured width to give PowerPoint headroom.
 * This is the reciprocal of applyPackingForHeight - same constant, inverse operation.
 */
export function applyPackingForWidth(measuredWidth: number): number {
  return measuredWidth / PACKING_EFFICIENCY;
}

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
 * Measure the total unwrapped width of content (all runs on one line).
 * Shared by estimateLines, Text.getWidth, List.getWidth.
 */
export function measureContentWidth(content: TextContent, style: TextStyle): number {
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
  const runs = normalizeContent(content);
  let totalWidth = 0;
  for (const run of runs) {
    const weight = run.weight ?? defaultWeight;
    const font = getFontFromFamily(style.fontFamily, weight);
    totalWidth += measureText(run.text, font.path, style.fontSize);
  }
  return totalWidth;
}

/**
 * Get the width needed to render content without wrapping.
 * Includes packing buffer for PowerPoint rendering differences.
 */
export function getContentWidth(content: TextContent, style: TextStyle): number {
  return applyPackingForWidth(measureContentWidth(content, style));
}

/**
 * Estimate the number of wrapped lines for content at a given width.
 *
 * Two-tier conservative approach:
 * 1. If text clearly fits on one line (ratio < threshold), return 1
 * 2. For longer text, use conservative packing efficiency
 *
 * Extra whitespace is preferable to text overflow.
 */
export function estimateLines(content: TextContent, style: TextStyle, availableWidth: number): number {
  const totalWidth = measureContentWidth(content, style);
  const ratio = totalWidth / availableWidth;

  // Tier 1: Text fits on one line - no packing penalty applies
  if (ratio <= SINGLE_LINE_THRESHOLD) {
    return 1;
  }

  // Tier 2: Text wraps - apply packing buffer
  const effectiveWidth = applyPackingForHeight(availableWidth);
  return Math.max(1, Math.ceil(totalWidth / effectiveWidth));
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
