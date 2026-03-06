// Testimonial Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import {
  defineComponent, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SHAPE, SIZE, schema,
  type GapSize, type HorizontalAlignment, type VerticalAlignment,
} from 'tycoslide';
import { Component } from './names.js';
import { stack, column, row } from './containers.js';
import { shape, type ShapeTokens } from './primitives.js';
import { image as imageNode, imageComponent } from './image.js';
import { text, textComponent, type TextTokens } from './text.js';
import { plainText, type PlainTextTokens } from './plainText.js';

export const TESTIMONIAL_TOKEN = {
  BACKGROUND: 'background',
  PADDING: 'padding',
  GAP: 'gap',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
  QUOTE: 'quote',
  ATTRIBUTION: 'attribution',
} as const;

export interface TestimonialTokens {
  [TESTIMONIAL_TOKEN.BACKGROUND]: ShapeTokens;
  [TESTIMONIAL_TOKEN.PADDING]: number;
  [TESTIMONIAL_TOKEN.GAP]: GapSize;
  [TESTIMONIAL_TOKEN.HALIGN]: HorizontalAlignment;
  [TESTIMONIAL_TOKEN.VALIGN]: VerticalAlignment;
  [TESTIMONIAL_TOKEN.QUOTE]: TextTokens;
  [TESTIMONIAL_TOKEN.ATTRIBUTION]: PlainTextTokens;
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
    background, padding, gap, hAlign: contentHAlign, vAlign: contentVAlign,
    quote: quoteTokens, attribution: attributionTokens,
  } = tokens;

  // Build content children: optional image, quote text, attribution
  const children: SlideNode[] = [];
  if (imagePath) {
    children.push(row({ hAlign: contentHAlign }, imageNode(imagePath)));
  }
  if (!actualQuote) {
    throw new Error(`[tycoslide] Testimonial component requires either a 'quote' attribute or body text.`);
  }
  children.push(text(actualQuote, quoteTokens));
  if (attribution) {
    children.push(plainText(attribution, attributionTokens));
  }

  const contentProps = { padding, gap, hAlign: contentHAlign, vAlign: contentVAlign };
  const outerHeight = sizeHeight ?? SIZE.FILL;

  // Check background opacity from the ShapeTokens map
  if (background.fillOpacity === 0) {
    return column({ ...contentProps, height: outerHeight }, ...children);
  }

  // Build background rectangle using ShapeTokens directly
  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    ...background,
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
  tokens: [TESTIMONIAL_TOKEN.BACKGROUND, TESTIMONIAL_TOKEN.PADDING, TESTIMONIAL_TOKEN.GAP, TESTIMONIAL_TOKEN.HALIGN, TESTIMONIAL_TOKEN.VALIGN, TESTIMONIAL_TOKEN.QUOTE, TESTIMONIAL_TOKEN.ATTRIBUTION],
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
