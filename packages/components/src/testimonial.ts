// Testimonial Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import {
  defineComponent, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SHAPE, SIZE, CONTENT, schema,
  type TextStyleName, type GapSize, type HorizontalAlignment, type VerticalAlignment,
} from 'tycoslide';
import { Component } from './names.js';
import { stack, column, row } from './containers.js';
import { shape } from './primitives.js';
import { image as imageNode, imageComponent } from './image.js';
import { text, textComponent } from './text.js';

export const TESTIMONIAL_TOKEN = {
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

export interface TestimonialTokens {
  [TESTIMONIAL_TOKEN.PADDING]: number;
  [TESTIMONIAL_TOKEN.CORNER_RADIUS]: number;
  [TESTIMONIAL_TOKEN.BACKGROUND_COLOR]: string;
  [TESTIMONIAL_TOKEN.BACKGROUND_OPACITY]: number;
  [TESTIMONIAL_TOKEN.BORDER_COLOR]: string;
  [TESTIMONIAL_TOKEN.BORDER_WIDTH]: number;
  [TESTIMONIAL_TOKEN.QUOTE_STYLE]: TextStyleName;
  [TESTIMONIAL_TOKEN.QUOTE_COLOR]: string;
  [TESTIMONIAL_TOKEN.ATTRIBUTION_STYLE]: TextStyleName;
  [TESTIMONIAL_TOKEN.ATTRIBUTION_COLOR]: string;
  [TESTIMONIAL_TOKEN.ATTRIBUTION_HALIGN]: HorizontalAlignment;
  [TESTIMONIAL_TOKEN.GAP]: GapSize;
  [TESTIMONIAL_TOKEN.HALIGN]: HorizontalAlignment;
  [TESTIMONIAL_TOKEN.VALIGN]: VerticalAlignment;
}

// ============================================
// PARAMS SCHEMA
// ============================================

const testimonialSchema = {
  /** Quote text (markdown supported). From directives, can come via body instead. */
  quote: textComponent.schema.optional(),
  /** Attribution line, e.g. "— Jane Smith, CTO" */
  attribution: textComponent.schema.optional(),
  /** Optional image/logo displayed above the quote */
  image: imageComponent.schema.optional(),
  /** Named variant (resolved from theme.components.testimonial.variants) */
  variant: schema.string().optional(),
  /** Sizing: 'fill' to share parent space equally, 'hug' for content-sized (default) */
  height: schema.size().optional(),
} satisfies SchemaShape;

// ============================================
// TYPES
// ============================================

export type TestimonialProps = InferProps<typeof testimonialSchema>;

// ============================================
// EXPANSION FUNCTION
// ============================================

/**
 * Expand testimonial params into primitive node tree.
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
function expandTestimonial(props: TestimonialProps & { body?: string }, context: ExpansionContext, tokens: TestimonialTokens): SlideNode {
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
    throw new Error(`[tycoslide] Testimonial component requires either a 'quote' attribute or body text.`);
  }
  children.push(text(actualQuote, { content: CONTENT.RICH, style: quoteStyle, color: quoteColor }));
  if (attribution) {
    children.push(text(attribution, { content: CONTENT.PLAIN, style: attributionStyle, color: attributionColor, hAlign: attributionHAlign }));
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

export const testimonialComponent = defineComponent({
  name: Component.Testimonial,
  params: testimonialSchema,
  tokens: [TESTIMONIAL_TOKEN.PADDING, TESTIMONIAL_TOKEN.CORNER_RADIUS, TESTIMONIAL_TOKEN.BACKGROUND_COLOR, TESTIMONIAL_TOKEN.BACKGROUND_OPACITY, TESTIMONIAL_TOKEN.BORDER_COLOR, TESTIMONIAL_TOKEN.BORDER_WIDTH, TESTIMONIAL_TOKEN.QUOTE_STYLE, TESTIMONIAL_TOKEN.QUOTE_COLOR, TESTIMONIAL_TOKEN.ATTRIBUTION_STYLE, TESTIMONIAL_TOKEN.ATTRIBUTION_COLOR, TESTIMONIAL_TOKEN.ATTRIBUTION_HALIGN, TESTIMONIAL_TOKEN.GAP, TESTIMONIAL_TOKEN.HALIGN, TESTIMONIAL_TOKEN.VALIGN],
  expand: expandTestimonial,
});

/**
 * Create a testimonial card with optional image, quote text, and attribution.
 *
 * @example
 * ```typescript
 * testimonial({
 *   quote: '"This changed everything for us."',
 *   attribution: '— Jane Smith, CTO',
 *   image: 'logo.png',
 * })
 * ```
 */
export function testimonial(props: TestimonialProps) {
  return component(Component.Testimonial, props);
}
