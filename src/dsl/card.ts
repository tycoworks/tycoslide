// Card Component
// Implements card as a component using primitives: stack, column, shape, text, image

import { defineComponent, type ExpansionContext } from '../core/registry.js';
import { stack, column } from './containers.js';
import { shape, image } from './primitives.js';
import { text } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import type { TextStyleName, GapSize } from '../core/types.js';
import { TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE } from '../core/types.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for card */
export const CARD_COMPONENT = 'card' as const;

// ============================================
// TYPES
// ============================================

export interface CardProps {
  /** Card image (path) - displayed at top */
  image?: string;
  /** Card title text */
  title?: string;
  /** Text style for title */
  titleStyle?: TextStyleName;
  /** Color for title */
  titleColor?: string;
  /** Card description text */
  description?: string;
  /** Text style for description */
  descriptionStyle?: TextStyleName;
  /** Color for description */
  descriptionColor?: string;
  /** Whether to show background (default: true) */
  background?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Background opacity (0-100) */
  backgroundOpacity?: number;
  /** Border color */
  borderColor?: string;
  /** Border width in points */
  borderWidth?: number;
  /** Corner radius in inches */
  cornerRadius?: number;
  /** Internal padding in inches */
  padding?: number;
  /** Gap between children */
  gap?: GapSize;
}

// ============================================
// EXPANSION FUNCTION
// ============================================

/**
 * Expand card props into primitive node tree.
 *
 * Structure:
 * ```
 * stack(
 *   rectangle(background),  // Background layer (z-index 0)
 *   column({ padding, gap }, ...children)  // Content layer (z-index 1)
 * )
 * ```
 */
function expandCard(props: CardProps, context: ExpansionContext): SlideNode {
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
    children.push(text(description, {
      style: descriptionStyle,
      color: descriptionColor,
    }));
  }

  // Build content layer (centered both axes for balanced card appearance)
  const contentLayer = column({ padding: cardPadding, gap, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE }, ...children);

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
// COMPONENT REGISTRATION & DSL
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
 *   backgroundColor: '#F0F0F0',
 * })
 * ```
 */
export const card = defineComponent<CardProps>(CARD_COMPONENT, expandCard);
