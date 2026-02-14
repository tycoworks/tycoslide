// Quote Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import { componentRegistry, component, type ExpansionContext } from '../core/registry.js';
import { stack, column } from './containers.js';
import { shape } from './primitives.js';
import { image as imageNode } from './primitives.js';
import { text, plainText } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import type { TextStyleName, GapSize } from '../core/types.js';
import { TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE, SIZE } from '../core/types.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for quote */
export const QUOTE_COMPONENT = 'quote' as const;

// ============================================
// TYPES
// ============================================

export interface QuoteProps {
  /** Quote text (markdown supported) */
  quote: string;
  /** Attribution line, e.g. "— Jane Smith, CTO" */
  attribution?: string;
  /** Optional image/logo displayed above the quote */
  image?: string;
  /** Text style for quote text */
  quoteStyle?: TextStyleName;
  /** Text style for attribution */
  attributionStyle?: TextStyleName;
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
 * Expand quote props into primitive node tree.
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
function expandQuote(props: QuoteProps, context: ExpansionContext): SlideNode {
  const {
    quote: quoteText,
    attribution,
    image: imagePath,
    quoteStyle,
    attributionStyle = TEXT_STYLE.SMALL,
    background = true,
    backgroundColor,
    backgroundOpacity,
    borderColor,
    borderWidth,
    cornerRadius,
    padding,
    gap = GAP.NORMAL,
  } = props;

  const theme = context.theme;

  // Resolve padding and corner radius from theme
  const quotePadding = padding ?? theme.spacing.padding * 2;
  const quoteRadius = cornerRadius ?? theme.borders.radius;

  // Build content children: optional image, quote text, attribution
  const children: SlideNode[] = [];
  if (imagePath) {
    children.push(imageNode(imagePath));
  }
  children.push(text(quoteText, quoteStyle ? { style: quoteStyle } : undefined));
  if (attribution) {
    children.push(plainText(attribution, { style: attributionStyle, hAlign: HALIGN.RIGHT }));
  }

  const contentLayer = column(
    { padding: quotePadding, gap, vAlign: VALIGN.MIDDLE, height: SIZE.FILL },
    ...children,
  );

  // If no background, just return the content
  if (background === false || backgroundColor === 'none') {
    return contentLayer;
  }

  // Build background shape
  const bgColor = backgroundColor ?? theme.colors.secondary;
  const bgOpacity = backgroundOpacity ?? theme.colors.subtleOpacity;
  const bgBorderColor = borderColor ?? theme.colors.secondary;
  const bgBorderWidth = borderWidth ?? theme.borders.width;

  const backgroundRect = shape({
    shape: SHAPE.ROUND_RECT,
    fill: { color: bgColor, opacity: bgOpacity },
    border: { color: bgBorderColor, width: bgBorderWidth },
    cornerRadius: quoteRadius,
  });

  return stack(backgroundRect, contentLayer);
}

// ============================================
// COMPONENT REGISTRATION & DSL
// ============================================

componentRegistry.register({ name: QUOTE_COMPONENT, expand: expandQuote });

/**
 * Create a quote card with optional image, quote text, and attribution.
 *
 * @example
 * ```typescript
 * quote({
 *   quote: '"This changed everything for us."',
 *   attribution: '— Jane Smith, CTO',
 *   image: 'logo.png',
 * })
 * ```
 */
export function quote(props: QuoteProps) {
  return component(QUOTE_COMPONENT, props);
}
