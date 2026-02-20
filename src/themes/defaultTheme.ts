// Default Theme
// A neutral starting point for new themes. Copy and customize.

import {
  TEXT_STYLE,
  GAP,
  BORDER_STYLE,
  DASH_TYPE,
  HALIGN,
  SLIDE_SIZE,
  FONT_WEIGHT,
  type Theme,
  type FontFamily,
} from '../core/types.js';

// ============================================
// FONTS (system fonts — no custom font files needed)
// ============================================

const systemFont: FontFamily = {
  normal: { name: 'Arial', path: '' },
  bold: { name: 'Arial Bold', path: '' },
};

// ============================================
// SPACING
// ============================================

const unit = 0.03125; // 1/32 inch

// ============================================
// THEME
// ============================================

const colors = {
  background: 'FFFFFF',
  text: '222222',
  textMuted: '666666',
  primary: '2563EB',     // Blue
  secondary: 'E5E7EB',   // Light gray
  subtleOpacity: 15,
  accents: {
    blue: '2563EB',
    green: '16A34A',
    red: 'DC2626',
    yellow: 'EAB308',
    purple: '9333EA',
  },
};

const spacing = {
  unit,
  margin: unit * 16,       // 0.5"
  gap: unit * 8,            // 0.25"
  gapTight: unit * 4,       // 0.125"
  gapLoose: unit * 16,      // 0.5"
  padding: unit * 8,        // 0.25"
  cellPadding: unit * 2,    // 0.0625"
  bulletSpacing: 1.5,
  bulletIndentMultiplier: 1.5,
  maxScaleFactor: 1.0,
  lineSpacing: 1.2,
};

const borders = {
  width: 0.75,
  radius: 0.05,
};

export const defaultTheme: Theme = {
  colors,
  slide: SLIDE_SIZE.S16x9,
  spacing,
  borders,
  textStyles: {
    h1: { fontFamily: systemFont, fontSize: 36, color: colors.text },
    h2: { fontFamily: systemFont, fontSize: 28, color: colors.text },
    h3: { fontFamily: systemFont, fontSize: 22, color: colors.text },
    h4: { fontFamily: systemFont, fontSize: 18, color: colors.text },
    body: { fontFamily: systemFont, fontSize: 14, color: colors.text },
    small: { fontFamily: systemFont, fontSize: 12, color: colors.textMuted },
    eyebrow: { fontFamily: systemFont, fontSize: 10, color: colors.textMuted },
    footer: { fontFamily: systemFont, fontSize: 8, color: colors.textMuted },
  },
  components: {
    card: {
      padding: spacing.padding,
      cornerRadius: borders.radius,
      backgroundColor: colors.secondary,
      backgroundOpacity: colors.subtleOpacity,
      borderColor: colors.secondary,
      borderWidth: borders.width,
      titleStyle: TEXT_STYLE.H4,
      descriptionStyle: TEXT_STYLE.SMALL,
      gap: GAP.TIGHT,
    },
    quote: {
      padding: spacing.padding * 2,
      cornerRadius: borders.radius,
      backgroundColor: colors.secondary,
      backgroundOpacity: colors.subtleOpacity,
      borderColor: colors.secondary,
      borderWidth: borders.width,
      attributionStyle: TEXT_STYLE.SMALL,
      gap: GAP.NORMAL,
    },
    table: {
      borderStyle: BORDER_STYLE.FULL,
      borderColor: colors.secondary,
      borderWidth: borders.width,
      cellPadding: spacing.cellPadding,
      cellTextStyle: TEXT_STYLE.BODY,
      headerTextStyle: TEXT_STYLE.BODY,
    },
    line: {
      color: colors.secondary,
      width: borders.width,
      dashType: DASH_TYPE.SOLID,
    },
    slideNumber: {
      style: TEXT_STYLE.FOOTER,
      hAlign: HALIGN.RIGHT,
    },
  },
};
