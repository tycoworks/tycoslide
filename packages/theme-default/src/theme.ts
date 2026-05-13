import { DASH_TYPE, GRID_STYLE, HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { LabelTokens, Layout, ListTokens, Palette, TextTokens, ThemeFormat } from "@tycoslide/sdk";
import { brandFonts, defineTemplate, defineTheme, TEXT_STYLE } from "@tycoslide/sdk";
import { assets } from "./assets.js";
import { brand } from "./brand.js";
import {
  type FactsheetChromeTokens,
  type FooterChromeTokens,
  type MarginChromeTokens,
  withFactsheetChrome,
  withFooterChrome,
  withMarginChrome,
} from "./chrome.js";
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
// SPATIAL CONSTANTS (not palette-dependent)
// ============================================

const BORDER_WIDTH = 0.75;
const CORNER_RADIUS = 0.08;
const CORNER_RADIUS_LARGE = 0.12;
const ACCENT_BAR_WIDTH = 2;
const IMAGE_BASE = {};
const ALIGN_CENTER = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } as const;

/** Theme-specific accent not in the standard Palette. */
const TEAL = "#0D9488";

// ============================================
// PALETTE → DERIVED VALUES
// ============================================

/** Derive visual token primitives from a Palette. */
function derivePaletteValues(palette: Palette) {
  const accents: Record<string, string> = {
    accent: palette.accent,
    soft: palette.accentSoft,
    dark: palette.heading,
  };
  const subtleBorder = { color: palette.divider, width: BORDER_WIDTH, dashType: DASH_TYPE.SOLID };
  const shadow = {
    type: SHADOW_TYPE.OUTER,
    color: palette.shadow,
    opacity: 12,
    blur: 6,
    offset: 2,
    angle: 180,
  };
  const cardBackground = { fill: palette.background, border: subtleBorder, cornerRadius: CORNER_RADIUS };
  const richTextBase = { linkColor: palette.accent, accents };
  const heroBase = { ...richTextBase, linkUnderline: false, hAlign: HALIGN.CENTER } as const;
  const labelBase = { color: palette.heading };

  return { accents, subtleBorder, shadow, cardBackground, richTextBase, heroBase, labelBase };
}

// ============================================
// SHARED TOKEN BUILDERS
// ============================================

/** Build text, label, and component tokens shared by all formats. */
function buildSharedTokens(palette: Palette, config: FormatConfig) {
  const { unit, spacing, spacingTight, padding } = config;
  const d = derivePaletteValues(palette);

  // --- Text tokens ---
  const bodyText: TextTokens = { ...d.richTextBase, style: TEXT_STYLE.BODY, color: palette.body };
  const bodyList: ListTokens = { ...bodyText, vAlign: VALIGN.TOP };
  const cardTitle: TextTokens = { ...d.richTextBase, style: TEXT_STYLE.H4, color: palette.accent };
  const cardDescription: TextTokens = {
    ...d.richTextBase,
    style: TEXT_STYLE.CAPTION,
    color: palette.secondary,
  };
  const quoteText: TextTokens = { ...d.richTextBase, style: TEXT_STYLE.H2, color: palette.heading };
  const mutedCaption: TextTokens = {
    ...d.richTextBase,
    ...ALIGN_CENTER,
    style: TEXT_STYLE.CAPTION,
    color: palette.secondary,
  };

  // --- Hero text ---
  const heroTitle: TextTokens = { ...d.heroBase, style: TEXT_STYLE.H1, color: palette.background };
  const heroSubtitle: TextTokens = { ...d.heroBase, style: TEXT_STYLE.H3, color: palette.background };

  // --- Heading labels ---
  const labelH1: LabelTokens = { ...d.labelBase, style: TEXT_STYLE.H1 };
  const labelH2: LabelTokens = { ...d.labelBase, style: TEXT_STYLE.H2 };
  const labelH3: LabelTokens = { ...d.labelBase, style: TEXT_STYLE.H3 };
  const labelH4: LabelTokens = { ...d.labelBase, style: TEXT_STYLE.H4 };

  // --- Functional labels ---
  const labelEyebrow: LabelTokens = { style: TEXT_STYLE.CAPTION, color: palette.accent };
  const labelMutedSmall: LabelTokens = { style: TEXT_STYLE.CAPTION, color: palette.secondary };
  const labelFooter: LabelTokens = { style: TEXT_STYLE.FOOTER, color: palette.secondary };

  // --- Accent labels ---
  const labelSectionHeading: LabelTokens = { hAlign: HALIGN.CENTER, style: TEXT_STYLE.H2, color: palette.background };
  const labelStatValue: LabelTokens = { hAlign: HALIGN.CENTER, style: TEXT_STYLE.H1, color: palette.accent };
  const labelStatLabel: LabelTokens = { hAlign: HALIGN.CENTER, style: TEXT_STYLE.H3, color: palette.secondary };

  // --- Component tokens ---
  const cardBase = {
    padding,
    image: { padding: 0.125 } as typeof IMAGE_BASE,
    spacing: spacingTight,
    hAlign: HALIGN.LEFT,
    title: cardTitle,
    description: cardDescription,
  };

  const cardSlotTokens = {
    ...cardBase,
    vAlign: VALIGN.MIDDLE,
    background: { ...d.cardBackground, shadow: d.shadow },
  };

  const tableHeaderBase = {
    textStyle: TEXT_STYLE.CAPTION,
    textColor: palette.muted,
    backgroundOpacity: 0,
  };

  const tableTokens = {
    headerRow: { ...tableHeaderBase, background: palette.divider, hAlign: HALIGN.CENTER },
    headerCol: { ...tableHeaderBase, background: palette.background, hAlign: HALIGN.LEFT },
    cellTextStyle: TEXT_STYLE.CAPTION,
    cellTextColor: palette.body,
    cellBackground: palette.surface,
    cellBackgroundOpacity: 0,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    gridStyle: GRID_STYLE.HORIZONTAL,
    gridStroke: d.subtleBorder,
    cellPadding: unit * 4,
    linkColor: palette.accent,
    linkUnderline: true,
    accents: d.accents,
    background: {
      fill: palette.background,
      border: d.subtleBorder,
      cornerRadius: CORNER_RADIUS_LARGE,
      shadow: d.shadow,
    },
    backgroundPadding: unit * 4,
  };

  const codeTokens = {
    textStyle: TEXT_STYLE.CODE,
    theme: palette.highlightTheme,
    padding: padding,
    background: {
      fill: palette.heading,
      cornerRadius: CORNER_RADIUS,
      shadow: d.shadow,
    },
    image: IMAGE_BASE,
  };

  const quoteSlotTokens = {
    bar: {
      color: palette.accent,
      width: ACCENT_BAR_WIDTH,
      dashType: DASH_TYPE.SOLID,
    },
    spacing: spacing,
    quote: quoteText,
    attribution: labelMutedSmall,
  };

  const testimonialSlotTokens = {
    background: {
      fill: palette.surface,
      border: d.subtleBorder,
      cornerRadius: CORNER_RADIUS,
    },
    padding: padding,
    spacing: spacingTight,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    quote: quoteText,
    attribution: labelMutedSmall,
    image: IMAGE_BASE,
  };

  const mermaidTokens = {
    primary: palette.background,
    primaryContrast: palette.heading,
    text: palette.heading,
    line: palette.accent,
    surface: palette.surface,
    surfaceBorder: palette.divider,
    surfaceSubtle: palette.surface,
    group: palette.surface,
    groupCornerRadius: CORNER_RADIUS,
    accents: d.accents,
    accentStyle: { opacity: 15, textColor: palette.accent },
    textStyle: TEXT_STYLE.BODY,
    image: IMAGE_BASE,
  };

  const bodySlotTokens = {
    table: tableTokens,
    code: codeTokens,
    mermaid: mermaidTokens,
    quote: quoteSlotTokens,
    testimonial: testimonialSlotTokens,
    card: cardSlotTokens,
    image: IMAGE_BASE,
    label: { 1: labelH1, 2: { ...labelH2, color: palette.accent }, 3: labelH3, 4: labelH4, 5: labelH4, 6: labelH4 },
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
// CHROME TOKEN BUILDERS
// ============================================

/** Build chrome token sets for a format. */
function buildChromeTokens(palette: Palette, config: FormatConfig) {
  const { margin, footerHeight, spacingTight } = config;
  const labelFooter: LabelTokens = { style: TEXT_STYLE.FOOTER, color: palette.secondary };

  const footer: FooterChromeTokens = {
    margin,
    footerHeight,
    footerLogo: assets.tycoslide.logo,
    footerText: "tycoslide",
    footerSpacing: spacingTight,
    slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
    footer: labelFooter,
    footerImage: IMAGE_BASE,
  };

  const lightMargin: MarginChromeTokens = { margin };
  const darkMargin: MarginChromeTokens = { margin };

  return { footer, lightMargin, darkMargin };
}

// ============================================
// BACKGROUNDS
// ============================================

function buildBackgrounds(palette: Palette) {
  return {
    surface: { color: palette.surface },
    dark: { color: palette.heading },
    white: { color: palette.background },
  };
}

// ============================================
// PRESENTATION FORMAT
// ============================================

function buildPresentationFormat(palette: Palette, config: FormatConfig): ThemeFormat {
  const { spacing, spacingTight, padding, unit } = config;
  const d = derivePaletteValues(palette);

  const t = buildSharedTokens(palette, config);
  const c = buildChromeTokens(palette, config);
  const bg = buildBackgrounds(palette);

  // Chrome wrapper helpers — bind chrome tokens for this format
  const footer = <T extends object, P extends Record<string, any>, S extends readonly string[]>(l: Layout<T, P, S>) =>
    withFooterChrome(l, c.footer);
  const lightMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, c.lightMargin);
  const darkMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, c.darkMargin);

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
        layout: lightMargin(title),
        background: bg.surface,
        layoutTokens: {
          title: { ...t.heroTitle, color: palette.heading, style: TEXT_STYLE.QUOTE },
          subtitle: { ...t.heroSubtitle, color: palette.secondary, style: TEXT_STYLE.H3 },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: IMAGE_BASE,
        },
      }),
      defineTemplate({
        name: TEMPLATE.END,
        description: "Closing slide. Mirrors the title layout.",
        layout: darkMargin(end),
        background: bg.dark,
        layoutTokens: {
          title: { ...t.heroTitle, style: TEXT_STYLE.QUOTE },
          subtitle: t.heroSubtitle,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: IMAGE_BASE,
        },
      }),
      defineTemplate({
        name: TEMPLATE.SECTION,
        description: "Section divider with centered title.",
        layout: darkMargin(section),
        background: bg.dark,
        layoutTokens: {
          title: t.labelSectionHeading,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        },
      }),
      defineTemplate({
        name: TEMPLATE.BODY,
        description: "Markdown body with optional title. Default layout.",
        layout: footer(body),
        background: bg.surface,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: footer(body),
        background: bg.surface,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STAT,
        description: "Big number or key metric with label and optional caption.",
        layout: footer(stat),
        background: bg.surface,
        layoutTokens: {
          value: t.labelStatValue,
          label: t.labelStatLabel,
          caption: t.mutedCaption,
          background: { ...d.cardBackground, cornerRadius: CORNER_RADIUS_LARGE },
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
        layout: footer(twoColumn),
        background: bg.surface,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        description: "Centered body text with optional caption. Use for value props and big statements.",
        layout: lightMargin(statement),
        background: bg.surface,
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
        layout: footer(agenda),
        background: bg.surface,
        layoutTokens: {
          ...t.headerTokens,
          vAlign: VALIGN.MIDDLE,
          items: { ...t.bodyText, style: TEXT_STYLE.H4, color: palette.heading },
          divider: d.subtleBorder,
          itemNumber: { style: TEXT_STYLE.H2, color: palette.accentSoft },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          spacing: spacingTight,
          image: IMAGE_BASE,
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS,
        description: "Card grid with intro text and optional caption.",
        layout: footer(cards),
        background: bg.surface,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: d.cardBackground },
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS_FLAT,
        description: "Flat card grid (no background) with intro text and optional caption.",
        layout: footer(cards),
        background: bg.surface,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP },
        },
      }),
      defineTemplate({
        name: TEMPLATE.BLANK,
        description: "No chrome. Full canvas for custom content.",
        layout: lightMargin(blank),
        background: bg.surface,
        layoutTokens: {
          ...t.bodySlotTokens,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE,
        description: "Standalone pull quote with left accent bar and optional attribution.",
        layout: lightMargin(quote),
        background: bg.surface,
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
        layout: darkMargin(quote),
        background: bg.dark,
        layoutTokens: {
          quote: {
            bar: {
              color: palette.accentSoft,
              width: ACCENT_BAR_WIDTH,
              dashType: DASH_TYPE.SOLID,
            },
            spacing: spacing,
            quote: {
              ...t.quoteText,
              color: palette.background,
              linkColor: palette.accentSoft,
            },
            attribution: {
              ...t.labelMutedSmall,
              color: palette.muted,
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
        layout: footer(shapes),
        background: bg.surface,
        layoutTokens: {
          ...t.headerTokens,
          subtitle: { style: TEXT_STYLE.BODY, color: palette.muted },
          label: {
            style: TEXT_STYLE.BODY,
            color: palette.secondary,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            border: { color: palette.accent, width: 1, dashType: DASH_TYPE.SOLID },
          },
          rectangle: {
            fill: palette.accent,
            border: { color: palette.heading, width: 2, dashType: DASH_TYPE.SOLID },
            cornerRadius: 0,
          },
          ellipse: {
            fill: palette.heading,
            border: { color: palette.accent, width: 2, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          triangle: {
            fill: TEAL,
            border: { color: palette.heading, width: 3, dashType: DASH_TYPE.DASHED },
            cornerRadius: 0,
          },
          diamond: {
            fill: palette.divider,
            border: { color: TEAL, width: 2, dashType: DASH_TYPE.DOTTED },
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
        layout: footer(transform),
        background: bg.surface,
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
            background: { ...d.cardBackground, shadow: d.shadow },
          },
        },
      }),
      defineTemplate({
        name: TEMPLATE.LINES,
        description: "Demo layout showing all 3 dash types.",
        layout: footer(lines),
        background: bg.surface,
        layoutTokens: {
          ...t.headerTokens,
          label: t.labelMutedSmall,
          solid: { color: palette.heading, width: 2, dashType: DASH_TYPE.SOLID },
          dashed: { color: palette.accent, width: 2, dashType: DASH_TYPE.DASHED },
          dotted: { color: palette.accentSoft, width: 2, dashType: DASH_TYPE.DOTTED },
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

function buildFactsheetFormat(palette: Palette, config: FormatConfig): ThemeFormat {
  const { spacing, spacingTight, padding, margin, footerHeight, unit } = config;
  const d = derivePaletteValues(palette);

  const t = buildSharedTokens(palette, config);
  const bg = buildBackgrounds(palette);

  // Factsheet chrome tokens
  const factsheetChrome: FactsheetChromeTokens = {
    margin,
    topBarHeight: unit * 36,
    topBarFill: { fill: palette.heading, cornerRadius: 0 },
    topBarLogo: assets.tycoslide.logomarkWhite,
    topBarLogoTokens: { padding: 0 },
    topBarLogoHeight: unit * 10,
    topBarLogoWidth: unit * 37,
    topBarLabel: "PRODUCT SHEET",
    topBarLabelTokens: {
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.MIDDLE,
      style: TEXT_STYLE.CAPTION,
      color: palette.background,
    },
    footerHeight,
    footerText: "\u00A9 2026 tycoslide | www.tycoslide.com",
    footerTokens: { ...t.labelFooter, hAlign: HALIGN.LEFT },
    slideNumber: { ...t.labelFooter, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
  };

  // Chrome wrapper helpers
  const factsheet = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withFactsheetChrome(l, factsheetChrome);
  const lightMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, { margin });
  const darkMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, { margin });

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
        layout: lightMargin(title),
        background: bg.surface,
        layoutTokens: {
          title: { ...t.heroTitle, color: palette.heading, style: TEXT_STYLE.QUOTE },
          subtitle: { ...t.heroSubtitle, color: palette.secondary, style: TEXT_STYLE.H3 },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: IMAGE_BASE,
        },
      }),
      defineTemplate({
        name: TEMPLATE.END,
        description: "Closing slide. Mirrors the title layout.",
        layout: darkMargin(end),
        background: bg.dark,
        layoutTokens: {
          title: { ...t.heroTitle, style: TEXT_STYLE.QUOTE },
          subtitle: t.heroSubtitle,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: IMAGE_BASE,
        },
      }),
      defineTemplate({
        name: TEMPLATE.SECTION,
        description: "Section divider with centered title.",
        layout: darkMargin(section),
        background: bg.dark,
        layoutTokens: {
          title: t.labelSectionHeading,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        },
      }),
      defineTemplate({
        name: TEMPLATE.BODY,
        description: "Markdown body with optional title. Default layout.",
        layout: factsheet(body),
        background: bg.white,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: factsheet(body),
        background: bg.white,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STAT,
        description: "Big number or key metric with label and optional caption.",
        layout: factsheet(stat),
        background: bg.white,
        layoutTokens: {
          value: t.labelStatValue,
          label: t.labelStatLabel,
          caption: t.mutedCaption,
          background: { ...d.cardBackground, cornerRadius: CORNER_RADIUS_LARGE },
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
        layout: factsheet(twoColumn),
        background: bg.white,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        description: "Centered body text with optional caption. Use for value props and big statements.",
        layout: lightMargin(statement),
        background: bg.surface,
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
        layout: factsheet(agenda),
        background: bg.white,
        layoutTokens: {
          ...t.headerTokens,
          vAlign: VALIGN.MIDDLE,
          items: { ...t.bodyText, style: TEXT_STYLE.H4, color: palette.heading },
          divider: d.subtleBorder,
          itemNumber: { style: TEXT_STYLE.H2, color: palette.accentSoft },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          spacing: spacingTight,
          image: IMAGE_BASE,
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS,
        description: "Card grid with intro text and optional caption.",
        layout: factsheet(cards),
        background: bg.white,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: d.cardBackground },
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS_FLAT,
        description: "Flat card grid (no background) with intro text and optional caption.",
        layout: factsheet(cards),
        background: bg.white,
        layoutTokens: {
          ...cardsBase,
          card: { ...t.cardBase, padding: unit * 11, vAlign: VALIGN.TOP },
        },
      }),
      defineTemplate({
        name: TEMPLATE.BLANK,
        description: "No chrome. Full canvas for custom content.",
        layout: lightMargin(blank),
        background: bg.surface,
        layoutTokens: {
          ...t.bodySlotTokens,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE,
        description: "Standalone pull quote with left accent bar and optional attribution.",
        layout: lightMargin(quote),
        background: bg.surface,
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
        layout: darkMargin(quote),
        background: bg.dark,
        layoutTokens: {
          quote: {
            bar: {
              color: palette.accentSoft,
              width: ACCENT_BAR_WIDTH,
              dashType: DASH_TYPE.SOLID,
            },
            spacing: spacing,
            quote: {
              ...t.quoteText,
              color: palette.background,
              linkColor: palette.accentSoft,
            },
            attribution: {
              ...t.labelMutedSmall,
              color: palette.muted,
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
  fonts: brandFonts(brand),
  formats: {
    presentation: buildPresentationFormat(brand.colors.light, presentationConfig),
    factsheet: buildFactsheetFormat(brand.colors.light, factsheetConfig),
  },
});
