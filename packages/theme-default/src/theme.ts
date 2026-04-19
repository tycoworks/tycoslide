import { DASH_TYPE, GRID_STYLE, HALIGN, VALIGN } from "@tycoslide/core";
import type { LabelTokens, ListTokens, TextTokens, ThemeFormat } from "@tycoslide/sdk";
import { defineTheme } from "@tycoslide/sdk";
import { assets } from "./assets.js";
import type * as Base from "./base.js";
import * as base from "./base.js";
import { factsheetConfig } from "./formats/factsheet.js";
import type { FormatConfig } from "./formats/presentation.js";
import { presentationConfig } from "./formats/presentation.js";
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
import { defaultMaster, factsheetMaster, MASTER, type MasterRef, minimalMaster } from "./master.js";

// ============================================
// SHARED TOKEN BUILDERS
// ============================================

/** Build text, label, and component tokens shared by all formats. */
function buildSharedTokens(base: typeof Base, config: FormatConfig) {
  const { unit, spacing, spacingTight, padding } = config;
  const {
    palette,
    accents,
    TEXT_STYLE,
    alignLeft,
    alignCenter,
    richTextBase,
    heroBase,
    labelBase,
    subtleBorder,
    shadow,
    cornerRadius,
    cornerRadiusLarge,
    accentBarWidth,
    cardBackground,
    imageBase,
    highlightTheme,
  } = base;

  // --- Text tokens ---
  const bodyText: TextTokens = { ...richTextBase, ...alignLeft, style: TEXT_STYLE.BODY, color: palette.navy };
  const bodyList: ListTokens = { ...bodyText, vAlign: VALIGN.TOP };
  const cardTitle: TextTokens = { ...richTextBase, ...alignLeft, style: TEXT_STYLE.H4, color: palette.navy };
  const cardDescription: TextTokens = {
    ...richTextBase,
    ...alignLeft,
    style: TEXT_STYLE.SMALL,
    color: palette.textSecondary,
  };
  const quoteText: TextTokens = { ...richTextBase, ...alignLeft, style: TEXT_STYLE.H2, color: palette.navy };
  const mutedCaption: TextTokens = {
    ...richTextBase,
    ...alignCenter,
    style: TEXT_STYLE.SMALL,
    color: palette.textSecondary,
  };

  // --- Hero text ---
  const heroTitle: TextTokens = { ...heroBase, style: TEXT_STYLE.H1, color: palette.white };
  const heroSubtitle: TextTokens = { ...heroBase, style: TEXT_STYLE.H3, color: palette.white };

  // --- Heading labels ---
  const labelH1: LabelTokens = { ...labelBase, style: TEXT_STYLE.H1 };
  const labelH2: LabelTokens = { ...labelBase, style: TEXT_STYLE.H2 };
  const labelH3: LabelTokens = { ...labelBase, style: TEXT_STYLE.H3 };
  const labelH4: LabelTokens = { ...labelBase, style: TEXT_STYLE.H4 };

  // --- Functional labels ---
  const labelEyebrow: LabelTokens = { ...alignLeft, style: TEXT_STYLE.EYEBROW, color: palette.purple };
  const labelMutedSmall: LabelTokens = { ...alignLeft, style: TEXT_STYLE.SMALL, color: palette.textSecondary };
  const labelFooter: LabelTokens = { ...alignLeft, style: TEXT_STYLE.FOOTER, color: palette.textSecondary };

  // --- Accent labels ---
  const labelSectionHeading: LabelTokens = { ...alignCenter, style: TEXT_STYLE.H2, color: palette.white };
  const labelStatValue: LabelTokens = { ...alignCenter, style: TEXT_STYLE.H1, color: palette.purple };
  const labelStatLabel: LabelTokens = { ...alignCenter, style: TEXT_STYLE.H3, color: palette.textSecondary };

  // --- Component tokens ---
  const cardBase = {
    padding,
    image: { padding: 0.125 } as typeof imageBase,
    spacing: spacingTight,
    hAlign: HALIGN.LEFT,
    title: cardTitle,
    description: cardDescription,
  };

  const cardSlotTokens = {
    ...cardBase,
    vAlign: VALIGN.MIDDLE,
    background: { ...cardBackground, shadow },
  };

  const tableHeaderBase = {
    textStyle: TEXT_STYLE.EYEBROW,
    textColor: palette.textMuted,
    backgroundOpacity: 0,
  };

  const tableTokens = {
    headerRow: { ...tableHeaderBase, background: palette.border, hAlign: HALIGN.CENTER },
    headerCol: { ...tableHeaderBase, background: palette.white, hAlign: HALIGN.LEFT },
    cellTextStyle: TEXT_STYLE.EYEBROW,
    cellTextColor: palette.navy,
    cellBackground: palette.surface,
    cellBackgroundOpacity: 0,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    gridStyle: GRID_STYLE.HORIZONTAL,
    gridStroke: subtleBorder,
    cellPadding: unit * 4,
    linkColor: palette.purple,
    linkUnderline: true,
    accents: accents,
    background: {
      fill: palette.white,
      fillOpacity: 100,
      border: subtleBorder,
      cornerRadius: cornerRadiusLarge,
      shadow,
    },
    backgroundPadding: unit * 4,
  };

  const codeTokens = {
    textStyle: TEXT_STYLE.CODE,
    theme: highlightTheme,
    padding: padding,
    background: {
      fill: palette.navy,
      fillOpacity: 100,
      cornerRadius,
      shadow,
    },
    image: imageBase,
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
      fill: palette.surface,
      fillOpacity: 100,
      border: subtleBorder,
      cornerRadius,
    },
    padding: padding,
    spacing: spacingTight,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    quote: quoteText,
    attribution: labelMutedSmall,
    image: imageBase,
  };

  const mermaidTokens = {
    primary: palette.white,
    primaryContrast: palette.navy,
    text: palette.navy,
    line: palette.purple,
    surface: palette.surface,
    surfaceBorder: palette.border,
    surfaceSubtle: palette.surface,
    group: palette.surface,
    groupCornerRadius: cornerRadius,
    accents: accents,
    accentStyle: { opacity: 15, textColor: palette.purple },
    textStyle: TEXT_STYLE.BODY,
    image: imageBase,
  };

  const bodySlotTokens = {
    table: tableTokens,
    code: codeTokens,
    mermaid: mermaidTokens,
    quote: quoteSlotTokens,
    testimonial: testimonialSlotTokens,
    card: cardSlotTokens,
    image: imageBase,
    label: { 1: labelH1, 2: labelH2, 3: labelH3, 4: labelH4, 5: labelH4, 6: labelH4 },
  };

  // --- Header tokens (shared by layouts with title + eyebrow) ---
  const headerTokens = {
    title: labelH3,
    eyebrow: labelEyebrow,
    headerSpacing: spacingTight,
  };

  return {
    bodyText,
    bodyList,
    cardTitle,
    cardDescription,
    quoteText,
    mutedCaption,
    heroTitle,
    heroSubtitle,
    labelH1,
    labelH2,
    labelH3,
    labelH4,
    labelEyebrow,
    labelMutedSmall,
    labelFooter,
    labelSectionHeading,
    labelStatValue,
    labelStatLabel,
    cardBase,
    cardSlotTokens,
    tableTokens,
    codeTokens,
    quoteSlotTokens,
    testimonialSlotTokens,
    mermaidTokens,
    bodySlotTokens,
    headerTokens,
  };
}

// ============================================
// PRESENTATION FORMAT
// ============================================

function buildPresentationFormat(base: typeof Base, config: FormatConfig): ThemeFormat {
  const { spacing, spacingTight, padding, margin, footerHeight, unit } = config;
  const { palette, TEXT_STYLE, alignLeft, subtleBorder, shadow, cardBackground, imageBase } = base;

  const t = buildSharedTokens(base, config);

  // --- Master refs ---
  const defaultMasterRef: MasterRef = {
    masterName: MASTER.DEFAULT,
    tokens: defaultMaster.tokenMap({
      background: { color: palette.surface },
      margin,
      footerHeight,
      footerLogo: assets.tycoslide.logo,
      footerText: "tycoslide",
      footerSpacing: spacingTight,
      slideNumber: { ...t.labelFooter, hAlign: HALIGN.RIGHT },
      footer: t.labelFooter,
      footerImage: imageBase,
    }),
  };

  const lightMinimalMaster: MasterRef = {
    masterName: MASTER.MINIMAL,
    tokens: minimalMaster.tokenMap({
      background: { color: palette.surface },
      margin,
    }),
  };

  const darkMinimalMaster: MasterRef = {
    masterName: MASTER.MINIMAL,
    tokens: minimalMaster.tokenMap({
      background: { color: palette.navy },
      margin,
    }),
  };

  const bodyBase = {
    master: defaultMasterRef,
    ...t.headerTokens,
    text: t.bodyText,
    list: t.bodyList,
    hAlign: HALIGN.LEFT,
    spacing,
    ...t.bodySlotTokens,
  };

  const cardsBase = {
    master: defaultMasterRef,
    ...t.headerTokens,
    intro: t.bodyText,
    caption: t.mutedCaption,
    vAlign: VALIGN.MIDDLE,
    hAlign: HALIGN.CENTER,
    spacing,
    gridSpacing: spacing,
  };

  return {
    slide: config.slide,
    textStyles: config.textStyles,
    layouts: {
      title: {
        variants: {
          default: titleLayout.tokenMap({
            title: { ...t.heroTitle, color: palette.navy, style: TEXT_STYLE.TITLE },
            subtitle: { ...t.heroSubtitle, color: palette.textSecondary, style: TEXT_STYLE.H3 },
            master: lightMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing: spacingTight,
            image: imageBase,
          }),
        },
      },
      end: {
        variants: {
          default: endLayout.tokenMap({
            title: { ...t.heroTitle, style: TEXT_STYLE.TITLE },
            subtitle: t.heroSubtitle,
            master: darkMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing: spacingTight,
            image: imageBase,
          }),
        },
      },
      section: {
        variants: {
          default: sectionLayout.tokenMap({
            title: t.labelSectionHeading,
            master: darkMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
          }),
        },
      },
      body: {
        variants: {
          default: bodyLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.TOP }),
          centered: bodyLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.MIDDLE }),
        },
      },
      stat: {
        variants: {
          default: statLayout.tokenMap({
            master: defaultMasterRef,
            value: t.labelStatValue,
            label: t.labelStatLabel,
            caption: t.mutedCaption,
            background: { ...cardBackground, cornerRadius: base.cornerRadiusLarge },
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
          default: twoColumnLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.MIDDLE }),
        },
      },
      statement: {
        variants: {
          default: statementLayout.tokenMap({
            caption: t.mutedCaption,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing: spacing,
            master: lightMinimalMaster,
            body: { ...t.bodyText, style: TEXT_STYLE.H2 },
          }),
        },
      },
      agenda: {
        variants: {
          default: agendaLayout.tokenMap({
            master: defaultMasterRef,
            ...t.headerTokens,
            vAlign: VALIGN.MIDDLE,
            items: { ...t.bodyText, style: TEXT_STYLE.H4, color: palette.navy },
            divider: subtleBorder,
            itemNumber: { ...alignLeft, style: TEXT_STYLE.H2, color: palette.lavender },
            itemVAlign: VALIGN.MIDDLE,
            itemSpacing: spacing,
            spacing: spacingTight,
            image: imageBase,
          }),
        },
      },
      cards: {
        variants: {
          default: cardsLayout.tokenMap({
            ...cardsBase,
            card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
          }),
          flat: cardsLayout.tokenMap({ ...cardsBase, card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP } }),
        },
      },
      blank: {
        variants: {
          default: blankLayout.tokenMap({
            master: lightMinimalMaster,
            ...t.bodySlotTokens,
          }),
        },
      },
      quote: {
        variants: {
          default: quoteLayout.tokenMap({
            quote: t.quoteSlotTokens,
            master: lightMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing,
          }),
          dark: quoteLayout.tokenMap({
            quote: {
              bar: {
                color: palette.lavender,
                width: base.accentBarWidth,
                dashType: DASH_TYPE.SOLID,
              },
              spacing: spacing,
              quote: {
                ...t.quoteText,
                color: palette.white,
                linkColor: palette.lavender,
              },
              attribution: {
                ...t.labelMutedSmall,
                color: palette.textMuted,
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
            master: defaultMasterRef,
            ...t.headerTokens,
            subtitle: { ...alignLeft, style: TEXT_STYLE.BODY, color: palette.textMuted },
            label: {
              style: TEXT_STYLE.BODY,
              color: palette.textSecondary,
              hAlign: HALIGN.CENTER,
              vAlign: VALIGN.TOP,
              border: { color: palette.purple, width: 1, dashType: DASH_TYPE.SOLID },
            },
            rectangle: {
              fill: palette.purple,
              fillOpacity: 100,
              border: { color: palette.navy, width: 2, dashType: DASH_TYPE.SOLID },
              cornerRadius: 0,
            },
            ellipse: {
              fill: palette.navy,
              fillOpacity: 100,
              border: { color: palette.purple, width: 2, dashType: DASH_TYPE.DASHED },
              cornerRadius: 0,
            },
            triangle: {
              fill: palette.teal,
              fillOpacity: 100,
              border: { color: palette.navy, width: 3, dashType: DASH_TYPE.DASHED },
              cornerRadius: 0,
            },
            diamond: {
              fill: palette.border,
              fillOpacity: 100,
              border: { color: palette.teal, width: 2, dashType: DASH_TYPE.DOTTED },
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
            master: defaultMasterRef,
            ...t.headerTokens,
            text: t.cardDescription,
            list: t.bodyList,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.LEFT,
            overlayVAlign: VALIGN.MIDDLE,
            overlayHAlign: HALIGN.CENTER,
            spacing: spacing,
            contentSpacing: 0,
            overlaySize: 0.9,
            ...t.bodySlotTokens,
            card: {
              ...t.cardBase,
              hAlign: HALIGN.CENTER,
              title: { ...t.cardTitle, hAlign: HALIGN.CENTER },
              description: { ...t.cardDescription, hAlign: HALIGN.CENTER },
              vAlign: VALIGN.MIDDLE,
              background: { ...cardBackground, shadow },
            },
          }),
        },
      },
      lines: {
        variants: {
          default: linesLayout.tokenMap({
            master: defaultMasterRef,
            ...t.headerTokens,
            label: t.labelMutedSmall,
            solid: { color: palette.navy, width: 2, dashType: DASH_TYPE.SOLID },
            dashed: { color: palette.purple, width: 2, dashType: DASH_TYPE.DASHED },
            dotted: { color: palette.lavender, width: 2, dashType: DASH_TYPE.DOTTED },
            vAlign: VALIGN.TOP,
            hAlign: HALIGN.LEFT,
            spacing: spacing,
          }),
        },
      },
    },
  };
}

// ============================================
// FACTSHEET FORMAT
// ============================================

function buildFactsheetFormat(base: typeof Base, config: FormatConfig): ThemeFormat {
  const { spacing, spacingTight, padding, margin, footerHeight, unit } = config;
  const { palette, TEXT_STYLE, alignLeft, subtleBorder, cardBackground, imageBase } = base;

  const t = buildSharedTokens(base, config);

  // Factsheet body slides use the factsheet master (header chrome + slide number).
  const factsheetMasterRef: MasterRef = {
    masterName: MASTER.FACTSHEET,
    tokens: factsheetMaster.tokenMap({
      background: { color: palette.white },
      margin,
      topBarHeight: unit * 36, // 0.9 inches
      topBarFill: { fill: palette.navy, fillOpacity: 100, cornerRadius: 0 },
      topBarLogo: assets.tycoslide.logomarkWhite,
      topBarLogoTokens: { padding: 0 },
      topBarLogoHeight: unit * 10, // 0.25 inches
      topBarLogoWidth: unit * 37, // 0.925 inches (aspect ratio of logomark)
      topBarLabel: "PRODUCT SHEET",
      topBarLabelTokens: {
        hAlign: HALIGN.RIGHT,
        vAlign: VALIGN.MIDDLE,
        style: TEXT_STYLE.EYEBROW,
        color: palette.white,
      },
      footerHeight,
      footerText: "\u00A9 2026 tycoslide | www.tycoslide.com",
      footerTokens: { ...t.labelFooter, hAlign: HALIGN.LEFT },
      slideNumber: { ...t.labelFooter, hAlign: HALIGN.RIGHT },
    }),
  };

  const lightMinimalMaster: MasterRef = {
    masterName: MASTER.MINIMAL,
    tokens: minimalMaster.tokenMap({
      background: { color: palette.white },
      margin,
    }),
  };

  const darkMinimalMaster: MasterRef = {
    masterName: MASTER.MINIMAL,
    tokens: minimalMaster.tokenMap({
      background: { color: palette.navy },
      margin,
    }),
  };

  // Factsheet header tokens: H1/24pt title (instead of shared H3/12pt)
  const factsheetHeaderTokens = {
    title: { ...t.labelH1, style: TEXT_STYLE.H1 },
    eyebrow: t.labelEyebrow,
    headerSpacing: spacingTight,
  };

  // Factsheet body slot tokens: purple H2 headings, refined quote styling
  const factsheetBodySlotTokens = {
    ...t.bodySlotTokens,
    label: {
      ...t.bodySlotTokens.label,
      2: { ...t.labelH2, color: palette.purple },
    },
    quote: {
      ...t.quoteSlotTokens,
      bar: { ...t.quoteSlotTokens.bar, width: 1 },
      attribution: { ...t.labelMutedSmall, style: TEXT_STYLE.BODY, hAlign: HALIGN.RIGHT },
    },
  };

  const bodyBase = {
    master: factsheetMasterRef,
    ...factsheetHeaderTokens,
    text: t.bodyText,
    list: t.bodyList,
    hAlign: HALIGN.LEFT,
    spacing,
    ...factsheetBodySlotTokens,
  };

  const cardsBase = {
    master: factsheetMasterRef,
    ...factsheetHeaderTokens,
    intro: t.bodyText,
    caption: t.mutedCaption,
    vAlign: VALIGN.MIDDLE,
    hAlign: HALIGN.CENTER,
    spacing,
    gridSpacing: spacing,
  };

  return {
    slide: config.slide,
    textStyles: config.textStyles,
    layouts: {
      title: {
        variants: {
          default: titleLayout.tokenMap({
            title: { ...t.heroTitle, color: palette.navy, style: TEXT_STYLE.TITLE },
            subtitle: { ...t.heroSubtitle, color: palette.purple, style: TEXT_STYLE.H3 },
            master: lightMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing: spacingTight,
            image: imageBase,
          }),
        },
      },
      end: {
        variants: {
          default: endLayout.tokenMap({
            title: { ...t.heroTitle, style: TEXT_STYLE.TITLE },
            subtitle: t.heroSubtitle,
            master: factsheetMasterRef,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.LEFT,
            spacing: spacingTight,
            image: imageBase,
          }),
        },
      },
      section: {
        variants: {
          default: sectionLayout.tokenMap({
            title: t.labelSectionHeading,
            master: darkMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
          }),
        },
      },
      body: {
        variants: {
          default: bodyLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.TOP }),
          centered: bodyLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.MIDDLE }),
        },
      },
      stat: {
        variants: {
          default: statLayout.tokenMap({
            master: factsheetMasterRef,
            value: t.labelStatValue,
            label: t.labelStatLabel,
            caption: t.mutedCaption,
            background: { ...cardBackground, cornerRadius: base.cornerRadiusLarge },
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
          default: twoColumnLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.MIDDLE }),
        },
      },
      statement: {
        variants: {
          default: statementLayout.tokenMap({
            caption: t.mutedCaption,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing: spacing,
            master: lightMinimalMaster,
            body: { ...t.bodyText, style: TEXT_STYLE.H2 },
          }),
        },
      },
      agenda: {
        variants: {
          default: agendaLayout.tokenMap({
            master: factsheetMasterRef,
            ...t.headerTokens,
            vAlign: VALIGN.MIDDLE,
            items: { ...t.bodyText, style: TEXT_STYLE.H4, color: palette.navy },
            divider: subtleBorder,
            itemNumber: { ...alignLeft, style: TEXT_STYLE.H2, color: palette.lavender },
            itemVAlign: VALIGN.MIDDLE,
            itemSpacing: spacing,
            spacing: spacingTight,
            image: imageBase,
          }),
        },
      },
      cards: {
        variants: {
          default: cardsLayout.tokenMap({
            ...cardsBase,
            card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
          }),
          flat: cardsLayout.tokenMap({ ...cardsBase, card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP } }),
        },
      },
      blank: {
        variants: {
          default: blankLayout.tokenMap({
            master: lightMinimalMaster,
            ...t.bodySlotTokens,
          }),
        },
      },
      quote: {
        variants: {
          default: quoteLayout.tokenMap({
            quote: t.quoteSlotTokens,
            master: lightMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing,
          }),
        },
      },
    },
  };
}

// ============================================
// THEME EXPORT
// ============================================

export const theme = defineTheme({
  fonts: [assets.fonts.inter, assets.fonts.interLight, assets.fonts.firaCode],
  formats: {
    presentation: buildPresentationFormat(base, presentationConfig),
    factsheet: buildFactsheetFormat(base, factsheetConfig),
  },
});
