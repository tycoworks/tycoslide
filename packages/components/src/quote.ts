// Quote Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import {
  componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SHAPE, SIZE, schema,
  type TextStyleName, type GapSize, type HorizontalAlignment, type VerticalAlignment,
} from 'tycoslide';
import { Component } from './names.js';
import { stack, column, row } from './containers.js';
import { shape } from './primitives.js';
import { image as imageNode, imageComponent } from './image.js';
import { prose, label, proseComponent, labelComponent } from './text.js';

export const QUOTE_TOKEN = {
  PADDING: 'padding',
  CORNER_RADIUS: 'cornerRadius',
  BACKGROUND_COLOR: 'backgroundColor',
  BACKGROUND_OPACITY: 'backgroundOpacity',
  BORDER_COLOR: 'borderColor',
  BORDER_WIDTH: 'borderWidth',
  QUOTE_STYLE: 'quoteStyle',
  QUOTE_COLOR: 'quoteColor',
  ATTRIBUTION_STYLE: 'attributionStyle',
  ATTRIBUTION_COLOR: 'attributionColor',
  ATTRIBUTION_HALIGN: 'attributionHAlign',
  GAP: 'gap',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
} as const;

export interface QuoteTokens {
  [QUOTE_TOKEN.PADDING]: number;
  [QUOTE_TOKEN.CORNER_RADIUS]: number;
  [QUOTE_TOKEN.BACKGROUND_COLOR]: string;
  [QUOTE_TOKEN.BACKGROUND_OPACITY]: number;
  [QUOTE_TOKEN.BORDER_COLOR]: string;
  [QUOTE_TOKEN.BORDER_WIDTH]: number;
  [QUOTE_TOKEN.QUOTE_STYLE]: TextStyleName;
  [QUOTE_TOKEN.QUOTE_COLOR]: string;
  [QUOTE_TOKEN.ATTRIBUTION_STYLE]: TextStyleName;
  [QUOTE_TOKEN.ATTRIBUTION_COLOR]: string;
  [QUOTE_TOKEN.ATTRIBUTION_HALIGN]: HorizontalAlignment;
  [QUOTE_TOKEN.GAP]: GapSize;
  [QUOTE_TOKEN.HALIGN]: HorizontalAlignment;
  [QUOTE_TOKEN.VALIGN]: VerticalAlignment;
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
  const { quote: quoteText, body, attribution, image: imagePath, height: sizeHeight } = props;
  const actualQuote = quoteText ?? body;
  const {
    padding, cornerRadius, backgroundColor, backgroundOpacity,
    borderColor, borderWidth, quoteStyle, quoteColor,
    attributionStyle, attributionColor, attributionHAlign,
    gap, hAlign: contentHAlign, vAlign: contentVAlign,
  } = tokens;

  // Build content children: optional image, quote text, attribution
  const children: SlideNode[] = [];
  if (imagePath) {
    children.push(row({ hAlign: contentHAlign }, imageNode(imagePath)));
  }
  if (!actualQuote) {
    throw new Error(`[tycoslide] Quote component requires either a 'quote' attribute or body text.`);
  }
  children.push(prose(actualQuote, { style: quoteStyle, color: quoteColor }));
  if (attribution) {
    children.push(label(attribution, { style: attributionStyle, color: attributionColor, hAlign: attributionHAlign }));
  }

  const contentProps = { padding, gap, hAlign: contentHAlign, vAlign: contentVAlign };
  const outerHeight = sizeHeight ?? SIZE.FILL;

  // If no background (opacity 0), just return the content column directly
  if (backgroundOpacity === 0) {
    return column({ ...contentProps, height: outerHeight }, ...children);
  }

  // Build background shape
  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: backgroundColor,
    fillOpacity: backgroundOpacity,
    borderColor,
    borderWidth,
    cornerRadius,
  });

  // Content layer fills the stack so vAlign: MIDDLE centering works
  const contentLayer = column({ ...contentProps, height: SIZE.FILL }, ...children);
  return stack({ height: outerHeight }, backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const quoteComponent = componentRegistry.define({
  name: Component.Quote,
  params: quoteSchema,
  tokens: [QUOTE_TOKEN.PADDING, QUOTE_TOKEN.CORNER_RADIUS, QUOTE_TOKEN.BACKGROUND_COLOR, QUOTE_TOKEN.BACKGROUND_OPACITY, QUOTE_TOKEN.BORDER_COLOR, QUOTE_TOKEN.BORDER_WIDTH, QUOTE_TOKEN.QUOTE_STYLE, QUOTE_TOKEN.QUOTE_COLOR, QUOTE_TOKEN.ATTRIBUTION_STYLE, QUOTE_TOKEN.ATTRIBUTION_COLOR, QUOTE_TOKEN.ATTRIBUTION_HALIGN, QUOTE_TOKEN.GAP, QUOTE_TOKEN.HALIGN, QUOTE_TOKEN.VALIGN],
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
