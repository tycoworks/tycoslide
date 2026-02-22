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
// BORDERS
// ============================================

const borderWidth = 0.75;
const cornerRadius = 0.05;

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
      variants: {
        default: {
          padding: spacing.padding,
          cornerRadius,
          backgroundColor: colors.secondary,
          backgroundOpacity: colors.subtleOpacity,
          borderColor: colors.secondary,
          borderWidth,
          titleStyle: TEXT_STYLE.H4,
          descriptionStyle: TEXT_STYLE.SMALL,
          gap: GAP.TIGHT,
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
          attributionStyle: TEXT_STYLE.SMALL,
          gap: GAP.NORMAL,
        },
      },
    },
    table: {
      variants: {
        default: {
          borderStyle: BORDER_STYLE.FULL,
          borderColor: colors.secondary,
          borderWidth,
          cellPadding: spacing.cellPadding,
          cellTextStyle: TEXT_STYLE.BODY,
          headerTextStyle: TEXT_STYLE.BODY,
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
        },
      },
    },
    text: {
      variants: {
        default: {
          color: colors.text,
          bulletColor: colors.text,
          style: TEXT_STYLE.BODY,
          lineHeightMultiplier: spacing.lineSpacing,
        },
        muted: {
          color: colors.textMuted,
          bulletColor: colors.textMuted,
          style: TEXT_STYLE.BODY,
          lineHeightMultiplier: spacing.lineSpacing,
        },
        accent: {
          color: colors.accents.blue,
          bulletColor: colors.accents.blue,
          style: TEXT_STYLE.BODY,
          lineHeightMultiplier: spacing.lineSpacing,
        },
        inverse: {
          color: colors.background,
          bulletColor: colors.background,
          style: TEXT_STYLE.BODY,
          lineHeightMultiplier: spacing.lineSpacing,
        },
      },
    },
    shape: {
      variants: {
        default: {
          fill: colors.secondary,
          fillOpacity: 100,
          borderColor: colors.background,
          borderWidth: 0,
          cornerRadius: 0,
        },
        primary: {
          fill: colors.primary,
          fillOpacity: 100,
          borderColor: colors.background,
          borderWidth: 0,
          cornerRadius: 0,
        },
        subtle: {
          fill: colors.secondary,
          fillOpacity: colors.subtleOpacity,
          borderColor: colors.background,
          borderWidth: 0,
          cornerRadius: 0,
        },
        outlined: {
          fill: colors.background,
          fillOpacity: 0,
          borderColor: colors.primary,
          borderWidth,
          cornerRadius: 0,
        },
        accent: {
          fill: colors.accents.blue,
          fillOpacity: 100,
          borderColor: colors.background,
          borderWidth: 0,
          cornerRadius: 0,
        },
      },
    },
  },
};
