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
import type { TextTokens, PlainTextTokens, ListTokens } from 'tycoslide-components';
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
  hyperlink: '7C3AED',           // Theme-level hyperlink fallback (Keynote/LibreOffice)
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
// SHARED TOKEN OBJECTS FOR COMPOSITION COMPONENTS
// ============================================

const cardTitle: TextTokens = {
  style: TEXT_STYLE.H4,
  color: colors.text,
  lineHeightMultiplier: spacing.lineSpacing,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
};
const cardDescription: TextTokens = {
  style: TEXT_STYLE.SMALL,
  color: colors.textMuted,
  lineHeightMultiplier: spacing.lineSpacing,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
};

const quoteText: TextTokens = {
  style: TEXT_STYLE.H3,
  color: colors.text,
  lineHeightMultiplier: spacing.lineSpacing,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
};
const quoteAttribution: PlainTextTokens = {
  style: TEXT_STYLE.SMALL,
  color: colors.textMuted,
  lineHeightMultiplier: 1.0,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
};

// --- Shared layout token objects ---

const headerTitle: PlainTextTokens = {
  style: TEXT_STYLE.H3, color: colors.text, lineHeightMultiplier: spacing.lineSpacing,
  hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
};
const headerEyebrow: PlainTextTokens = {
  style: TEXT_STYLE.EYEBROW, color: colors.primary, lineHeightMultiplier: 1.0,
  hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
};
const bodyText: TextTokens = {
  style: TEXT_STYLE.BODY, color: colors.text, lineHeightMultiplier: spacing.lineSpacing,
  linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
};
const bodyList: ListTokens = {
  style: TEXT_STYLE.BODY, color: colors.text, lineHeightMultiplier: spacing.lineSpacing,
  linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP,
};
const mutedCaption: TextTokens = {
  style: TEXT_STYLE.SMALL, color: colors.textMuted, lineHeightMultiplier: spacing.lineSpacing,
  linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
};

// ============================================
// SLOT COMPONENT TOKEN OBJECTS (shared across layouts)
// ============================================

const tableTokens = {
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
  linkColor: colors.primary,
  linkUnderline: true,
};

const codeTokens = {
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
};

const mermaidTokens = {
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
  layouts: {
    title: {
      variants: {
        default: {
          background: colors.text,
          title: { style: TEXT_STYLE.H1, color: colors.onPrimary, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          subtitle: { style: TEXT_STYLE.H3, color: colors.onPrimary, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
        },
      },
    },
    end: {
      variants: {
        default: {
          background: colors.text,
          title: { style: TEXT_STYLE.H1, color: colors.onPrimary, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          subtitle: { style: TEXT_STYLE.H3, color: colors.onPrimary, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
        },
      },
    },
    section: {
      variants: {
        default: {
          background: colors.text,
          title: { style: TEXT_STYLE.H2, color: colors.onPrimary, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
        },
      },
    },
    body: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
        },
      },
    },
    stat: {
      variants: {
        default: {
          value: { style: TEXT_STYLE.H1, color: colors.text, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          label: { style: TEXT_STYLE.H3, color: colors.textMuted, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          caption: mutedCaption,
        },
      },
    },
    image: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
        },
      },
    },
    'image-left': {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
        },
      },
    },
    'image-right': {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
        },
      },
    },
    'two-column': {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
        },
      },
    },
    comparison: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          columnTitle: { style: TEXT_STYLE.H4, color: colors.text, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          text: bodyText,
          list: bodyList,
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
        },
      },
    },
    statement: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          body: bodyText,
          caption: mutedCaption,
        },
        hero: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          body: { ...bodyText, style: TEXT_STYLE.H3 },
          caption: mutedCaption,
        },
      },
    },
    agenda: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          intro: bodyText,
          items: bodyList,
        },
      },
    },
    cards: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          intro: bodyText,
          caption: mutedCaption,
          card: {
            background: {
              fill: colors.surfaceContainer,
              fillOpacity: 100,
              borderColor: colors.outlineVariant,
              borderWidth,
              cornerRadius,
            },
            padding: spacing.padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        },
        flat: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          intro: bodyText,
          caption: mutedCaption,
          card: {
            background: {
              fill: colors.background,
              fillOpacity: 0,
              borderColor: colors.outlineVariant,
              borderWidth: 0,
              cornerRadius,
            },
            padding: spacing.padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        },
      },
    },
    bio: {
      variants: {
        default: {
          person: { style: TEXT_STYLE.H4, color: colors.text, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          role: { style: TEXT_STYLE.BODY, color: colors.textMuted, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
          text: bodyText,
          list: bodyList,
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
        },
      },
    },
    caption: {
      variants: {
        default: {
          caption: { style: TEXT_STYLE.SMALL, color: colors.textMuted, lineHeightMultiplier: spacing.lineSpacing, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } satisfies PlainTextTokens,
        },
      },
    },
    'title-only': {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
        },
      },
    },
    team: {
      variants: {
        default: {
          title: headerTitle,
          eyebrow: headerEyebrow,
          card: {
            background: {
              fill: colors.background,
              fillOpacity: 0,
              borderColor: colors.outlineVariant,
              borderWidth: 0,
              cornerRadius,
            },
            padding: spacing.padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        },
      },
    },
    quote: {
      variants: {
        default: {
          quote: {
            bar: {
              color: colors.primary,
              width: 2,
              dashType: DASH_TYPE.SOLID,
            },
            gap: GAP.NORMAL,
            quote: quoteText,
            attribution: quoteAttribution,
          },
        },
      },
    },
  },
  master: {
    slideNumber: {
      style: TEXT_STYLE.FOOTER,
      color: colors.textMuted,
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.MIDDLE,
    },
    footer: {
      style: TEXT_STYLE.FOOTER,
      color: colors.textMuted,
      lineHeightMultiplier: 1.0,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.MIDDLE,
    },
  },
};
