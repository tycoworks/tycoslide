// Brand, Palette, and Format types for the SDK authoring API.
// Brand is the typed input contract for visual identity — shared across all formats.
// Format is the per-format spatial configuration — all spatial values in pixels (96 DPI), strokes in pt.

import type {
  FontFamily as CoreFontFamily,
  TextStyle as CoreTextStyle,
  Font,
  HorizontalAlignment,
  Shadow,
  VerticalAlignment,
} from "@tycoslide/core";
import type { HighlightThemeName } from "../presets/highlighting.js";

// ── SDK-friendly input types ─────────────────────────────────────────────────

/** Font family as theme authors write it (normalRatio populated by measurement). */
export interface FontFamily {
  name: string;
  regular: Font;
  italic?: Font;
  bold?: Font;
  boldItalic?: Font;
  normalRatio?: number; // optional — populated by Playwright measurement
}

/** Text style as theme authors write it (bulletIndentPt defaults to fontSize * 1.5). */
export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  bulletIndentPt?: number; // optional — defaults to fontSize * 1.5
}

// ── Resolution helpers ───────────────────────────────────────────────────────

/** Resolve an SDK FontFamily to a core FontFamily. */
export function resolveFontFamily(family: FontFamily): CoreFontFamily {
  return family as CoreFontFamily;
}

/** Resolve an SDK TextStyle to a core TextStyle (applies defaults). */
export function resolveTextStyle(style: TextStyle): CoreTextStyle {
  return {
    fontFamily: style.fontFamily as CoreFontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    bulletIndentPt: style.bulletIndentPt ?? style.fontSize * 1.5,
  };
}

// ── Scalars ──────────────────────────────────────────────────────────────────

export type Hex = `#${string}`;

// ── Palette ──────────────────────────────────────────────────────────────────

/**
 * Semantic color roles for a single appearance mode (light or dark).
 *
 * Organized into three groups:
 * - text — typographic hierarchy (heading → body → secondary → subtle)
 * - brand — brand/interactive colors (primary + soft tonal variant)
 * - fill — backgrounds, surfaces, borders, shadows
 */
export interface Palette {
  text: {
    heading: Hex; // primary heading text
    body: Hex; // body text
    description: Hex; // descriptions, captions, stat labels
    subtle: Hex; // table headers, attribution
    highlight: Hex; // ==highlighted text== color
  };
  brand: {
    primary: Hex; // brand/interactive — links, accent bars, stat values
    soft: Hex; // tonal variant — agenda numbers, quote bars
  };
  fill: {
    background: Hex; // page/area background
    surface: Hex; // elevated fills — cards, panels
    divider: Hex; // borders and separators
    shadow: Hex; // shadow color
  };
  /** Syntax highlight theme for code blocks in this scheme. */
  highlightTheme: HighlightThemeName;
}

// ── Brand ────────────────────────────────────────────────────────────────────

/** Visual identity shared across all formats. Colors per palette, fonts. */
export interface Brand {
  colors: { light: Palette; dark: Palette };
  fonts: {
    body: FontFamily; // general body text
    heading: FontFamily; // headings and display
    code: FontFamily; // code blocks
  };
}

// ── Format ───────────────────────────────────────────────────────────────────

/** Per-format spatial configuration. Spatial values in pixels (96 DPI), strokes in pt, font sizes in pt. */
export interface Format {
  slide: { width: number; height: number }; // pixels
  spacing: {
    base: number; // pixels — layout-level gaps between sections, grid gaps
    tight: number; // pixels — component-internal gaps (card content, header eyebrow-to-title)
  };
  padding: number; // pixels — internal padding (cards, code blocks, tables)
  radius: number; // pixels — base corner radius
  strokes: {
    hairline: number; // pt — very subtle (mermaid grid, table grid)
    thin: number; // pt — default borders (cards, tables)
    base: number; // pt — standard emphasis
    thick: number; // pt — accent bars, strong emphasis
  };
  shadow: {
    type: Shadow;
    opacity: number; // 0–100
    blur: number; // pt
    offset: number; // pt
    angle: number; // degrees 0–360
  };
  hAlign: HorizontalAlignment; // default horizontal alignment
  vAlign: VerticalAlignment; // default vertical alignment
  textStyles: Record<string, TextStyle>; // font sizes in pt
}

// ── Text Style Names ────────────────────────────────────────────────────────

/** Standard text style keys that Format.textStyles is expected to provide. */
export const TEXT_STYLE = {
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  BODY: "body",
  QUOTE: "quote",
  CAPTION: "caption",
  FOOTER: "footer",
  CODE: "code",
} as const;

export type TextStyleKey = (typeof TEXT_STYLE)[keyof typeof TEXT_STYLE];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the font array from a Brand for core Theme consumption. */
export function brandFonts(brand: Brand): FontFamily[] {
  return [brand.fonts.heading, brand.fonts.body, brand.fonts.code];
}
