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

/** Convert points to inches */
export const ptToIn = (pt: number): number => pt / POINTS_PER_INCH;

/** Convert inches to points */
export const inToPt = (inches: number): number => inches * POINTS_PER_INCH;

/** Convert points to pixels */
export const ptToPx = (pt: number): number => (pt / POINTS_PER_INCH) * SCREEN_DPI;

// ============================================
// GAP RESOLUTION
// ============================================

import type { Theme } from '../core/model/types.js';
import { GAP } from '../core/model/types.js';

/**
 * Resolve GAP constant to actual spacing value from theme.
 */
export function resolveGap(gap: string | undefined, theme: Theme): number {
  switch (gap) {
    case GAP.NONE: return 0;
    case GAP.TIGHT: return theme.spacing.tight;
    case GAP.LOOSE: return theme.spacing.loose;
    case GAP.NORMAL:
    default: return theme.spacing.normal;
  }
}
