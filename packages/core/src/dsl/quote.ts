// Quote Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import { componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape } from '../core/registry.js';
import { stack, column, row } from './containers.js';
import { shape, image as imageNode, imageComponent } from './primitives.js';
import { prose, label, proseComponent, labelComponent } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import { HALIGN, VALIGN, SHAPE, SIZE } from '../core/types.js';
import { QUOTE_TOKEN } from '../core/types.js';
import type { QuoteTokens } from '../core/types.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

import { Component } from '../core/types.js';

// ============================================
// PARAMS SCHEMA
// ============================================

const quoteSchema = {
  /** Quote text (markdown supported). From directives, can come via body instead. */
  quote: proseComponent.schema.optional(),
  /** Attribution line, e.g. "— Jane Smith, CTO" */
  attribution: labelComponent.schema.optional(),
  /** Optional image/logo displayed above the quote */
  image: imageComponent.schema.optional(),
  /** Whether to show background (default: true) */
  background: schema.boolean().optional(),
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
 * stack(
 *   shape(background),
 *   column({ padding, gap, vAlign: MIDDLE },
 *     image?,         // Optional logo/image
 *     text(quote),
 *     text(attribution, { style: SMALL, hAlign: RIGHT })
 *   )
 * )
 * ```
 */
function expandQuote(props: QuoteProps & { body?: string }, context: ExpansionContext, tokens: QuoteTokens): SlideNode {
  const { quote: quoteText, body, attribution, image: imagePath, background = true, height: sizeHeight } = props;
  const actualQuote = quoteText ?? body;
  const {
    padding, cornerRadius, backgroundColor, backgroundOpacity,
    borderColor, borderWidth, quoteStyle, attributionStyle, gap,
  } = tokens;

  // Build content children: optional image, quote text, attribution
  const children: SlideNode[] = [];
  if (imagePath) {
    children.push(row({ hAlign: HALIGN.CENTER }, imageNode(imagePath)));
  }
  children.push(prose(actualQuote!, quoteStyle ? { style: quoteStyle } : undefined));
  if (attribution) {
    children.push(label(attribution, { style: attributionStyle, hAlign: HALIGN.RIGHT }));
  }

  const contentProps = { padding, gap, vAlign: VALIGN.MIDDLE };
  const outerHeight = sizeHeight ?? SIZE.FILL;

  // If no background, just return the content column directly
  if (background === false || backgroundColor === 'none') {
    return column({ ...contentProps, height: outerHeight }, ...children);
  }

  // Build background shape
  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: { color: backgroundColor, opacity: backgroundOpacity },
    border: { color: borderColor, width: borderWidth },
    cornerRadius,
  });

  // Content layer fills the stack so vAlign: MIDDLE centering works
  const contentLayer = column({ ...contentProps, height: SIZE.FILL }, ...children);
  return stack({ height: outerHeight }, backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const quoteComponent = componentRegistry.defineContent({
  name: Component.Quote,
  params: quoteSchema,
  tokens: [QUOTE_TOKEN.PADDING, QUOTE_TOKEN.CORNER_RADIUS, QUOTE_TOKEN.BACKGROUND_COLOR, QUOTE_TOKEN.BACKGROUND_OPACITY, QUOTE_TOKEN.BORDER_COLOR, QUOTE_TOKEN.BORDER_WIDTH, QUOTE_TOKEN.ATTRIBUTION_STYLE, QUOTE_TOKEN.GAP],
  expand: expandQuote,
});

/**
 * Create a quote card with optional image, quote text, and attribution.
 *
 * @example
 * ```typescript
 * quote({
 *   quote: '"This changed everything for us."',
 *   attribution: '— Jane Smith, CTO',
 *   image: 'logo.png',
 * })
 * ```
 */
export function quote(props: QuoteProps) {
  return component(Component.Quote, props);
}
