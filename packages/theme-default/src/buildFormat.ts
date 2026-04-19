// Single factory that builds a ThemeFormat from base constants + format config.
// All ~40 intermediate token objects are assembled here. Each format declares its
// differences via a typed Format object — no merge, no inheritance.

import { DASH_TYPE, GRID_STYLE, HALIGN, VALIGN } from "@tycoslide/core";
import type { LabelTokens, ListTokens, TextTokens, ThemeFormat } from "@tycoslide/sdk";
import type * as Base from "./base.js";
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
import type { MasterRef } from "./master.js";

// ============================================
// FORMAT TYPE
// ============================================

/** Per-format configuration that drives the single buildFormat factory. */
export interface Format {
  /** Slide dimensions. */
  slide: { width: number; height: number };
  /** Dimensional constants derived from format-specific unit size. */
  unit: number;
  spacing: number;
  spacingTight: number;
  padding: number;
  margin: number;
  footerHeight: number;
  /** Complete text style record (font sizes, line heights, etc.). */
  textStyles: ThemeFormat["textStyles"];
  /** Primary master ref for body/cards/stat/agenda layouts. */
  primaryMaster: MasterRef;
  /** Light minimal master for title/statement/blank/quote layouts. */
  lightMinimalMaster: MasterRef;
  /** Dark minimal master for end/section/quote-dark layouts. */
  darkMinimalMaster: MasterRef;
  /** Header title text style (H3 for presentation, H1 for factsheet). */
  headerTitleStyle: string;
  /** Quote bar width override (default: accentBarWidth from base). */
  quoteBarWidth?: number;
  /** Quote attribution tokens override. */
  quoteAttribution?: LabelTokens;
  /** Layout names to exclude from this format. */
  excludeLayouts?: string[];
}

// ============================================
// BUILD FORMAT
// ============================================

export function buildFormat(base: typeof Base, format: Format): ThemeFormat {
  const { spacing, spacingTight, padding, unit } = format;
  const {
    palette,
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
  const bodyText: TextTokens = { ...richTextBase, ...alignLeft, style: TEXT_STYLE.BODY, color: palette.textPrimary };
  const bodyList: ListTokens = { ...bodyText, vAlign: VALIGN.TOP };
  const cardTitle: TextTokens = { ...richTextBase, ...alignLeft, style: TEXT_STYLE.H4, color: palette.brand };
  const cardDescription: TextTokens = {
    ...richTextBase,
    ...alignLeft,
    style: TEXT_STYLE.SMALL,
    color: palette.textSecondary,
  };
  const quoteText: TextTokens = { ...richTextBase, ...alignLeft, style: TEXT_STYLE.H2, color: palette.textPrimary };
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
  const labelEyebrow: LabelTokens = { ...alignLeft, style: TEXT_STYLE.EYEBROW, color: palette.brand };
  const labelMutedSmall: LabelTokens = { ...alignLeft, style: TEXT_STYLE.SMALL, color: palette.textSecondary };

  // --- Accent labels ---
  const labelSectionHeading: LabelTokens = { ...alignCenter, style: TEXT_STYLE.H2, color: palette.white };
  const labelStatValue: LabelTokens = { ...alignCenter, style: TEXT_STYLE.H1, color: palette.brand };
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
    accents: base.accents,
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
      fill: palette.textPrimary,
      fillOpacity: 100,
      cornerRadius,
      shadow,
    },
    image: imageBase,
  };

  const quoteSlotTokens = {
    bar: {
      color: palette.brand,
      width: format.quoteBarWidth ?? accentBarWidth,
      dashType: DASH_TYPE.SOLID,
    },
    spacing: spacing,
    quote: quoteText,
    attribution: format.quoteAttribution ?? labelMutedSmall,
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
    primaryContrast: palette.textPrimary,
    text: palette.textPrimary,
    line: palette.brand,
    surface: palette.surface,
    surfaceBorder: palette.border,
    surfaceSubtle: palette.surface,
    group: palette.surface,
    groupCornerRadius: cornerRadius,
    accents: base.accents,
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

  // --- Header tokens (format-specific title style) ---
  const headerTitleLabel =
    format.headerTitleStyle === TEXT_STYLE.H1
      ? { ...labelH1, style: TEXT_STYLE.H1 }
      : labelH3;
  const headerTokens = {
    title: headerTitleLabel,
    eyebrow: labelEyebrow,
    headerSpacing: spacingTight,
  };

  // --- Layout building blocks ---
  const { primaryMaster, lightMinimalMaster, darkMinimalMaster } = format;

  const bodyBase = {
    master: primaryMaster,
    ...headerTokens,
    text: bodyText,
    list: bodyList,
    hAlign: HALIGN.LEFT,
    spacing,
    ...bodySlotTokens,
  };

  const cardsBase = {
    master: primaryMaster,
    ...headerTokens,
    intro: bodyText,
    caption: mutedCaption,
    vAlign: VALIGN.MIDDLE,
    hAlign: HALIGN.CENTER,
    spacing,
    gridSpacing: spacing,
  };

  // --- Layout token maps ---
  const excluded = new Set(format.excludeLayouts ?? []);
  const layouts: ThemeFormat["layouts"] = {};

  layouts.title = {
    variants: {
      default: titleLayout.tokenMap({
        title: { ...heroTitle, color: palette.textPrimary, style: TEXT_STYLE.TITLE },
        subtitle: { ...heroSubtitle, color: palette.textSecondary, style: TEXT_STYLE.H3 },
        master: lightMinimalMaster,
        vAlign: VALIGN.MIDDLE,
        hAlign: HALIGN.CENTER,
        spacing: spacingTight,
        image: imageBase,
      }),
    },
  };

  layouts.end = {
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
  };

  layouts.section = {
    variants: {
      default: sectionLayout.tokenMap({
        title: labelSectionHeading,
        master: darkMinimalMaster,
        vAlign: VALIGN.MIDDLE,
        hAlign: HALIGN.CENTER,
      }),
    },
  };

  layouts.body = {
    variants: {
      default: bodyLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.TOP }),
      centered: bodyLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.MIDDLE }),
    },
  };

  layouts.stat = {
    variants: {
      default: statLayout.tokenMap({
        master: primaryMaster,
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
  };

  layouts["two-column"] = {
    variants: {
      default: twoColumnLayout.tokenMap({ ...bodyBase, vAlign: VALIGN.MIDDLE }),
    },
  };

  layouts.statement = {
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
  };

  layouts.agenda = {
    variants: {
      default: agendaLayout.tokenMap({
        master: primaryMaster,
        ...headerTokens,
        vAlign: VALIGN.MIDDLE,
        items: { ...bodyText, style: TEXT_STYLE.H4, color: palette.textPrimary },
        divider: subtleBorder,
        itemNumber: { ...alignLeft, style: TEXT_STYLE.H2, color: palette.brandLight },
        itemVAlign: VALIGN.MIDDLE,
        itemSpacing: spacing,
        spacing: spacingTight,
        image: imageBase,
      }),
    },
  };

  layouts.cards = {
    variants: {
      default: cardsLayout.tokenMap({
        ...cardsBase,
        card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: cardBackground },
      }),
      flat: cardsLayout.tokenMap({ ...cardsBase, card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP } }),
    },
  };

  layouts.blank = {
    variants: {
      default: blankLayout.tokenMap({
        master: lightMinimalMaster,
        ...bodySlotTokens,
      }),
    },
  };

  layouts.quote = {
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
            color: palette.brandLight,
            width: accentBarWidth,
            dashType: DASH_TYPE.SOLID,
          },
          spacing: spacing,
          quote: {
            ...quoteText,
            color: palette.white,
            linkColor: palette.brandLight,
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
  };

  if (!excluded.has("shapes")) {
    layouts.shapes = {
      variants: {
        default: shapesLayout.tokenMap({
          master: primaryMaster,
          ...headerTokens,
          subtitle: { ...alignLeft, style: TEXT_STYLE.BODY, color: palette.textMuted },
          label: {
            style: TEXT_STYLE.BODY,
            color: palette.textSecondary,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            border: { color: palette.brand, width: 1, dashType: DASH_TYPE.SOLID },
          },
          rectangle: {
            fill: palette.brand,
            fillOpacity: 100,
            border: { color: palette.textPrimary, width: 2, dashType: DASH_TYPE.SOLID },
            cornerRadius: 0,
          },
          ellipse: {
            fill: palette.textPrimary,
            fillOpacity: 100,
            border: { color: palette.brand, width: 2, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          triangle: {
            fill: palette.teal,
            fillOpacity: 100,
            border: { color: palette.textPrimary, width: 3, dashType: DASH_TYPE.DASHED },
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
    };
  }

  if (!excluded.has("transform")) {
    layouts.transform = {
      variants: {
        default: transformLayout.tokenMap({
          master: primaryMaster,
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
    };
  }

  if (!excluded.has("lines")) {
    layouts.lines = {
      variants: {
        default: linesLayout.tokenMap({
          master: primaryMaster,
          ...headerTokens,
          label: labelMutedSmall,
          solid: { color: palette.textPrimary, width: 2, dashType: DASH_TYPE.SOLID },
          dashed: { color: palette.brand, width: 2, dashType: DASH_TYPE.DASHED },
          dotted: { color: palette.brandLight, width: 2, dashType: DASH_TYPE.DOTTED },
          vAlign: VALIGN.TOP,
          hAlign: HALIGN.LEFT,
          spacing: spacing,
        }),
      },
    };
  }

  // Remove excluded layouts
  for (const name of excluded) {
    delete layouts[name];
  }

  return {
    slide: format.slide,
    textStyles: format.textStyles,
    layouts,
  };
}
