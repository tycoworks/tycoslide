// Default Theme
// Clean light theme with Inter font. Copy and customize for your brand.
// Units: spacing/margins/radii = inches, fontSize/borderWidth = points, opacity = 0-100

import {
  TEXT_STYLE,
  GAP,
  BORDER_STYLE,
  DASH_TYPE,
  HALIGN,
  VALIGN,
  SLIDE_SIZE,
  type Theme,
} from 'tycoslide';
import type { TextTokens, PlainTextTokens, ListTokens } from 'tycoslide-components';
import { assets } from './assets.js';
import { defaultMaster, minimalMaster } from './master.js';
import {
  titleLayout, endLayout, sectionLayout, bodyLayout,
  statLayout, imageLayout, imageLeftLayout, imageRightLayout,
  twoColumnLayout, comparisonLayout, statementLayout,
  agendaLayout, cardsLayout, captionLayout,
  titleOnlyLayout, quoteLayout,
} from './layouts.js';

// ============================================
// COLOR PALETTE
// ============================================

// Neutral gray surfaces (zero chroma), purple primary accent.
export const colors = {
  background: '#FFFFFF',          // Pure white
  text: '#1A1A2E',               // Dark navy
  textMuted: '#4A4A5A',           // Neutral gray
  primary: '#7C3AED',             // Purple accent
  onPrimary: '#FFFFFF',           // White on purple
  secondary: '#F5F5F5',           // Neutral surface

  // Neutral gray surface hierarchy (zero chroma)
  surfaceContainer: '#F5F5F5',    // Cards, callouts
  surfaceContainerLow: '#FAFAFA', // Quotes
  surfaceContainerHigh: '#EBEBEB',// Table headers
  outlineVariant: '#E5E5E5',      // Borders, separators

  accents: {
    blue: '#1A1A2E',      // Dark navy (default emphasis)
    green: '#0E6245',     // Deep forest green
    red: '#B42318',       // Deep brick red
    yellow: '#B54708',    // Deep amber
    purple: '#7C3AED',
  },
};

const subtleOpacity = 15;

// ============================================
// SPACING
// ============================================

const unit = 0.03125; // 1/32 inch

// Derived spacing constants (local to theme construction, not on Theme type)
const gap = unit * 8;             // 0.25"
const gapTight = unit * 4;        // 0.125"
const gapLoose = unit * 16;       // 0.5"
const padding = unit * 8;         // 0.25"
const cellPadding = unit * 2;     // 0.0625"
const bulletIndentMultiplier = 1.5;
const lineSpacing = 1.2;
const footerHeight = unit * 8;

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
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};
const cardDescription: TextTokens = {
  style: TEXT_STYLE.SMALL,
  color: colors.textMuted,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};

const quoteText: TextTokens = {
  style: TEXT_STYLE.H3,
  color: colors.text,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};
const quoteAttribution: PlainTextTokens = {
  style: TEXT_STYLE.SMALL,
  color: colors.textMuted,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
};

// --- Shared layout token objects ---

const headerTitle: PlainTextTokens = {
  style: TEXT_STYLE.H3, color: colors.text,
  hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
};
const headerEyebrow: PlainTextTokens = {
  style: TEXT_STYLE.EYEBROW, color: colors.primary,
  hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
};
const bodyText: TextTokens = {
  style: TEXT_STYLE.BODY, color: colors.text,
  linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};
const bodyList: ListTokens = {
  style: TEXT_STYLE.BODY, color: colors.text,
  linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP,
  accents: colors.accents,
};
const mutedCaption: TextTokens = {
  style: TEXT_STYLE.SMALL, color: colors.textMuted,
  linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};

// --- Dark-background (hero/section) token objects ---

const heroTitle: PlainTextTokens = {
  style: TEXT_STYLE.H1, color: colors.onPrimary,
  hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
};
const heroSubtitle: PlainTextTokens = {
  style: TEXT_STYLE.H3, color: colors.onPrimary,
  hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
};
const sectionHeading: PlainTextTokens = {
  style: TEXT_STYLE.H2, color: colors.onPrimary,
  hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
};

// --- Layout-specific token objects ---

const statValue: PlainTextTokens = {
  style: TEXT_STYLE.H1, color: colors.text,
  hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
};
const statLabel: PlainTextTokens = {
  style: TEXT_STYLE.H3, color: colors.textMuted,
  hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
};
const subHeading: PlainTextTokens = {
  style: TEXT_STYLE.H4, color: colors.text,
  hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE,
};
const captionPlain: PlainTextTokens = {
  style: TEXT_STYLE.SMALL, color: colors.textMuted,
  hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE,
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
  cellPadding: cellPadding,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  cellLineHeight: lineSpacing,
  linkColor: colors.primary,
  linkUnderline: true,
  accents: colors.accents,
};

const codeTokens = {
  textStyle: TEXT_STYLE.CODE,
  backgroundColor: '#1A1A2E',
  textColor: '#E2E8F0',
  keywordColor: '#A78BFA',
  stringColor: '#10B981',
  commentColor: '#6B7280',
  functionColor: '#79C0FF',
  numberColor: '#F0883E',
  operatorColor: '#E2E8F0',
  typeColor: '#FFA657',
  variableColor: '#E2E8F0',
  padding: padding,
  borderRadius: cornerRadius,
};

const quoteSlotTokens = {
  bar: {
    color: colors.primary,
    width: 2,
    dashType: DASH_TYPE.SOLID,
  },
  gap: GAP.NORMAL,
  quote: quoteText,
  attribution: quoteAttribution,
};

const testimonialSlotTokens = {
  background: {
    fill: colors.surfaceContainer,
    fillOpacity: 100,
    borderColor: colors.outlineVariant,
    borderWidth,
    cornerRadius,
  },
  padding: padding,
  gap: GAP.TIGHT,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  quote: quoteText,
  attribution: quoteAttribution,
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
  accentOpacity: subtleOpacity,
  accents: colors.accents,
};

// ============================================
// THEME EXPORT
// ============================================

// Shared slot injection tokens for layouts with markdown body slots
const bodySlotTokens = {
  table: tableTokens,
  code: codeTokens,
  mermaid: mermaidTokens,
  quote: quoteSlotTokens,
  testimonial: testimonialSlotTokens,
};

export const theme = {
  slide: SLIDE_SIZE.S16x9,
  spacing: { normal: gap, tight: gapTight, loose: gapLoose },
  fonts: [assets.fonts.inter, assets.fonts.interLight, assets.fonts.firaCode],
  textStyles: {
    h1: { fontFamily: assets.fonts.interLight, fontSize: 48, lineHeightMultiplier: lineSpacing, bulletIndentPt: 48 * bulletIndentMultiplier },
    h2: { fontFamily: assets.fonts.interLight, fontSize: 36, lineHeightMultiplier: lineSpacing, bulletIndentPt: 36 * bulletIndentMultiplier },
    h3: { fontFamily: assets.fonts.interLight, fontSize: 24, lineHeightMultiplier: lineSpacing, bulletIndentPt: 24 * bulletIndentMultiplier },
    h4: { fontFamily: assets.fonts.interLight, fontSize: 16, lineHeightMultiplier: lineSpacing, bulletIndentPt: 16 * bulletIndentMultiplier },
    body: { fontFamily: assets.fonts.interLight, fontSize: 14, lineHeightMultiplier: lineSpacing, bulletIndentPt: 14 * bulletIndentMultiplier },
    small: { fontFamily: assets.fonts.interLight, fontSize: 12, lineHeightMultiplier: lineSpacing, bulletIndentPt: 12 * bulletIndentMultiplier },
    eyebrow: { fontFamily: assets.fonts.inter, fontSize: 11, lineHeightMultiplier: 1.0, bulletIndentPt: 11 * bulletIndentMultiplier },
    footer: { fontFamily: assets.fonts.interLight, fontSize: 8, lineHeightMultiplier: 1.0, bulletIndentPt: 8 * bulletIndentMultiplier },
    code: { fontFamily: assets.fonts.firaCode, fontSize: 11, lineHeightMultiplier: 1.6, bulletIndentPt: 0 },
  },
  layouts: {
    title: {
      variants: {
        default: titleLayout.tokenMap({
          title: heroTitle,
          subtitle: heroSubtitle,
        }),
      },
    },
    end: {
      variants: {
        default: endLayout.tokenMap({
          title: heroTitle,
          subtitle: heroSubtitle,
        }),
      },
    },
    section: {
      variants: {
        default: sectionLayout.tokenMap({
          title: sectionHeading,
        }),
      },
    },
    body: {
      variants: {
        default: bodyLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          ...bodySlotTokens,
        }),
      },
    },
    stat: {
      variants: {
        default: statLayout.tokenMap({
          value: statValue,
          label: statLabel,
          caption: mutedCaption,
        }),
      },
    },
    image: {
      variants: {
        default: imageLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
        }),
      },
    },
    'image-left': {
      variants: {
        default: imageLeftLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          ...bodySlotTokens,
        }),
      },
    },
    'image-right': {
      variants: {
        default: imageRightLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          ...bodySlotTokens,
        }),
      },
    },
    'two-column': {
      variants: {
        default: twoColumnLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          text: bodyText,
          list: bodyList,
          ...bodySlotTokens,
        }),
      },
    },
    comparison: {
      variants: {
        default: comparisonLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          columnTitle: subHeading,
          text: bodyText,
          list: bodyList,
          ...bodySlotTokens,
        }),
      },
    },
    statement: {
      variants: (() => {
        const base = { title: headerTitle, eyebrow: headerEyebrow, caption: mutedCaption };
        return {
          default: statementLayout.tokenMap({ ...base, body: bodyText }),
          hero: statementLayout.tokenMap({ ...base, body: { ...bodyText, style: TEXT_STYLE.H3 } }),
        };
      })(),
    },
    agenda: {
      variants: {
        default: agendaLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          intro: bodyText,
          items: bodyList,
        }),
      },
    },
    cards: {
      variants: {
        default: cardsLayout.tokenMap({
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
            padding: padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        }),
        flat: cardsLayout.tokenMap({
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
            padding: padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        }),
      },
    },
    caption: {
      variants: {
        default: captionLayout.tokenMap({
          caption: captionPlain,
        }),
      },
    },
    'title-only': {
      variants: {
        default: titleOnlyLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
        }),
      },
    },
    quote: {
      variants: {
        default: quoteLayout.tokenMap({
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
        }),
      },
    },
  },
  masters: {
    default: {
      variants: {
        default: defaultMaster.tokenMap({
          background: { color: colors.background },
          margin: 0.5,
          footerHeight,
          footerText: 'tycoworks',
          slideNumber: {
            style: TEXT_STYLE.FOOTER,
            color: colors.textMuted,
            hAlign: HALIGN.RIGHT,
            vAlign: VALIGN.MIDDLE,
          },
          footer: {
            style: TEXT_STYLE.FOOTER,
            color: colors.textMuted,
            hAlign: HALIGN.LEFT,
            vAlign: VALIGN.MIDDLE,
          },
        }),
      },
    },
    minimal: {
      variants: {
        default: minimalMaster.tokenMap({
          background: { color: colors.background },
          margin: 0.5,
        }),
        dark: minimalMaster.tokenMap({
          background: { color: colors.text },
          margin: 0.5,
        }),
      },
    },
  },
} satisfies Theme;
