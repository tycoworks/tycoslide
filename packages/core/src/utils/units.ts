// Unit Conversion Constants and Functions
// Single source of truth for all unit conversions

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

/** Convert pixels to inches */
export const pxToIn = (px: number): number => px / SCREEN_DPI;

/** Convert inches to pixels */
export const inToPx = (inches: number): number => inches * SCREEN_DPI;

/** Convert points to pixels */
export const ptToPx = (pt: number): number => (pt / POINTS_PER_INCH) * SCREEN_DPI;
