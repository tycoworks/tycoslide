// Font Utilities Module
// Provides text measurement and rich text processing using fontkit

import { openSync, type Font as FontkitFont } from 'fontkit';
import { FONT_WEIGHT, type Font, type FontFamily, type FontWeight, type TextStyle, type TextContent, type TextRun, type NormalizedRun, type Theme } from '../core/types.js';
import { log, contentPreview } from './log.js';

// Unit conversion constants
export const POINTS_PER_INCH = 72;
export const ptToIn = (pt: number): number => pt / POINTS_PER_INCH;
export const inToPt = (inches: number): number => inches * POINTS_PER_INCH;

// Calibration Constants
// Fontkit measures text using font metrics, but presentation software renders differently.
// These calibration factors bridge fontkit's theoretical measurements to practical rendering.
// Derived empirically by comparing fontkit estimates to actual output.

// Width: Presentation software packs text ~25% tighter than fontkit predicts (kerning, hinting, platform differences)
const WIDTH_CALIBRATION = 0.75;

// Height: Presentation software renders lines ~12% shorter than fontkit's ascent+descent+lineGap suggests
const HEIGHT_CALIBRATION = 0.88;

const SINGLE_LINE_THRESHOLD = 1.0;

/**
 * Apply packing buffer for height estimation.
 * Shrinks available width to account for PowerPoint's tighter rendering.
 */
export function applyPackingForHeight(availableWidth: number): number {
  return availableWidth * WIDTH_CALIBRATION;
}

/**
 * Apply packing buffer for width reporting.
 * Expands measured width to give PowerPoint headroom.
 * This is the reciprocal of applyPackingForHeight - same constant, inverse operation.
 */
export function applyPackingForWidth(measuredWidth: number): number {
  return measuredWidth / WIDTH_CALIBRATION;
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
  const widthInInches = ptToIn(widthInPoints);
  log.measure.width('measureText "%s" font=%s size=%f -> %f in',
    contentPreview(text, 40), fontPath.split('/').pop(), fontSize, widthInInches);
  return widthInInches;
}

/**
 * Get line height in inches based on font metrics, calibrated for PowerPoint rendering.
 * Raw fontkit metrics (ascent + descent + lineGap) overestimate compared to PowerPoint.
 */
export function getLineHeight(fontPath: string, fontSize: number): number {
  const font = loadFont(fontPath);
  // descent is typically negative, so we use Math.abs
  const lineHeightUnits = font.ascent + Math.abs(font.descent) + font.lineGap;
  const lineHeightPoints = (lineHeightUnits / font.unitsPerEm) * fontSize;
  const rawHeight = ptToIn(lineHeightPoints);
  const calibratedHeight = rawHeight * HEIGHT_CALIBRATION;
  log.measure.height('getLineHeight font=%s size=%f raw=%f calibrated=%f',
    fontPath.split('/').pop(), fontSize, rawHeight, calibratedHeight);
  return calibratedHeight;
}

// ============================================
// TEXT STYLE HELPERS
// ============================================

/**
 * Get the line height in inches for a TextStyle.
 * Uses style.lineHeightMultiplier if set, otherwise theme.spacing.lineSpacing.
 */
export function getStyleLineHeight(style: TextStyle, theme: Theme): number {
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
  const defaultFont = getFontFromFamily(style.fontFamily, defaultWeight);
  const baseHeight = getLineHeight(defaultFont.path, style.fontSize);
  const multiplier = style.lineHeightMultiplier ?? theme.spacing.lineSpacing;
  return baseHeight * multiplier;
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

  log.measure.lines('estimateLines available=%f totalWidth=%f ratio=%f threshold=%f',
    availableWidth, totalWidth, ratio, SINGLE_LINE_THRESHOLD);
  log.measure.lines('  content="%s"', contentPreview(content, 50));

  // Tier 1: Text fits on one line - no packing penalty applies
  if (ratio <= SINGLE_LINE_THRESHOLD) {
    log.measure.lines('  -> 1 line (fits single line)');
    return 1;
  }

  // Tier 2: Text wraps - apply packing buffer
  const effectiveWidth = applyPackingForHeight(availableWidth);
  const lines = Math.max(1, Math.ceil(totalWidth / effectiveWidth));
  log.measure.lines('  effectiveWidth=%f (with packing) -> %d lines', effectiveWidth, lines);
  return lines;
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
