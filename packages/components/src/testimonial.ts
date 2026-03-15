// Testimonial Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import {
  type ComponentProps,
  component,
  defineComponent,
  type GapSize,
  type HorizontalAlignment,
  type SchemaShape,
  SHAPE,
  SIZE,
  token,
  type VerticalAlignment,
} from "tycoslide";
import { column, row, stack } from "./containers.js";
import { imageComponent, image as imageNode } from "./image.js";
import { Component } from "./names.js";
import { type PlainTextTokens, plainText } from "./plainText.js";
import { type ShapeTokens, shape } from "./primitives.js";
import { type TextTokens, text, textComponent } from "./text.js";

export const TESTIMONIAL_TOKEN = {
  BACKGROUND: "background",
  PADDING: "padding",
  GAP: "gap",
  HALIGN: "hAlign",
  VALIGN: "vAlign",
  QUOTE: "quote",
  ATTRIBUTION: "attribution",
} as const;

export type TestimonialTokens = {
  [TESTIMONIAL_TOKEN.BACKGROUND]?: ShapeTokens;
  [TESTIMONIAL_TOKEN.PADDING]: number;
  [TESTIMONIAL_TOKEN.GAP]: GapSize;
  [TESTIMONIAL_TOKEN.HALIGN]: HorizontalAlignment;
  [TESTIMONIAL_TOKEN.VALIGN]: VerticalAlignment;
  [TESTIMONIAL_TOKEN.QUOTE]: TextTokens;
  [TESTIMONIAL_TOKEN.ATTRIBUTION]: PlainTextTokens;
};

export const TESTIMONIAL_TOKEN_SPEC = token.spec(TESTIMONIAL_TOKEN, {
  optional: [TESTIMONIAL_TOKEN.BACKGROUND],
});

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
} satisfies SchemaShape;

// ============================================
// COMPONENT DEFINITION
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
export const testimonialComponent = defineComponent({
  name: Component.Testimonial,
  params: testimonialSchema,
  tokens: TESTIMONIAL_TOKEN_SPEC,
  expand(props, _context, tokens: TestimonialTokens) {
    const { quote: quoteText, body, attribution, image: imagePath } = props;
    const actualQuote = quoteText ?? body;
    const {
      background,
      padding,
      gap,
      hAlign: contentHAlign,
      vAlign: contentVAlign,
      quote: quoteTokens,
      attribution: attributionTokens,
    } = tokens;

    // Build content children: optional image, quote text, attribution
    const children = [];
    if (imagePath) {
      children.push(row({ hAlign: contentHAlign, height: SIZE.FILL }, imageNode(imagePath)));
    }
    if (!actualQuote) {
      throw new Error(`[tycoslide] Testimonial component requires either a 'quote' attribute or body text.`);
    }
    children.push(text(actualQuote, quoteTokens));
    if (attribution) {
      children.push(plainText(attribution, attributionTokens));
    }

    const contentProps = { padding, gap, hAlign: contentHAlign, vAlign: contentVAlign };
    const outerHeight = SIZE.FILL;

    // No background token — skip background shape
    if (!background) {
      return column({ ...contentProps, height: outerHeight }, ...children);
    }

    // Build background rectangle using ShapeTokens directly
    const backgroundRect = shape(background, { shape: SHAPE.ROUND_RECT });

    // Content layer fills the stack so vAlign: MIDDLE centering works
    const contentLayer = column({ ...contentProps, height: SIZE.FILL }, ...children);
    return stack({ height: outerHeight }, backgroundRect, contentLayer);
  },
});

// ============================================
// DSL FUNCTION
// ============================================

export type TestimonialProps = ComponentProps<typeof testimonialComponent>;

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
export function testimonial(props: TestimonialProps, tokens: TestimonialTokens) {
  return component(Component.Testimonial, props, tokens);
}
