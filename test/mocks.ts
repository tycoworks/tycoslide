// Test Mocks
// Shared mock utilities for testing the declarative pipeline

import * as assert from 'node:assert';
import type { TextMeasurer } from '../src/utils/text-measurer.js';
import type { Theme, TextStyle, FontFamily } from '../src/core/types.js';
import { TEXT_STYLE, GAP } from '../src/core/types.js';

// ============================================
// MOCK TEXT MEASURER
// ============================================

/**
 * Create a mock TextMeasurer with configurable return values.
 * Default: 0.25" line height, 1 line per text block, 1" content width
 */
export function mockMeasurer(options?: {
  lineHeight?: number;
  lines?: number;
  contentWidth?: number;
}): TextMeasurer {
  const lineHeight = options?.lineHeight ?? 0.25;
  const lines = options?.lines ?? 1;
  const contentWidth = options?.contentWidth ?? 1;

  return {
    getStyleLineHeight: () => lineHeight,
    estimateLines: () => lines,
    getContentWidth: () => contentWidth,
  };
}

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  normal: { name: 'Arial', path: '/fonts/Arial.ttf' },
  bold: { name: 'Arial Bold', path: '/fonts/Arial-Bold.ttf' },
};

const mockTextStyle: TextStyle = {
  fontSize: 12,
  fontFamily: mockFontFamily,
};

/**
 * Create a mock Theme with configurable spacing.
 * All text styles point to the same mock style.
 */
export function mockTheme(options?: {
  gap?: number;
  gapTight?: number;
  gapLoose?: number;
  padding?: number;
  cellPadding?: number;
  bulletSpacing?: number;
  margin?: number;
}): Theme {
  const gap = options?.gap ?? 0.25;
  const gapTight = options?.gapTight ?? 0.125;
  const gapLoose = options?.gapLoose ?? 0.5;
  const padding = options?.padding ?? 0.25;
  const cellPadding = options?.cellPadding ?? 0.1;
  const bulletSpacing = options?.bulletSpacing ?? 1.2;
  const margin = options?.margin ?? 0.5;

  return {
    slide: { width: 13.333, height: 7.5 },
    colors: {
      primary: 'FF0000',
      background: 'FFFFFF',
      secondary: '333333',
      accent1: '00FF00',
      accent2: '0000FF',
      accent3: 'FFFF00',
      accent4: 'FF00FF',
      accent5: '00FFFF',
      text: '000000',
      textMuted: '666666',
      subtleOpacity: 20,
    },
    spacing: {
      gap,
      gapTight,
      gapLoose,
      padding,
      cellPadding,
      bulletSpacing,
      margin,
    },
    textStyles: {
      [TEXT_STYLE.H1]: mockTextStyle,
      [TEXT_STYLE.H2]: mockTextStyle,
      [TEXT_STYLE.H3]: mockTextStyle,
      [TEXT_STYLE.H4]: mockTextStyle,
      [TEXT_STYLE.BODY]: mockTextStyle,
      [TEXT_STYLE.SMALL]: mockTextStyle,
      [TEXT_STYLE.FOOTER]: mockTextStyle,
    },
  } as Theme;
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a number is approximately equal to expected value.
 */
export function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${msg}: expected ~${expected}, got ${actual}`
  );
}

/**
 * Assert that two numbers are approximately equal.
 */
export function assertApprox(actual: number, expected: number, tolerance = 0.01): void {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ~${expected}, got ${actual}`
  );
}
