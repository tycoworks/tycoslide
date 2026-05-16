// Slide Format Presets
// Standard slide dimensions (in pixels at 96 DPI) for common aspect ratios and paper sizes.
// These are universal constants — themes can use them or define custom dimensions.

export const SlideFormat = {
  /** 16:9 — 960 × 540px — default for modern presentations */
  s16x9: { width: 960, height: 540 },
  /** 16:10 — 960 × 600px — common laptop/display ratio */
  s16x10: { width: 960, height: 600 },
  /** 4:3 — 960 × 720px — classic presentation ratio */
  s4x3: { width: 960, height: 720 },
  /** US Letter portrait — 816 × 1056px */
  letterPortrait: { width: 816, height: 1056 },
  /** A4 portrait — 794 × 1123px */
  a4Portrait: { width: 794, height: 1123 },
} as const;
