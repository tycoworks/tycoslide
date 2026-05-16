// Unit Conversion Constants and Functions
//
// The domain model is pixel-native: all layout geometry (positions, sizes,
// spacing, padding, corner radius) is in pixels. Points are used for visual
// styling (font sizes, stroke widths, shadow blur/offset).
//
// pxToIn is used exclusively by the PPTX renderer (pptxgenjs expects inches).
// ptToPx is used by HTML rendering (CSS expects pixels for point-based values).

// ============================================
// CONSTANTS
// ============================================

/** Screen DPI for pixel calculations (CSS standard) */
export const SCREEN_DPI = 96;

/** Points per inch (typography standard) */
export const POINTS_PER_INCH = 72;

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/** Convert pixels to inches — used by PPTX renderer (pptxgenjs expects inches) */
export const pxToIn = (px: number): number => px / SCREEN_DPI;

/** Convert points to pixels — used by HTML renderer (CSS expects pixels) */
export const ptToPx = (pt: number): number => (pt / POINTS_PER_INCH) * SCREEN_DPI;
