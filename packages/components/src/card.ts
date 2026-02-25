// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

import {
  componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape,
  type SlideNode, SHAPE, SIZE, CONTENT, schema,
  type TextStyleName, type GapSize, type HorizontalAlignment, type VerticalAlignment,
} from 'tycoslide';
import { Component } from './names.js';
import { stack, column } from './containers.js';
import { shape } from './primitives.js';
import { image, imageComponent } from './image.js';
import { text, textComponent } from './text.js';

export const CARD_TOKEN = {
  PADDING: 'padding',
  CORNER_RADIUS: 'cornerRadius',
  BACKGROUND_COLOR: 'backgroundColor',
  BACKGROUND_OPACITY: 'backgroundOpacity',
  BORDER_COLOR: 'borderColor',
  BORDER_WIDTH: 'borderWidth',
  TITLE_STYLE: 'titleStyle',
  TITLE_COLOR: 'titleColor',
  DESCRIPTION_STYLE: 'descriptionStyle',
  DESCRIPTION_COLOR: 'descriptionColor',
  GAP: 'gap',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
} as const;

export interface CardTokens {
  [CARD_TOKEN.PADDING]: number;
  [CARD_TOKEN.CORNER_RADIUS]: number;
  [CARD_TOKEN.BACKGROUND_COLOR]: string;
  [CARD_TOKEN.BACKGROUND_OPACITY]: number;
  [CARD_TOKEN.BORDER_COLOR]: string;
  [CARD_TOKEN.BORDER_WIDTH]: number;
  [CARD_TOKEN.TITLE_STYLE]: TextStyleName;
  [CARD_TOKEN.TITLE_COLOR]: string;
  [CARD_TOKEN.DESCRIPTION_STYLE]: TextStyleName;
  [CARD_TOKEN.DESCRIPTION_COLOR]: string;
  [CARD_TOKEN.GAP]: GapSize;
  [CARD_TOKEN.HALIGN]: HorizontalAlignment;
  [CARD_TOKEN.VALIGN]: VerticalAlignment;
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
    descriptionStyle, descriptionColor, gap,
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
    children.push(text(actualDescription, {
      content: CONTENT.PROSE,
      style: descriptionStyle,
      color: descriptionColor,
    }));
  }

  const contentProps = { padding, gap, hAlign: contentHAlign, vAlign: contentVAlign };
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
  tokens: [CARD_TOKEN.PADDING, CARD_TOKEN.CORNER_RADIUS, CARD_TOKEN.BACKGROUND_COLOR, CARD_TOKEN.BACKGROUND_OPACITY, CARD_TOKEN.BORDER_COLOR, CARD_TOKEN.BORDER_WIDTH, CARD_TOKEN.TITLE_STYLE, CARD_TOKEN.TITLE_COLOR, CARD_TOKEN.DESCRIPTION_STYLE, CARD_TOKEN.DESCRIPTION_COLOR, CARD_TOKEN.GAP, CARD_TOKEN.HALIGN, CARD_TOKEN.VALIGN],
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
