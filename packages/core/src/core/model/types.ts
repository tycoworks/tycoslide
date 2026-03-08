// Core Type Definitions
// External-facing interfaces and type aliases

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
  TIGHT: 'tight',
  NORMAL: 'normal',
  LOOSE: 'loose',
} as const;

export type GapSize = typeof GAP[keyof typeof GAP];



export const DIRECTION = {
  ROW: 'row',
  COLUMN: 'column',
} as const;

export type Direction = typeof DIRECTION[keyof typeof DIRECTION];

export const SIZE = {
  FILL: 'fill',
  HUG: 'hug',
} as const;

export type SizeValue = typeof SIZE[keyof typeof SIZE];



export const BORDER_STYLE = {
  FULL: 'full',
  INTERNAL: 'internal',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  NONE: 'none',
} as const;

export type BorderStyle = typeof BORDER_STYLE[keyof typeof BORDER_STYLE];


export const SHAPE = {
  // Basic geometry
  RECT: 'rect',
  ROUND_RECT: 'roundRect',
  ELLIPSE: 'ellipse',
  TRIANGLE: 'triangle',
  RT_TRIANGLE: 'rtTriangle',
  DIAMOND: 'diamond',
  PARALLELOGRAM: 'parallelogram',
  TRAPEZOID: 'trapezoid',
  NON_ISOSCELES_TRAPEZOID: 'nonIsoscelesTrapezoid',
  PENTAGON: 'pentagon',
  HEXAGON: 'hexagon',
  HEPTAGON: 'heptagon',
  OCTAGON: 'octagon',
  DECAGON: 'decagon',
  DODECAGON: 'dodecagon',
  ARC: 'arc',
  CHORD: 'chord',
  PIE: 'pie',
  PIE_WEDGE: 'pieWedge',
  PLUS: 'plus',
  DONUT: 'donut',
  BLOCK_ARC: 'blockArc',
  TEARDROP: 'teardrop',
  HEART: 'heart',
  MOON: 'moon',
  SUN: 'sun',
  CLOUD: 'cloud',
  LIGHTNING_BOLT: 'lightningBolt',
  // Specialty rectangles
  ROUND_1_RECT: 'round1Rect',
  ROUND_2_DIAG_RECT: 'round2DiagRect',
  ROUND_2_SAME_RECT: 'round2SameRect',
  SNIP_1_RECT: 'snip1Rect',
  SNIP_2_DIAG_RECT: 'snip2DiagRect',
  SNIP_2_SAME_RECT: 'snip2SameRect',
  SNIP_ROUND_RECT: 'snipRoundRect',
  BEVEL: 'bevel',
  FRAME: 'frame',
  HALF_FRAME: 'halfFrame',
  CORNER: 'corner',
  DIAG_STRIPE: 'diagStripe',
  PLAQUE: 'plaque',
  CAN: 'can',
  CUBE: 'cube',
  FOLDER_CORNER: 'folderCorner',
  FUNNEL: 'funnel',
  GEAR_6: 'gear6',
  GEAR_9: 'gear9',
  NO_SMOKING: 'noSmoking',
  SMILEY_FACE: 'smileyFace',
  // Arrows
  LEFT_ARROW: 'leftArrow',
  RIGHT_ARROW: 'rightArrow',
  UP_ARROW: 'upArrow',
  DOWN_ARROW: 'downArrow',
  LEFT_RIGHT_ARROW: 'leftRightArrow',
  UP_DOWN_ARROW: 'upDownArrow',
  LEFT_UP_ARROW: 'leftUpArrow',
  LEFT_RIGHT_UP_ARROW: 'leftRightUpArrow',
  QUAD_ARROW: 'quadArrow',
  BENT_ARROW: 'bentArrow',
  BENT_UP_ARROW: 'bentUpArrow',
  CURVED_LEFT_ARROW: 'curvedLeftArrow',
  CURVED_RIGHT_ARROW: 'curvedRightArrow',
  CURVED_UP_ARROW: 'curvedUpArrow',
  CURVED_DOWN_ARROW: 'curvedDownArrow',
  STRIPED_RIGHT_ARROW: 'stripedRightArrow',
  NOTCHED_RIGHT_ARROW: 'notchedRightArrow',
  CHEVRON: 'chevron',
  HOME_PLATE: 'homePlate',
  CIRCULAR_ARROW: 'circularArrow',
  LEFT_CIRCULAR_ARROW: 'leftCircularArrow',
  LEFT_RIGHT_CIRCULAR_ARROW: 'leftRightCircularArrow',
  SWOOSH_ARROW: 'swooshArrow',
  UTURN_ARROW: 'uturnArrow',
  // Arrow callouts
  LEFT_ARROW_CALLOUT: 'leftArrowCallout',
  RIGHT_ARROW_CALLOUT: 'rightArrowCallout',
  UP_ARROW_CALLOUT: 'upArrowCallout',
  DOWN_ARROW_CALLOUT: 'downArrowCallout',
  LEFT_RIGHT_ARROW_CALLOUT: 'leftRightArrowCallout',
  UP_DOWN_ARROW_CALLOUT: 'upDownArrowCallout',
  QUAD_ARROW_CALLOUT: 'quadArrowCallout',
  // Callouts
  CALLOUT_1: 'callout1',
  CALLOUT_2: 'callout2',
  CALLOUT_3: 'callout3',
  ACCENT_CALLOUT_1: 'accentCallout1',
  ACCENT_CALLOUT_2: 'accentCallout2',
  ACCENT_CALLOUT_3: 'accentCallout3',
  BORDER_CALLOUT_1: 'borderCallout1',
  BORDER_CALLOUT_2: 'borderCallout2',
  BORDER_CALLOUT_3: 'borderCallout3',
  ACCENT_BORDER_CALLOUT_1: 'accentBorderCallout1',
  ACCENT_BORDER_CALLOUT_2: 'accentBorderCallout2',
  ACCENT_BORDER_CALLOUT_3: 'accentBorderCallout3',
  CLOUD_CALLOUT: 'cloudCallout',
  WEDGE_RECT_CALLOUT: 'wedgeRectCallout',
  WEDGE_ROUND_RECT_CALLOUT: 'wedgeRoundRectCallout',
  WEDGE_ELLIPSE_CALLOUT: 'wedgeEllipseCallout',
  // Stars
  STAR_4: 'star4',
  STAR_5: 'star5',
  STAR_6: 'star6',
  STAR_7: 'star7',
  STAR_8: 'star8',
  STAR_10: 'star10',
  STAR_12: 'star12',
  STAR_16: 'star16',
  STAR_24: 'star24',
  STAR_32: 'star32',
  IRREGULAR_SEAL_1: 'irregularSeal1',
  IRREGULAR_SEAL_2: 'irregularSeal2',
  // Banners & ribbons
  RIBBON: 'ribbon',
  RIBBON_2: 'ribbon2',
  ELLIPSE_RIBBON: 'ellipseRibbon',
  ELLIPSE_RIBBON_2: 'ellipseRibbon2',
  LEFT_RIGHT_RIBBON: 'leftRightRibbon',
  HORIZONTAL_SCROLL: 'horizontalScroll',
  VERTICAL_SCROLL: 'verticalScroll',
  WAVE: 'wave',
  DOUBLE_WAVE: 'doubleWave',
  // Flowchart
  FLOW_CHART_PROCESS: 'flowChartProcess',
  FLOW_CHART_ALTERNATE_PROCESS: 'flowChartAlternateProcess',
  FLOW_CHART_DECISION: 'flowChartDecision',
  FLOW_CHART_INPUT_OUTPUT: 'flowChartInputOutput',
  FLOW_CHART_PREDEFINED_PROCESS: 'flowChartPredefinedProcess',
  FLOW_CHART_INTERNAL_STORAGE: 'flowChartInternalStorage',
  FLOW_CHART_DOCUMENT: 'flowChartDocument',
  FLOW_CHART_MULTIDOCUMENT: 'flowChartMultidocument',
  FLOW_CHART_TERMINATOR: 'flowChartTerminator',
  FLOW_CHART_PREPARATION: 'flowChartPreparation',
  FLOW_CHART_MANUAL_INPUT: 'flowChartManualInput',
  FLOW_CHART_MANUAL_OPERATION: 'flowChartManualOperation',
  FLOW_CHART_CONNECTOR: 'flowChartConnector',
  FLOW_CHART_OFFPAGE_CONNECTOR: 'flowChartOffpageConnector',
  FLOW_CHART_PUNCHED_CARD: 'flowChartPunchedCard',
  FLOW_CHART_PUNCHED_TAPE: 'flowChartPunchedTape',
  FLOW_CHART_SUMMING_JUNCTION: 'flowChartSummingJunction',
  FLOW_CHART_OR: 'flowChartOr',
  FLOW_CHART_COLLATE: 'flowChartCollate',
  FLOW_CHART_SORT: 'flowChartSort',
  FLOW_CHART_EXTRACT: 'flowChartExtract',
  FLOW_CHART_MERGE: 'flowChartMerge',
  FLOW_CHART_OFFLINE_STORAGE: 'flowChartOfflineStorage',
  FLOW_CHART_ONLINE_STORAGE: 'flowChartOnlineStorage',
  FLOW_CHART_MAGNETIC_TAPE: 'flowChartMagneticTape',
  FLOW_CHART_MAGNETIC_DISK: 'flowChartMagneticDisk',
  FLOW_CHART_MAGNETIC_DRUM: 'flowChartMagneticDrum',
  FLOW_CHART_DISPLAY: 'flowChartDisplay',
  FLOW_CHART_DELAY: 'flowChartDelay',
  // Brackets & braces
  LEFT_BRACKET: 'leftBracket',
  RIGHT_BRACKET: 'rightBracket',
  LEFT_BRACE: 'leftBrace',
  RIGHT_BRACE: 'rightBrace',
  BRACKET_PAIR: 'bracketPair',
  BRACE_PAIR: 'bracePair',
  // Math
  MATH_PLUS: 'mathPlus',
  MATH_MINUS: 'mathMinus',
  MATH_MULTIPLY: 'mathMultiply',
  MATH_DIVIDE: 'mathDivide',
  MATH_EQUAL: 'mathEqual',
  MATH_NOT_EQUAL: 'mathNotEqual',
  // Tabs & charts
  CORNER_TABS: 'cornerTabs',
  SQUARE_TABS: 'squareTabs',
  PLAQUE_TABS: 'plaqueTabs',
  CHART_PLUS: 'chartPlus',
  CHART_STAR: 'chartStar',
  CHART_X: 'chartX',
  // Action buttons
  ACTION_BUTTON_BACK_PREVIOUS: 'actionButtonBackPrevious',
  ACTION_BUTTON_BEGINNING: 'actionButtonBeginning',
  ACTION_BUTTON_BLANK: 'actionButtonBlank',
  ACTION_BUTTON_DOCUMENT: 'actionButtonDocument',
  ACTION_BUTTON_END: 'actionButtonEnd',
  ACTION_BUTTON_FORWARD_NEXT: 'actionButtonForwardNext',
  ACTION_BUTTON_HELP: 'actionButtonHelp',
  ACTION_BUTTON_HOME: 'actionButtonHome',
  ACTION_BUTTON_INFORMATION: 'actionButtonInformation',
  ACTION_BUTTON_MOVIE: 'actionButtonMovie',
  ACTION_BUTTON_RETURN: 'actionButtonReturn',
  ACTION_BUTTON_SOUND: 'actionButtonSound',
} as const;

export type ShapeName = typeof SHAPE[keyof typeof SHAPE];

/** All SHAPE values as a tuple — useful for Zod enum schemas */
export const SHAPE_VALUES = Object.values(SHAPE) as [ShapeName, ...ShapeName[]];


/** pptxgenjs line shape name — used internally by buildLineConfig */
export const LINE_SHAPE = 'line' as const;

export const ARROW_TYPE = {
  NONE: 'none',
  ARROW: 'arrow',
  DIAMOND: 'diamond',
  OVAL: 'oval',
  STEALTH: 'stealth',
  TRIANGLE: 'triangle',
} as const;

export type ArrowType = typeof ARROW_TYPE[keyof typeof ARROW_TYPE];

/** All ARROW_TYPE values as a tuple — useful for Zod enum schemas */
export const ARROW_TYPE_VALUES = Object.values(ARROW_TYPE) as [ArrowType, ...ArrowType[]];

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


/** pptxgenjs strikethrough styles (OpenXML a:strike values) */
export const STRIKE_TYPE = {
  SINGLE: 'sngStrike',
  DOUBLE: 'dblStrike',
} as const;

export type StrikeType = typeof STRIKE_TYPE[keyof typeof STRIKE_TYPE];

/** pptxgenjs underline styles (OpenXML a:uFill values) */
export const UNDERLINE_STYLE = {
  SINGLE: 'sng',
} as const;

export type UnderlineStyle = typeof UNDERLINE_STYLE[keyof typeof UNDERLINE_STYLE];

export const SLIDE_SIZE = {
  S16x9:  { layout: 'LAYOUT_16x9',  width: 10,    height: 5.625 },
  S16x10: { layout: 'LAYOUT_16x10', width: 10,    height: 6.25  },
  S4x3:   { layout: 'LAYOUT_4x3',   width: 10,    height: 7.5   },
  WIDE:   { layout: 'LAYOUT_WIDE',  width: 13.33, height: 7.5   },
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

/**
 * A font reference for rendering and measurement.
 *
 * For custom fonts, set `path` to the absolute path of a .woff2/.ttf file.
 * Theme authors can use @fontsource npm packages:
 * ```typescript
 * import { createRequire } from 'module';
 * const require = createRequire(import.meta.url);
 * const font: Font = {
 *   name: 'Inter',
 *   path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'),
 * };
 * ```
 *
 * For system fonts, set `path` to `''` (empty string). System fonts are used
 * for PPTX rendering (where the viewer resolves them) but skipped during
 * Playwright measurement (which uses base64-embedded fonts only).
 */
export interface Font {
  name: string;
  path: string;
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
  CODE: 'code',
} as const;

/** Well-known text style names from TEXT_STYLE, plus any theme-defined custom names. */
export type TextStyleName = (typeof TEXT_STYLE)[keyof typeof TEXT_STYLE] | (string & {});


export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  defaultWeight: FontWeight;
  lineHeightMultiplier: number;
  bulletIndentPt: number;
}

// ============================================
// HIGHLIGHT PAIRS
// ============================================

export interface HighlightPair {
  bg: string;    // Background color (muted)
  text: string;  // Text color (bright)
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
  // Paragraph-level options (for rich text / markdown support)
  bold?: boolean;              // Shorthand for weight: 'bold'
  italic?: boolean;            // Italic text
  strikethrough?: boolean;     // Strikethrough text (~~text~~)
  underline?: boolean;         // Underlined text (++text++)
  hyperlink?: string;          // Hyperlink URL ([text](url))
  paragraphBreak?: boolean;    // Force new paragraph before this run
  softBreak?: boolean;         // Soft line break (like <br>, no paragraph spacing)
  bullet?: boolean | { type?: string };  // Bullet marker
}

// Rich text run - string shorthand or full object
export type TextRun = string | NormalizedRun;

// Content: simple string or array of runs
export type TextContent = string | TextRun[];

// ============================================
// BOUNDS
// ============================================

export { Bounds } from './bounds.js';

import type { ComponentNode } from './nodes.js';

// ============================================
// SLIDE & THEME TYPES
// ============================================

export interface Slide {
  /** Master name — every slide must reference a registered master. */
  masterName: string;
  /** Master variant — explicitly set by every layout. */
  masterVariant: string;
  /** Overrides master background if set. */
  background?: string;
  notes?: string;
  content: ComponentNode;
  /** Optional name for identifying slides in error messages and shared slide references. */
  name?: string;
}

export interface Theme {
  slide: SlideSize | CustomSlideSize;
  /** Semantic spacing scale for container gaps (W3C DTCG convention). */
  spacing: {
    normal: number;
    tight: number;
    loose: number;
  };
  /** Explicit font manifest. Every font the theme uses must be listed here.
   *  `generateFontFaceCSS()` reads exclusively from this list. */
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  /** Layout tokens. Each layout that declares token keys gets its visual values from here. */
  layouts: Record<string, {
    variants: Record<string, Record<string, unknown>>;
  }>;
  /** Master tokens. Each master that declares token keys gets its visual values from here.
   *  Same variant structure as layouts — framework resolves tokens before calling getContent. */
  masters: Record<string, {
    variants: Record<string, Record<string, unknown>>;
  }>;
}
