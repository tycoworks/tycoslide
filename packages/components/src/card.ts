// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

import {
  componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SHAPE, SIZE, CARD_TOKEN, type CardTokens, schema, Component,
} from 'tycoslide';
import { stack, column } from './containers.js';
import { shape, image, imageComponent } from './primitives.js';
import { text, prose, textComponent, proseComponent } from './text.js';

// ============================================
// PARAMS SCHEMA
// ============================================

const cardSchema = {
  /** Card image (path) - displayed at top */
  image: imageComponent.schema.optional(),
  /** Card title (supports markdown: bold, color highlights, etc.) */
  title: textComponent.schema.optional(),
  /** Card description text */
  description: proseComponent.schema.optional(),
  /** Named variant (resolved from theme.components.card.variants) */
  variant: schema.string().optional(),
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
    padding, cornerRadius, backgroundColor, backgroundOpacity,
    borderColor, borderWidth, titleStyle, titleColor,
    descriptionStyle, descriptionColor, textGap,
    hAlign: contentHAlign, vAlign: contentVAlign,
  } = tokens;

  // Build children from image/title/description props
  const children: SlideNode[] = [];

  if (imagePath) {
    children.push(image(imagePath));
  }

  if (title) {
    children.push(text(title, {
      style: titleStyle,
      color: titleColor,
    }));
  }

  if (actualDescription) {
    children.push(prose(actualDescription, {
      style: descriptionStyle,
      color: descriptionColor,
    }));
  }

  const contentProps = { padding, gap: textGap, hAlign: contentHAlign, vAlign: contentVAlign };
  const outerHeight = sizeHeight ?? SIZE.FILL;

  // If no background (opacity 0), just return the content column directly
  if (backgroundOpacity === 0) {
    return column({ ...contentProps, height: outerHeight }, ...children);
  }

  // Build background rectangle
  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: backgroundColor,
    fillOpacity: backgroundOpacity,
    borderColor,
    borderWidth,
    cornerRadius,
  });

  // Stack: background behind, content in front
  // Content layer fills the stack so padding/alignment works consistently
  const contentLayer = column({ ...contentProps, height: SIZE.FILL }, ...children);
  return stack({ height: outerHeight }, backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const cardComponent = componentRegistry.define({
  name: Component.Card,
  params: cardSchema,
  tokens: [CARD_TOKEN.PADDING, CARD_TOKEN.CORNER_RADIUS, CARD_TOKEN.BACKGROUND_COLOR, CARD_TOKEN.BACKGROUND_OPACITY, CARD_TOKEN.BORDER_COLOR, CARD_TOKEN.BORDER_WIDTH, CARD_TOKEN.TITLE_STYLE, CARD_TOKEN.TITLE_COLOR, CARD_TOKEN.DESCRIPTION_STYLE, CARD_TOKEN.DESCRIPTION_COLOR, CARD_TOKEN.GAP, CARD_TOKEN.TEXT_GAP, CARD_TOKEN.HALIGN, CARD_TOKEN.VALIGN],
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
export function card(props: CardProps) {
  return component(Component.Card, props);
}
