// Test Mocks
// Shared mock utilities for testing

import * as assert from 'node:assert';
import { createRequire } from 'module';
import type { Theme, TextStyle, FontFamily } from 'tycoslide';
import { TEXT_STYLE, GAP, BORDER_STYLE, DASH_TYPE, HALIGN, VALIGN, FONT_WEIGHT, DEFAULT_VARIANT } from 'tycoslide';
import { Component } from '../src/names.js';

const require = createRequire(import.meta.url);

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  normal: { name: 'Inter', path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2') },
  bold: { name: 'Inter Bold', path: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2') },
};

const mockTextStyle: TextStyle = {
  fontSize: 12,
  fontFamily: mockFontFamily,
  defaultWeight: FONT_WEIGHT.NORMAL,
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

  // Default component tokens (Figma model: each is a complete default variant)
  const defaultTokens: Record<string, Record<string, unknown>> = {
    [Component.Card]: {
      padding,
      cornerRadius: borderRadius,
      backgroundColor: '333333',
      backgroundOpacity: 20,
      borderColor: '333333',
      borderWidth,
      titleStyle: TEXT_STYLE.H4,
      titleColor: 'FFFFFF',
      descriptionStyle: TEXT_STYLE.SMALL,
      descriptionColor: 'CCCCCC',
      gap: GAP.TIGHT,
      textGap: GAP.TIGHT,
      hAlign: HALIGN.CENTER,
      vAlign: VALIGN.TOP,
    },
    [Component.Quote]: {
      padding: padding * 2,
      cornerRadius: borderRadius,
      backgroundColor: '333333',
      backgroundOpacity: 20,
      borderColor: '333333',
      borderWidth,
      quoteStyle: TEXT_STYLE.BODY,
      quoteColor: 'FFFFFF',
      attributionStyle: TEXT_STYLE.SMALL,
      attributionColor: '666666',
      attributionHAlign: HALIGN.RIGHT,
      gap: GAP.NORMAL,
      hAlign: HALIGN.CENTER,
      vAlign: VALIGN.MIDDLE,
    },
    [Component.Table]: {
      borderStyle: BORDER_STYLE.FULL,
      borderColor: '333333',
      borderWidth,
      headerBackground: 'FFFFFF',
      headerBackgroundOpacity: 0,
      headerTextStyle: TEXT_STYLE.BODY,
      cellBackground: 'FFFFFF',
      cellBackgroundOpacity: 0,
      cellTextStyle: TEXT_STYLE.BODY,
      cellPadding,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.MIDDLE,
    },
    [Component.Line]: {
      color: '333333',
      width: borderWidth,
      dashType: DASH_TYPE.SOLID,
    },
    [Component.SlideNumber]: {
      style: TEXT_STYLE.FOOTER,
      color: '666666',
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.MIDDLE,
    },
    [Component.Text]: {
      color: '000000',
      bulletColor: '000000',
      style: TEXT_STYLE.BODY,
      lineHeightMultiplier: lineSpacing,
    },
    [Component.Shape]: {
      fill: '333333',
      fillOpacity: 100,
      borderColor: 'FFFFFF',
      borderWidth: 0,
      cornerRadius: 0,
    },
  };
  // Build Figma-model components: { variants: { default: {...}, ... } }
  // User-provided overrides merge into the default variant for test convenience.
  // User-provided variants are made complete by merging with the (overridden) default.
  const mergedComponents: Record<string, { variants: Record<string, Record<string, unknown>> }> = {};
  for (const [name, defaults] of Object.entries(defaultTokens)) {
    const userConfig = options?.components?.[name] as Record<string, unknown> | undefined;
    if (userConfig) {
      const { variants: userVariants, ...userOverrides } = userConfig as
        Record<string, unknown> & { variants?: Record<string, Record<string, unknown>> };
      const defaultVariant = { ...defaults, ...userOverrides };
      const variants: Record<string, Record<string, unknown>> = { [DEFAULT_VARIANT]: defaultVariant };
      if (userVariants) {
        for (const [varName, varOverrides] of Object.entries(userVariants)) {
          if (varName === DEFAULT_VARIANT) {
            variants[DEFAULT_VARIANT] = { ...defaultVariant, ...varOverrides };
          } else {
            variants[varName] = { ...defaultVariant, ...varOverrides };
          }
        }
      }
      mergedComponents[name] = { variants };
    } else {
      mergedComponents[name] = { variants: { [DEFAULT_VARIANT]: { ...defaults } } };
    }
  }
  // Also include any user-provided components not in defaults (custom components)
  for (const [name, config] of Object.entries(options?.components ?? {})) {
    if (!mergedComponents[name]) {
      const { variants: userVariants, ...userTokens } = config as
        Record<string, unknown> & { variants?: Record<string, Record<string, unknown>> };
      if (userVariants) {
        mergedComponents[name] = { variants: userVariants };
      } else {
        mergedComponents[name] = { variants: { [DEFAULT_VARIANT]: userTokens } };
      }
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
