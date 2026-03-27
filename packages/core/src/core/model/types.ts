// Core Type Definitions
// External-facing interfaces and type aliases

// ============================================
// CONSTANTS
// ============================================

export const HALIGN = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;

export type HorizontalAlignment = (typeof HALIGN)[keyof typeof HALIGN];

export const VALIGN = {
  TOP: "top",
  MIDDLE: "middle",
  BOTTOM: "bottom",
} as const;

export type VerticalAlignment = (typeof VALIGN)[keyof typeof VALIGN];

export const DIRECTION = {
  ROW: "row",
  COLUMN: "column",
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

/** All DIRECTION values as a tuple — useful for schema enum validation */
export const DIRECTION_VALUES = Object.values(DIRECTION) as [Direction, ...Direction[]];

export const SIZE = {
  FILL: "fill",
  HUG: "hug",
} as const;

export type SizeValue = (typeof SIZE)[keyof typeof SIZE];

export const SPACING_MODE = {
  BETWEEN: "between",
  AROUND: "around",
} as const;

export type SpacingMode = (typeof SPACING_MODE)[keyof typeof SPACING_MODE];

export const SHADOW_TYPE = {
  OUTER: "outer",
} as const;

export type ShadowType = (typeof SHADOW_TYPE)[keyof typeof SHADOW_TYPE];

export const GRID_STYLE = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
  BOTH: "both",
  NONE: "none",
} as const;

export type GridStyle = (typeof GRID_STYLE)[keyof typeof GRID_STYLE];

/**
 * Supported shape presets. Only shapes with exact CSS equivalents are included —
 * every shape renders identically in both HTML preview and PPTX output.
 * For complex/decorative graphics, use image() with SVG/PNG assets.
 */
export const SHAPE = {
  RECTANGLE: "roundRect",
  ELLIPSE: "ellipse",
  TRIANGLE: "triangle",
  DIAMOND: "diamond",
} as const;

export type ShapeName = (typeof SHAPE)[keyof typeof SHAPE];

/** All SHAPE values as a tuple — useful for Zod enum schemas */
export const SHAPE_VALUES = Object.values(SHAPE) as [ShapeName, ...ShapeName[]];

/** pptxgenjs line shape name — used internally by buildLineConfig */
export const LINE_SHAPE = "line" as const;

export const DASH_TYPE = {
  SOLID: "solid",
  DASHED: "dashed",
  DOTTED: "dotted",
} as const;

export type DashType = (typeof DASH_TYPE)[keyof typeof DASH_TYPE];

/** pptxgenjs strikethrough styles (OpenXML a:strike values) */
export const STRIKE_TYPE = {
  SINGLE: "sngStrike",
  DOUBLE: "dblStrike",
} as const;

export type StrikeType = (typeof STRIKE_TYPE)[keyof typeof STRIKE_TYPE];

/** pptxgenjs underline styles (OpenXML a:uFill values) */
export const UNDERLINE_STYLE = {
  SINGLE: "sng",
} as const;

export type UnderlineStyle = (typeof UNDERLINE_STYLE)[keyof typeof UNDERLINE_STYLE];

export const SLIDE_SIZE = {
  S16x9: { layout: "LAYOUT_16x9", width: 10, height: 5.625 },
  S16x10: { layout: "LAYOUT_16x10", width: 10, height: 6.25 },
  S4x3: { layout: "LAYOUT_4x3", width: 10, height: 7.5 },
  WIDE: { layout: "LAYOUT_WIDE", width: 13.33, height: 7.5 },
} as const;

export type SlideSize = (typeof SLIDE_SIZE)[keyof typeof SLIDE_SIZE];

export const CUSTOM_LAYOUT = "CUSTOM" as const;

export interface CustomSlideSize {
  layout: typeof CUSTOM_LAYOUT;
  width: number;
  height: number;
}

// ============================================
// STYLING TYPES
// ============================================

/**
 * A font reference for rendering and measurement.
 *
 * `path` must be an absolute path to a font file (.woff2, .woff, .ttf, or .otf).
 * `weight` is the CSS font-weight (e.g. 300, 400, 700).
 *
 * Use `@fontsource` npm packages for easy font management:
 * ```typescript
 * import { createRequire } from 'module';
 * const require = createRequire(import.meta.url);
 * const font: Font = {
 *   path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'),
 *   weight: 400,
 * };
 * ```
 *
 */
export interface Font {
  path: string;
  weight: number;
  /** Family name when this font belongs to a different typeface than
   *  its parent FontFamily. Used for PPTX fontFace resolution: bold Inter
   *  renders as 'Inter' even when the parent family is 'Inter Light'.
   *  Resolver: font.name ?? family.name. */
  name?: string;
}

/**
 * A font family matching PowerPoint's 2×2 grid: typeface + bold flag + italic flag.
 *
 * `name` is the shared CSS `font-family` and PPTX `fontFace` string.
 * `regular` is required; `italic`, `bold`, and `boldItalic` are optional
 * (missing slots get algorithmic fallback from the browser/PowerPoint).
 *
 * Light is modeled as a separate FontFamily (e.g., `interLight` with `name: 'Inter Light'`)
 * because OOXML has no "light" flag — it's a distinct typeface.
 *
 * Use `getFontForRun()` to resolve bold/italic flags to the correct `Font`.
 */
export interface FontFamily {
  name: string; // CSS font-family, PPTX fontFace
  regular: Font; // required — the default face
  italic?: Font; // optional — algorithmic italic if missing
  bold?: Font; // optional — algorithmic bold if missing
  boldItalic?: Font; // optional — algorithmic bold+italic if missing
}

/** Font slot keys for iterating FontFamily (excluding name) */
export const FONT_SLOT = {
  REGULAR: "regular",
  ITALIC: "italic",
  BOLD: "bold",
  BOLD_ITALIC: "boldItalic",
} as const;

export type FontSlot = (typeof FONT_SLOT)[keyof typeof FONT_SLOT];

export const TEXT_STYLE = {
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  BODY: "body",
  SMALL: "small",
  EYEBROW: "eyebrow",
  FOOTER: "footer",
  CODE: "code",
} as const;

/** Well-known text style names from TEXT_STYLE, plus any theme-defined custom names. */
export type TextStyleName = (typeof TEXT_STYLE)[keyof typeof TEXT_STYLE] | (string & {});

export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeightMultiplier: number;
  bulletIndentPt: number;
}

// ============================================
// HIGHLIGHT PAIRS
// ============================================

export interface HighlightPair {
  bg: string; // Background color (muted)
  text: string; // Text color (bright)
}

// ============================================
// TEXT CONTENT TYPES
// ============================================

// Normalized run - object form with all formatting options
export interface NormalizedRun {
  text: string;
  color?: string;
  highlight?: HighlightPair;
  // Paragraph-level options (for rich text / markdown support)
  bold?: boolean; // Use bold font variant
  italic?: boolean; // Italic text
  strikethrough?: boolean; // Strikethrough text (~~text~~)
  underline?: boolean; // Underlined text (++text++)
  hyperlink?: string; // Hyperlink URL ([text](url))
  paragraphBreak?: boolean; // Force new paragraph before this run
  softBreak?: boolean; // Soft line break (like <br>, no paragraph spacing)
  bullet?: boolean | { type?: string }; // Bullet marker
}

// Rich text run - string shorthand or full object
export type TextRun = string | NormalizedRun;

// Content: simple string or array of runs
export type TextContent = string | TextRun[];

// ============================================
// BOUNDS
// ============================================

export { Bounds } from "./bounds.js";

import type { ComponentNode } from "./nodes.js";

// ============================================
// BACKGROUND
// ============================================

/**
 * Slide/master background. All fields optional — set color, path, or both.
 * Opacity uses the same convention as ShapeNode.fill (0 = invisible, 100 = opaque).
 * The renderer inverts to pptxgenjs's transparency at the rendering boundary.
 */
export interface Background {
  color?: string;
  opacity?: number;
  path?: string;
}

// ============================================
// SLIDE & THEME TYPES
// ============================================

export interface Slide {
  /** Master name — every slide must reference a registered master. */
  masterName: string;
  /** Master tokens — resolved values passed directly from layout tokens. */
  masterTokens: Record<string, unknown>;
  /** Overrides master background if set. */
  background?: Background;
  notes?: string;
  content: ComponentNode;
  /** Optional name for identifying slides in error messages and shared slide references. */
  name?: string;
}

/** Variant configuration — a named map of token values for layout variants. */
export type VariantConfig = Record<string, Record<string, unknown>>;

export interface Theme {
  slide: SlideSize | CustomSlideSize;
  /** Explicit font manifest. Every font the theme uses must be listed here.
   *  `generateFontFaceCSS()` reads exclusively from this list. */
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  /** Layout tokens. Each layout that declares token keys gets its visual values from here.
   *  Layouts with slots may include extra keys for slot injection (keyed by component name). */
  layouts: Record<string, { variants: VariantConfig }>;
}
