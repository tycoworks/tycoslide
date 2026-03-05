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

// Neutral gray surfaces (zero chroma), purple primary accent.
export const colors = {
  background: 'FFFFFF',          // Pure white
  text: '1A1A2E',               // Dark navy
  textMuted: '4A4A5A',           // Neutral gray
  primary: '7C3AED',             // Purple accent
  onPrimary: 'FFFFFF',           // White on purple
  secondary: 'F5F5F5',           // Neutral surface
  subtleOpacity: 15,

  // Neutral gray surface hierarchy (zero chroma)
  surfaceContainer: 'F5F5F5',    // Cards, callouts
  surfaceContainerLow: 'FAFAFA', // Quotes
  surfaceContainerHigh: 'EBEBEB',// Table headers
  outlineVariant: 'E5E5E5',      // Borders, separators

  accents: {
    blue: '1A1A2E',      // Dark navy (default emphasis)
    green: '0E6245',     // Deep forest green
    red: 'B42318',       // Deep brick red
    yellow: 'B54708',    // Deep amber
    purple: '7C3AED',
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
const cornerRadius = 0.08;

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
  fonts: [assets.fonts.inter, assets.fonts.firaCode],
  textStyles: {
    h1: { fontFamily: assets.fonts.inter, fontSize: 48, defaultWeight: FONT_WEIGHT.LIGHT },
    h2: { fontFamily: assets.fonts.inter, fontSize: 36, defaultWeight: FONT_WEIGHT.LIGHT },
    h3: { fontFamily: assets.fonts.inter, fontSize: 24, defaultWeight: FONT_WEIGHT.LIGHT },
    h4: { fontFamily: assets.fonts.inter, fontSize: 16, defaultWeight: FONT_WEIGHT.LIGHT },
    body: { fontFamily: assets.fonts.inter, fontSize: 14, defaultWeight: FONT_WEIGHT.LIGHT },
    small: { fontFamily: assets.fonts.inter, fontSize: 12, defaultWeight: FONT_WEIGHT.LIGHT },
    eyebrow: { fontFamily: assets.fonts.inter, fontSize: 11, defaultWeight: FONT_WEIGHT.NORMAL },
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
          barColor: colors.primary,
          barWidth: 2,
          quoteStyle: TEXT_STYLE.H3,
          quoteColor: colors.text,
          attributionStyle: TEXT_STYLE.SMALL,
          attributionColor: colors.textMuted,
          gap: GAP.NORMAL,
        },
      },
    },
    testimonial: {
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
        eyebrow:  { ...textBase, color: colors.primary, bulletColor: colors.primary, style: TEXT_STYLE.EYEBROW, lineHeightMultiplier: 1.0 },
        muted:    { ...textBase, color: colors.textMuted, bulletColor: colors.textMuted },
        accent:  { ...textBase, color: colors.accents.blue, bulletColor: colors.accents.blue },
        inverse: { ...textBase, color: colors.background, bulletColor: colors.background },
      },
    },
    list: {
      variants: {
        default: {
          color: colors.text,
          bulletColor: colors.text,
          style: TEXT_STYLE.BODY,
          lineHeightMultiplier: spacing.lineSpacing,
        },
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
    code: {
      variants: {
        default: {
          backgroundColor: '1A1A2E',
          textColor: 'E2E8F0',
          keywordColor: 'A78BFA',
          stringColor: '10B981',
          commentColor: '6B7280',
          functionColor: '79C0FF',
          numberColor: 'F0883E',
          operatorColor: 'E2E8F0',
          typeColor: 'FFA657',
          variableColor: 'E2E8F0',
          fontSize: 11,
          fontFamily: assets.fonts.firaCode,
          lineHeight: 1.6,
          padding: spacing.padding,
          borderRadius: cornerRadius,
        },
      },
    },
    mermaid: {
      variants: {
        default: {
          primaryColor: colors.primary,
          primaryTextColor: colors.onPrimary,
          primaryBorderColor: colors.outlineVariant,
          lineColor: colors.text,
          secondaryColor: colors.secondary,
          tertiaryColor: colors.secondary,
          textColor: colors.text,
          nodeTextColor: colors.text,
          clusterBackground: colors.secondary,
          clusterBorderColor: colors.outlineVariant,
          edgeLabelBackground: colors.background,
          titleColor: colors.text,
          textStyle: TEXT_STYLE.BODY,
          accentOpacity: colors.subtleOpacity,
        },
      },
    },
  },
};
