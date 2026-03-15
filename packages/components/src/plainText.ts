// PlainText Component
// DSL-only component — not reachable via :::directives in markdown.
// Handles plain (non-markdown) text with 3 tokens (no link tokens).
// Use this for eyebrows, attributions, labels, and other non-rich text.

import type { ExpansionContext, HorizontalAlignment, TextStyleName, VerticalAlignment } from "tycoslide";
import { type ComponentNode, component, defineComponent, type ElementNode, NODE_TYPE, schema, token } from "tycoslide";
import { Component } from "./names.js";

export const PLAIN_TEXT_TOKEN = {
  COLOR: "color",
  STYLE: "style",
  HALIGN: "hAlign",
  VALIGN: "vAlign",
} as const;

export type PlainTextTokens = {
  [PLAIN_TEXT_TOKEN.COLOR]: string;
  [PLAIN_TEXT_TOKEN.STYLE]: TextStyleName;
  [PLAIN_TEXT_TOKEN.HALIGN]: HorizontalAlignment;
  [PLAIN_TEXT_TOKEN.VALIGN]: VerticalAlignment;
};

export const PLAIN_TEXT_TOKEN_SPEC = token.allRequired(PLAIN_TEXT_TOKEN);

// ============================================
// TYPES
// ============================================

/** Full props including body content (used internally by expansion). */
export type PlainTextComponentProps = {
  body: string;
};

// ============================================
// EXPAND
// ============================================

function expandPlainText(
  props: PlainTextComponentProps,
  context: ExpansionContext,
  tokens: PlainTextTokens,
): ElementNode {
  const textStyle = context.theme.textStyles[tokens.style];

  return {
    type: NODE_TYPE.TEXT,
    content: [{ text: props.body }],
    style: tokens.style,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeightMultiplier: textStyle.lineHeightMultiplier,
    bulletIndentPt: textStyle.bulletIndentPt,
    linkColor: tokens.color,
    linkUnderline: false,
  };
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const plainTextComponent = defineComponent({
  name: Component.PlainText,
  body: schema.string(),
  directive: false,
  tokens: PLAIN_TEXT_TOKEN_SPEC,
  expand: expandPlainText,
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a plain text component node.
 * No markdown parsing — the body string is used as-is, single run.
 * Use for eyebrows, attributions, labels, and other non-rich text.
 *
 * @example
 * ```typescript
 * plainText("ARCHITECTURE", tokens.eyebrow)
 * ```
 */
export function plainText(body: string, tokens: PlainTextTokens): ComponentNode<PlainTextComponentProps> {
  return component(Component.PlainText, { body }, tokens);
}
