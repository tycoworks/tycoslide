// Test Mocks
// Shared mock utilities for testing

import * as assert from "node:assert";
import { createRequire } from "node:module";
import type { FontFamily, TextStyle, Theme } from "tycoslide";
import { DASH_TYPE, GRID_STYLE, HALIGN, VALIGN } from "tycoslide";
import { HIGHLIGHT_THEME } from "../src/highlighting.js";
import type {
  CardTokens,
  CodeTokens,
  LineTokens,
  ListTokens,
  MermaidTokens,
  PlainTextTokens,
  QuoteTokens,
  ShapeTokens,
  SlideNumberTokens,
  TableTokens,
  TestimonialTokens,
  TextTokens,
} from "../src/index.js";

const require = createRequire(import.meta.url);

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  name: "Inter",
  regular: { path: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"), weight: 400 },
  bold: { path: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"), weight: 700 },
};

const mockTextStyle: TextStyle = {
  fontSize: 12,
  fontFamily: mockFontFamily,
  lineHeightMultiplier: 1.0,
  bulletIndentPt: 18,
};

/**
 * Create a mock Theme.
 * All text styles point to the same mock style.
 */
export function mockTheme(): Theme {
  return {
    slide: { layout: "CUSTOM" as const, width: 13.333, height: 7.5 },
    fonts: [mockFontFamily],
    textStyles: {
      h1: mockTextStyle,
      h2: mockTextStyle,
      h3: mockTextStyle,
      h4: mockTextStyle,
      body: mockTextStyle,
      small: mockTextStyle,
      footer: mockTextStyle,
      eyebrow: mockTextStyle,
      code: mockTextStyle,
    },
    layouts: {},
  };
}

// ============================================
// DEFAULT TOKEN MAPS FOR TEST DSL CALLS
// ============================================

export const DEFAULT_TEXT_TOKENS: TextTokens = {
  color: "#000000",
  style: "body",
  linkColor: "#0000FF",
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
};

export const DEFAULT_PLAIN_TEXT_TOKENS: PlainTextTokens = {
  color: "#000000",
  style: "body",
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
};

export const DEFAULT_LIST_TOKENS: ListTokens = {
  color: "#000000",
  style: "body",
  linkColor: "#0000FF",
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
};

export const DEFAULT_TABLE_TOKENS: TableTokens = {
  headerRow: {
    textStyle: "body",
    textColor: "#000000",
    background: "#FFFFFF",
    backgroundOpacity: 100,
  },
  cellTextStyle: "body",
  cellTextColor: "#000000",
  cellBackground: "#FFFFFF",
  cellBackgroundOpacity: 100,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  border: { color: "#333333", width: 1, dashType: DASH_TYPE.SOLID },
  gridStyle: GRID_STYLE.BOTH,
  gridStroke: { color: "#333333", width: 1, dashType: DASH_TYPE.SOLID },
  cellPadding: 0.1,
  linkColor: "#0000FF",
  linkUnderline: true,
  accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
};

export const DEFAULT_CODE_TOKENS: CodeTokens = {
  textStyle: "code",
  theme: HIGHLIGHT_THEME.GITHUB_DARK,
  padding: 0.25,
  background: {
    fill: "#1E1E1E",
    fillOpacity: 100,
    cornerRadius: 0,
  },
};

export const DEFAULT_MERMAID_TOKENS: MermaidTokens = {
  primaryColor: "#FF0000",
  primaryTextColor: "#FFFFFF",
  primaryBorderColor: "#666666",
  lineColor: "#000000",
  secondaryColor: "#333333",
  tertiaryColor: "#333333",
  textColor: "#000000",
  nodeTextColor: "#000000",
  clusterBackground: "#333333",
  clusterBorderColor: "#666666",
  edgeLabelBackground: "#FFFFFF",
  titleColor: "#000000",
  textStyle: "body",
  accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
  accentOpacity: 100,
  clusterCornerRadius: 0.08,
  accentTextColor: "#000000",
};

export const DEFAULT_CARD_TOKENS: CardTokens = {
  background: {
    fill: "#333333",
    fillOpacity: 100,
    cornerRadius: 0,
  },
  padding: 0.25,
  spacing: 0.125,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.TOP,
  title: {
    style: "h4",
    color: "#FFFFFF",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.TOP,
    accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
  },
  description: {
    style: "small",
    color: "#CCCCCC",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.TOP,
    accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
  },
};

export const DEFAULT_QUOTE_TOKENS: QuoteTokens = {
  bar: {
    color: "#FF0000",
    width: 3,
    dashType: DASH_TYPE.SOLID,
  },
  spacing: 0.125,
  quote: {
    style: "body",
    color: "#FFFFFF",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
    accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
  },
  attribution: {
    style: "small",
    color: "#666666",
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
  },
};

export const DEFAULT_TESTIMONIAL_TOKENS: TestimonialTokens = {
  background: {
    fill: "#333333",
    fillOpacity: 100,
    cornerRadius: 0,
  },
  padding: 0.5,
  spacing: 0.25,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  quote: {
    style: "body",
    color: "#FFFFFF",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.TOP,
    accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
  },
  attribution: {
    style: "small",
    color: "#666666",
    hAlign: HALIGN.RIGHT,
    vAlign: VALIGN.TOP,
  },
};

export const DEFAULT_LINE_TOKENS: LineTokens = {
  color: "#333333",
  width: 1,
  dashType: DASH_TYPE.SOLID,
};

export const DEFAULT_SHAPE_TOKENS: ShapeTokens = {
  fill: "#333333",
  fillOpacity: 100,
  cornerRadius: 0,
};

export const DEFAULT_SLIDE_NUMBER_TOKENS: SlideNumberTokens = {
  style: "footer",
  color: "#666666",
  hAlign: HALIGN.RIGHT,
  vAlign: VALIGN.MIDDLE,
};

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
