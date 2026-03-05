// Quote Component
// Simple pull quote with left accent bar, quote text, and optional attribution.
// Expands to: row(line(bar), column(quote, attribution?))

import {
  defineComponent, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, CONTENT, SIZE, HALIGN, schema, SYNTAX, extractSource,
  type TextStyleName, type GapSize,
} from 'tycoslide';
import type { RootContent } from 'mdast';
import { Component } from './names.js';
import { row, column } from './containers.js';
import { line } from './primitives.js';
import { text, textComponent } from './text.js';

export const QUOTE_TOKEN = {
  BAR_COLOR: 'barColor',
  BAR_WIDTH: 'barWidth',
  QUOTE_STYLE: 'quoteStyle',
  QUOTE_COLOR: 'quoteColor',
  ATTRIBUTION_STYLE: 'attributionStyle',
  ATTRIBUTION_COLOR: 'attributionColor',
  GAP: 'gap',
} as const;

export interface QuoteTokens {
  [QUOTE_TOKEN.BAR_COLOR]: string;
  [QUOTE_TOKEN.BAR_WIDTH]: number;
  [QUOTE_TOKEN.QUOTE_STYLE]: TextStyleName;
  [QUOTE_TOKEN.QUOTE_COLOR]: string;
  [QUOTE_TOKEN.ATTRIBUTION_STYLE]: TextStyleName;
  [QUOTE_TOKEN.ATTRIBUTION_COLOR]: string;
  [QUOTE_TOKEN.GAP]: GapSize;
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
  const { barColor, barWidth, quoteStyle, quoteColor, attributionStyle, attributionColor, gap } = tokens;

  if (!actualQuote) {
    throw new Error(`[tycoslide] Quote component requires either a 'quote' attribute or body text.`);
  }

  // Build content children: quote text, optional attribution
  const children: SlideNode[] = [
    text(actualQuote, { content: CONTENT.RICH, style: quoteStyle, color: quoteColor }),
  ];
  if (attribution) {
    children.push(text(attribution, { content: CONTENT.PLAIN, style: attributionStyle, color: attributionColor, hAlign: HALIGN.LEFT }));
  }

  const outerHeight = sizeHeight ?? SIZE.HUG;

  return row(
    { gap, height: outerHeight },
    line({ color: barColor, width: barWidth }),
    column({ gap }, ...children),
  );
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const quoteComponent = defineComponent({
  name: Component.Quote,
  params: quoteSchema,
  tokens: [QUOTE_TOKEN.BAR_COLOR, QUOTE_TOKEN.BAR_WIDTH, QUOTE_TOKEN.QUOTE_STYLE, QUOTE_TOKEN.QUOTE_COLOR, QUOTE_TOKEN.ATTRIBUTION_STYLE, QUOTE_TOKEN.ATTRIBUTION_COLOR, QUOTE_TOKEN.GAP],
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
