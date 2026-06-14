import type { Brand, Format, LabelTokens, Layout, Palette, ThemeFormat } from "@tycoslide/sdk";
import { defineTemplate, deriveTokens, HALIGN, SHADOW, SlideFormat, TEXT_STYLE, VALIGN } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { type FooterChromeTokens, type MarginChromeTokens, withFooterChrome, withMarginChrome } from "../chrome.js";
import { fonts } from "../fonts.js";
import { TEMPLATE } from "../index.js";
import { agenda, body, cards, section, statement, title } from "../layouts.js";

/** Chrome-specific spatial config (not token-relevant). */
interface ChromeConfig {
  margin: number;
  footerWeight: number;
}

const unit = 3;

const presentationFormat: Format = {
  slide: SlideFormat.s16x9,
  spacing: { base: unit * 8, tight: unit * 4 },
  padding: unit * 8,
  radius: unit * 3,
  strokes: { hairline: 0.5, thin: 0.75, base: 1, thick: 2 },
  shadow: { type: SHADOW.OUTER, opacity: 12, blur: 6, offset: 2, angle: 180 },
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  textStyles: {
    [TEXT_STYLE.QUOTE]: {
      fontFamily: fonts.inter,
      fontSize: 56,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: fonts.interLight,
      fontSize: 44,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: fonts.interLight,
      fontSize: 32,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: fonts.interLight,
      fontSize: 24,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: fonts.interLight,
      fontSize: 18,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: fonts.interLight,
      fontSize: 14,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.CAPTION]: {
      fontFamily: fonts.interLight,
      fontSize: 12,
      lineHeight: 1.4,
    },
    [TEXT_STYLE.FOOTER]: {
      fontFamily: fonts.interLight,
      fontSize: 8,
      lineHeight: 1.2,
    },
    [TEXT_STYLE.CODE]: {
      fontFamily: fonts.firaCode,
      fontSize: 11,
      lineHeight: 1.6,
    },
  },
};

const presentationChrome: ChromeConfig = {
  margin: unit * 16,
  footerWeight: 0.05,
};

// ============================================
// CHROME TOKEN BUILDERS
// ============================================

/** Build chrome token sets for a format. */
function buildChromeTokens(palette: Palette, config: Format, chrome: ChromeConfig) {
  const { margin, footerWeight } = chrome;
  const spacingTight = config.spacing.tight;
  const labelFooter: LabelTokens = {
    style: TEXT_STYLE.FOOTER,
    color: palette.text.secondary,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
  };

  const footer: FooterChromeTokens = {
    margin,
    footerWeight,
    bottomPadding: margin / 2,
    footerLogo: assets.resolve(assets.entries.tycoslide.logo),
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

export function buildPresentationFormat(brand: Brand): ThemeFormat {
  const config = presentationFormat;
  const palette = brand.colors.light;
  const spacing = config.spacing.base;
  const spacingTight = config.spacing.tight;

  const t = deriveTokens(brand, config);
  const c = buildChromeTokens(palette, config, presentationChrome);

  // ── Chrome wrapper helpers ──────────────────────────────────────────────
  const footer = <T extends object, P extends Record<string, any>, S extends readonly string[]>(l: Layout<T, P, S>) =>
    withFooterChrome(l, c.footer);
  const margin = <T extends object, P extends Record<string, any>, S extends readonly string[]>(l: Layout<T, P, S>) =>
    withMarginChrome(l, c.margin);

  // ── Composition atoms ───────────────────────────────────────────────────
  const centered = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } as const;
  const richText = { linkColor: palette.brand.primary, highlightColor: palette.brand.primary, linkUnderline: true };

  // ── Header tokens (shared by body, cards, agenda) ──────────────────────
  const headerTokens = {
    title: t.onLight.headings.h3,
    eyebrow: {
      style: TEXT_STYLE.CAPTION,
      color: palette.brand.primary,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.MIDDLE,
    } as LabelTokens,
    headerSpacing: spacingTight,
  };

  // ── Shared body spread ──────────────────────────────────────────────────
  const bodyBase = {
    ...headerTokens,
    text: t.onLight.text,
    list: t.onLight.list,
    hAlign: HALIGN.LEFT,
    spacing,
    ...t.onLight.components,
    table: { ...t.onLight.components.table, hAlign: HALIGN.CENTER },
    testimonial: { ...t.onLight.components.testimonial, ...centered },
    quote: { ...t.onLight.components.quote, quote: { ...t.onLight.components.quote.quote, style: TEXT_STYLE.H2 } },
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
        documentation: {
          description: "Opening slide with large title and optional subtitle.",
          whenToUse: "First slide of any deck. Sets the topic and tone.",
          whenNotToUse: "Mid-deck content slides. Use section for mid-deck dividers.",
          limits: ["Title and subtitle only — no body content."],
        },
        layout: margin(title),
        background: t.onLight.surfaces.elevated,
        tokens: {
          title: { ...t.onLight.headings.h1, ...centered, ...richText, linkUnderline: false, style: TEXT_STYLE.QUOTE },
          subtitle: {
            ...t.onLight.headings.h3,
            ...centered,
            ...richText,
            linkUnderline: false,
            color: palette.text.secondary,
          },
          ...centered,
          spacing: spacingTight,
          image: {},
        },
      }),

      // ── End (dark, uses title layout) ─────────────────────────────────
      defineTemplate({
        name: TEMPLATE.TITLE_DARK,
        documentation: {
          description: "Closing slide. Dark variant of the title layout.",
          whenToUse: "Last slide of the deck. Call to action, contact info, or closing statement.",
          whenNotToUse: "Opening or mid-deck slides.",
          limits: ["Title and subtitle only — no body content."],
        },
        layout: margin(title),
        background: t.onLight.surfaces.emphasis,
        tokens: {
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
        documentation: {
          description: "Section divider with centered title.",
          whenToUse:
            "Between groups of related slides to signal a new topic. Decks over 5 slides benefit from section dividers.",
          whenNotToUse: "Decks under 4 slides or as the opening/closing slide.",
          limits: ["Title only — no body content, no subtitle."],
        },
        layout: margin(section),
        background: t.onLight.surfaces.emphasis,
        tokens: {
          title: { ...t.onDark.headings.h2, hAlign: HALIGN.CENTER },
          ...centered,
        },
      }),

      // ── Body (light, top-aligned) ─────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.BODY,
        documentation: {
          description: "Markdown body with optional title. Default layout.",
          whenToUse:
            "General-purpose content: paragraphs, bullet lists, tables, code blocks, diagrams. The workhorse template.",
          whenNotToUse: "When content fits a more specific template (cards, statement). Don't use body for everything.",
          limits: [
            "Max 4-7 bullet items, 1-2 lines each.",
            "Max 3-5 short paragraphs.",
            "Max 2 levels of nested lists.",
            "Tables: 5-7 rows, 3-5 columns.",
            "Code blocks: 5-15 lines.",
            "Mermaid diagrams: 5-10 nodes.",
          ],
          gotchas: ["Content is top-aligned. Use body-centered if you want vertical centering."],
        },
        layout: footer(body),
        background: t.onLight.surfaces.elevated,
        tokens: { ...bodyBase, vAlign: VALIGN.TOP },
      }),

      // ── Body centered (light) ─────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.BODY_CENTERED,
        documentation: {
          description: "Centered markdown body with optional title.",
          whenToUse:
            "Same content as body but vertically centered. Good for shorter content, pricing tables, or investment asks.",
          whenNotToUse: "Long-form content that needs top-alignment to avoid overflow.",
          limits: [
            "Same density limits as body — but less forgiving because centering amplifies overflow.",
            "Tables: max 5 rows for comfortable centering.",
          ],
        },
        layout: footer(body),
        background: t.onLight.surfaces.elevated,
        tokens: { ...bodyBase, vAlign: VALIGN.MIDDLE },
      }),

      // ── Statement (light) ─────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.STATEMENT,
        documentation: {
          description: "Centered body text with optional caption. Use for value props and big statements.",
          whenToUse: "A single bold claim, key metric, or value proposition that deserves its own slide.",
          whenNotToUse: "Multiple ideas or detailed content. If you need bullets or tables, use body.",
          limits: [
            "1-2 sentences in the body param, 1 short caption. Both are frontmatter params, not markdown body slots.",
          ],
          gotchas: ["Body text is set large (H2). Keep it punchy — long sentences will overflow."],
        },
        layout: margin(statement),
        background: t.onLight.surfaces.elevated,
        tokens: {
          caption: mutedCaption,
          ...centered,
          spacing,
          body: { ...t.onLight.text, style: TEXT_STYLE.H2 },
        },
      }),

      // ── Agenda (light) ────────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.AGENDA,
        documentation: {
          description: "Eyebrow, title, and numbered item list with divider lines.",
          whenToUse: "Ordered lists of 3-5 key points, agenda items, or sequential steps.",
          whenNotToUse: "Unstructured content or more than 5 items. Use body with a bullet list instead.",
          limits: ["3-5 items. Each item: 1-2 lines. Items are numbered automatically."],
          gotchas: ["Items are frontmatter params (YAML array), not markdown body content."],
        },
        layout: footer(agenda),
        background: t.onLight.surfaces.elevated,
        tokens: {
          ...headerTokens,
          vAlign: VALIGN.MIDDLE,
          items: { ...t.onLight.text, style: TEXT_STYLE.H4, color: palette.text.heading },
          divider: t.onLight.primitives.border,
          itemNumber: { style: TEXT_STYLE.H2, color: palette.brand.soft, ...centered },
          itemVAlign: VALIGN.MIDDLE,
          itemSpacing: spacing,
          numberWeight: 0.1,
          spacing: spacingTight,
          image: {},
        },
      }),

      // ── Cards (light) ─────────────────────────────────────────────────
      defineTemplate({
        name: TEMPLATE.CARDS,
        documentation: {
          description: "Card grid with intro text and optional caption.",
          whenToUse:
            "Feature lists, team members, product tiers, or any set of parallel items with title + description.",
          whenNotToUse: "Sequential/ordered content (use agenda).",
          limits: ["2-4 cards. Each card: short title + 1-2 sentence description. More than 4 will overflow."],
          gotchas: ["Cards are frontmatter params (YAML array), not markdown body content."],
        },
        layout: footer(cards),
        background: t.onLight.surfaces.elevated,
        tokens: {
          ...headerTokens,
          intro: t.onLight.text,
          caption: mutedCaption,
          ...centered,
          spacing,
          gridSpacing: spacing,
          card: {
            ...t.onLight.components.card,
            padding: unit * 11,
            vAlign: VALIGN.TOP,
            background: t.onLight.surfaces.card,
          },
        },
      }),
    ],
  };
}
