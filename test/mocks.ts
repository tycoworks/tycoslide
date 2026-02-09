// Test Mocks
// Shared mock utilities for testing the declarative pipeline

import * as assert from 'node:assert';
import type { MeasurementResults } from '../src/layout/pipeline.js';
import type { Theme, TextStyle, FontFamily } from '../src/core/types.js';
import { TEXT_STYLE } from '../src/core/types.js';

// ============================================
// MOCK MEASUREMENT RESULTS
// ============================================

/**
 * Create a mock MeasurementResults with configurable return values.
 * Default: 0.25" total height (1 line), 0.25" line height, 1" content width
 *
 * This mock returns the same values for any node, which is suitable for
 * unit tests that don't depend on specific text content.
 */
export function mockMeasurer(options?: {
  lineHeight?: number;
  lines?: number;
  contentWidth?: number;
}): MeasurementResults {
  const lineHeight = options?.lineHeight ?? 0.25;
  const lines = options?.lines ?? 1;
  const contentWidth = options?.contentWidth ?? 1;

  return {
    get: () => ({
      componentId: 'mock',
      lines,
      lineHeight,
      totalHeight: lineHeight * lines,
      contentWidth,
    }),
    has: () => true,
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
  maxScaleFactor?: number;
  lineSpacing?: number;
  borderWidth?: number;
  borderRadius?: number;
}): Theme {
  const gap = options?.gap ?? 0.25;
  const gapTight = options?.gapTight ?? 0.125;
  const gapLoose = options?.gapLoose ?? 0.5;
  const padding = options?.padding ?? 0.25;
  const cellPadding = options?.cellPadding ?? 0.1;
  const bulletSpacing = options?.bulletSpacing ?? 1.2;
  const margin = options?.margin ?? 0.5;
  const maxScaleFactor = options?.maxScaleFactor ?? 1.0;
  const lineSpacing = options?.lineSpacing ?? 1.0;
  const borderWidth = options?.borderWidth ?? 1;
  const borderRadius = options?.borderRadius ?? 0.1;

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
      unit: 0.03125,
      gap,
      gapTight,
      gapLoose,
      padding,
      cellPadding,
      bulletSpacing,
      bulletIndentMultiplier: 1.5,
      margin,
      maxScaleFactor,
      lineSpacing,
    },
    borders: {
      width: borderWidth,
      radius: borderRadius,
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
