import { GRID_STYLE, HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { Format, LabelTokens, Layout, Palette, ThemeFormat } from "@tycoslide/sdk";
import { defineTemplate, deriveTokens, SlideFormat, TEXT_STYLE } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { type FooterChromeTokens, type MarginChromeTokens, withFooterChrome, withMarginChrome } from "../chrome.js";
import { TEMPLATE } from "../index.js";
import { agenda, body, cards, section, statement, title, transform } from "../layouts.js";

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
    bottomPadding: margin / 4,
    footerLogo: assets.tycoslide.logo,
    footerText: "tycoslide",
    footerSpacing: spacingTight,
    slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
    footer: labelFooter,
    footerImage: {},
  };

  const marginTokens: MarginChromeTokens = { margin };

  return { footer, margin: marginTokens };
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

  // ── Chrome wrapper helpers ──────────────────────────────────────────────
  const footer = <T extends object, P extends Record<string, any>, S extends readonly string[]>(l: Layout<T, P, S>) =>
    withFooterChrome(l, c.footer);
  const margin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(l: Layout<T, P, S>) =>
    withMarginChrome(l, c.margin);

  // ── Composition atoms ───────────────────────────────────────────────────
  const centered = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } as const;
  const richText = { linkColor: palette.accent, accents: t.primitives.accents, linkUnderline: true };

  // ── Header tokens (shared by body, cards, agenda, transform) ────────────
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

  // ── Component tokens (body slots can contain any of these) ──────────────
  const imageTokens = {};

  const labelMutedSmall: LabelTokens = {
    style: TEXT_STYLE.CAPTION,
    color: palette.secondary,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
  };

  const quoteText = { ...t.onLight.headings.h2, ...richText };

  // ── Card tokens (used by cards + transform templates) ───────────────────
  const cardTitle = {
    ...richText,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.H4,
    color: palette.accent,
  };
  const cardDescription = {
    ...richText,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    style: TEXT_STYLE.CAPTION,
    color: palette.secondary,
  };
  const cardBase = {
    padding,
    image: { padding: spacingTight },
    spacing: spacingTight,
    hAlign: HALIGN.LEFT,
    title: cardTitle,
    description: cardDescription,
  };

  const componentTokens = {
    table: {
      headerRow: {
        textStyle: TEXT_STYLE.CAPTION,
        textColor: palette.muted,
        background: palette.divider,
        hAlign: HALIGN.CENTER,
      },
      headerCol: {
        textStyle: TEXT_STYLE.CAPTION,
        textColor: palette.muted,
        background: palette.background,
        hAlign: HALIGN.LEFT,
      },
      cellTextStyle: TEXT_STYLE.CAPTION,
      cellTextColor: palette.body,
      cellBackground: palette.surface,
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
    },
    code: {
      textStyle: TEXT_STYLE.CODE,
      theme: palette.highlightTheme,
      padding,
      background: {
        fill: palette.heading,
        cornerRadius: config.radius,
        shadow: t.primitives.shadow,
      },
      image: imageTokens,
    },
    mermaid: {
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
    },
    quote: {
      bar: { color: palette.accent, width: config.strokes.thick },
      spacing,
      quote: quoteText,
      attribution: labelMutedSmall,
    },
    testimonial: {
      background: {
        fill: palette.surface,
        border: t.primitives.border,
        cornerRadius: config.radius,
      },
      padding,
      spacing: spacingTight,
      ...centered,
      quote: quoteText,
      attribution: labelMutedSmall,
      image: imageTokens,
    },
    card: { ...cardBase, vAlign: VALIGN.MIDDLE, background: { ...t.surfaces.card, shadow: t.primitives.shadow } },
    image: imageTokens,
    label: {
      1: t.onLight.headings.h1,
      2: t.onLight.headings.h2,
      3: t.onLight.headings.h3,
      4: t.onLight.headings.h4,
      5: t.onLight.headings.h4,
      6: t.onLight.headings.h4,
    },
  };

  // ── Shared body spread ──────────────────────────────────────────────────
  const bodyBase = {
    ...headerTokens,
    text: t.onLight.text,
    list: t.onLight.list,
    hAlign: HALIGN.LEFT,
    spacing,
    ...componentTokens,
  };

  // ── Muted caption (used by statement, cards) ────────────────────────────
  const mutedCaption = { ...t.onLight.caption, ...centered };

  return {
    slide: config.slide,
    textStyles: config.textStyles,
    templates: [
      // ── Title (light) ─────────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.TITLE,
        description: "Opening slide with large title and optional subtitle.",
        layout: margin(title),
        background: t.surfaces.elevated,
        layoutTokens: {
          title: { ...t.onLight.headings.h1, ...centered, ...richText, linkUnderline: false, style: TEXT_STYLE.QUOTE },
          subtitle: {
            ...t.onLight.headings.h3,
            ...centered,
            ...richText,
            linkUnderline: false,
            color: palette.secondary,
          },
          ...centered,
          spacing: spacingTight,
          image: {},
        },
      }),

      // ── End (dark, uses title layout) ─────────────────────────────────
      defineTemplate({
        name: TEMPLATE.TITLE_DARK,
        description: "Closing slide. Dark variant of the title layout.",
        layout: margin(title),
        background: t.surfaces.emphasis,
        layoutTokens: {
          title: { ...t.onDark.headings.h1, ...centered, ...richText, linkUnderline: false, style: TEXT_STYLE.QUOTE },
          subtitle: { ...t.onDark.headings.h3, ...centered, ...richText, linkUnderline: false },
          ...centered,
          spacing: spacingTight,
          image: {},
        },
      }),

      // ── Section (dark) ────────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.SECTION,
        description: "Section divider with centered title.",
        layout: margin(section),
        background: t.surfaces.emphasis,
        layoutTokens: {
          title: { ...t.onDark.headings.h2, hAlign: HALIGN.CENTER },
          ...centered,
        },
      }),

      // ── Body (light, top-aligned) ─────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.BODY,
        description: "Markdown body with optional title. Default layout.",
        layout: footer(body),
        background: t.surfaces.elevated,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),

      // ── Body centered (light) ─────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        description: "Centered markdown body with optional title.",
        layout: footer(body),
        background: t.surfaces.elevated,
        layoutTokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),

      // ── Statement (light) ─────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        description: "Centered body text with optional caption. Use for value props and big statements.",
        layout: margin(statement),
        background: t.surfaces.elevated,
        layoutTokens: {
          caption: mutedCaption,
          ...centered,
          spacing,
          body: { ...t.onLight.text, style: TEXT_STYLE.H2 },
        },
      }),

      // ── Agenda (light) ────────────────────────────────────────────────
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
          itemNumber: { style: TEXT_STYLE.H2, color: palette.accentSoft, ...centered },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          spacing: spacingTight,
          image: {},
        },
      }),

      // ── Cards (light) ─────────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.CARDS,
        description: "Card grid with intro text and optional caption.",
        layout: footer(cards),
        background: t.surfaces.elevated,
        layoutTokens: {
          ...headerTokens,
          intro: t.onLight.text,
          caption: mutedCaption,
          ...centered,
          spacing,
          gridSpacing: spacing,
          card: { ...cardBase, padding: unit * 11, vAlign: VALIGN.TOP, background: t.surfaces.card },
        },
      }),

      // ── Transform (light) ─────────────────────────────────────────────
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
          spacing,
          contentSpacing: 0,
          overlaySize: 0.9,
          ...componentTokens,
          card: {
            ...cardBase,
            ...centered,
            title: { ...cardTitle, hAlign: HALIGN.CENTER },
            description: { ...cardDescription, hAlign: HALIGN.CENTER },
            background: { ...t.surfaces.card, shadow: t.primitives.shadow },
          },
        },
      }),
    ],
  };
}
