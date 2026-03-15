// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

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
import { column, stack } from "./containers.js";
import { image, imageComponent } from "./image.js";
import { Component } from "./names.js";
import { type ShapeTokens, shape } from "./primitives.js";
import { type TextTokens, text, textComponent } from "./text.js";

export const CARD_TOKEN = {
  BACKGROUND: "background",
  PADDING: "padding",
  GAP: "gap",
  HALIGN: "hAlign",
  VALIGN: "vAlign",
  TITLE: "title",
  DESCRIPTION: "description",
} as const;

export type CardTokens = {
  [CARD_TOKEN.BACKGROUND]?: ShapeTokens;
  [CARD_TOKEN.PADDING]: number;
  [CARD_TOKEN.GAP]: GapSize;
  [CARD_TOKEN.HALIGN]: HorizontalAlignment;
  [CARD_TOKEN.VALIGN]: VerticalAlignment;
  [CARD_TOKEN.TITLE]: TextTokens;
  [CARD_TOKEN.DESCRIPTION]: TextTokens;
};

export const CARD_TOKEN_SPEC = token.spec(CARD_TOKEN, {
  optional: [CARD_TOKEN.BACKGROUND],
});

// ============================================
// PARAMS SCHEMA
// ============================================

const cardSchema = {
  /** Card image (path) - displayed at top */
  image: imageComponent.schema.optional(),
  /** Card title (supports markdown: bold, color highlights, etc.) */
  title: textComponent.schema.optional(),
  /** Card description text */
  description: textComponent.schema.optional(),
} satisfies SchemaShape;

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Expand card params into primitive node tree.
 *
 * Structure:
 * ```
 * stack(
 *   rectangle(background),  // Background layer (z-index 0)
 *   column({ padding, gap }, ...children)  // Content layer (z-index 1)
 * )
 * ```
 */
export const cardComponent = defineComponent({
  name: Component.Card,
  params: cardSchema,
  tokens: CARD_TOKEN_SPEC,
  expand(props, _context, tokens: CardTokens) {
    const { image: imagePath, title, description, body } = props;
    const actualDescription = description ?? body;
    const {
      background,
      padding,
      gap,
      hAlign: contentHAlign,
      vAlign: contentVAlign,
      title: titleTokens,
      description: descriptionTokens,
    } = tokens;

    // Build children from image/title/description props
    const children = [];

    if (imagePath) {
      children.push(image(imagePath));
    }

    if (title) {
      children.push(text(title, titleTokens));
    }

    if (actualDescription) {
      children.push(text(actualDescription, descriptionTokens));
    }

    const contentProps = { padding, gap, hAlign: contentHAlign, vAlign: contentVAlign };
    const outerHeight = SIZE.FILL;

    // No background token — skip background shape
    if (!background) {
      return column({ ...contentProps, height: outerHeight }, ...children);
    }

    // Build background rectangle using ShapeTokens directly
    const backgroundRect = shape(background, { shape: SHAPE.ROUND_RECT });

    // Stack: background behind, content in front
    // Content layer fills the stack so padding/alignment works consistently
    const contentLayer = column({ ...contentProps, height: SIZE.FILL }, ...children);
    return stack({ height: outerHeight }, backgroundRect, contentLayer);
  },
});

// ============================================
// DSL FUNCTION
// ============================================

export type CardProps = ComponentProps<typeof cardComponent>;

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
export function card(props: CardProps, tokens: CardTokens) {
  return component(Component.Card, props, tokens);
}
