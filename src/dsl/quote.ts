// Quote Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import { componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape } from '../core/registry.js';
import { stack, column, row } from './containers.js';
import { shape, image as imageNode, imageComponent } from './primitives.js';
import { prose, label, proseComponent, labelComponent } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import { TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE, SIZE } from '../core/types.js';
import type { TextStyleName, GapSize, Theme } from '../core/types.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

import { Component } from '../core/types.js';

// ============================================
// DESIGN TOKENS
// ============================================

export interface QuoteTokens {
  padding: number;
  cornerRadius: number;
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  quoteStyle?: TextStyleName;
  attributionStyle: TextStyleName;
  gap: GapSize;
}

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
} satisfies SchemaShape;

// ============================================
// TYPES
// ============================================

export type QuoteProps = InferProps<typeof quoteSchema>;

// ============================================
// EXPANSION FUNCTION
// ============================================

function quoteDefaults(theme: Theme): QuoteTokens {
  return {
    padding: theme.spacing.padding * 2,
    cornerRadius: theme.borders.radius,
    backgroundColor: theme.colors.secondary,
    backgroundOpacity: theme.colors.subtleOpacity,
    borderColor: theme.colors.secondary,
    borderWidth: theme.borders.width,
    attributionStyle: TEXT_STYLE.SMALL,
    gap: GAP.NORMAL,
  };
}

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
  const { quote: quoteText, body, attribution, image: imagePath, background = true } = props;
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

  const contentLayer = column(
    { padding, gap, vAlign: VALIGN.MIDDLE, height: SIZE.FILL },
    ...children,
  );

  // If no background, just return the content
  if (background === false || backgroundColor === 'none') {
    return contentLayer;
  }

  // Build background shape
  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: { color: backgroundColor, opacity: backgroundOpacity },
    border: { color: borderColor, width: borderWidth },
    cornerRadius,
  });

  return stack(backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const quoteComponent = componentRegistry.defineContent({
  name: Component.Quote,
  params: quoteSchema,
  defaults: quoteDefaults,
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
