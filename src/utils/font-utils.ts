// Font Utilities Module
// Provides text measurement, word wrapping, and rich text processing using fontkit

import { openSync, type Font as FontkitFont } from 'fontkit';
import { ptToIn } from './units.js';
import type { Font, FontFamily, FontWeight, TextContent, TextRun, NormalizedRun } from '../core/types.js';

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

/**
 * A text segment with its font for measurement
 */
export interface TextSegment {
  text: string;
  fontPath: string;
}

/**
 * Measure width of multiple segments, each with its own font
 */
function measureSegments(segments: TextSegment[], fontSize: number, start: number, end: number): number {
  let totalWidth = 0;
  let pos = 0;

  for (const segment of segments) {
    const segStart = pos;
    const segEnd = pos + segment.text.length;

    // Check if this segment overlaps with our range
    if (segEnd > start && segStart < end) {
      const sliceStart = Math.max(0, start - segStart);
      const sliceEnd = Math.min(segment.text.length, end - segStart);
      const slice = segment.text.slice(sliceStart, sliceEnd);
      if (slice) {
        totalWidth += measureText(slice, segment.fontPath, fontSize);
      }
    }

    pos = segEnd;
  }

  return totalWidth;
}

/**
 * Word wrap text to fit within width, returns array of lines
 * Overloaded: accepts either plain text + font, or rich text segments
 */
export function wrapText(text: string, fontPath: string, fontSize: number, width: number): string[];
export function wrapText(segments: TextSegment[], fontSize: number, width: number): string[];
export function wrapText(
  textOrSegments: string | TextSegment[],
  fontPathOrFontSize: string | number,
  fontSizeOrWidth: number,
  width?: number
): string[] {
  // Normalize to segments array
  const segments: TextSegment[] = typeof textOrSegments === 'string'
    ? [{ text: textOrSegments, fontPath: fontPathOrFontSize as string }]
    : textOrSegments;
  const fontSize = typeof textOrSegments === 'string' ? fontSizeOrWidth : (fontPathOrFontSize as number);
  const actualWidth = typeof textOrSegments === 'string' ? width! : fontSizeOrWidth;

  // Combine all text for word boundary detection
  const fullText = segments.map(s => s.text).join('');
  if (!fullText) return [''];

  // Find word boundaries
  const wordBoundaries: Array<{ start: number; end: number }> = [];
  const wordRegex = /\S+/g;
  let match;
  while ((match = wordRegex.exec(fullText)) !== null) {
    wordBoundaries.push({ start: match.index, end: match.index + match[0].length });
  }

  if (wordBoundaries.length === 0) return [''];

  const lines: string[] = [];
  let lineStart = 0;
  let lineEndWord = 0;

  for (let i = 0; i < wordBoundaries.length; i++) {
    const testEnd = wordBoundaries[i].end;
    const testWidth = measureSegments(segments, fontSize, lineStart, testEnd);

    if (testWidth > actualWidth && i > lineEndWord) {
      const prevWordEnd = wordBoundaries[i - 1].end;
      lines.push(fullText.slice(lineStart, prevWordEnd));
      lineStart = wordBoundaries[i].start;
      lineEndWord = i;
    } else {
      lineEndWord = i;
    }
  }

  const lastWordEnd = wordBoundaries[wordBoundaries.length - 1].end;
  lines.push(fullText.slice(lineStart, lastWordEnd));

  return lines.length > 0 ? lines : [''];
}

/**
 * Calculate text height in inches for wrapped text
 */
export function measureTextHeight(
  text: string,
  fontPath: string,
  fontSize: number,
  width: number,
  lineHeight: number
): number {
  const lines = wrapText(text, fontPath, fontSize, width);
  return ptToIn(fontSize) * lineHeight * lines.length;
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

/**
 * Build measurement segments from normalized runs with resolved fonts
 */
export function buildSegments(
  runs: NormalizedRun[],
  fontFamily: FontFamily,
  defaultWeight: FontWeight
): TextSegment[] {
  return runs.map(run => {
    const weight = run.weight ?? defaultWeight;
    const font = getFontFromFamily(fontFamily, weight);
    return { text: run.text, fontPath: font.path };
  });
}

/**
 * Split runs across wrapped lines, preserving formatting
 * Takes normalized runs and line strings, returns runs grouped by line
 */
export function splitRunsIntoLines(
  runs: NormalizedRun[],
  lines: string[]
): NormalizedRun[][] {
  const result: NormalizedRun[][] = [];
  let runIndex = 0;
  let charInRun = 0;

  for (const line of lines) {
    const lineRuns: NormalizedRun[] = [];
    let remaining = line.length;

    while (remaining > 0 && runIndex < runs.length) {
      const run = runs[runIndex];
      const availableInRun = run.text.length - charInRun;
      const takeChars = Math.min(remaining, availableInRun);

      if (takeChars > 0) {
        lineRuns.push({
          text: run.text.slice(charInRun, charInRun + takeChars),
          color: run.color,
          highlight: run.highlight,
          weight: run.weight,
        });
      }

      charInRun += takeChars;
      remaining -= takeChars;

      // Move to next run if we've consumed this one
      if (charInRun >= run.text.length) {
        runIndex++;
        charInRun = 0;
      }
    }

    // Skip whitespace between lines (the space that became the line break)
    if (runIndex < runs.length) {
      const run = runs[runIndex];
      while (charInRun < run.text.length && run.text[charInRun] === ' ') {
        charInRun++;
      }
      if (charInRun >= run.text.length) {
        runIndex++;
        charInRun = 0;
      }
    }

    result.push(lineRuns);
  }

  return result;
}
