// Quote Component
// Card with optional image, quote text, and attribution.
// Expands to: stack(shape(background), column(image?, quote, attribution))

import { componentRegistry, component, type ExpansionContext, type InferProps, type SchemaShape } from '../core/registry.js';
import { stack, column } from './containers.js';
import { shape, image as imageNode, imageComponent } from './primitives.js';
import { markdown, text, markdownComponent, textComponent } from './text.js';
import type { SlideNode } from '../core/nodes.js';
import { TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE, SIZE, MARKDOWN } from '../core/types.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for quote */
export const QUOTE_COMPONENT = 'quote' as const;

// ============================================
// PARAMS SCHEMA
// ============================================

const quoteSchema = {
  /** Quote text (markdown supported) */
  quote: markdownComponent.input,
  /** Attribution line, e.g. "— Jane Smith, CTO" */
  attribution: textComponent.input.optional(),
  /** Optional image/logo displayed above the quote */
  image: imageComponent.input.optional(),
  /** Text style for quote text */
  quoteStyle: schema.textStyle().optional(),
  /** Text style for attribution */
  attributionStyle: schema.textStyle().optional(),
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
  gap: schema.gap().optional(),
} satisfies SchemaShape;

// ============================================
// TYPES
// ============================================

export type QuoteProps = InferProps<typeof quoteSchema>;

// ============================================
// EXPANSION FUNCTION
// ============================================

/**
 * Expand quote params into primitive node tree.
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
  children.push(markdown(quoteText, quoteStyle ? { style: quoteStyle } : undefined));
  if (attribution) {
    children.push(text(attribution, { style: attributionStyle, hAlign: HALIGN.RIGHT }));
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
// COMPONENT DEFINITION
// ============================================

export const quoteComponent = componentRegistry.define({
  name: QUOTE_COMPONENT,
  params: quoteSchema,
  expand: expandQuote,
  markdown: { type: MARKDOWN.BLOCK },
});

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
