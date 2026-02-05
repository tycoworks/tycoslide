// Core Type Definitions
// External-facing interfaces and type aliases

import type { Canvas } from './canvas.js';
import { Bounds } from './bounds.js';

// ============================================
// CONSTANTS
// ============================================

export const HALIGN = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const;

export type HorizontalAlignment = typeof HALIGN[keyof typeof HALIGN];

export const VALIGN = {
  TOP: 'top',
  MIDDLE: 'middle',
  BOTTOM: 'bottom',
} as const;

export type VerticalAlignment = typeof VALIGN[keyof typeof VALIGN];

export const GAP = {
  NONE: 'none',
  SMALL: 'small',
  NORMAL: 'normal',
} as const;

export type GapSize = typeof GAP[keyof typeof GAP];

export const DIRECTION = {
  ROW: 'row',
  COLUMN: 'column',
} as const;

export type Direction = typeof DIRECTION[keyof typeof DIRECTION];

export const JUSTIFY = {
  START: 'start',
  CENTER: 'center',
  END: 'end',
} as const;

export type Justify = typeof JUSTIFY[keyof typeof JUSTIFY];

export const ALIGN = {
  START: 'flex-start',
  CENTER: 'center',
  END: 'flex-end',
} as const;

export type Align = typeof ALIGN[keyof typeof ALIGN];

export const BORDER_STYLE = {
  FULL: 'full',
  INTERNAL: 'internal',
  HORIZONTAL: 'horizontal',
  NONE: 'none',
} as const;

export type BorderStyle = typeof BORDER_STYLE[keyof typeof BORDER_STYLE];

export const SHAPE = {
  LINE: 'line',
  RECT: 'rect',
  ROUND_RECT: 'roundRect',
} as const;

export type ShapeName = typeof SHAPE[keyof typeof SHAPE];

export const ARROW_TYPE = {
  NONE: 'none',
  ARROW: 'arrow',
  DIAMOND: 'diamond',
  OVAL: 'oval',
  STEALTH: 'stealth',
  TRIANGLE: 'triangle',
} as const;

export type ArrowType = typeof ARROW_TYPE[keyof typeof ARROW_TYPE];

export const DASH_TYPE = {
  SOLID: 'solid',
  DASH: 'dash',
  DASH_DOT: 'dashDot',
  LG_DASH: 'lgDash',
  LG_DASH_DOT: 'lgDashDot',
  SYS_DASH: 'sysDash',
  SYS_DOT: 'sysDot',
} as const;

export type DashType = typeof DASH_TYPE[keyof typeof DASH_TYPE];

export const LAYER = {
  SLIDE: 'slide',
  MASTER: 'master',
} as const;

export type Layer = typeof LAYER[keyof typeof LAYER];

export const SLIDE_SIZE = {
  S16x9:  { layout: 'LAYOUT_16x9',  width: 10,    height: 5.625 },
  S16x10: { layout: 'LAYOUT_16x10', width: 10,    height: 6.25 },
  S4x3:   { layout: 'LAYOUT_4x3',   width: 10,    height: 7.5 },
  WIDE:   { layout: 'LAYOUT_WIDE',  width: 13.33, height: 7.5 },
} as const;

export type SlideSize = typeof SLIDE_SIZE[keyof typeof SLIDE_SIZE];

export const CUSTOM_LAYOUT = 'CUSTOM' as const;

export interface CustomSlideSize {
  layout: typeof CUSTOM_LAYOUT;
  width: number;
  height: number;
}

// ============================================
// STYLING TYPES
// ============================================

export interface Font {
  name: string;   // Font name for rendering (e.g., 'Host Grotesk')
  path: string;   // File path for measurement (e.g., '/path/to/font.woff2')
}

export interface FontFamily {
  light?: Font;   // weight 300
  normal: Font;   // weight 400 (required default)
  bold?: Font;    // weight 700
}

export const FONT_WEIGHT = {
  LIGHT: 'light',
  NORMAL: 'normal',
  BOLD: 'bold',
} as const;

export type FontWeight = typeof FONT_WEIGHT[keyof typeof FONT_WEIGHT];

export const TEXT_STYLE = {
  H1: 'h1',
  H2: 'h2',
  H3: 'h3',
  H4: 'h4',
  BODY: 'body',
  SMALL: 'small',
  EYEBROW: 'eyebrow',
  FOOTER: 'footer',
} as const;

export type TextStyleName = typeof TEXT_STYLE[keyof typeof TEXT_STYLE];

export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  defaultWeight?: FontWeight;  // default: 'normal'
  color?: string;              // default color for this style
}

// ============================================
// COLOR NAMES (single source of truth)
// ============================================

/** Base color names shared by ColorScheme and NODE_STYLE */
export const COLOR_NAME = {
  PRIMARY: 'primary',
  BACKGROUND: 'background',
  SECONDARY: 'secondary',
  ACCENT1: 'accent1',
  ACCENT2: 'accent2',
  ACCENT3: 'accent3',
  ACCENT4: 'accent4',
  ACCENT5: 'accent5',
} as const;

export type ColorName = typeof COLOR_NAME[keyof typeof COLOR_NAME];

// ============================================
// COLOR SCHEME (derived from COLOR_NAME)
// ============================================

/** Base colors derived from COLOR_NAME */
type BaseColorScheme = {
  [K in ColorName]: string;
};

/** Full color scheme with additional properties */
export type ColorScheme = BaseColorScheme & {
  text: string;         // Main text color
  textMuted: string;    // Muted text for footers, captions
  subtleOpacity: number; // Opacity for muted fills (0-100)
};

// ============================================
// NODE STYLES (alias for COLOR_NAME)
// ============================================

/** Style classes for diagram nodes. Same as COLOR_NAME for consistency with theme. */
export const NODE_STYLE = COLOR_NAME;

export type NodeStyle = ColorName;

// ============================================
// HIGHLIGHT PAIRS
// ============================================

export interface HighlightPair {
  bg: string;    // Background color (muted)
  text: string;  // Text color (bright)
}

export interface HighlightScheme {
  [key: string]: HighlightPair;
}

// ============================================
// TEXT CONTENT TYPES
// ============================================

// Normalized run - object form with all formatting options
export interface NormalizedRun {
  text: string;
  color?: string;
  highlight?: HighlightPair;
  weight?: FontWeight;
}

// Rich text run - string shorthand or full object
export type TextRun = string | NormalizedRun;

// Content: simple string or array of runs
export type TextContent = string | TextRun[];

// ============================================
// BOUNDS
// ============================================

export { Bounds } from './bounds.js';

// ============================================
// ALIGNMENT CONTEXT
// ============================================

export interface AlignContext {
  hAlign?: HorizontalAlignment;  // Horizontal alignment (left/center/right)
  vAlign?: VerticalAlignment;    // Vertical alignment (top/middle/bottom)
  parentDirection?: Direction;   // Layout direction (for Divider orientation)
}

// ============================================
// COMPONENT (abstract interface)
// ============================================

// Drawer function - executes drawing operations on a canvas
export type Drawer = (canvas: Canvas) => void;

// Component prepares a drawer from bounds
// Theme is provided at construction time, not method-call time
export interface Component {
  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer;
  getHeight(width: number): number;      // "At this width, how tall is my content?"
  getMinHeight(width: number): number;   // Incompressible floor (return getHeight for rigid components)
  getWidth(height: number): number;      // "At this height, how wide is my content?"
}

// ============================================
// MASTER AND SLIDE
// ============================================

// Master defines the visual foundation of slides:
// background image, fixed elements (footer), margins, and content bounds
export interface Master {
  name: string;
  background?: string;  // Background image path (overrides theme.backgroundImage)
  init(theme: Theme): {
    render: Drawer;        // Draws master elements (e.g., footer)
    contentBounds: Bounds; // Where slide content goes
  };
}

// Slide combines a master (optional) with content drawing function
export interface Slide {
  master?: Master;       // Which master to use (or none for full-slide layouts)
  background?: string;   // Background image path (overrides master background)
  notes?: string;        // Speaker notes (plain text)
  draw: (canvas: Canvas, bounds: Bounds) => void;  // Draw content within bounds
}

// ============================================
// THEME TYPES
// ============================================

/** All spacing/dimension values are in inches. */
export interface Theme {
  colors: ColorScheme;
  highlights: HighlightScheme;
  slide: SlideSize | CustomSlideSize;
  spacing: {
    unit: number;           // Grid quantum in inches (e.g. 0.125 = 1/8")
    margin: number;         // Inset from all 4 edges
    gap: number;            // Standard gap between elements
    gapSmall: number;       // Small gap between elements
    padding: number;        // Internal padding for containers (e.g. cards)
    cellPadding: number;    // Padding inside table cells
    bulletSpacing: number;  // Line spacing multiple for lists
    bulletIndentMultiplier: number; // Multiplier for bullet indent (fontSize * multiplier = points)
    minDisplayDPI: number;  // Minimum effective DPI for image display (e.g. 96)
  };
  borders: {
    width: number;   // Border width in points
    radius: number;  // Corner radius in inches
  };
  textStyles: { [K in TextStyleName]: TextStyle };
}
