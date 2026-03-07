// Test Mocks
// Shared mock utilities for testing

import * as assert from 'node:assert';
import { createRequire } from 'module';
import type { Theme, TextStyle, FontFamily } from '../src/core/model/types.js';
import { TEXT_STYLE, FONT_WEIGHT } from '../src/core/model/types.js';

const require = createRequire(import.meta.url);

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  normal: { name: 'Inter', path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2') },
  bold: { name: 'Inter Bold', path: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2') },
};

export const mockTextStyle: TextStyle = {
  fontSize: 12,
  fontFamily: mockFontFamily,
  defaultWeight: FONT_WEIGHT.NORMAL,
  lineHeightMultiplier: 1.0,
  bulletIndentPt: 18,
};

/**
 * Create a mock Theme with configurable spacing.
 * All text styles point to the same mock style.
 */
export function mockTheme(options?: {
  gap?: number;
  gapTight?: number;
  gapLoose?: number;
  layouts?: Record<string, { variants: Record<string, Record<string, unknown>> }>;
  textStyles?: Partial<Record<string, Partial<TextStyle>>>;
  slide?: Theme['slide'];
}): Theme {
  const gap = options?.gap ?? 0.25;
  const gapTight = options?.gapTight ?? 0.125;
  const gapLoose = options?.gapLoose ?? 0.5;
  return {
    slide: options?.slide ?? { layout: 'CUSTOM' as const, width: 13.333, height: 7.5 },
    spacing: { normal: gap, tight: gapTight, loose: gapLoose },
    fonts: [mockFontFamily],
    textStyles: {
      [TEXT_STYLE.H1]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.H1] },
      [TEXT_STYLE.H2]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.H2] },
      [TEXT_STYLE.H3]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.H3] },
      [TEXT_STYLE.H4]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.H4] },
      [TEXT_STYLE.BODY]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.BODY] },
      [TEXT_STYLE.SMALL]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.SMALL] },
      [TEXT_STYLE.FOOTER]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.FOOTER] },
      [TEXT_STYLE.EYEBROW]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.EYEBROW] },
      [TEXT_STYLE.CODE]: { ...mockTextStyle, ...options?.textStyles?.[TEXT_STYLE.CODE] },
    },
    layouts: (options?.layouts ?? {}) as Theme['layouts'],
    masters: {},
  };
}

// ============================================
// CANVAS MOCK
// ============================================

export function noopCanvas() {
  return { renderHtml: async () => 'mock://render.png' };
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
