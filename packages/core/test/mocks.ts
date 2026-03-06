// Test Mocks
// Shared mock utilities for testing

import * as assert from 'node:assert';
import { createRequire } from 'module';
import type { Theme, TextStyle, FontFamily } from '../src/core/model/types.js';
import { TEXT_STYLE, GAP, BORDER_STYLE, DASH_TYPE, FONT_WEIGHT, HALIGN, VALIGN, DEFAULT_VARIANT } from '../src/core/model/types.js';

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
  layouts?: Record<string, { variants: Record<string, Record<string, unknown>> }>;
  textStyles?: Partial<Record<string, Partial<TextStyle>>>;
  slide?: { layout: string; width: number; height: number };
  colors?: Partial<Theme['colors']>;
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

  // Default component tokens (Figma model: each is a complete default variant).
  // NOTE: String-literal keys here must match Component enum values in
  // packages/components/src/names.ts. Core cannot import from components
  // (dependency flows the other direction), so keep these in sync manually.
  const defaultTokens: Record<string, Record<string, unknown>> = {
    card: {
      padding,
      cornerRadius: borderRadius,
      backgroundColor: '333333',
      backgroundOpacity: 20,
      borderColor: '333333',
      borderWidth,
      titleStyle: TEXT_STYLE.H4,
      titleColor: 'FFFFFF',
      titleLineHeightMultiplier: lineSpacing,
      titleLinkColor: '0000FF',
      titleLinkUnderline: true,
      descriptionStyle: TEXT_STYLE.SMALL,
      descriptionColor: 'CCCCCC',
      descriptionLineHeightMultiplier: lineSpacing,
      descriptionLinkColor: '0000FF',
      descriptionLinkUnderline: true,
      gap: GAP.TIGHT,
      hAlign: HALIGN.CENTER,
      vAlign: VALIGN.TOP,
    },
    table: {
      borderStyle: BORDER_STYLE.FULL,
      borderColor: '333333',
      borderWidth,
      headerBackground: 'FFFFFF',
      headerBackgroundOpacity: 0,
      headerTextStyle: TEXT_STYLE.BODY,
      headerTextColor: '000000',
      cellBackground: 'FFFFFF',
      cellBackgroundOpacity: 0,
      cellTextStyle: TEXT_STYLE.BODY,
      cellTextColor: '000000',
      cellPadding,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.MIDDLE,
      linkColor: '0000FF',
      linkUnderline: true,
    },
    line: {
      color: '333333',
      width: borderWidth,
      dashType: DASH_TYPE.SOLID,
    },
    text: {
      color: '000000',
      style: TEXT_STYLE.BODY,
      lineHeightMultiplier: lineSpacing,
      linkColor: '0000FF',
      linkUnderline: true,
    },
    plainText: {
      color: '000000',
      style: TEXT_STYLE.BODY,
      lineHeightMultiplier: lineSpacing,
    },
    code: {
      backgroundColor: '1E1E1E',
      textColor: 'D4D4D4',
      keywordColor: '569CD6',
      stringColor: 'CE9178',
      commentColor: '6A9955',
      functionColor: 'DCDCAA',
      numberColor: 'B5CEA8',
      operatorColor: 'D4D4D4',
      typeColor: '4EC9B0',
      variableColor: '9CDCFE',
      fontSize: 12,
      fontFamily: mockFontFamily,
      lineHeight: 1.4,
      padding: 0.25,
      borderRadius: 0.1,
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
    slide: (options?.slide ?? { layout: 'CUSTOM', width: 13.333, height: 7.5 }) as Theme['slide'],
    colors: {
      primary: options?.colors?.primary ?? 'FF0000',
      background: options?.colors?.background ?? 'FFFFFF',
      secondary: options?.colors?.secondary ?? '333333',
      hyperlink: options?.colors?.hyperlink ?? 'FF0000',
      accents: options?.colors?.accents ?? accents,
      text: options?.colors?.text ?? '000000',
      textMuted: options?.colors?.textMuted ?? '666666',
      subtleOpacity: options?.colors?.subtleOpacity ?? 20,
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
    },
    components: mergedComponents as Theme['components'],
    ...(options?.layouts ? { layouts: options.layouts as Theme['layouts'] } : {}),
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
