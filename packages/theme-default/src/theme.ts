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

// Stripe-derived palette — navy IS the brand color.
// Source: Stripe's accessible color system (0A2540 "Downriver")
const colors = {
  background: 'FFFFFF',          // Pure white
  text: '0A2540',                // Stripe Downriver navy (15.5:1 AAA)
  textMuted: '425466',           // Stripe secondary slate (7.8:1 AAA)
  primary: '0A2540',             // Navy — same as text (Stripe pattern)
  onPrimary: 'FFFFFF',           // White on navy
  secondary: 'E8EDF3',           // Blue-tinted surface variant
  subtleOpacity: 15,

  // Blue-tinted gray surface hierarchy (hue 210°)
  surfaceContainer: 'ECF0F4',    // Cards, callouts
  surfaceContainerLow: 'F5F7F9', // Quotes
  surfaceContainerHigh: 'D9E0E8',// Table headers
  outlineVariant: 'B2C2D1',      // Borders, separators

  accents: {
    blue: '0A2540',      // Navy (default emphasis)
    green: '0E6245',     // Deep forest green
    red: 'B42318',       // Deep brick red
    yellow: 'B54708',    // Deep amber
    purple: '5925DC',    // Deep violet
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
    h1: { fontFamily: assets.fonts.inter, fontSize: 32, defaultWeight: FONT_WEIGHT.LIGHT },
    h2: { fontFamily: assets.fonts.inter, fontSize: 26, defaultWeight: FONT_WEIGHT.LIGHT },
    h3: { fontFamily: assets.fonts.inter, fontSize: 20, defaultWeight: FONT_WEIGHT.NORMAL },
    h4: { fontFamily: assets.fonts.inter, fontSize: 16, defaultWeight: FONT_WEIGHT.NORMAL },
    body: { fontFamily: assets.fonts.inter, fontSize: 14, defaultWeight: FONT_WEIGHT.LIGHT },
    small: { fontFamily: assets.fonts.inter, fontSize: 12, defaultWeight: FONT_WEIGHT.LIGHT },
    eyebrow: { fontFamily: assets.fonts.inter, fontSize: 10, defaultWeight: FONT_WEIGHT.NORMAL },
    footer: { fontFamily: assets.fonts.inter, fontSize: 8, defaultWeight: FONT_WEIGHT.LIGHT },
  },
  components: {
    card: {
      variants: {
        default: {
          padding: spacing.padding,
          cornerRadius,
          backgroundColor: colors.surfaceContainer,
          backgroundOpacity: 100,
          borderColor: colors.outlineVariant,
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
          borderColor: colors.outlineVariant,
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
          backgroundColor: colors.surfaceContainerLow,
          backgroundOpacity: 100,
          borderColor: colors.text,
          borderWidth,
          quoteStyle: TEXT_STYLE.H4,
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
          borderColor: colors.outlineVariant,
          borderWidth,
          headerBackground: colors.surfaceContainerHigh,
          headerBackgroundOpacity: 100,
          headerTextStyle: TEXT_STYLE.BODY,
          headerTextColor: colors.text,
          cellBackground: colors.background,
          cellBackgroundOpacity: 0,
          cellTextStyle: TEXT_STYLE.BODY,
          cellTextColor: colors.text,
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
          color: colors.outlineVariant,
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
        default:  { ...textBase, color: colors.text, bulletColor: colors.text },
        eyebrow:  { ...textBase, color: colors.textMuted, bulletColor: colors.textMuted, style: TEXT_STYLE.EYEBROW, lineHeightMultiplier: 1.0 },
        muted:    { ...textBase, color: colors.textMuted, bulletColor: colors.textMuted },
        accent:  { ...textBase, color: colors.accents.blue, bulletColor: colors.accents.blue },
        inverse: { ...textBase, color: colors.background, bulletColor: colors.background },
      },
    },
    shape: {
      variants: {
        default:  { ...shapeBase, fill: colors.surfaceContainerHigh, fillOpacity: 100 },
        primary:  { ...shapeBase, fill: colors.primary, fillOpacity: 100 },
        subtle:   { ...shapeBase, fill: colors.surfaceContainer, fillOpacity: 100 },
        outlined: { ...shapeBase, fill: colors.background, fillOpacity: 0, borderColor: colors.outlineVariant, borderWidth },
        accent:   { ...shapeBase, fill: colors.accents.blue, fillOpacity: 100 },
      },
    },
  },
};
