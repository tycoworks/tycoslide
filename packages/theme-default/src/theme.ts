// Default Theme
// Clean light theme with Inter font. Copy and customize for your brand.

import {
  TEXT_STYLE,
  GAP,
  BORDER_STYLE,
  DASH_TYPE,
  FONT_WEIGHT,
  HALIGN,
  VALIGN,
  SLIDE_SIZE,
  type Theme,
} from 'tycoslide';
import { assets } from './assets.js';

// ============================================
// COLOR PALETTE
// ============================================

// Material Design 3 color palette
const colors = {
  background: 'FFFFFF',
  text: '1C1B1F',        // Material Design on-surface (16.1:1 contrast, AAA)
  textMuted: '49454F',   // Material Design on-surface-variant (7.5:1 contrast, AAA)
  primary: '1976D2',     // Material Blue 700
  secondary: 'E7E0EC',   // Material Design surface-variant
  subtleOpacity: 15,
  accents: {
    blue: '1976D2',      // Material Blue 700
    green: '388E3C',     // Material Green 700
    red: 'D32F2F',       // Material Red 700
    yellow: 'FBC02D',    // Material Yellow 700
    purple: '7B1FA2',    // Material Purple 700
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
// BORDERS
// ============================================

const borderWidth = 0.75;
const cornerRadius = 0.05;

// ============================================
// COMPONENT BASES (shared across variants)
// ============================================

const textBase = {
  style: TEXT_STYLE.BODY,
  lineHeightMultiplier: spacing.lineSpacing,
};

const shapeBase = {
  borderColor: colors.background,
  borderWidth: 0,
  cornerRadius: 0,
};

// ============================================
// THEME EXPORT
// ============================================

export const theme: Theme = {
  colors,
  slide: SLIDE_SIZE.S16x9,
  spacing,
  borders: {
    width: borderWidth,
    radius: cornerRadius,
  },
  textStyles: {
    h1: { fontFamily: assets.fonts.inter, fontSize: 36, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.text },
    h2: { fontFamily: assets.fonts.inter, fontSize: 28, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.text },
    h3: { fontFamily: assets.fonts.inter, fontSize: 22, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.text },
    h4: { fontFamily: assets.fonts.inter, fontSize: 18, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.text },
    body: { fontFamily: assets.fonts.inter, fontSize: 14, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.text },
    small: { fontFamily: assets.fonts.inter, fontSize: 12, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.textMuted },
    eyebrow: { fontFamily: assets.fonts.inter, fontSize: 10, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.textMuted },
    footer: { fontFamily: assets.fonts.inter, fontSize: 8, defaultWeight: FONT_WEIGHT.NORMAL, color: colors.textMuted },
  },
  components: {
    card: {
      variants: {
        default: {
          padding: spacing.padding,
          cornerRadius,
          backgroundColor: colors.secondary,
          backgroundOpacity: colors.subtleOpacity,
          borderColor: colors.secondary,
          borderWidth,
          titleStyle: TEXT_STYLE.H4,
          titleColor: colors.text,
          descriptionStyle: TEXT_STYLE.SMALL,
          descriptionColor: colors.textMuted,
          gap: GAP.TIGHT,
          hAlign: HALIGN.CENTER,
          vAlign: VALIGN.TOP,
        },
        flat: {
          padding: spacing.padding,
          cornerRadius,
          backgroundColor: colors.background,
          backgroundOpacity: 0,
          borderColor: colors.secondary,
          borderWidth: 0,
          titleStyle: TEXT_STYLE.H4,
          titleColor: colors.text,
          descriptionStyle: TEXT_STYLE.SMALL,
          descriptionColor: colors.textMuted,
          gap: GAP.TIGHT,
          hAlign: HALIGN.CENTER,
          vAlign: VALIGN.TOP,
        },
      },
    },
    quote: {
      variants: {
        default: {
          padding: spacing.padding * 2,
          cornerRadius,
          backgroundColor: colors.secondary,
          backgroundOpacity: colors.subtleOpacity,
          borderColor: colors.secondary,
          borderWidth,
          quoteStyle: TEXT_STYLE.BODY,
          quoteColor: colors.text,
          attributionStyle: TEXT_STYLE.SMALL,
          attributionColor: colors.textMuted,
          attributionHAlign: HALIGN.RIGHT,
          gap: GAP.NORMAL,
          hAlign: HALIGN.CENTER,
          vAlign: VALIGN.MIDDLE,
        },
      },
    },
    table: {
      variants: {
        default: {
          borderStyle: BORDER_STYLE.FULL,
          borderColor: colors.secondary,
          borderWidth,
          headerBackground: colors.background,
          headerBackgroundOpacity: 0,
          headerTextStyle: TEXT_STYLE.BODY,
          cellBackground: colors.background,
          cellBackgroundOpacity: 0,
          cellTextStyle: TEXT_STYLE.BODY,
          cellPadding: spacing.cellPadding,
          hAlign: HALIGN.LEFT,
          vAlign: VALIGN.MIDDLE,
          cellLineHeight: spacing.lineSpacing,
        },
      },
    },
    line: {
      variants: {
        default: {
          color: colors.secondary,
          width: borderWidth,
          dashType: DASH_TYPE.SOLID,
        },
      },
    },
    slideNumber: {
      variants: {
        default: {
          style: TEXT_STYLE.FOOTER,
          color: colors.textMuted,
          hAlign: HALIGN.RIGHT,
          vAlign: VALIGN.MIDDLE,
        },
      },
    },
    text: {
      variants: {
        default: { ...textBase, color: colors.text, bulletColor: colors.text },
        muted:   { ...textBase, color: colors.textMuted, bulletColor: colors.textMuted },
        accent:  { ...textBase, color: colors.accents.blue, bulletColor: colors.accents.blue },
        inverse: { ...textBase, color: colors.background, bulletColor: colors.background },
      },
    },
    shape: {
      variants: {
        default:  { ...shapeBase, fill: colors.secondary, fillOpacity: 100 },
        primary:  { ...shapeBase, fill: colors.primary, fillOpacity: 100 },
        subtle:   { ...shapeBase, fill: colors.secondary, fillOpacity: colors.subtleOpacity },
        outlined: { ...shapeBase, fill: colors.background, fillOpacity: 0, borderColor: colors.primary, borderWidth },
        accent:   { ...shapeBase, fill: colors.accents.blue, fillOpacity: 100 },
      },
    },
  },
};
