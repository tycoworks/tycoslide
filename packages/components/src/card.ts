// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

import {
  defineComponent, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SHAPE, SIZE, schema,
  type GapSize, type HorizontalAlignment, type VerticalAlignment,
} from 'tycoslide';
import { Component } from './names.js';
import { stack, column } from './containers.js';
import { shape, type ShapeTokens } from './primitives.js';
import { image, imageComponent } from './image.js';
import { text, textComponent, type TextTokens } from './text.js';

export const CARD_TOKEN = {
  BACKGROUND: 'background',
  PADDING: 'padding',
  GAP: 'gap',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
  TITLE: 'title',
  DESCRIPTION: 'description',
} as const;

export interface CardTokens {
  [CARD_TOKEN.BACKGROUND]: ShapeTokens;
  [CARD_TOKEN.PADDING]: number;
  [CARD_TOKEN.GAP]: GapSize;
  [CARD_TOKEN.HALIGN]: HorizontalAlignment;
  [CARD_TOKEN.VALIGN]: VerticalAlignment;
  [CARD_TOKEN.TITLE]: TextTokens;
  [CARD_TOKEN.DESCRIPTION]: TextTokens;
}

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
  /** Sizing: 'fill' to share parent space equally, 'hug' for content-sized (default) */
  height: schema.size().optional(),
} satisfies SchemaShape;

// ============================================
// TYPES
// ============================================

export type CardProps = InferProps<typeof cardSchema>;

// ============================================
// EXPANSION FUNCTION
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
function expandCard(props: CardProps & { body?: string }, context: ExpansionContext, tokens: CardTokens): SlideNode {
  const { image: imagePath, title, description, body, height: sizeHeight } = props;
  const actualDescription = description ?? body;
  const {
    background, padding, gap, hAlign: contentHAlign, vAlign: contentVAlign,
    title: titleTokens, description: descriptionTokens,
  } = tokens;

  // Build children from image/title/description props
  const children: SlideNode[] = [];

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
  const outerHeight = sizeHeight ?? SIZE.FILL;

  // Check background opacity from the ShapeTokens map
  if (background.fillOpacity === 0) {
    return column({ ...contentProps, height: outerHeight }, ...children);
  }

  // Build background rectangle using ShapeTokens directly
  const backgroundRect = shape(background, { shape: SHAPE.ROUND_RECT });

  // Stack: background behind, content in front
  // Content layer fills the stack so padding/alignment works consistently
  const contentLayer = column({ ...contentProps, height: SIZE.FILL }, ...children);
  return stack({ height: outerHeight }, backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const cardComponent = defineComponent({
  name: Component.Card,
  params: cardSchema,
  tokens: [CARD_TOKEN.BACKGROUND, CARD_TOKEN.PADDING, CARD_TOKEN.GAP, CARD_TOKEN.HALIGN, CARD_TOKEN.VALIGN, CARD_TOKEN.TITLE, CARD_TOKEN.DESCRIPTION],
  expand: expandCard,
});

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
