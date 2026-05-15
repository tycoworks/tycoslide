import { DASH_TYPE, GRID_STYLE, HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { Format, LabelTokens, Layout, Palette, ThemeFormat } from "@tycoslide/sdk";
import { defineTemplate, deriveTokens, SlideFormat, TEXT_STYLE } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { type FooterChromeTokens, type MarginChromeTokens, withFooterChrome, withMarginChrome } from "../chrome.js";
import { TEMPLATE } from "../index.js";
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
} from "../layouts.js";

/** Chrome-specific spatial config (not token-relevant). */
export interface ChromeConfig {
  margin: number;
  footerHeight: number;
}

const unit = 0.03125;

export const presentationFormat: Format = {
  slide: SlideFormat.s16x9,
  spacing: { base: unit * 8, tight: unit * 4 },
  padding: unit * 8,
  radius: 0.08,
  strokes: { hairline: 0.5, thin: 0.75, base: 1, thick: 2 },
  shadow: { type: SHADOW_TYPE.OUTER, opacity: 12, blur: 6, offset: 2, angle: 180 },
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  textStyles: {
    [TEXT_STYLE.QUOTE]: {
      fontFamily: assets.fonts.inter,
      fontSize: 56,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 44,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 44 * 1.5,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 32,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 32 * 1.5,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 24,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 24 * 1.5,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 18,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 18 * 1.5,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 14 * 1.5,
    },
    [TEXT_STYLE.CAPTION]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 12,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 12 * 1.5,
    },
    [TEXT_STYLE.FOOTER]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 8 * 1.5,
    },
    [TEXT_STYLE.CODE]: {
      fontFamily: assets.fonts.firaCode,
      fontSize: 11,
      lineHeightMultiplier: 1.6,
      bulletIndentPt: 0,
    },
  },
};

export const presentationChrome: ChromeConfig = {
  margin: 0.5,
  footerHeight: unit * 8,
};

// ============================================
// SPATIAL CONSTANTS (not palette-dependent)
// ============================================

/** Theme-specific accent not in the standard Palette. */
const TEAL = "#0D9488";

// ============================================
// CHROME TOKEN BUILDERS
// ============================================

/** Build chrome token sets for a format. */
export function buildChromeTokens(palette: Palette, config: Format, chrome: ChromeConfig) {
  const { margin, footerHeight } = chrome;
  const spacingTight = config.spacing.tight;
  const labelFooter: LabelTokens = {
    style: TEXT_STYLE.FOOTER,
    color: palette.secondary,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
  };

  const footer: FooterChromeTokens = {
    margin,
    footerHeight,
    footerLogo: assets.tycoslide.logo,
    footerText: "tycoslide",
    footerSpacing: spacingTight,
    slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
    footer: labelFooter,
    footerImage: {},
  };

  const lightMargin: MarginChromeTokens = { margin };
  const darkMargin: MarginChromeTokens = { margin };

  return { footer, lightMargin, darkMargin };
}

// ============================================
// PRESENTATION FORMAT
// ============================================

export function buildPresentationFormat(palette: Palette): ThemeFormat {
  const config = presentationFormat;
  const spacing = config.spacing.base;
  const spacingTight = config.spacing.tight;
  const { padding } = config;

  const t = deriveTokens(palette, config);
  const c = buildChromeTokens(palette, config, presentationChrome);

  // Chrome wrapper helpers — bind chrome tokens for this format
  const footer = <T extends object, P extends Record<string, any>, S extends readonly string[]>(l: Layout<T, P, S>) =>
    withFooterChrome(l, c.footer);
  const lightMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, c.lightMargin);
  const darkMargin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(
    l: Layout<T, P, S>,
  ) => withMarginChrome(l, c.darkMargin);

  // ── Theme-specific semantic tokens ─────────────────────────────────────
  // These compose from t.onLight/onDark/surfaces/primitives + palette.

  const richTextBase = { linkColor: palette.accent, accents: t.primitives.accents };

  const heroTitle = {
    ...richTextBase,
    linkUnderline: false,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H1,
    color: palette.background,
  };
  const heroSubtitle = {
    ...richTextBase,
    linkUnderline: false,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H3,
    color: palette.background,
  };

  const headerTokens = {
    title: t.onLight.headings.h3,
    eyebrow: {
      style: TEXT_STYLE.CAPTION,
      color: palette.accent,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.MIDDLE,
    } as LabelTokens,
    headerSpacing: spacingTight,
  };

  const sectionHeading: LabelTokens = {
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H2,
    color: palette.background,
  };
  const statValue: LabelTokens = {
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H1,
    color: palette.accent,
  };
  const statLabel: LabelTokens = {
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H3,
    color: palette.secondary,
  };
  const mutedCaption = { ...t.onLight.caption, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE };
  const labelMutedSmall: LabelTokens = {
    style: TEXT_STYLE.CAPTION,
    color: palette.secondary,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
  };

  const cardTitle = {
    ...richTextBase,
    linkUnderline: true,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H4,
    color: palette.accent,
  };
  const cardDescription = {
    ...richTextBase,
    linkUnderline: true,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.CAPTION,
    color: palette.secondary,
  };
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
    headerRow: {
      textStyle: TEXT_STYLE.CAPTION,
      textColor: palette.muted,
      backgroundOpacity: 0,
      background: palette.divider,
      hAlign: HALIGN.CENTER,
    },
    headerCol: {
      textStyle: TEXT_STYLE.CAPTION,
      textColor: palette.muted,
      backgroundOpacity: 0,
      background: palette.background,
      hAlign: HALIGN.LEFT,
    },
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

  const quoteText = {
    ...richTextBase,
    linkUnderline: true,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H2,
    color: palette.heading,
  };

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
        layout: footer(body),
        background: t.surfaces.elevated,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: footer(body),
        background: t.surfaces.elevated,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),
      defineTemplate({
        name: TEMPLATE.STAT,
        description: "Big number or key metric with label and optional caption.",
        layout: footer(stat),
        background: t.surfaces.elevated,
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
        layout: footer(twoColumn),
        background: t.surfaces.elevated,
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
        layout: footer(agenda),
        background: t.surfaces.elevated,
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
        layout: footer(cards),
        background: t.surfaces.elevated,
        layoutTokens: {
          ...cardsBase,
          card: { ...cardBase, padding: 0.34375, vAlign: VALIGN.TOP, background: t.surfaces.card },
        },
      }),
      defineTemplate({
        name: TEMPLATE.CARDS_FLAT,
        description: "Flat card grid (no background) with intro text and optional caption.",
        layout: footer(cards),
        background: t.surfaces.elevated,
        layoutTokens: {
          ...cardsBase,
          card: { ...cardBase, padding: 0.34375, vAlign: VALIGN.TOP },
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
      defineTemplate({
        name: TEMPLATE.SHAPES,
        description: "Demo layout showing all 4 shape primitives with varied properties.",
        layout: footer(shapes),
        background: t.surfaces.elevated,
        layoutTokens: {
          ...headerTokens,
          subtitle: { style: TEXT_STYLE.BODY, color: palette.muted, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
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
          },
          ellipse: {
            fill: palette.heading,
            border: { color: palette.accent, width: 2, dashType: DASH_TYPE.DASHED },
          },
          triangle: {
            fill: TEAL,
            border: { color: palette.heading, width: 3, dashType: DASH_TYPE.DASHED },
          },
          diamond: {
            fill: palette.divider,
            border: { color: TEAL, width: 2, dashType: DASH_TYPE.DOTTED },
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
        background: t.surfaces.elevated,
        layoutTokens: {
          ...headerTokens,
          text: cardDescription,
          list: t.onLight.list,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.LEFT,
          overlayVAlign: VALIGN.MIDDLE,
          overlayHAlign: HALIGN.CENTER,
          spacing: spacing,
          contentSpacing: 0,
          overlaySize: 0.9,
          ...componentTokens,
          card: {
            ...cardBase,
            hAlign: HALIGN.CENTER,
            title: { ...cardTitle, hAlign: HALIGN.CENTER },
            description: { ...cardDescription, hAlign: HALIGN.CENTER },
            vAlign: VALIGN.MIDDLE,
            background: { ...t.surfaces.card, shadow: t.primitives.shadow },
          },
        },
      }),
      defineTemplate({
        name: TEMPLATE.LINES,
        description: "Demo layout showing all 3 dash types.",
        layout: footer(lines),
        background: t.surfaces.elevated,
        layoutTokens: {
          ...headerTokens,
          label: labelMutedSmall,
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
