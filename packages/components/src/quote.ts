// Quote Component
// Simple pull quote with left accent bar, quote text, and optional attribution.
// Expands to: row(line(bar), column(quote, attribution?))

import type { RootContent } from "mdast";
import {
  type ComponentProps,
  component,
  defineComponent,
  extractSource,
  type GapSize,
  type SchemaShape,
  SIZE,
  SYNTAX,
  token,
} from "tycoslide";
import { column, row } from "./containers.js";
import { Component } from "./names.js";
import { type PlainTextTokens, plainText } from "./plainText.js";
import { type LineTokens, line } from "./primitives.js";
import { type TextTokens, text, textComponent } from "./text.js";

export const QUOTE_TOKEN = {
  BAR: "bar",
  GAP: "gap",
  QUOTE: "quote",
  ATTRIBUTION: "attribution",
} as const;

export type QuoteTokens = {
  [QUOTE_TOKEN.BAR]: LineTokens;
  [QUOTE_TOKEN.GAP]: GapSize;
  [QUOTE_TOKEN.QUOTE]: TextTokens;
  [QUOTE_TOKEN.ATTRIBUTION]: PlainTextTokens;
};

export const QUOTE_TOKEN_SPEC = token.allRequired(QUOTE_TOKEN);

// ============================================
// PARAMS SCHEMA
// ============================================

const quoteSchema = {
  /** Quote text (markdown supported). From directives, can come via body instead. */
  quote: textComponent.schema.optional(),
  /** Attribution line, e.g. "— Jane Smith, CTO" */
  attribution: textComponent.schema.optional(),
} satisfies SchemaShape;

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Expand quote params into primitive node tree.
 *
 * Structure:
 * ```
 * row({ gap },
 *   line({ color, width }),   // vertical accent bar
 *   column({ gap },
 *     text(quote),
 *     text(attribution)?
 *   )
 * )
 * ```
 */
export const quoteComponent = defineComponent({
  name: Component.Quote,
  params: quoteSchema,
  tokens: QUOTE_TOKEN_SPEC,
  mdast: {
    nodeTypes: [SYNTAX.BLOCKQUOTE],
    compile: (node: RootContent, source: string) => {
      const raw = extractSource(node, source);
      // Strip leading `> ` or `>` from each line to get the inner content
      const inner = raw.replace(/^>\s?/gm, "").trim();
      return component(Component.Quote, { quote: inner });
    },
  },
  expand(props, _context, tokens: QuoteTokens) {
    const { quote: quoteText, body, attribution } = props;
    const actualQuote = quoteText ?? body;
    const { bar: barTokens, gap, quote: quoteTokens, attribution: attributionTokens } = tokens;

    if (!actualQuote) {
      throw new Error(`[tycoslide] Quote component requires either a 'quote' attribute or body text.`);
    }

    // Build content children: quote text, optional attribution
    const children = [text(actualQuote, quoteTokens)];
    if (attribution) {
      children.push(plainText(attribution, attributionTokens));
    }

    const outerHeight = SIZE.HUG;

    return row({ gap, height: outerHeight }, line(barTokens), column({ gap }, ...children));
  },
});

// ============================================
// DSL FUNCTION
// ============================================

export type QuoteProps = ComponentProps<typeof quoteComponent>;

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
export function quote(props: QuoteProps, tokens: QuoteTokens) {
  return component(Component.Quote, props, tokens);
}
