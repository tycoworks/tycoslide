import { DASH_TYPE, GRID_STYLE, HALIGN, VALIGN } from "@tycoslide/core";
import type { LabelTokens, ListTokens, TextTokens, ThemeFormat } from "@tycoslide/sdk";
import { defineTemplate, defineTheme } from "@tycoslide/sdk";
import { assets } from "./assets.js";
import type * as Base from "./base.js";
import * as base from "./base.js";
import { factsheetConfig } from "./formats/factsheet.js";
import type { FormatConfig } from "./formats/presentation.js";
import { presentationConfig } from "./formats/presentation.js";
import {
  agenda,
  blank,
  body,
  cards,
  end,
  lines,
  quote,
  section,
  shapes,
  stat,
  statement,
  title,
  transform,
  twoColumn,
} from "./layouts.js";
import { defaultMaster, factsheetMaster, minimalMaster } from "./masters.js";

// ============================================
// TEMPLATE NAMES
// ============================================

export const TEMPLATE = {
  TITLE: "title",
  END: "end",
  SECTION: "section",
  BODY: "body",
  BODY_CENTERED: "body-centered",
  STAT: "stat",
  TWO_COLUMN: "two-column",
  STATEMENT: "statement",
  AGENDA: "agenda",
  CARDS: "cards",
  CARDS_FLAT: "cards-flat",
  BLANK: "blank",
  QUOTE: "quote",
  QUOTE_DARK: "quote-dark",
  SHAPES: "shapes",
  TRANSFORM: "transform",
  LINES: "lines",
} as const;

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
  const bodyText: TextTokens = { ...richTextBase, style: TEXT_STYLE.BODY, color: palette.textPrimary };
  const bodyList: ListTokens = { ...bodyText, vAlign: VALIGN.TOP };
  const cardTitle: TextTokens = { ...richTextBase, style: TEXT_STYLE.H4, color: palette.brand };
  const cardDescription: TextTokens = {
    ...richTextBase,
    style: TEXT_STYLE.SMALL,
    color: palette.textSecondary,
  };
  const quoteText: TextTokens = { ...richTextBase, style: TEXT_STYLE.H2, color: palette.textPrimary };
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
  const labelEyebrow: LabelTokens = { style: TEXT_STYLE.EYEBROW, color: palette.brand };
  const labelMutedSmall: LabelTokens = { style: TEXT_STYLE.SMALL, color: palette.textSecondary };
  const labelFooter: LabelTokens = { style: TEXT_STYLE.FOOTER, color: palette.textSecondary };

  // --- Accent labels ---
  const labelSectionHeading: LabelTokens = { hAlign: HALIGN.CENTER, style: TEXT_STYLE.H2, color: palette.white };
  const labelStatValue: LabelTokens = { hAlign: HALIGN.CENTER, style: TEXT_STYLE.H1, color: palette.brand };
  const labelStatLabel: LabelTokens = { hAlign: HALIGN.CENTER, style: TEXT_STYLE.H3, color: palette.textSecondary };

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
    cellTextColor: palette.textPrimary,
    cellBackground: palette.surface,
    cellBackgroundOpacity: 0,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    gridStyle: GRID_STYLE.HORIZONTAL,
    gridStroke: subtleBorder,
    cellPadding: unit * 4,
    linkColor: palette.brand,
    linkUnderline: true,
    accents: accents,
    background: {
      fill: palette.white,
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
      fill: palette.textPrimary,
      cornerRadius,
      shadow,
    },
    image: imageBase,
  };

  const quoteSlotTokens = {
    bar: {
      color: palette.brand,
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
    primaryContrast: palette.textPrimary,
    text: palette.textPrimary,
    line: palette.brand,
    surface: palette.surface,
    surfaceBorder: palette.border,
    surfaceSubtle: palette.surface,
    group: palette.surface,
    groupCornerRadius: cornerRadius,
    accents: accents,
    accentStyle: { opacity: 15, textColor: palette.brand },
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
    label: { 1: labelH1, 2: { ...labelH2, color: palette.brand }, 3: labelH3, 4: labelH4, 5: labelH4, 6: labelH4 },
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
// MASTER TOKEN BUILDERS
// ============================================

/** Build master token sets for a format. */
function buildMasterTokens(base: typeof Base, config: FormatConfig) {
  const { margin, footerHeight, spacingTight } = config;
  const { palette, imageBase } = base;
  const labelFooter: LabelTokens = { style: base.TEXT_STYLE.FOOTER, color: palette.textSecondary };

  return {
    default: {
      background: { color: palette.surface },
      margin,
      footerHeight,
      footerLogo: assets.tycoslide.logo,
      footerText: "tycoslide",
      footerSpacing: spacingTight,
      slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT },
      footer: labelFooter,
      footerImage: imageBase,
    },
    lightMinimal: {
      background: { color: palette.surface },
      margin,
    },
    darkMinimal: {
      background: { color: palette.textPrimary },
      margin,
    },
  };
}

// ============================================
// PRESENTATION FORMAT
// ============================================

function buildPresentationFormat(base: typeof Base, config: FormatConfig): ThemeFormat {
  const { spacing, spacingTight, padding, unit } = config;
  const { palette, TEXT_STYLE, subtleBorder, shadow, cardBackground, imageBase } = base;

  const t = buildSharedTokens(base, config);
  const m = buildMasterTokens(base, config);

  const bodyBase = {
    ...t.headerTokens,
    text: t.bodyText,
    list: t.bodyList,
    hAlign: HALIGN.LEFT,
    spacing,
    ...t.bodySlotTokens,
  };

  const cardsBase = {
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
    templates: [
      defineTemplate({
        name: TEMPLATE.TITLE,
        description: "Opening slide with large title and optional subtitle.",
        layout: title,
        master: minimalMaster,
        masterTokens: m.lightMinimal,
        layoutTokens: {
          title: { ...t.heroTitle, color: palette.textPrimary, style: TEXT_STYLE.TITLE },
          subtitle: { ...t.heroSubtitle, color: palette.textSecondary, style: TEXT_STYLE.H3 },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: imageBase,
        },
      }),
      defineTemplate({
        name: TEMPLATE.END,
        description: "Closing slide. Mirrors the title layout.",
        layout: end,
        master: minimalMaster,
        masterTokens: m.darkMinimal,
        layoutTokens: {
          title: { ...t.heroTitle, style: TEXT_STYLE.TITLE },
          subtitle: t.heroSubtitle,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: imageBase,
        },
      }),
      defineTemplate({
        name: TEMPLATE.SECTION,
        description: "Section divider with centered title.",
        layout: section,
        master: minimalMaster,
        masterTokens: m.darkMinimal,
        layoutTokens: {
          title: t.labelSectionHeading,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        },
      }),
      defineTemplate({
        name: TEMPLATE.BODY,
        description: "Markdown body with optional title. Default layout.",
        layout: body,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: body,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STAT,
        description: "Big number or key metric with label and optional caption.",
        layout: stat,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
          value: t.labelStatValue,
          label: t.labelStatLabel,
          caption: t.mutedCaption,
          background: { ...cardBackground, cornerRadius: base.cornerRadiusLarge },
          backgroundWidth: 6,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          padding,
        },
      }),
      defineTemplate({
        name: TEMPLATE.TWO_COLUMN,
        description: "Two equal markdown columns with optional header.",
        layout: twoColumn,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        description: "Centered body text with optional caption. Use for value props and big statements.",
        layout: statement,
        master: minimalMaster,
        masterTokens: m.lightMinimal,
        layoutTokens: {
          caption: t.mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          body: { ...t.bodyText, style: TEXT_STYLE.H2 },
        },
      }),
      defineTemplate({
        name: TEMPLATE.AGENDA,
        description: "Eyebrow, title, and numbered item list with divider lines.",
        layout: agenda,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
          ...t.headerTokens,
          vAlign: VALIGN.MIDDLE,
          items: { ...t.bodyText, style: TEXT_STYLE.H4, color: palette.textPrimary },
          divider: subtleBorder,
          itemNumber: { style: TEXT_STYLE.H2, color: palette.brandLight },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          spacing: spacingTight,
          image: imageBase,
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS,
        description: "Card grid with intro text and optional caption.",
        layout: cards,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS_FLAT,
        description: "Flat card grid (no background) with intro text and optional caption.",
        layout: cards,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP },
        },
      }),
      defineTemplate({
        name: TEMPLATE.BLANK,
        description: "No chrome. Full canvas for custom content.",
        layout: blank,
        master: minimalMaster,
        masterTokens: m.lightMinimal,
        layoutTokens: {
          ...t.bodySlotTokens,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE,
        description: "Standalone pull quote with left accent bar and optional attribution.",
        layout: quote,
        master: minimalMaster,
        masterTokens: m.lightMinimal,
        layoutTokens: {
          quote: t.quoteSlotTokens,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE_DARK,
        description: "Dark variant of the pull quote with left accent bar and optional attribution.",
        layout: quote,
        master: minimalMaster,
        masterTokens: m.darkMinimal,
        layoutTokens: {
          quote: {
            bar: {
              color: palette.brandLight,
              width: base.accentBarWidth,
              dashType: DASH_TYPE.SOLID,
            },
            spacing: spacing,
            quote: {
              ...t.quoteText,
              color: palette.white,
              linkColor: palette.brandLight,
            },
            attribution: {
              ...t.labelMutedSmall,
              color: palette.textMuted,
            },
          },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        },
      }),
      defineTemplate({
        name: TEMPLATE.SHAPES,
        description: "Demo layout showing all 4 shape primitives with varied properties.",
        layout: shapes,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
          ...t.headerTokens,
          subtitle: { style: TEXT_STYLE.BODY, color: palette.textMuted },
          label: {
            style: TEXT_STYLE.BODY,
            color: palette.textSecondary,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            border: { color: palette.brand, width: 1, dashType: DASH_TYPE.SOLID },
          },
          rectangle: {
            fill: palette.brand,
            border: { color: palette.textPrimary, width: 2, dashType: DASH_TYPE.SOLID },
            cornerRadius: 0,
          },
          ellipse: {
            fill: palette.textPrimary,
            border: { color: palette.brand, width: 2, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          triangle: {
            fill: palette.teal,
            border: { color: palette.textPrimary, width: 3, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          diamond: {
            fill: palette.border,
            border: { color: palette.teal, width: 2, dashType: DASH_TYPE.DOTTED },
            cornerRadius: 0,
          },
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        },
      }),
      defineTemplate({
        name: TEMPLATE.TRANSFORM,
        description: "Side-by-side comparison layout with optional overlay.",
        layout: transform,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
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
        },
      }),
      defineTemplate({
        name: TEMPLATE.LINES,
        description: "Demo layout showing all 3 dash types.",
        layout: lines,
        master: defaultMaster,
        masterTokens: m.default,
        layoutTokens: {
          ...t.headerTokens,
          label: t.labelMutedSmall,
          solid: { color: palette.textPrimary, width: 2, dashType: DASH_TYPE.SOLID },
          dashed: { color: palette.brand, width: 2, dashType: DASH_TYPE.DASHED },
          dotted: { color: palette.brandLight, width: 2, dashType: DASH_TYPE.DOTTED },
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.LEFT,
          spacing: spacing,
        },
      }),
    ],
  };
}

// ============================================
// FACTSHEET FORMAT
// ============================================

function buildFactsheetFormat(base: typeof Base, config: FormatConfig): ThemeFormat {
  const { spacing, spacingTight, padding, margin, footerHeight, unit } = config;
  const { palette, TEXT_STYLE, subtleBorder, cardBackground, imageBase } = base;

  const t = buildSharedTokens(base, config);

  // Factsheet master tokens
  const factsheetMasterTokens = {
    background: { color: palette.white },
    margin,
    topBarHeight: unit * 36,
    topBarFill: { fill: palette.textPrimary, cornerRadius: 0 },
    topBarLogo: assets.tycoslide.logomarkWhite,
    topBarLogoTokens: { padding: 0 },
    topBarLogoHeight: unit * 10,
    topBarLogoWidth: unit * 37,
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
  };

  const lightMinimalTokens = {
    background: { color: palette.surface },
    margin,
  };

  const darkMinimalTokens = {
    background: { color: palette.textPrimary },
    margin,
  };

  // Factsheet header tokens: H1/24pt title (instead of shared H3/12pt)
  const factsheetHeaderTokens = {
    title: { ...t.labelH1, style: TEXT_STYLE.H1 },
    eyebrow: t.labelEyebrow,
    headerSpacing: spacingTight,
  };

  // Factsheet body slot tokens: refined quote styling
  const factsheetBodySlotTokens = {
    ...t.bodySlotTokens,
    quote: {
      ...t.quoteSlotTokens,
      bar: { ...t.quoteSlotTokens.bar, width: 1 },
      attribution: { ...t.labelMutedSmall, style: TEXT_STYLE.BODY, hAlign: HALIGN.RIGHT },
    },
  };

  const bodyBase = {
    ...factsheetHeaderTokens,
    text: t.bodyText,
    list: t.bodyList,
    hAlign: HALIGN.LEFT,
    spacing,
    ...factsheetBodySlotTokens,
  };

  const cardsBase = {
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
    templates: [
      defineTemplate({
        name: TEMPLATE.TITLE,
        description: "Opening slide with large title and optional subtitle.",
        layout: title,
        master: minimalMaster,
        masterTokens: lightMinimalTokens,
        layoutTokens: {
          title: { ...t.heroTitle, color: palette.textPrimary, style: TEXT_STYLE.TITLE },
          subtitle: { ...t.heroSubtitle, color: palette.textSecondary, style: TEXT_STYLE.H3 },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: imageBase,
        },
      }),
      defineTemplate({
        name: TEMPLATE.END,
        description: "Closing slide. Mirrors the title layout.",
        layout: end,
        master: minimalMaster,
        masterTokens: darkMinimalTokens,
        layoutTokens: {
          title: { ...t.heroTitle, style: TEXT_STYLE.TITLE },
          subtitle: t.heroSubtitle,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: imageBase,
        },
      }),
      defineTemplate({
        name: TEMPLATE.SECTION,
        description: "Section divider with centered title.",
        layout: section,
        master: minimalMaster,
        masterTokens: darkMinimalTokens,
        layoutTokens: {
          title: t.labelSectionHeading,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        },
      }),
      defineTemplate({
        name: TEMPLATE.BODY,
        description: "Markdown body with optional title. Default layout.",
        layout: body,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: body,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STAT,
        description: "Big number or key metric with label and optional caption.",
        layout: stat,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: {
          value: t.labelStatValue,
          label: t.labelStatLabel,
          caption: t.mutedCaption,
          background: { ...cardBackground, cornerRadius: base.cornerRadiusLarge },
          backgroundWidth: 6,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          padding,
        },
      }),
      defineTemplate({
        name: TEMPLATE.TWO_COLUMN,
        description: "Two equal markdown columns with optional header.",
        layout: twoColumn,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        description: "Centered body text with optional caption. Use for value props and big statements.",
        layout: statement,
        master: minimalMaster,
        masterTokens: lightMinimalTokens,
        layoutTokens: {
          caption: t.mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          body: { ...t.bodyText, style: TEXT_STYLE.H2 },
        },
      }),
      defineTemplate({
        name: TEMPLATE.AGENDA,
        description: "Eyebrow, title, and numbered item list with divider lines.",
        layout: agenda,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: {
          ...t.headerTokens,
          vAlign: VALIGN.MIDDLE,
          items: { ...t.bodyText, style: TEXT_STYLE.H4, color: palette.textPrimary },
          divider: subtleBorder,
          itemNumber: { style: TEXT_STYLE.H2, color: palette.brandLight },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          spacing: spacingTight,
          image: imageBase,
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS,
        description: "Card grid with intro text and optional caption.",
        layout: cards,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS_FLAT,
        description: "Flat card grid (no background) with intro text and optional caption.",
        layout: cards,
        master: factsheetMaster,
        masterTokens: factsheetMasterTokens,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP },
        },
      }),
      defineTemplate({
        name: TEMPLATE.BLANK,
        description: "No chrome. Full canvas for custom content.",
        layout: blank,
        master: minimalMaster,
        masterTokens: lightMinimalTokens,
        layoutTokens: {
          ...t.bodySlotTokens,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE,
        description: "Standalone pull quote with left accent bar and optional attribution.",
        layout: quote,
        master: minimalMaster,
        masterTokens: lightMinimalTokens,
        layoutTokens: {
          quote: t.quoteSlotTokens,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE_DARK,
        description: "Dark variant of the pull quote with left accent bar and optional attribution.",
        layout: quote,
        master: minimalMaster,
        masterTokens: darkMinimalTokens,
        layoutTokens: {
          quote: {
            bar: {
              color: palette.brandLight,
              width: base.accentBarWidth,
              dashType: DASH_TYPE.SOLID,
            },
            spacing: spacing,
            quote: {
              ...t.quoteText,
              color: palette.white,
              linkColor: palette.brandLight,
            },
            attribution: {
              ...t.labelMutedSmall,
              color: palette.textMuted,
            },
          },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
        },
      }),
    ],
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
