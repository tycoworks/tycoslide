// Testimonial Component
// Card with optional image, quote text, and attribution.
// Renders to: stack(shape(background), column(image?, quote, attribution))

import {
  component,
  defineComponent,
  type HorizontalAlignment,
  type InferParams,
  type InferTokens,
  param,
  SHAPE,
  SIZE,
  schema,
  token,
  type VerticalAlignment,
} from "@tycoworks/tycoslide";
import { column, row, stack } from "./containers.js";
import { imageComponent, image as imageNode } from "./image.js";
import { type LabelTokens, label } from "./label.js";
import { Component } from "./names.js";
import { type ShapeTokens, shape } from "./primitives.js";
import { type TextTokens, text, textComponent } from "./text.js";

// ============================================
// TOKENS
// ============================================

const testimonialTokens = token.shape({
  background: token.optional<ShapeTokens>(),
  padding: token.required<number>(),
  spacing: token.required<number>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  quote: token.required<TextTokens>(),
  attribution: token.required<LabelTokens>(),
});
export type TestimonialTokens = InferTokens<typeof testimonialTokens>;

// ============================================
// PARAMS
// ============================================

const testimonialParams = param.shape({
  quote: param.optional(textComponent.schema),
  attribution: param.optional(textComponent.schema),
  image: param.optional(imageComponent.schema),
});
export type TestimonialParams = InferParams<typeof testimonialParams>;

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Render testimonial params into primitive node tree.
 *
 * Structure:
 * ```
 * stack(
 *   shape(background),
 *   column({ padding, spacing, vAlign: MIDDLE },
 *     image?,         // Optional logo/image
 *     text(quote),
 *     text(attribution, { style: SMALL, hAlign: RIGHT })
 *   )
 * )
 * ```
 */
export const testimonialComponent = defineComponent({
  name: Component.Testimonial,
  content: schema.string().optional(),
  params: testimonialParams,
  tokens: testimonialTokens,
  render(params, content, _context, tokens) {
    const { quote: quoteText, attribution, image: imagePath } = params;
    const actualQuote = quoteText ?? content;
    const {
      background,
      padding,
      spacing,
      hAlign: contentHAlign,
      vAlign: contentVAlign,
      quote: quoteTokens,
      attribution: attributionTokens,
    } = tokens;

    // Build content children: optional image, quote text, attribution
    const children = [];
    if (imagePath) {
      children.push(row({ spacing: 0, hAlign: contentHAlign, height: SIZE.FILL }, imageNode(imagePath)));
    }
    if (!actualQuote) {
      throw new Error(`Testimonial component requires either a 'quote' attribute or body text.`);
    }
    children.push(text(actualQuote, quoteTokens));
    if (attribution) {
      children.push(label(attribution, attributionTokens));
    }

    const containerParams = { padding, spacing, hAlign: contentHAlign, vAlign: contentVAlign };
    const outerHeight = SIZE.FILL;

    // No background token — skip background shape
    if (!background) {
      return column({ ...containerParams, height: outerHeight }, ...children);
    }

    // Build background rectangle using ShapeTokens directly
    const backgroundRect = shape(background, { shape: SHAPE.RECTANGLE });

    // Content layer fills the stack so vAlign: MIDDLE centering works
    const contentLayer = column({ ...containerParams, height: SIZE.FILL }, ...children);
    return stack({ height: outerHeight }, backgroundRect, contentLayer);
  },
});

// ============================================
// DSL FUNCTION
// ============================================

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
export function testimonial(params: TestimonialParams, tokens: TestimonialTokens) {
  return component(Component.Testimonial, params, undefined, tokens);
}
