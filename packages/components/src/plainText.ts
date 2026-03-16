// PlainText Component
// DSL-only component — not reachable via :::directives in markdown.
// Handles plain (non-markdown) text with 3 tokens (no link tokens).
// Use this for eyebrows, attributions, labels, and other non-rich text.

import type { HorizontalAlignment, RenderContext, TextStyleName, VerticalAlignment } from "tycoslide";
import { type ComponentNode, component, defineComponent, type ElementNode, type InferTokens, NODE_TYPE, schema, token } from "tycoslide";
import { Component } from "./names.js";

const plainTextTokens = token.shape({
  color: token.required<string>(),
  style: token.required<TextStyleName>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
});

export type PlainTextTokens = InferTokens<typeof plainTextTokens>;

// ============================================
// TYPES
// ============================================

/** Params for plainText component (empty — content is the body string). */
export type PlainTextParams = {};

// ============================================
// RENDER
// ============================================

function renderPlainText(
  _params: PlainTextParams,
  content: string,
  context: RenderContext,
  tokens: PlainTextTokens,
): ElementNode {
  const textStyle = context.theme.textStyles[tokens.style];

  return {
    type: NODE_TYPE.TEXT,
    content: [{ text: content }],
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
  content: schema.string(),
  directive: false,
  tokens: plainTextTokens,
  render: renderPlainText,
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
export function plainText(body: string, tokens: PlainTextTokens): ComponentNode {
  return component(Component.PlainText, {}, body, tokens);
}
