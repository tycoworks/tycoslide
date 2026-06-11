// deriveTokens — single-call token derivation from Palette + Format.
// Produces generic visual tokens organized by surface context (onLight/onDark),
// role-based surfaces, and visual primitives.
// Zero theme-specific concepts — no "hero", "eyebrow", "stat", "section heading".

import { DASH, VALIGN } from "@tycoslide/core";
import type { LabelTokens } from "../components/label.js";
import type { ListTokens } from "../components/list.js";
import type { TextTokens } from "../components/text.js";
import type { Format, Palette } from "./format.js";
import { TEXT_STYLE } from "./format.js";

/**
 * Derive a complete set of visual tokens from a Palette and Format.
 *
 * Call once per palette/format pair. The returned tokens are organized into:
 * - `onLight` / `onDark` — text/heading/list tokens for each background context
 * - `surfaces` — role-based backgrounds (page, elevated, emphasis, card)
 * - `primitives` — accents, border, shadow
 */
export function deriveTokens(palette: Palette, format: Format) {
  // ── Palette-derived visual primitives ──────────────────────────────────

  const accents: string[] = [palette.brand.primary, ...palette.accents];
  const subtleBorder = { color: palette.fill.divider, width: format.strokes.thin, dashType: DASH.SOLID };
  const shadow = {
    type: format.shadow.type,
    color: palette.fill.shadow,
    opacity: format.shadow.opacity,
    blur: format.shadow.blur,
    offset: format.shadow.offset,
    angle: format.shadow.angle,
  };
  const richTextBase = {
    linkColor: palette.brand.primary,
    linkUnderline: true,
    hAlign: format.hAlign,
    vAlign: format.vAlign,
    highlightColor: palette.brand.primary,
  };

  // ── onLight text tokens (for light/neutral backgrounds) ──────────────

  const bodyText: TextTokens = { ...richTextBase, style: TEXT_STYLE.BODY, color: palette.text.body };
  const bodyList: ListTokens = { ...bodyText, vAlign: VALIGN.TOP };
  const captionText: TextTokens = {
    ...richTextBase,
    style: TEXT_STYLE.CAPTION,
    color: palette.text.secondary,
  };

  const lightHeadings = {
    h1: {
      color: palette.text.heading,
      style: TEXT_STYLE.H1,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
    h2: {
      color: palette.text.heading,
      style: TEXT_STYLE.H2,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
    h3: {
      color: palette.text.heading,
      style: TEXT_STYLE.H3,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
    h4: {
      color: palette.text.heading,
      style: TEXT_STYLE.H4,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
  };

  const onLight = {
    headings: lightHeadings,
    text: bodyText,
    list: bodyList,
    caption: captionText,
  };

  // ── onDark text tokens (for emphasis/dark backgrounds) ────────────────

  const darkText: TextTokens = { ...richTextBase, style: TEXT_STYLE.BODY, color: palette.fill.background };
  const darkList: ListTokens = { ...darkText, vAlign: VALIGN.TOP };
  const darkCaption: TextTokens = {
    ...richTextBase,
    style: TEXT_STYLE.CAPTION,
    color: palette.fill.background,
  };

  const darkHeadings = {
    h1: {
      color: palette.fill.background,
      style: TEXT_STYLE.H1,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
    h2: {
      color: palette.fill.background,
      style: TEXT_STYLE.H2,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
    h3: {
      color: palette.fill.background,
      style: TEXT_STYLE.H3,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
    h4: {
      color: palette.fill.background,
      style: TEXT_STYLE.H4,
      hAlign: format.hAlign,
      vAlign: format.vAlign,
    } as LabelTokens,
  };

  const onDark = {
    headings: darkHeadings,
    text: darkText,
    list: darkList,
    caption: darkCaption,
  };

  // ── Surfaces ─────────────────────────────────────────────────────────

  const surfaces = {
    page: { color: palette.fill.background },
    elevated: { color: palette.fill.surface },
    emphasis: { color: palette.fill.emphasis },
    card: { fill: palette.fill.background, border: subtleBorder, cornerRadius: format.radius },
  };

  // ── Primitives ───────────────────────────────────────────────────────

  const primitives = {
    accents,
    border: subtleBorder,
    shadow,
  };

  return {
    onLight,
    onDark,
    surfaces,
    primitives,
  };
}

/** Token set produced by {@link deriveTokens}. */
export type VisualTokens = ReturnType<typeof deriveTokens>;
