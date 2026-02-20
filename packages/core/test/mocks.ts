// Test Mocks
// Shared mock utilities for testing

import * as assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Theme, TextStyle, FontFamily, ComponentTokenMap } from '../src/core/types.js';
import { Component, TEXT_STYLE, GAP, BORDER_STYLE, DASH_TYPE, HALIGN } from '../src/core/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  normal: { name: 'Arial', path: path.join(__dirname, 'fixtures', 'test-font.woff2') },
  bold: { name: 'Arial Bold', path: path.join(__dirname, 'fixtures', 'test-font-bold.woff2') },
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
  accents?: Record<string, string>;
  components?: Record<string, Record<string, unknown>>;
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
  const accents = options?.accents ?? { teal: '00CCCC', pink: 'FF00FF', orange: 'FF8800' };

  // Default component tokens computed from primitive values
  const defaultComponents: Record<string, Record<string, unknown>> = {
    [Component.Card]: {
      padding,
      cornerRadius: borderRadius,
      backgroundColor: '333333',
      backgroundOpacity: 20,
      borderColor: '333333',
      borderWidth,
      titleStyle: TEXT_STYLE.H4,
      descriptionStyle: TEXT_STYLE.SMALL,
      gap: GAP.TIGHT,
    },
    [Component.Quote]: {
      padding: padding * 2,
      cornerRadius: borderRadius,
      backgroundColor: '333333',
      backgroundOpacity: 20,
      borderColor: '333333',
      borderWidth,
      attributionStyle: TEXT_STYLE.SMALL,
      gap: GAP.NORMAL,
    },
    [Component.Table]: {
      borderStyle: BORDER_STYLE.FULL,
      borderColor: '333333',
      borderWidth,
      cellPadding,
      cellTextStyle: TEXT_STYLE.BODY,
      headerTextStyle: TEXT_STYLE.BODY,
    },
    [Component.Line]: {
      color: '333333',
      width: borderWidth,
      dashType: DASH_TYPE.SOLID,
    },
    [Component.SlideNumber]: {
      style: TEXT_STYLE.FOOTER,
      hAlign: HALIGN.RIGHT,
    },
  };
  // Compile-time exhaustiveness: fails if a new ComponentTokenMap entry is missing above
  const _exhaustive: Record<keyof ComponentTokenMap, unknown> = defaultComponents;

  // Deep merge: user-provided components override defaults per-component
  const mergedComponents: Record<string, Record<string, unknown>> = {};
  for (const [name, defaults] of Object.entries(defaultComponents)) {
    const userConfig = options?.components?.[name];
    if (userConfig) {
      // Preserve user's variants if they provided them
      const { variants: userVariants, ...userBase } = userConfig as any;
      const { variants: defaultVariants, ...defaultBase } = defaults as any;
      mergedComponents[name] = { ...defaultBase, ...userBase };
      if (userVariants || defaultVariants) {
        (mergedComponents[name] as any).variants = { ...(defaultVariants ?? {}), ...(userVariants ?? {}) };
      }
    } else {
      mergedComponents[name] = { ...defaults };
    }
  }
  // Also include any user-provided components not in defaults (custom components)
  for (const [name, config] of Object.entries(options?.components ?? {})) {
    if (!mergedComponents[name]) {
      mergedComponents[name] = config;
    }
  }

  return {
    slide: { layout: 'CUSTOM' as const, width: 13.333, height: 7.5 },
    colors: {
      primary: 'FF0000',
      background: 'FFFFFF',
      secondary: '333333',
      accents,
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
      [TEXT_STYLE.EYEBROW]: mockTextStyle,
    },
    components: mergedComponents as Theme['components'],
  };
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
