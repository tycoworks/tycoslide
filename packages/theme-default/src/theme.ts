// Default Theme
// Clean light theme with Inter font. Copy and customize for your brand.

import {
  TEXT_STYLE,
  GAP,
  BORDER_STYLE,
  DASH_TYPE,
  HALIGN,
  SLIDE_SIZE,
  type Theme,
} from 'tycoslide';
import { assets } from './assets.js';

// ============================================
// COLOR PALETTE
// ============================================

const colors = {
  background: 'FFFFFF',
  text: '1A1A2E',
  textMuted: '64748B',
  primary: '2563EB',
  secondary: 'E2E8F0',
  subtleOpacity: 15,
  accents: {
    blue: '2563EB',
    green: '16A34A',
    red: 'DC2626',
    yellow: 'EAB308',
    purple: '9333EA',
  },
};

// ============================================
// SPACING
// ============================================

const unit = 0.03125; // 1/32 inch

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

// ============================================
// THEME EXPORT
// ============================================

export const theme: Theme = {
  colors,
  slide: SLIDE_SIZE.S16x9,
  spacing,
  borders: {
    width: 0.75,
    radius: 0.05,
  },
  textStyles: {
    h1: { fontFamily: assets.fonts.inter, fontSize: 36, color: colors.text },
    h2: { fontFamily: assets.fonts.inter, fontSize: 28, color: colors.text },
    h3: { fontFamily: assets.fonts.inter, fontSize: 22, color: colors.text },
    h4: { fontFamily: assets.fonts.inter, fontSize: 18, color: colors.text },
    body: { fontFamily: assets.fonts.inter, fontSize: 14, color: colors.text },
    small: { fontFamily: assets.fonts.inter, fontSize: 12, color: colors.textMuted },
    eyebrow: { fontFamily: assets.fonts.inter, fontSize: 10, color: colors.textMuted },
    footer: { fontFamily: assets.fonts.inter, fontSize: 8, color: colors.textMuted },
  },
  components: {
    card: {
      padding: spacing.padding,
      cornerRadius: 0.05,
      backgroundColor: colors.secondary,
      backgroundOpacity: colors.subtleOpacity,
      borderColor: colors.secondary,
      borderWidth: 0.75,
      titleStyle: TEXT_STYLE.H4,
      descriptionStyle: TEXT_STYLE.SMALL,
      gap: GAP.TIGHT,
    },
    quote: {
      padding: spacing.padding * 2,
      cornerRadius: 0.05,
      backgroundColor: colors.secondary,
      backgroundOpacity: colors.subtleOpacity,
      borderColor: colors.secondary,
      borderWidth: 0.75,
      attributionStyle: TEXT_STYLE.SMALL,
      gap: GAP.NORMAL,
    },
    table: {
      borderStyle: BORDER_STYLE.FULL,
      borderColor: colors.secondary,
      borderWidth: 0.75,
      cellPadding: spacing.cellPadding,
      cellTextStyle: TEXT_STYLE.BODY,
      headerTextStyle: TEXT_STYLE.BODY,
    },
    line: {
      color: colors.secondary,
      width: 0.75,
      dashType: DASH_TYPE.SOLID,
    },
    slideNumber: {
      style: TEXT_STYLE.FOOTER,
      hAlign: HALIGN.RIGHT,
    },
  },
};
