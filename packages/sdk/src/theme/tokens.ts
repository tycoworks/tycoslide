// deriveTokens — single-call token derivation from Brand + Format.
// Produces generic visual tokens organized by surface context (onLight/onDark),
// role-based surfaces, and visual primitives.
// Zero theme-specific concepts — no "hero", "eyebrow", "stat", "section heading".
//
// Component tokens are built identically against each palette. The dark palette's
// text/fill values produce correct dark-background colors automatically.

import { DASH, GRID_STYLE } from "@tycoslide/core";
import type { LabelTokens } from "../components/label.js";
import type { ListTokens } from "../components/list.js";
import type { TextTokens } from "../components/text.js";
import type { Brand, Format, Hex, Palette } from "./format.js";
import { TEXT_STYLE } from "./format.js";

/**
 * Build all per-palette tokens: headings, text, list, caption, components,
 * surfaces, and primitives. Called once per palette — the palette's own values
 * determine whether text is dark-on-light or light-on-dark.
 */
function buildContextTokens(palette: Palette, format: Format) {
  // ── Shared building blocks ──────────────────────────────────────────────

  const richTextBase = {
    linkColor: palette.brand.primary,
    linkUnderline: true,
    hAlign: format.hAlign,
    vAlign: format.vAlign,
    highlightColor: palette.brand.primary,
  };

  const border = { color: palette.fill.divider, width: format.strokes.thin, dashType: DASH.SOLID };
  const shadow = {
    type: format.shadow.type,
    color: palette.fill.shadow,
    opacity: format.shadow.opacity,
    blur: format.shadow.blur,
    offset: format.shadow.offset,
    angle: format.shadow.angle,
  };
  const accents: Hex[] = [palette.brand.primary, ...palette.accents];

  // ── Headings ────────────────────────────────────────────────────────────

  const headingBase = { hAlign: format.hAlign, vAlign: format.vAlign };
  const headings = {
    h1: { color: palette.text.heading, style: TEXT_STYLE.H1, ...headingBase } as LabelTokens,
    h2: { color: palette.text.heading, style: TEXT_STYLE.H2, ...headingBase } as LabelTokens,
    h3: { color: palette.text.heading, style: TEXT_STYLE.H3, ...headingBase } as LabelTokens,
    h4: { color: palette.text.heading, style: TEXT_STYLE.H4, ...headingBase } as LabelTokens,
  };

  // ── Body text ───────────────────────────────────────────────────────────

  const text: TextTokens = { ...richTextBase, style: TEXT_STYLE.BODY, color: palette.text.body };
  const list: ListTokens = { ...text };
  const caption: TextTokens = { ...richTextBase, style: TEXT_STYLE.CAPTION, color: palette.text.secondary };

  // ── Components ──────────────────────────────────────────────────────────

  const attributionLabel: LabelTokens = {
    style: TEXT_STYLE.CAPTION,
    color: palette.text.secondary,
    hAlign: format.hAlign,
    vAlign: format.vAlign,
  };

  const components = {
    table: {
      headerRow: {
        style: TEXT_STYLE.CAPTION,
        color: palette.text.subtle,
        fill: palette.fill.divider,
        hAlign: format.hAlign,
      },
      headerCol: {
        style: TEXT_STYLE.CAPTION,
        color: palette.text.subtle,
        fill: palette.fill.background,
        hAlign: format.hAlign,
      },
      cellStyle: TEXT_STYLE.CAPTION,
      cellColor: palette.text.body,
      cellFill: palette.fill.surface,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
      gridStyle: GRID_STYLE.HORIZONTAL,
      gridStroke: border,
      cellPadding: format.spacing.tight,
      linkColor: palette.brand.primary,
      linkUnderline: true,
      highlightColor: palette.brand.primary,
      background: {
        fill: palette.fill.background,
        border,
        cornerRadius: format.radius,
        shadow,
      },
      backgroundPadding: format.spacing.tight,
    },
    code: {
      style: TEXT_STYLE.CODE,
      theme: palette.highlightTheme,
      padding: format.padding,
      background: { fill: palette.fill.emphasis, cornerRadius: format.radius, shadow },
      image: {},
    },
    mermaid: {
      primary: palette.fill.background,
      primaryContrast: palette.text.heading,
      text: palette.text.heading,
      line: palette.brand.primary,
      surface: palette.fill.surface,
      surfaceBorder: palette.fill.divider,
      surfaceSubtle: palette.fill.surface,
      group: palette.fill.surface,
      groupCornerRadius: format.radius,
      accents,
      accentOpacity: format.shadow.opacity,
      accentTextColor: palette.text.body,
      style: TEXT_STYLE.BODY,
      image: {},
    },
    quote: {
      bar: { color: palette.brand.primary, width: format.strokes.thick },
      spacing: format.spacing.base,
      quote: { ...richTextBase, style: TEXT_STYLE.QUOTE, color: palette.text.heading } as TextTokens,
      attribution: attributionLabel,
    },
    testimonial: {
      background: { fill: palette.fill.surface, border, cornerRadius: format.radius },
      padding: format.padding,
      spacing: format.spacing.tight,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
      quote: { ...richTextBase, style: TEXT_STYLE.QUOTE, color: palette.text.heading } as TextTokens,
      attribution: attributionLabel,
      image: {},
    },
    card: {
      padding: format.padding,
      image: { padding: format.spacing.tight, tint: palette.brand.primary },
      spacing: format.spacing.tight,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
      title: {
        ...richTextBase,
        style: TEXT_STYLE.H4,
        color: palette.brand.primary,
      } as TextTokens,
      description: {
        ...richTextBase,
        style: TEXT_STYLE.CAPTION,
        color: palette.text.secondary,
      } as TextTokens,
      background: { fill: palette.fill.background, border, cornerRadius: format.radius, shadow },
    },
    image: {},
    label: {
      1: headings.h1,
      2: headings.h2,
      3: headings.h3,
      4: headings.h4,
    },
  };

  // ── Surfaces ────────────────────────────────────────────────────────────

  const surfaces = {
    page: { color: palette.fill.background },
    elevated: { color: palette.fill.surface },
    emphasis: { color: palette.fill.emphasis },
    card: { fill: palette.fill.background, border, cornerRadius: format.radius },
  };

  // ── Primitives ──────────────────────────────────────────────────────────

  const primitives = { accents, border, shadow };

  return { headings, text, list, caption, components, surfaces, primitives };
}

/**
 * Derive a complete set of visual tokens from a Brand and Format.
 *
 * Call once per brand/format pair. The returned tokens are organized into:
 * - `onLight` / `onDark` — text, heading, list, caption, component, surface,
 *   and primitive tokens for each background context
 *
 * Component tokens are built by running the same wiring against each palette.
 * The dark palette's text/fill values produce correct colors automatically.
 *
 * Both onLight and onDark include surfaces and primitives. Use onLight for
 * light-background templates and onDark for dark-background templates.
 */
export function deriveTokens(brand: Brand, format: Format) {
  const onLight = buildContextTokens(brand.colors.light, format);
  const onDark = buildContextTokens(brand.colors.dark, format);

  return { onLight, onDark };
}

/** Token set produced by {@link deriveTokens}. */
export type VisualTokens = ReturnType<typeof deriveTokens>;
