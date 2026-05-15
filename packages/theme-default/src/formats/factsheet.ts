import { GRID_STYLE, HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { Format, LabelTokens, Layout, Palette, ThemeFormat } from "@tycoslide/sdk";
import { SlideFormat, TEXT_STYLE, defineTemplate, deriveTokens } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import {
  type FactsheetChromeTokens,
  withFactsheetChrome,
  withMarginChrome,
} from "../chrome.js";
import {
  agenda,
  blank,
  body,
  cards,
  end,
  quote,
  section,
  stat,
  statement,
  title,
  twoColumn,
} from "../layouts.js";
import { TEMPLATE } from "../index.js";
import type { ChromeConfig } from "./presentation.js";

const unit = 0.025;

export const factsheetFormat: Format = {
  slide: SlideFormat.letterPortrait,
  spacing: { base: unit * 5, tight: unit * 2.5 },
  padding: unit * 6,
  radius: 0.08,
  strokes: { hairline: 0.5, thin: 0.75, base: 1, thick: 2 },
  shadow: { type: SHADOW_TYPE.OUTER, opacity: 12, blur: 6, offset: 2, angle: 180 },
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  textStyles: {
    [TEXT_STYLE.QUOTE]: {
      fontFamily: assets.fonts.inter,
      fontSize: 28,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.inter,
      fontSize: 20,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 20 * 1.5,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.inter,
      fontSize: 16,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 16 * 1.5,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 14 * 1.5,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 11,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 11 * 1.5,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 10,
      lineHeightMultiplier: 1.4,
      bulletIndentPt: 10 * 1.5,
    },
    [TEXT_STYLE.CAPTION]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 8 * 1.5,
    },
    [TEXT_STYLE.FOOTER]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 7,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 7 * 1.5,
    },
    [TEXT_STYLE.CODE]: {
      fontFamily: assets.fonts.firaCode,
      fontSize: 9,
      lineHeightMultiplier: 1.6,
      bulletIndentPt: 0,
    },
  },
};

export const factsheetChrome: ChromeConfig = {
  margin: 0.5,
  footerHeight: unit * 6,
};

// ============================================
// FACTSHEET FORMAT
// ============================================

export function buildFactsheetFormat(palette: Palette): ThemeFormat {
  const config = factsheetFormat;
  const spacing = config.spacing.base;
  const spacingTight = config.spacing.tight;
  const { padding } = config;
  const { margin, footerHeight } = factsheetChrome;
  const t = deriveTokens(palette, config);

  // ── Theme-specific semantic tokens ─────────────────────────────────────

  const richTextBase = { linkColor: palette.accent, accents: t.primitives.accents };

  const heroTitle = { ...richTextBase, linkUnderline: false, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H1, color: palette.background };
  const heroSubtitle = { ...richTextBase, linkUnderline: false, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H3, color: palette.background };

  const headerTokens = {
    title: t.onLight.headings.h3,
    eyebrow: { style: TEXT_STYLE.CAPTION, color: palette.accent, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE } as LabelTokens,
    headerSpacing: spacingTight,
  };

  const sectionHeading: LabelTokens = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H2, color: palette.background };
  const statValue: LabelTokens = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H1, color: palette.accent };
  const statLabel: LabelTokens = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H3, color: palette.secondary };
  const mutedCaption = { ...t.onLight.caption, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE };
  const labelMutedSmall: LabelTokens = { style: TEXT_STYLE.CAPTION, color: palette.secondary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };
  const labelFooter: LabelTokens = { style: TEXT_STYLE.FOOTER, color: palette.secondary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };

  const cardTitle = { ...richTextBase, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H4, color: palette.accent };
  const cardDescription = { ...richTextBase, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.CAPTION, color: palette.secondary };
  const cardBase = {
    padding,
    image: { padding: 0.125 },
    spacing: spacingTight,
    hAlign: HALIGN.LEFT,
    title: cardTitle,
    description: cardDescription,
  };

  // ── Component tokens (composed from building blocks) ──────────────────

  const imageTokens = {};

  const tableTokens = {
    headerRow: { textStyle: TEXT_STYLE.CAPTION, textColor: palette.muted, backgroundOpacity: 0, background: palette.divider, hAlign: HALIGN.CENTER },
    headerCol: { textStyle: TEXT_STYLE.CAPTION, textColor: palette.muted, backgroundOpacity: 0, background: palette.background, hAlign: HALIGN.LEFT },
    cellTextStyle: TEXT_STYLE.CAPTION,
    cellTextColor: palette.body,
    cellBackground: palette.surface,
    cellBackgroundOpacity: 0,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    gridStyle: GRID_STYLE.HORIZONTAL,
    gridStroke: t.primitives.border,
    cellPadding: spacingTight,
    linkColor: palette.accent,
    linkUnderline: true,
    accents: t.primitives.accents,
    background: {
      fill: palette.background,
      border: t.primitives.border,
      cornerRadius: config.radius,
      shadow: t.primitives.shadow,
    },
    backgroundPadding: spacingTight,
  };

  const codeTokens = {
    textStyle: TEXT_STYLE.CODE,
    theme: palette.highlightTheme,
    padding,
    background: {
      fill: palette.heading,
      cornerRadius: config.radius,
      shadow: t.primitives.shadow,
    },
    image: imageTokens,
  };

  const quoteText = { ...richTextBase, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE, style: TEXT_STYLE.H2, color: palette.heading };

  const quoteTokens = {
    bar: {
      color: palette.accent,
      width: config.strokes.thick,
    },
    spacing,
    quote: quoteText,
    attribution: labelMutedSmall,
  };

  const testimonialTokens = {
    background: {
      fill: palette.surface,
      border: t.primitives.border,
      cornerRadius: config.radius,
    },
    padding,
    spacing: spacingTight,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    quote: quoteText,
    attribution: labelMutedSmall,
    image: imageTokens,
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
    groupCornerRadius: config.radius,
    accents: t.primitives.accents,
    accentStyle: { opacity: config.shadow.opacity, textColor: palette.accent },
    textStyle: TEXT_STYLE.BODY,
    image: imageTokens,
  };

  const cardSlotTokens = {
    ...cardBase,
    vAlign: VALIGN.MIDDLE,
    background: { ...t.surfaces.card, shadow: t.primitives.shadow },
  };

  const labelTokens = {
    1: t.onLight.headings.h1,
    2: t.onLight.headings.h2,
    3: t.onLight.headings.h3,
    4: t.onLight.headings.h4,
    5: t.onLight.headings.h4,
    6: t.onLight.headings.h4,
  };

  const componentTokens = {
    table: tableTokens,
    code: codeTokens,
    mermaid: mermaidTokens,
    quote: quoteTokens,
    testimonial: testimonialTokens,
    card: cardSlotTokens,
    image: imageTokens,
    label: labelTokens,
  };

  // Factsheet chrome tokens
  const factsheetChromeTokens: FactsheetChromeTokens = {
    margin,
    topBarHeight: 0.9,
    topBarFill: { fill: palette.heading, cornerRadius: 0 },
    topBarLogo: assets.tycoslide.logomarkWhite,
    topBarLogoTokens: { padding: 0 },
    topBarLogoHeight: 0.25,
    topBarLogoWidth: 0.925,
    topBarLabel: "PRODUCT SHEET",
    topBarLabelTokens: {
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.MIDDLE,
      style: TEXT_STYLE.CAPTION,
      color: palette.background,
    },
    footerHeight,
    footerText: "\u00A9 2026 tycoslide | www.tycoslide.com",
    footerTokens: { ...labelFooter, hAlign: HALIGN.LEFT },
    slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
  };

  // Chrome wrapper helpers
  const factsheet = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withFactsheetChrome(l, factsheetChromeTokens);
  const lightMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, { margin });
  const darkMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, { margin });

  const bodyBase = {
    ...headerTokens,
    text: t.onLight.text,
    list: t.onLight.list,
    hAlign: HALIGN.LEFT,
    spacing,
    ...componentTokens,
  };

  const cardsBase = {
    ...headerTokens,
    intro: t.onLight.text,
    caption: mutedCaption,
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
        background: t.surfaces.elevated,
        layoutTokens: {
          title: { ...heroTitle, color: palette.heading, style: TEXT_STYLE.QUOTE },
          subtitle: { ...heroSubtitle, color: palette.secondary, style: TEXT_STYLE.H3 },
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: {},
        },
      }),
      defineTemplate({
        name: TEMPLATE.END,
        description: "Closing slide. Mirrors the title layout.",
        layout: darkMargin(end),
        background: t.surfaces.emphasis,
        layoutTokens: {
          title: { ...heroTitle, style: TEXT_STYLE.QUOTE },
          subtitle: heroSubtitle,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacingTight,
          image: {},
        },
      }),
      defineTemplate({
        name: TEMPLATE.SECTION,
        description: "Section divider with centered title.",
        layout: darkMargin(section),
        background: t.surfaces.emphasis,
        layoutTokens: {
          title: sectionHeading,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        },
      }),
      defineTemplate({
        name: TEMPLATE.BODY,
        description: "Markdown body with optional title. Default layout.",
        layout: factsheet(body),
        background: t.surfaces.page,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: factsheet(body),
        background: t.surfaces.page,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STAT,
        description: "Big number or key metric with label and optional caption.",
        layout: factsheet(stat),
        background: t.surfaces.page,
        layoutTokens: {
          value: statValue,
          label: statLabel,
          caption: mutedCaption,
          background: { ...t.surfaces.card, cornerRadius: config.radius * 1.5 },
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
        background: t.surfaces.page,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        description: "Centered body text with optional caption. Use for value props and big statements.",
        layout: lightMargin(statement),
        background: t.surfaces.elevated,
        layoutTokens: {
          caption: mutedCaption,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing: spacing,
          body: { ...t.onLight.text, style: TEXT_STYLE.H2 },
        },
      }),
      defineTemplate({
        name: TEMPLATE.AGENDA,
        description: "Eyebrow, title, and numbered item list with divider lines.",
        layout: factsheet(agenda),
        background: t.surfaces.page,
        layoutTokens: {
          ...headerTokens,
          vAlign: VALIGN.MIDDLE,
          items: { ...t.onLight.text, style: TEXT_STYLE.H4, color: palette.heading },
          divider: t.primitives.border,
          itemNumber: { style: TEXT_STYLE.H2, color: palette.accentSoft, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          spacing: spacingTight,
          image: {},
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS,
        description: "Card grid with intro text and optional caption.",
        layout: factsheet(cards),
        background: t.surfaces.page,
        layoutTokens: {
          ...cardsBase,
          card: { ...cardBase, padding: 0.275, vAlign: VALIGN.TOP, background: t.surfaces.card },
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS_FLAT,
        description: "Flat card grid (no background) with intro text and optional caption.",
        layout: factsheet(cards),
        background: t.surfaces.page,
        layoutTokens: {
          ...cardsBase,
          card: { ...cardBase, padding: 0.275, vAlign: VALIGN.TOP },
        },
      }),
      defineTemplate({
        name: TEMPLATE.BLANK,
        description: "No chrome. Full canvas for custom content.",
        layout: lightMargin(blank),
        background: t.surfaces.elevated,
        layoutTokens: {
          ...componentTokens,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE,
        description: "Standalone pull quote with left accent bar and optional attribution.",
        layout: lightMargin(quote),
        background: t.surfaces.elevated,
        layoutTokens: {
          quote: quoteTokens,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          spacing,
        },
      }),
      defineTemplate({
        name: TEMPLATE.QUOTE_DARK,
        description: "Dark variant of the pull quote with left accent bar and optional attribution.",
        layout: darkMargin(quote),
        background: t.surfaces.emphasis,
        layoutTokens: {
          quote: {
            bar: {
              color: palette.accentSoft,
              width: config.strokes.thick,
            },
            spacing: spacing,
            quote: {
              ...quoteTokens.quote,
              color: palette.background,
              linkColor: palette.accentSoft,
            },
            attribution: {
              ...labelMutedSmall,
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
