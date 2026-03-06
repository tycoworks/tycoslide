// PlainText Component
// DSL-only component — not reachable via :::directives in markdown.
// Handles plain (non-markdown) text with 3 tokens (no link tokens).
// Use this for eyebrows, attributions, labels, and other non-rich text.

import type { TextStyleName, HorizontalAlignment, VerticalAlignment, ExpansionContext } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { defineComponent, component, type ComponentNode } from 'tycoslide';
import { schema } from 'tycoslide';
import { Component } from './names.js';

export const PLAIN_TEXT_TOKEN = {
  COLOR: 'color',
  STYLE: 'style',
  LINE_HEIGHT_MULTIPLIER: 'lineHeightMultiplier',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
} as const;

export type PlainTextTokens = {
  color: string;
  style: TextStyleName;
  lineHeightMultiplier: number;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
};

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

function expandPlainText(props: PlainTextComponentProps, context: ExpansionContext, tokens: PlainTextTokens): ElementNode {
  const textStyle = context.theme.textStyles[tokens.style];
  const bulletIndentPt = textStyle.fontSize * context.theme.spacing.bulletIndentMultiplier;

  return {
    type: NODE_TYPE.TEXT,
    content: [{ text: props.body }],
    style: tokens.style,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeightMultiplier: tokens.lineHeightMultiplier,
    bulletIndentPt,
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
  tokens: Object.values(PLAIN_TEXT_TOKEN),
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
export function plainText(
  body: string,
  tokens: PlainTextTokens,
): ComponentNode<PlainTextComponentProps> {
  return component(Component.PlainText, { body }, tokens);
}
