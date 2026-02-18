// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

import { componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape } from '../core/registry.js';
import { stack, column } from './containers.js';
import { shape, image, imageComponent } from './primitives.js';
import { markdown, text, markdownComponent, textComponent } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import { TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE } from '../core/types.js';
import type { TextStyleName, GapSize, Theme } from '../core/types.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

import { CARD_COMPONENT } from '../core/componentNames.js';
export { CARD_COMPONENT };

// ============================================
// DESIGN TOKENS
// ============================================

export interface CardTokens {
  padding: number;
  cornerRadius: number;
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  titleStyle: TextStyleName;
  titleColor?: string;
  descriptionStyle: TextStyleName;
  descriptionColor?: string;
  gap: GapSize;
  textGap?: GapSize;
}

// ============================================
// PARAMS SCHEMA
// ============================================

const cardSchema = {
  /** Card image (path) - displayed at top */
  image: imageComponent.input.optional(),
  /** Card title text */
  title: textComponent.input.optional(),
  /** Card description text */
  description: markdownComponent.input.optional(),
  /** Whether to show background (default: true) */
  background: schema.boolean().optional(),
  /** Named variant (resolved from theme.components.card.variants) */
  variant: schema.string().optional(),
} satisfies SchemaShape;

// ============================================
// TYPES
// ============================================

export type CardProps = InferProps<typeof cardSchema>;

// ============================================
// EXPANSION FUNCTION
// ============================================

function cardDefaults(theme: Theme): CardTokens {
  return {
    padding: theme.spacing.padding,
    cornerRadius: theme.borders.radius,
    backgroundColor: theme.colors.secondary,
    backgroundOpacity: theme.colors.subtleOpacity,
    borderColor: theme.colors.secondary,
    borderWidth: theme.borders.width,
    titleStyle: TEXT_STYLE.H4,
    descriptionStyle: TEXT_STYLE.SMALL,
    gap: GAP.TIGHT,
  };
}

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
function expandCard(props: CardProps, context: ExpansionContext, tokens: CardTokens): SlideNode {
  const { image: imagePath, title, description, background = true } = props;
  const {
    padding, cornerRadius, backgroundColor, backgroundOpacity,
    borderColor, borderWidth, titleStyle, titleColor,
    descriptionStyle, descriptionColor, gap, textGap,
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

  if (description) {
    children.push(markdown(description, {
      style: descriptionStyle,
      color: descriptionColor,
    }));
  }

  // Build content layer (centered both axes for balanced card appearance)
  const contentLayer = column({ padding, gap: textGap ?? gap, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE }, ...children);

  // If no background, just return the content
  if (background === false || backgroundColor === 'none') {
    return contentLayer;
  }

  // Build background rectangle
  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: { color: backgroundColor, opacity: backgroundOpacity },
    border: {
      color: borderColor,
      width: borderWidth,
    },
    cornerRadius,
  });

  // Stack: background behind, content in front
  return stack(backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const cardComponent = componentRegistry.define({
  name: CARD_COMPONENT,
  params: cardSchema,
  defaults: cardDefaults,
  expand: expandCard,
  directive: true,
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
  return component(CARD_COMPONENT, props);
}
