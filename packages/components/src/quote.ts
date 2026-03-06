// Quote Component
// Simple pull quote with left accent bar, quote text, and optional attribution.
// Expands to: row(line(bar), column(quote, attribution?))

import {
  defineComponent, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SIZE, schema, SYNTAX, extractSource,
  type GapSize,
} from 'tycoslide';
import type { RootContent } from 'mdast';
import { Component } from './names.js';
import { row, column } from './containers.js';
import { line, type LineTokens } from './primitives.js';
import { text, textComponent, type TextTokens } from './text.js';
import { plainText, type PlainTextTokens } from './plainText.js';

export const QUOTE_TOKEN = {
  BAR: 'bar',
  GAP: 'gap',
  QUOTE: 'quote',
  ATTRIBUTION: 'attribution',
} as const;

export interface QuoteTokens {
  [QUOTE_TOKEN.BAR]: LineTokens;
  [QUOTE_TOKEN.GAP]: GapSize;
  [QUOTE_TOKEN.QUOTE]: TextTokens;
  [QUOTE_TOKEN.ATTRIBUTION]: PlainTextTokens;
}

// ============================================
// PARAMS SCHEMA
// ============================================

const quoteSchema = {
  /** Quote text (markdown supported). From directives, can come via body instead. */
  quote: textComponent.schema.optional(),
  /** Attribution line, e.g. "— Jane Smith, CTO" */
  attribution: textComponent.schema.optional(),
  /** Named variant (resolved from theme.components.quote.variants) */
  variant: schema.string().optional(),
  /** Sizing: 'fill' to share parent space equally, 'hug' for content-sized (default) */
  height: schema.size().optional(),
} satisfies SchemaShape;

// ============================================
// TYPES
// ============================================

export type QuoteProps = InferProps<typeof quoteSchema>;

// ============================================
// EXPANSION FUNCTION
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
function expandQuote(props: QuoteProps & { body?: string }, _context: ExpansionContext, tokens: QuoteTokens): SlideNode {
  const { quote: quoteText, body, attribution, height: sizeHeight } = props;
  const actualQuote = quoteText ?? body;
  const {
    bar: barTokens, gap,
    quote: quoteTokens, attribution: attributionTokens,
  } = tokens;

  if (!actualQuote) {
    throw new Error(`[tycoslide] Quote component requires either a 'quote' attribute or body text.`);
  }

  // Build content children: quote text, optional attribution
  const children: SlideNode[] = [
    text(actualQuote, quoteTokens),
  ];
  if (attribution) {
    children.push(plainText(attribution, attributionTokens));
  }

  const outerHeight = sizeHeight ?? SIZE.HUG;

  return row(
    { gap, height: outerHeight },
    line(barTokens),
    column({ gap }, ...children),
  );
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const quoteComponent = defineComponent({
  name: Component.Quote,
  params: quoteSchema,
  tokens: [QUOTE_TOKEN.BAR, QUOTE_TOKEN.GAP, QUOTE_TOKEN.QUOTE, QUOTE_TOKEN.ATTRIBUTION],
  mdast: {
    nodeTypes: [SYNTAX.BLOCKQUOTE],
    compile: (node: RootContent, source: string) => {
      const raw = extractSource(node, source);
      // Strip leading `> ` or `>` from each line to get the inner content
      const inner = raw.replace(/^>\s?/gm, '').trim();
      return component(Component.Quote, { quote: inner });
    },
  },
  expand: expandQuote,
});

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
export function quote(props: QuoteProps) {
  return component(Component.Quote, props);
}
