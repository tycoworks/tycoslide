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
import { defaultMaster, minimalMaster } from "./master.js";

function buildThemeFormat(base: typeof Base, config: FormatConfig): ThemeFormat {
  const { unit, spacing, spacingTight, padding, margin, footerHeight } = config;
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

  // --- Master configs ---
  const defaultMasterConfig = defaultMaster.tokenMap({
    background: { color: palette.surface },
    margin,
    footerHeight,
    footerLogo: assets.tycoslide.logo,
    footerText: "tycoslide",
    footerSpacing: spacingTight,
    slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT },
    footer: labelFooter,
    footerImage: imageBase,
  });

  const lightMinimalMaster = minimalMaster.tokenMap({
    background: { color: palette.surface },
    margin,
  });

  const darkMinimalMaster = minimalMaster.tokenMap({
    background: { color: palette.navy },
    margin,
  });

  // --- Layout helpers ---
  const headerTokens = {
    title: labelH3,
    eyebrow: labelEyebrow,
    headerSpacing: spacingTight,
  };

  const bodyBase = {
    master: defaultMasterConfig,
    ...headerTokens,
    text: bodyText,
    list: bodyList,
    hAlign: HALIGN.LEFT,
    spacing,
    ...bodySlotTokens,
  };

  const cardsBase = {
    master: defaultMasterConfig,
    ...headerTokens,
    intro: bodyText,
    caption: mutedCaption,
    vAlign: VALIGN.MIDDLE,
    hAlign: HALIGN.CENTER,
    spacing,
    gridSpacing: spacing,
  };

  // --- Layout token maps ---
  return {
    slide: config.slide,
    textStyles: config.textStyles,
    layouts: {
      title: {
        variants: {
          default: titleLayout.tokenMap({
            title: { ...heroTitle, color: palette.navy, style: TEXT_STYLE.TITLE },
            subtitle: { ...heroSubtitle, color: palette.textSecondary, style: TEXT_STYLE.H3 },
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
            title: { ...heroTitle, style: TEXT_STYLE.TITLE },
            subtitle: heroSubtitle,
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
            title: labelSectionHeading,
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
            master: defaultMasterConfig,
            value: labelStatValue,
            label: labelStatLabel,
            caption: mutedCaption,
            background: { ...cardBackground, cornerRadius: cornerRadiusLarge },
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
            ...headerTokens,
            vAlign: VALIGN.MIDDLE,
            items: { ...bodyText, style: TEXT_STYLE.H4, color: palette.navy },
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
            card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
          }),
          flat: cardsLayout.tokenMap({ ...cardsBase, card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP } }),
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
            quote: quoteSlotTokens,
            master: lightMinimalMaster,
            vAlign: VALIGN.MIDDLE,
            hAlign: HALIGN.CENTER,
            spacing,
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
            master: defaultMasterConfig,
            ...headerTokens,
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
            master: defaultMasterConfig,
            ...headerTokens,
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
            ...headerTokens,
            label: labelMutedSmall,
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

export const theme = defineTheme({
  fonts: [assets.fonts.inter, assets.fonts.interLight, assets.fonts.firaCode],
  formats: {
    presentation: buildThemeFormat(base, presentationConfig),
    factsheet: buildThemeFormat(base, factsheetConfig),
  },
});
