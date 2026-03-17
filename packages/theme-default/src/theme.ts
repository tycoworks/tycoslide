// Default Theme
// Clean light theme with Inter font. Copy and customize for your brand.
// Units: spacing/margins/radii = inches, fontSize/borderWidth = points, opacity = 0-100

import { BORDER_STYLE, DASH_TYPE, defineTheme, HALIGN, SHADOW_TYPE, SLIDE_SIZE, TEXT_STYLE, VALIGN } from "tycoslide";
import type { ListTokens, PlainTextTokens, TextTokens } from "tycoslide-components";
import { assets } from "./assets.js";
import {
  agendaLayout,
  blankLayout,
  bodyLayout,
  cardsLayout,
  endLayout,
  quoteLayout,
  sectionLayout,
  statementLayout,
  statLayout,
  titleLayout,
  twoColumnLayout,
} from "./layouts.js";
import { defaultMaster, minimalMaster } from "./master.js";

// ============================================
// COLOR PALETTE
// ============================================

const palette = {
  white: "#FFFFFF",
  gray50: "#FAFAFA",
  gray100: "#F5F5F5",
  gray200: "#EBEBEB",
  gray300: "#E5E5E5",
  gray400: "#C8C8D0",
  gray500: "#6B7280",
  gray600: "#4A4A5A",
  navy: "#1A1A2E",
  purple: "#7C3AED",
  forest: "#0E6245",
  brick: "#B42318",
  amber: "#B54708",
  slate: "#E2E8F0",
  lavender: "#A78BFA",
  emerald: "#10B981",
  skyBlue: "#79C0FF",
  orange: "#F0883E",
  gold: "#FFA657",
};

const accents: Record<string, string> = {
  blue: palette.navy,
  green: palette.forest,
  red: palette.brick,
  yellow: palette.amber,
  purple: palette.purple,
};

const subtleOpacity = 15;

// ============================================
// SPACING
// ============================================

const unit = 0.03125; // 1/32 inch

// Derived spacing constants (local to theme construction, not on Theme type)
const spacing = unit * 8; // 0.25"
const spacingTight = unit * 4; // 0.125"
const padding = unit * 8; // 0.25"
const cellPadding = unit * 2; // 0.0625"
const bulletIndentMultiplier = 1.5;
const lineSpacing = 1.2;
const footerHeight = unit * 8;
const margin = 0.5;

// ============================================
// BORDERS
// ============================================

const borderWidth = 0.75;
const cornerRadius = 0.08;
const cornerRadiusLarge = 0.12;
const accentBarWidth = 2;
const shadowOpacity = 24;
const shadowBlur = 10;
const shadowOffset = 3;
const shadowAngle = 180;
const defaultOpacity = 100;

// ============================================
// SHARED TOKEN OBJECTS FOR COMPOSITION COMPONENTS
// ============================================

const cardTitle: TextTokens = {
  style: TEXT_STYLE.H4,
  color: palette.navy,
  linkColor: palette.purple,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};
const cardDescription: TextTokens = {
  style: TEXT_STYLE.SMALL,
  color: palette.gray600,
  linkColor: palette.purple,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};

const quoteText: TextTokens = {
  style: TEXT_STYLE.H2,
  color: palette.navy,
  linkColor: palette.purple,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};
const quoteAttribution: PlainTextTokens = {
  style: TEXT_STYLE.SMALL,
  color: palette.gray600,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
};

// --- Shared layout token objects ---

const headerTitle: PlainTextTokens = {
  style: TEXT_STYLE.H3,
  color: palette.navy,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
};
const headerEyebrow: PlainTextTokens = {
  style: TEXT_STYLE.EYEBROW,
  color: palette.purple,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
};
const bodyText: TextTokens = {
  style: TEXT_STYLE.BODY,
  color: palette.navy,
  linkColor: palette.purple,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};
const bodyList: ListTokens = {
  style: TEXT_STYLE.BODY,
  color: palette.navy,
  linkColor: palette.purple,
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  accents: accents,
};
const mutedCaption: TextTokens = {
  style: TEXT_STYLE.SMALL,
  color: palette.gray600,
  linkColor: palette.purple,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};

// --- Dark-background (hero/section) token objects ---

const heroTitle: TextTokens = {
  style: TEXT_STYLE.H1,
  color: palette.white,
  linkColor: palette.purple,
  linkUnderline: false,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};
const heroSubtitle: TextTokens = {
  style: TEXT_STYLE.H3,
  color: palette.white,
  linkColor: palette.purple,
  linkUnderline: false,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: accents,
};
const sectionHeading: PlainTextTokens = {
  style: TEXT_STYLE.H2,
  color: palette.white,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
};

// --- Layout-specific token objects ---

const statValue: PlainTextTokens = {
  style: TEXT_STYLE.H1,
  color: palette.purple,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
};
const statLabel: PlainTextTokens = {
  style: TEXT_STYLE.H3,
  color: palette.gray600,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
};

// ============================================
// SLOT COMPONENT TOKEN OBJECTS (shared across layouts)
// ============================================

const tableTokens = {
  borderStyle: BORDER_STYLE.FULL,
  borderColor: palette.gray300,
  borderWidth,
  headerBackground: palette.gray200,
  headerTextStyle: TEXT_STYLE.BODY,
  headerTextColor: palette.navy,
  cellBackground: palette.gray50,
  headerBackgroundOpacity: defaultOpacity,
  cellBackgroundOpacity: 0,
  cellTextStyle: TEXT_STYLE.BODY,
  cellTextColor: palette.navy,
  cellPadding: cellPadding,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  cellLineHeight: lineSpacing,
  linkColor: palette.purple,
  linkUnderline: true,
  accents: accents,
};

const codeTokens = {
  textStyle: TEXT_STYLE.CODE,
  textColor: palette.slate,
  keywordColor: palette.lavender,
  stringColor: palette.emerald,
  commentColor: palette.gray500,
  functionColor: palette.skyBlue,
  numberColor: palette.orange,
  operatorColor: palette.slate,
  typeColor: palette.gold,
  variableColor: palette.slate,
  padding: padding,
  background: {
    fill: palette.navy,
    fillOpacity: defaultOpacity,
    borderColor: palette.navy,
    borderWidth: 0,
    cornerRadius,
    shadow: {
      type: SHADOW_TYPE.OUTER,
      color: palette.navy,
      opacity: shadowOpacity,
      blur: shadowBlur,
      offset: shadowOffset,
      angle: shadowAngle,
    },
  },
};

const quoteSlotTokens = {
  bar: {
    color: palette.purple,
    width: accentBarWidth,
    dashType: DASH_TYPE.SOLID,
  },
  spacing: spacing,
  quote: quoteText,
  attribution: quoteAttribution,
};

const testimonialSlotTokens = {
  background: {
    fill: palette.gray100,
    fillOpacity: defaultOpacity,
    borderColor: palette.gray300,
    borderWidth,
    cornerRadius,
  },
  padding: padding,
  spacing: spacingTight,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  quote: quoteText,
  attribution: quoteAttribution,
};

const mermaidTokens = {
  primaryColor: palette.purple,
  primaryTextColor: palette.white,
  primaryBorderColor: palette.gray300,
  lineColor: palette.navy,
  secondaryColor: palette.gray100,
  tertiaryColor: palette.gray100,
  textColor: palette.navy,
  nodeTextColor: palette.navy,
  clusterBackground: palette.gray100,
  clusterBorderColor: palette.gray300,
  edgeLabelBackground: palette.gray50,
  titleColor: palette.navy,
  textStyle: TEXT_STYLE.BODY,
  accentOpacity: subtleOpacity,
  accents: accents,
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

export const theme = defineTheme({
  slide: SLIDE_SIZE.S16x9,
  fonts: [assets.fonts.inter, assets.fonts.interLight, assets.fonts.firaCode],
  textStyles: {
    title: {
      fontFamily: assets.fonts.inter,
      fontSize: 56,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 0,
    },
    h1: {
      fontFamily: assets.fonts.interLight,
      fontSize: 44,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 44 * bulletIndentMultiplier,
    },
    h2: {
      fontFamily: assets.fonts.interLight,
      fontSize: 32,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 32 * bulletIndentMultiplier,
    },
    h3: {
      fontFamily: assets.fonts.interLight,
      fontSize: 24,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 24 * bulletIndentMultiplier,
    },
    h4: {
      fontFamily: assets.fonts.interLight,
      fontSize: 18,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 18 * bulletIndentMultiplier,
    },
    body: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 14 * bulletIndentMultiplier,
    },
    small: {
      fontFamily: assets.fonts.interLight,
      fontSize: 12,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 12 * bulletIndentMultiplier,
    },
    eyebrow: {
      fontFamily: assets.fonts.inter,
      fontSize: 11,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 11 * bulletIndentMultiplier,
    },
    footer: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 8 * bulletIndentMultiplier,
    },
    code: {
      fontFamily: assets.fonts.firaCode,
      fontSize: 11,
      lineHeightMultiplier: 1.6,
      bulletIndentPt: 0,
    },
  },
  layouts: {
    title: {
      variants: {
        default: titleLayout.tokenMap({
          title: { ...heroTitle, color: palette.navy, style: "title" },
          subtitle: { ...heroSubtitle, color: palette.gray600, style: TEXT_STYLE.H3 },
          masterVariant: "default",
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
        }),
      },
    },
    end: {
      variants: {
        default: endLayout.tokenMap({
          title: { ...heroTitle, style: "title" },
          subtitle: heroSubtitle,
          masterVariant: "dark",
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
        }),
      },
    },
    section: {
      variants: {
        default: sectionLayout.tokenMap({
          title: sectionHeading,
          masterVariant: "dark",
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        }),
      },
    },
    body: {
      variants: {
        default: bodyLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          headerSpacing: spacingTight,
          text: bodyText,
          list: bodyList,
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.LEFT,
          spacing: spacing,
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
          surface: {
            fill: palette.white,
            fillOpacity: defaultOpacity,
            borderColor: palette.gray300,
            borderWidth,
            cornerRadius: cornerRadiusLarge,
          },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          padding,
        }),
      },
    },
    "two-column": {
      variants: {
        default: twoColumnLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          headerSpacing: spacingTight,
          text: bodyText,
          list: bodyList,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.LEFT,
          spacing: spacing,
          ...bodySlotTokens,
        }),
      },
    },
    statement: {
      variants: {
        default: statementLayout.tokenMap({
          caption: mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          masterVariant: "default",
          body: { ...bodyText, style: TEXT_STYLE.H2 },
        }),
      },
    },
    agenda: {
      variants: {
        default: agendaLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          headerSpacing: spacingTight,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          items: { ...bodyText, style: TEXT_STYLE.H4, color: palette.navy },
          itemBackground: {
            fill: palette.white,
            fillOpacity: defaultOpacity,
            borderColor: palette.gray300,
            borderWidth,
            cornerRadius,
          },
          itemNumber: {
            style: TEXT_STYLE.H2,
            color: palette.gray400,
            hAlign: HALIGN.LEFT,
            vAlign: VALIGN.MIDDLE,
          },
          itemPadding: spacingTight + unit,
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          gridColumns: 2,
          gridSpacing: spacingTight,
        }),
      },
    },
    cards: {
      variants: {
        default: cardsLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          headerSpacing: spacingTight,
          intro: bodyText,
          caption: mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          gridSpacing: spacing,
          card: {
            background: {
              fill: palette.white,
              fillOpacity: defaultOpacity,
              borderColor: palette.gray300,
              borderWidth,
              cornerRadius,
            },
            padding,
            spacing: spacingTight,
            hAlign: HALIGN.LEFT,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        }),
        flat: cardsLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          headerSpacing: spacingTight,
          intro: bodyText,
          caption: mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          gridSpacing: spacing,
          card: {
            padding,
            spacing: spacingTight,
            hAlign: HALIGN.LEFT,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        }),
      },
    },
    blank: {
      variants: {
        default: blankLayout.tokenMap({
          masterVariant: "default",
          ...bodySlotTokens,
        }),
      },
    },
    quote: {
      variants: {
        default: quoteLayout.tokenMap({
          quote: {
            bar: {
              color: palette.purple,
              width: accentBarWidth,
              dashType: DASH_TYPE.SOLID,
            },
            spacing: spacing,
            quote: quoteText,
            attribution: quoteAttribution,
          },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        }),
      },
    },
  },
  masters: {
    default: {
      variants: {
        default: defaultMaster.tokenMap({
          background: { color: palette.gray50 },
          margin,
          footerHeight,
          footerLogo: assets.tycoworks.logo,
          footerText: "tycoworks",
          footerSpacing: spacingTight,
          slideNumber: {
            style: TEXT_STYLE.FOOTER,
            color: palette.gray600,
            hAlign: HALIGN.RIGHT,
            vAlign: VALIGN.MIDDLE,
          },
          footer: {
            style: TEXT_STYLE.FOOTER,
            color: palette.gray600,
            hAlign: HALIGN.LEFT,
            vAlign: VALIGN.MIDDLE,
          },
        }),
      },
    },
    minimal: {
      variants: {
        default: minimalMaster.tokenMap({
          background: { color: palette.gray50 },
          margin,
        }),
        dark: minimalMaster.tokenMap({
          background: { color: palette.navy },
          margin,
        }),
      },
    },
  },
});
