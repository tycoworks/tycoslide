// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

import { componentRegistry, component, type ExpansionContext, type InferParams } from '../core/registry.js';
import { stack, column } from './containers.js';
import { shape, image, imageComponent } from './primitives.js';
import { markdown, text, markdownComponent, textComponent } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import { TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE, TEXT_STYLE_VALUES, GAP_VALUES, MARKDOWN } from '../core/types.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for card */
export const CARD_COMPONENT = 'card' as const;

// ============================================
// PARAMS SCHEMA
// ============================================

const cardParams = {
  /** Card image (path) - displayed at top */
  image: imageComponent.input.optional(),
  /** Card title text */
  title: textComponent.input.optional(),
  /** Text style for title */
  titleStyle: schema.enum(TEXT_STYLE_VALUES).optional(),
  /** Color for title */
  titleColor: schema.string().optional(),
  /** Card description text */
  description: markdownComponent.input.optional(),
  /** Text style for description */
  descriptionStyle: schema.enum(TEXT_STYLE_VALUES).optional(),
  /** Color for description */
  descriptionColor: schema.string().optional(),
  /** Whether to show background (default: true) */
  background: schema.boolean().optional(),
  /** Background color */
  backgroundColor: schema.string().optional(),
  /** Background opacity (0-100) */
  backgroundOpacity: schema.number().optional(),
  /** Border color */
  borderColor: schema.string().optional(),
  /** Border width in points */
  borderWidth: schema.number().optional(),
  /** Corner radius in inches */
  cornerRadius: schema.number().optional(),
  /** Internal padding in inches */
  padding: schema.number().optional(),
  /** Gap between children */
  gap: schema.enum(GAP_VALUES).optional(),
  /** Gap between title and description (defaults to gap) */
  textGap: schema.enum(GAP_VALUES).optional(),
};

// ============================================
// TYPES
// ============================================

export type CardParams = InferParams<typeof cardParams>;

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
function expandCard(props: CardParams, context: ExpansionContext): SlideNode {
  const {
    image: imagePath,
    title,
    titleStyle = TEXT_STYLE.H4,
    titleColor,
    description,
    descriptionStyle = TEXT_STYLE.SMALL,
    descriptionColor,
    background = true,
    backgroundColor,
    backgroundOpacity,
    borderColor,
    borderWidth,
    cornerRadius,
    padding,
    gap = GAP.TIGHT,
    textGap,
  } = props;

  const theme = context.theme;

  // Resolve padding and corner radius from theme
  const cardPadding = padding ?? theme.spacing.padding;
  const cardRadius = cornerRadius ?? theme.borders.radius;

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
  const contentLayer = column({ padding: cardPadding, gap: textGap ?? gap, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE }, ...children);

  // If no background, just return the content
  if (background === false || backgroundColor === 'none') {
    return contentLayer;
  }

  // Build background rectangle
  const bgColor = backgroundColor ?? theme.colors.secondary;
  const bgOpacity = backgroundOpacity ?? theme.colors.subtleOpacity;
  const bgBorderColor = borderColor ?? theme.colors.secondary;
  const bgBorderWidth = borderWidth ?? theme.borders.width;

  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: { color: bgColor, opacity: bgOpacity },
    border: {
      color: bgBorderColor,
      width: bgBorderWidth,
    },
    cornerRadius: cardRadius,
  });

  // Stack: background behind, content in front
  return stack(backgroundRect, contentLayer);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const cardComponent = componentRegistry.define({
  name: CARD_COMPONENT,
  params: cardParams,
  expand: expandCard,
  markdown: { type: MARKDOWN.BLOCK },
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
 *   backgroundColor: '#F0F0F0',
 * })
 * ```
 */
export function card(props: CardParams) {
  return component(CARD_COMPONENT, props);
}
