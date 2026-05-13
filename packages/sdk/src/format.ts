// Brand, Palette, and Format types for the SDK authoring API.
// Brand is the typed input contract for visual identity — shared across all formats.
// Format is the per-format spatial configuration — all spatial values in inches, strokes in pt.

import type {
  FontFamily,
  HorizontalAlignment,
  ShadowType,
  TextStyle,
  VerticalAlignment,
} from "@tycoslide/core";
import type { HighlightThemeName } from "./presets/highlighting.js";

// ── Scalars ──────────────────────────────────────────────────────────────────

export type Hex = `#${string}`;

// ── Palette ──────────────────────────────────────────────────────────────────

/**
 * Semantic color roles for a single appearance mode (light or dark).
 *
 * Names follow industry conventions:
 * - heading / body / secondary / muted — text hierarchy (Apple: label cascade, Carbon: text-primary/secondary)
 * - accent / accentSoft — brand/interactive color (M3: primary / primary-container)
 * - surface — elevated fills (M3: surface-container, Apple: secondarySystemBackground)
 * - divider — borders and separators (M3: outline-variant, Apple: separator)
 * - shadow — shadow color (M3: shadow)
 */
export interface Palette {
  heading: Hex; // primary heading text
  body: Hex; // body text
  secondary: Hex; // descriptions, captions, stat labels
  muted: Hex; // table headers, attribution
  accent: Hex; // brand/interactive — links, accent bars, stat values
  accentSoft: Hex; // tonal variant — agenda numbers, quote bars on dark
  background: Hex; // page/area background — M3: background, Apple: systemBackground
  surface: Hex; // elevated fills — M3: surface-container, Apple: secondarySystemBackground
  divider: Hex; // borders and separators
  shadow: Hex; // shadow color
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

/** Per-format spatial configuration. Spatial values in inches, strokes in pt, font sizes in pt. */
export interface Format {
  slide: { width: number; height: number }; // inches
  spacing: {
    base: number; // inches — layout-level gaps between sections, grid gaps
    tight: number; // inches — component-internal gaps (card content, header eyebrow-to-title)
  };
  padding: number; // inches — internal padding (cards, code blocks, tables)
  radius: number; // inches — base corner radius
  strokes: {
    hairline: number; // pt — very subtle (mermaid grid, table grid)
    thin: number; // pt — default borders (cards, tables)
    base: number; // pt — standard emphasis
    thick: number; // pt — accent bars, strong emphasis
  };
  shadow: {
    type: ShadowType;
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
