// Quote Component
// Simple pull quote with left accent bar, quote text, and optional attribution.
// Renders to: row(line(bar), column(quote, attribution?))

import {
  component,
  defineComponent,
  extractSource,
  type InferParams,
  type InferTokens,
  param,
  SIZE,
  SYNTAX,
  schema,
  token,
} from "@tycoworks/tycoslide";
import type { RootContent } from "mdast";
import { column, row } from "./containers.js";
import { type LabelTokens, label } from "./label.js";
import { Component } from "./names.js";
import { type LineTokens, line } from "./primitives.js";
import { type TextTokens, text, textComponent } from "./text.js";

// ============================================
// TOKENS
// ============================================

const quoteTokens = token.shape({
  bar: token.required<LineTokens>(),
  spacing: token.required<number>(),
  quote: token.required<TextTokens>(),
  attribution: token.required<LabelTokens>(),
});
export type QuoteTokens = InferTokens<typeof quoteTokens>;

// ============================================
// PARAMS
// ============================================

const quoteParams = param.shape({
  quote: param.optional(textComponent.schema),
  attribution: param.optional(textComponent.schema),
});
export type QuoteParams = InferParams<typeof quoteParams>;

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Render quote params into primitive node tree.
 *
 * Structure:
 * ```
 * row({ spacing },
 *   line({ color, width }),   // vertical accent bar
 *   column({ spacing },
 *     text(quote),
 *     text(attribution)?
 *   )
 * )
 * ```
 */
export const quoteComponent = defineComponent({
  name: Component.Quote,
  content: schema.string().optional(),
  params: quoteParams,
  tokens: quoteTokens,
  mdast: {
    nodeTypes: [SYNTAX.BLOCKQUOTE],
    compile: (node: RootContent, source: string) => {
      const raw = extractSource(node, source);
      // Strip leading `> ` or `>` from each line to get the inner content
      const inner = raw.replace(/^>\s?/gm, "").trim();
      return component(Component.Quote, { quote: inner });
    },
  },
  render(params, content, _context, tokens) {
    const { quote: quoteText, attribution } = params;
    const actualQuote = quoteText ?? content;
    const { bar: barTokens, spacing, quote: quoteTokens, attribution: attributionTokens } = tokens;

    if (!actualQuote) {
      throw new Error(`Quote component requires either a 'quote' attribute or body text.`);
    }

    // Build content children: quote text, optional attribution
    const children = [text(actualQuote, quoteTokens)];
    if (attribution) {
      children.push(label(attribution, attributionTokens));
    }

    const outerHeight = SIZE.HUG;

    return row({ spacing, height: outerHeight }, line(barTokens, "column"), column({ spacing }, ...children));
  },
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a pull quote with left accent bar, quote text, and optional attribution.
 *
 * @example
 * ```typescript
 * quote({
 *   quote: '"The best way to predict the future is to invent it."',
 *   attribution: '— Alan Kay',
 * })
 * ```
 */
export function quote(params: QuoteParams, tokens: QuoteTokens) {
  return component(Component.Quote, params, undefined, tokens);
}
