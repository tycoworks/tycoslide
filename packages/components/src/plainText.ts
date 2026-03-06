// PlainText Component
// DSL-only component — not reachable via :::directives in markdown.
// Handles plain (non-markdown) text with 3 tokens (no link tokens).
// Use this for eyebrows, attributions, labels, and other non-rich text.

import type { TextStyleName, HorizontalAlignment, VerticalAlignment, ExpansionContext } from 'tycoslide';
import { HALIGN, VALIGN } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { defineComponent, component, type ComponentNode } from 'tycoslide';
import { schema } from 'tycoslide';
import { Component } from './names.js';

export const PLAIN_TEXT_TOKEN = {
  COLOR: 'color',
  STYLE: 'style',
  LINE_HEIGHT_MULTIPLIER: 'lineHeightMultiplier',
} as const;

export type PlainTextTokens = {
  color: string;
  style: TextStyleName;
  lineHeightMultiplier: number;
};

// ============================================
// TYPES
// ============================================

/** Props accepted by the plainText() DSL function. */
export interface PlainTextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  lineHeightMultiplier?: number;
  variant?: string;
}

/** Full props including body content (used internally by expansion). */
export interface PlainTextComponentProps extends PlainTextProps {
  body: string;
}

// ============================================
// EXPAND
// ============================================

function expandPlainText(props: PlainTextComponentProps, context: ExpansionContext, tokens: PlainTextTokens): ElementNode {
  const resolvedStyle = props.style ?? tokens.style;
  const resolvedColor = props.color ?? tokens.color;
  const resolvedLineHeight = props.lineHeightMultiplier ?? tokens.lineHeightMultiplier;
  const textStyle = context.theme.textStyles[resolvedStyle];
  const bulletIndentPt = textStyle.fontSize * context.theme.spacing.bulletIndentMultiplier;

  return {
    type: NODE_TYPE.TEXT,
    content: [{ text: props.body }],
    style: resolvedStyle,
    resolvedStyle: textStyle,
    color: resolvedColor,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
    lineHeightMultiplier: resolvedLineHeight,
    bulletIndentPt,
    linkColor: resolvedColor,
    linkUnderline: false,
  };
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const plainTextComponent = defineComponent({
  name: Component.PlainText,
  body: schema.string(),
  params: {
    style: schema.textStyle().optional(),
    hAlign: schema.hAlign().optional(),
    vAlign: schema.vAlign().optional(),
    lineHeightMultiplier: schema.number().optional(),
    variant: schema.string().optional(),
  },
  directive: false,
  tokens: [
    PLAIN_TEXT_TOKEN.COLOR,
    PLAIN_TEXT_TOKEN.STYLE,
    PLAIN_TEXT_TOKEN.LINE_HEIGHT_MULTIPLIER,
  ],
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
 * plainText("ARCHITECTURE", { style: TEXT_STYLE.EYEBROW })
 * plainText("© 2024 Acme Corp", { style: TEXT_STYLE.CAPTION, color: '#888888' })
 * ```
 */
export function plainText(
  body: string,
  props?: PlainTextProps,
): ComponentNode<PlainTextComponentProps> {
  return component(Component.PlainText, { body, ...props });
}
