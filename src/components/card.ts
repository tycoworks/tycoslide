// Card Component
// Implements card as a component using primitives: stack, column, rectangle, text, image

import { componentRegistry, type ExpansionContext, type ComponentNode } from '../core/component-registry.js';
import { stack, column, rectangle, text, image } from '../core/dsl.js';
import type { ElementNode } from '../core/nodes.js';
import type { TextStyleName, GapSize } from '../core/types.js';
import { TEXT_STYLE, GAP } from '../core/types.js';

// ============================================
// TYPES
// ============================================

export interface CardComponentProps {
  /** Card image (path) - displayed at top */
  image?: string;
  /** Icon image (path) - displayed at top (smaller than image) */
  icon?: string;
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
  /** Custom children - if provided, overrides image/title/description */
  children?: ElementNode[];
}

// ============================================
// COMPONENT DEFINITION
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
function expandCard(props: CardComponentProps, context: ExpansionContext): ElementNode {
  const {
    image: imagePath,
    icon,
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
    children: customChildren,
  } = props;

  const theme = context.theme;

  // Resolve padding and corner radius from theme
  const cardPadding = padding ?? theme.spacing.padding;
  const cardRadius = cornerRadius ?? theme.borders.radius;

  // Build children: either custom children or from image/title/description props
  let children: ElementNode[];

  if (customChildren && customChildren.length > 0) {
    children = customChildren;
  } else {
    children = [];

    if (imagePath) {
      children.push(image(imagePath));
    }

    if (icon) {
      children.push(image(icon));
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
  }

  // Build content layer
  const contentLayer = column({ padding: cardPadding, gap }, ...children);

  // If no background, just return the content
  if (background === false || backgroundColor === 'none') {
    return contentLayer;
  }

  // Build background rectangle
  const bgColor = backgroundColor ?? theme.colors.secondary;
  const bgOpacity = backgroundOpacity ?? theme.colors.subtleOpacity;
  const bgBorderColor = borderColor ?? theme.colors.secondary;
  const bgBorderWidth = borderWidth ?? theme.borders.width;

  const backgroundRect = rectangle({
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
// REGISTRATION
// ============================================

/**
 * Register the card component with the global registry.
 */
export function registerCardComponent(): void {
  if (!componentRegistry.has('card')) {
    componentRegistry.register({
      name: 'card',
      expand: expandCard,
    });
  }
}

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a card component node.
 *
 * @example
 * ```typescript
 * // Using convenience props
 * cardComponent({
 *   title: 'My Card',
 *   description: 'Card description text',
 *   backgroundColor: '#F0F0F0',
 * })
 *
 * // Using custom children
 * cardComponent({
 *   children: [h2('Custom Title'), body('Custom content')],
 * })
 * ```
 */
export function cardComponent(props: CardComponentProps): ComponentNode<CardComponentProps> {
  return {
    type: 'component',
    componentName: 'card',
    props,
  };
}

// Auto-register on import
registerCardComponent();
