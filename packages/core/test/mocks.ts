// Test Mocks
// Shared mock utilities for testing

import * as assert from "node:assert";
import { createRequire } from "node:module";
import type { FontFamily, TextStyle, Theme } from "../src/core/model/types.js";

const require = createRequire(import.meta.url);

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  name: "Inter",
  regular: { path: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"), weight: 400 },
  bold: { path: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"), weight: 700 },
};

export const mockTextStyle: TextStyle = {
  fontSize: 12,
  fontFamily: mockFontFamily,
  lineHeightMultiplier: 1.0,
  bulletIndentPt: 18,
};

/**
 * Create a mock Theme.
 * All text styles point to the same mock style.
 */
export function mockTheme(options?: {
  layouts?: Theme["layouts"];
  textStyles?: Partial<Record<string, Partial<TextStyle>>>;
  slide?: Theme["slide"];
}): Theme {
  return {
    slide: options?.slide ?? { width: 13.333, height: 7.5 },
    fonts: [mockFontFamily],
    textStyles: {
      h1: { ...mockTextStyle, ...options?.textStyles?.["h1"] },
      h2: { ...mockTextStyle, ...options?.textStyles?.["h2"] },
      h3: { ...mockTextStyle, ...options?.textStyles?.["h3"] },
      h4: { ...mockTextStyle, ...options?.textStyles?.["h4"] },
      body: { ...mockTextStyle, ...options?.textStyles?.["body"] },
      small: { ...mockTextStyle, ...options?.textStyles?.["small"] },
      footer: { ...mockTextStyle, ...options?.textStyles?.["footer"] },
      eyebrow: { ...mockTextStyle, ...options?.textStyles?.["eyebrow"] },
      code: { ...mockTextStyle, ...options?.textStyles?.["code"] },
    },
    layouts: options?.layouts ?? {},
  };
}

// ============================================
// CANVAS MOCK
// ============================================

export function noopCanvas() {
  return { renderHtml: async () => "mock://render.png" };
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a number is approximately equal to expected value.
 */
export function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/**
 * Assert that two numbers are approximately equal.
 */
export function assertApprox(actual: number, expected: number, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ~${expected}, got ${actual}`);
}
