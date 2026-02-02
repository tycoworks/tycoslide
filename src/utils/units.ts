// Unit Conversion Utilities
// Shared constants for point ↔ inch conversion

export const POINTS_PER_INCH = 72;
export const ptToIn = (pt: number): number => pt / POINTS_PER_INCH;
export const inToPt = (inches: number): number => inches * POINTS_PER_INCH;
