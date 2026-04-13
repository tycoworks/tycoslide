// Slide Format Presets
// Standard slide dimensions (in inches) for common aspect ratios and paper sizes.
// These are universal constants — themes can use them or define custom dimensions.

export const SlideFormat = {
  /** 16:9 — 10" × 5.625" — default for modern presentations */
  s16x9: { width: 10, height: 5.625 },
  /** 16:10 — 10" × 6.25" — common laptop/display ratio */
  s16x10: { width: 10, height: 6.25 },
  /** 4:3 — 10" × 7.5" — classic presentation ratio */
  s4x3: { width: 10, height: 7.5 },
  /** US Letter portrait — 8.5" × 11" */
  letterPortrait: { width: 8.5, height: 11 },
  /** A4 portrait — 210mm × 297mm */
  a4Portrait: { width: 8.27, height: 11.69 },
} as const;
