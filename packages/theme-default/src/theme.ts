// Default Theme
// Clean light theme with Inter font. Copy and customize for your brand.
// Units: spacing/margins/radii = inches, fontSize/borderWidth = points, opacity = 0-100

import { DASH_TYPE, defineTheme, GRID_STYLE, HALIGN, SHADOW_TYPE, SLIDE_SIZE, VALIGN } from "tycoslide";
import type { LabelTokens, ListTokens, TextTokens } from "tycoslide-components";
import { HIGHLIGHT_THEME } from "tycoslide-components";
import { assets } from "./assets.js";
import {
  agendaLayout,
  blankLayout,
  bodyLayout,
  cardsLayout,
  endLayout,
  linesLayout,
  quoteLayout,
  sectionLayout,
  shapesLayout,
  statementLayout,
  statLayout,
  titleLayout,
  transformLayout,
  twoColumnLayout,
} from "./layouts.js";
import { defaultMaster, minimalMaster } from "./master.js";

// ============================================
// TEXT STYLE NAMES
// ============================================

/** Well-known text style names used by this theme. */
const TEXT_STYLE = {
  TITLE: "title",
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  BODY: "body",
  SMALL: "small",
  EYEBROW: "eyebrow",
  FOOTER: "footer",
  CODE: "code",
} as const;

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
  purpleDeep: "#652593",
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
const shadowOpacity = 12;
const shadowBlur = 6;
const shadowOffset = 2;
const shadowAngle = 180;
const defaultOpacity = 100;

// ============================================
// SHARED TOKEN OBJECTS FOR COMPOSITION COMPONENTS
// ============================================

const shadow = {
  type: SHADOW_TYPE.OUTER,
  color: palette.navy,
  opacity: shadowOpacity,
  blur: shadowBlur,
  offset: shadowOffset,
  angle: shadowAngle,
};

// --- Rich text base (shared link/accent wiring) ---
const richTextBase = {
  linkColor: palette.purple,
  linkUnderline: true,
  accents: accents,
} as const;

// --- Standard body text tokens ---
const cardTitle: TextTokens = { ...richTextBase, style: TEXT_STYLE.H4, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const cardDescription: TextTokens = { ...richTextBase, style: TEXT_STYLE.SMALL, color: palette.gray600, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const quoteText: TextTokens = { ...richTextBase, style: TEXT_STYLE.H2, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const bodyText: TextTokens = { ...richTextBase, style: TEXT_STYLE.BODY, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const bodyList: ListTokens = { ...bodyText, vAlign: VALIGN.TOP };
const mutedCaption: TextTokens = { ...richTextBase, style: TEXT_STYLE.SMALL, color: palette.gray600, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE };

// --- Dark-background (hero/section) text tokens ---
const heroBase = { ...richTextBase, linkUnderline: false, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } as const;
const heroTitle: TextTokens = { ...heroBase, style: TEXT_STYLE.H1, color: palette.white };
const heroSubtitle: TextTokens = { ...heroBase, style: TEXT_STYLE.H3, color: palette.white };

// --- Heading scale (standard left-aligned navy labels) ---
const labelH1: LabelTokens = { style: TEXT_STYLE.H1, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const labelH2: LabelTokens = { style: TEXT_STYLE.H2, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const labelH3: LabelTokens = { style: TEXT_STYLE.H3, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const labelH4: LabelTokens = { style: TEXT_STYLE.H4, color: palette.navy, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };

// --- Functional labels ---
const labelEyebrow: LabelTokens = { style: TEXT_STYLE.EYEBROW, color: palette.purple, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const labelMutedSmall: LabelTokens = { style: TEXT_STYLE.SMALL, color: palette.gray600, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
const labelFooter: LabelTokens = { style: TEXT_STYLE.FOOTER, color: palette.gray600, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };

// --- Accent / dark-background labels ---
const labelSectionHeading: LabelTokens = { style: TEXT_STYLE.H2, color: palette.white, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE };
const labelStatValue: LabelTokens = { style: TEXT_STYLE.H1, color: palette.purple, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE };
const labelStatLabel: LabelTokens = { style: TEXT_STYLE.H3, color: palette.gray600, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE };
// ============================================
// SLOT COMPONENT TOKEN OBJECTS (shared across layouts)
// ============================================

const tableHeaderBase = {
  textStyle: TEXT_STYLE.EYEBROW,
  textColor: palette.gray500,
  backgroundOpacity: 0,
};

const tableTokens = {
  headerRow: { ...tableHeaderBase, background: palette.gray200, hAlign: HALIGN.CENTER },
  headerCol: { ...tableHeaderBase, background: palette.white, hAlign: HALIGN.LEFT },
  cellTextStyle: TEXT_STYLE.EYEBROW,
  cellTextColor: palette.navy,
  cellBackground: palette.gray50,
  cellBackgroundOpacity: 0,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  gridStyle: GRID_STYLE.HORIZONTAL,
  gridStroke: { color: palette.gray300, width: borderWidth, dashType: DASH_TYPE.SOLID },
  cellPadding: cellPadding * 2,
  linkColor: palette.purple,
  linkUnderline: true,
  accents: accents,
  background: {
    fill: palette.white,
    fillOpacity: defaultOpacity,
    border: { color: palette.gray300, width: borderWidth, dashType: DASH_TYPE.SOLID },
    cornerRadius: cornerRadiusLarge,
    shadow,
  },
  backgroundPadding: unit * 4,
};

const codeTokens = {
  textStyle: TEXT_STYLE.CODE,
  theme: HIGHLIGHT_THEME.GITHUB_DARK,
  padding: padding,
  background: {
    fill: palette.navy,
    fillOpacity: defaultOpacity,
    cornerRadius,
    shadow,
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
  attribution: labelMutedSmall,
};

const testimonialSlotTokens = {
  background: {
    fill: palette.gray100,
    fillOpacity: defaultOpacity,
    border: { color: palette.gray300, width: borderWidth, dashType: DASH_TYPE.SOLID },
    cornerRadius,
  },
  padding: padding,
  spacing: spacingTight,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  quote: quoteText,
  attribution: labelMutedSmall,
};

const mermaidTokens = {
  primaryColor: palette.white,
  primaryTextColor: palette.navy,
  primaryBorderColor: palette.gray300,
  lineColor: palette.purple,
  secondaryColor: palette.gray100,
  tertiaryColor: palette.gray100,
  textColor: palette.navy,
  nodeTextColor: palette.navy,
  clusterBackground: palette.gray100,
  clusterBorderColor: palette.purple,
  clusterCornerRadius: cornerRadius,
  edgeLabelBackground: palette.gray50,
  titleColor: palette.navy,
  textStyle: TEXT_STYLE.BODY,
  accentOpacity: subtleOpacity,
  accentTextColor: palette.purple,
  accents: accents,
};

// ============================================
// THEME EXPORT
// ============================================

// Base card tokens shared across slot injection and layout variants
const cardBase = {
  padding,
  spacing: spacingTight,
  hAlign: HALIGN.LEFT,
  title: cardTitle,
  description: cardDescription,
};

const cardBackground = {
  fill: palette.white,
  fillOpacity: defaultOpacity,
  border: { color: palette.gray300, width: borderWidth, dashType: DASH_TYPE.SOLID },
  cornerRadius,
};

// Slot injection tokens for inline :::card{} directives in markdown body slots
const cardSlotTokens = {
  ...cardBase,
  vAlign: VALIGN.MIDDLE,
  background: { ...cardBackground, shadow },
};

const bodySlotTokens = {
  table: tableTokens,
  code: codeTokens,
  mermaid: mermaidTokens,
  quote: quoteSlotTokens,
  testimonial: testimonialSlotTokens,
  card: cardSlotTokens,
  label: { 1: labelH1, 2: labelH2, 3: labelH3, 4: labelH4, 5: labelH4, 6: labelH4 },
};

// ============================================
// MASTER CONFIGS
// ============================================

const defaultMasterConfig = defaultMaster.tokenMap({
  background: { color: palette.gray50 },
  margin,
  footerHeight,
  footerLogo: assets.tycoworks.logo,
  footerText: "tycoworks",
  footerSpacing: spacingTight,
  slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT },
  footer: labelFooter,
});

const lightMinimalMaster = minimalMaster.tokenMap({
  background: { color: palette.gray50 },
  margin,
});

const darkMinimalMaster = minimalMaster.tokenMap({
  background: { color: palette.navy },
  margin,
});

export const theme = defineTheme({
  slide: SLIDE_SIZE.S16x9,
  fonts: [assets.fonts.inter, assets.fonts.interLight, assets.fonts.firaCode],
  textStyles: {
    [TEXT_STYLE.TITLE]: {
      fontFamily: assets.fonts.inter,
      fontSize: 56,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 44,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 44 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 32,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 32 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 24,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 24 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 18,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 18 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 14 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.SMALL]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 12,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 12 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.EYEBROW]: {
      fontFamily: assets.fonts.inter,
      fontSize: 11,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 11 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.FOOTER]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 8 * bulletIndentMultiplier,
    },
    [TEXT_STYLE.CODE]: {
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
          title: { ...heroTitle, color: palette.navy, style: TEXT_STYLE.TITLE },
          subtitle: { ...heroSubtitle, color: palette.gray600, style: TEXT_STYLE.H3 },
          master: lightMinimalMaster,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
        }),
      },
    },
    end: {
      variants: {
        default: endLayout.tokenMap({
          title: { ...heroTitle, style: TEXT_STYLE.TITLE },
          subtitle: heroSubtitle,
          master: darkMinimalMaster,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
        }),
      },
    },
    section: {
      variants: {
        default: sectionLayout.tokenMap({
          title: labelSectionHeading,
          master: darkMinimalMaster,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        }),
      },
    },
    body: {
      variants: {
        default: bodyLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          headerSpacing: spacingTight,
          text: bodyText,
          list: bodyList,
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.LEFT,
          spacing: spacing,
          ...bodySlotTokens,
        }),
        centered: bodyLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
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
    stat: {
      variants: {
        default: statLayout.tokenMap({
          master: defaultMasterConfig,
          value: labelStatValue,
          label: labelStatLabel,
          caption: mutedCaption,
          background: {
            fill: palette.white,
            fillOpacity: defaultOpacity,
            border: { color: palette.gray300, width: borderWidth, dashType: DASH_TYPE.SOLID },
            cornerRadius: cornerRadiusLarge,
          },
          backgroundWidth: 6,
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
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
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
          master: lightMinimalMaster,
          body: { ...bodyText, style: TEXT_STYLE.H2 },
        }),
      },
    },
    agenda: {
      variants: {
        default: agendaLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          headerSpacing: spacingTight,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          items: { ...bodyText, style: TEXT_STYLE.H4, color: palette.navy },
          itemBackground: {
            fill: palette.white,
            fillOpacity: defaultOpacity,
            border: { color: palette.gray300, width: borderWidth, dashType: DASH_TYPE.SOLID },
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
          gridSpacing: spacing,
        }),
      },
    },
    cards: {
      variants: {
        default: cardsLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          headerSpacing: spacingTight,
          intro: bodyText,
          caption: mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          gridSpacing: spacing,
          card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
        }),
        flat: cardsLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          headerSpacing: spacingTight,
          intro: bodyText,
          caption: mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          gridSpacing: spacing,
          card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP },
        }),
      },
    },
    blank: {
      variants: {
        default: blankLayout.tokenMap({
          master: lightMinimalMaster,
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
            attribution: labelMutedSmall,
          },
          master: lightMinimalMaster,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        }),
        dark: quoteLayout.tokenMap({
          quote: {
            bar: {
              color: palette.lavender,
              width: accentBarWidth,
              dashType: DASH_TYPE.SOLID,
            },
            spacing: spacing,
            quote: {
              ...quoteText,
              color: palette.white,
              linkColor: palette.lavender,
            },
            attribution: {
              ...labelMutedSmall,
              color: palette.gray400,
            },
          },
          master: darkMinimalMaster,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        }),
      },
    },
    shapes: {
      variants: {
        default: shapesLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          subtitle: { style: TEXT_STYLE.BODY, color: palette.gray500, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
          headerSpacing: spacingTight,
          label: {
            style: TEXT_STYLE.BODY,
            color: palette.gray600,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            border: { color: palette.purple, width: 1, dashType: DASH_TYPE.SOLID },
          },
          rectangle: {
            fill: palette.purple,
            fillOpacity: defaultOpacity,
            border: { color: palette.navy, width: 2, dashType: DASH_TYPE.SOLID },
            cornerRadius: 0,
          },
          ellipse: {
            fill: palette.navy,
            fillOpacity: defaultOpacity,
            border: { color: palette.purple, width: 2, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          triangle: {
            fill: palette.emerald,
            fillOpacity: defaultOpacity,
            border: { color: palette.brick, width: 3, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          diamond: {
            fill: palette.slate,
            fillOpacity: defaultOpacity,
            border: { color: palette.emerald, width: 2, dashType: DASH_TYPE.DOTTED },
            cornerRadius: 0,
          },
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        }),
      },
    },
    transform: {
      variants: {
        default: transformLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          headerSpacing: spacingTight,
          text: cardDescription,
          list: bodyList,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.LEFT,
          overlayVAlign: VALIGN.MIDDLE,
          overlayHAlign: HALIGN.CENTER,
          spacing: spacing,
          contentSpacing: 0,
          overlaySize: 0.9,
          ...bodySlotTokens,
          card: {
            ...cardBase,
            hAlign: HALIGN.CENTER,
            title: { ...cardTitle, hAlign: HALIGN.CENTER },
            description: { ...cardDescription, hAlign: HALIGN.CENTER },
            vAlign: VALIGN.MIDDLE,
            background: { ...cardBackground, shadow },
          },
        }),
      },
    },
    lines: {
      variants: {
        default: linesLayout.tokenMap({
          master: defaultMasterConfig,
          title: labelH3,
          eyebrow: labelEyebrow,
          headerSpacing: spacingTight,
          label: labelMutedSmall,
          solid: { color: palette.navy, width: 2, dashType: DASH_TYPE.SOLID },
          dashed: { color: palette.purple, width: 2, dashType: DASH_TYPE.DASHED },
          dotted: { color: palette.skyBlue, width: 2, dashType: DASH_TYPE.DOTTED },
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.LEFT,
          spacing: spacing,
        }),
      },
    },
  },
});
