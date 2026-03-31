// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

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
} from "@tycoslide/core";
import { column, stack } from "./containers.js";
import { image, type ImageTokens, imageComponent } from "./image.js";
import { Component } from "./names.js";
import { type ShapeTokens, shape } from "./primitives.js";
import { type TextTokens, text, textComponent } from "./text.js";

// ============================================
// TOKENS
// ============================================

const cardTokens = token.shape({
  background: token.optional<ShapeTokens>(),
  padding: token.required<number>(),
  image: token.required<ImageTokens>(),
  spacing: token.required<number>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  title: token.required<TextTokens>(),
  description: token.required<TextTokens>(),
});
export type CardTokens = InferTokens<typeof cardTokens>;

// ============================================
// PARAMS
// ============================================

const cardParams = param.shape({
  image: param.optional(imageComponent.schema),
  title: param.optional(textComponent.schema),
  description: param.optional(textComponent.schema),
});
export type CardParams = InferParams<typeof cardParams>;

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Render card params into primitive node tree.
 *
 * Structure:
 * ```
 * stack(
 *   rectangle(background),  // Background layer (z-index 0)
 *   column({ padding, spacing }, ...children)  // Content layer (z-index 1)
 * )
 * ```
 */
export const cardComponent = defineComponent({
  name: Component.Card,
  content: schema.string().optional(),
  params: cardParams,
  tokens: cardTokens,
  render(params, content, _context, tokens) {
    const { image: imagePath, title, description } = params;
    const actualDescription = description ?? content;
    const {
      background,
      padding,
      image: imageTokens,
      spacing,
      hAlign: contentHAlign,
      vAlign: contentVAlign,
      title: titleTokens,
      description: descriptionTokens,
    } = tokens;

    // Build children from image/title/description params
    const children = [];

    if (imagePath) {
      children.push(image(imagePath, imageTokens));
    }

    if (title) {
      children.push(text(title, titleTokens));
    }

    if (actualDescription) {
      children.push(text(actualDescription, descriptionTokens));
    }

    const containerParams = { padding, spacing, hAlign: contentHAlign, vAlign: contentVAlign };
    const outerHeight = SIZE.FILL;

    // No background token — skip background shape
    if (!background) {
      return column({ ...containerParams, height: outerHeight }, ...children);
    }

    // Build background rectangle using ShapeTokens directly
    const backgroundRect = shape(background, { shape: SHAPE.RECTANGLE });

    // Stack: background behind, content in front
    // Content layer fills the stack so padding/alignment works consistently
    const contentLayer = column({ ...containerParams, height: SIZE.FILL }, ...children);
    return stack({ height: outerHeight }, backgroundRect, contentLayer);
  },
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a card component node.
 *
 * @example
 * ```typescript
 * card({
 *   image: 'assets/photo.png',
 *   title: 'My Card',
 *   description: 'Card description text',
 * })
 * ```
 */
export function card(params: CardParams, tokens: CardTokens) {
  return component(Component.Card, params, undefined, tokens);
}
