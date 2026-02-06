// Intrinsic Size Calculation
// Centralized node-specific size knowledge to prevent magic numbers

import { NODE_TYPE, type ElementNode, type ImageNode, type TextNode, type SlideNumberNode } from '../nodes.js';
import { TEXT_STYLE } from '../types.js';
import { ptToIn } from '../../utils/font-utils.js';
import type { LayoutContext } from './types.js';
import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

/**
 * Get intrinsic width of a node at a given height constraint.
 * Used when a Row has a SIZE.FILL child and flex siblings need their natural width.
 *
 * This centralizes all node-specific width knowledge to prevent magic numbers.
 *
 * @param node - The element node to measure
 * @param constraintHeight - Height constraint (used for aspect ratio calculations)
 * @param ctx - Layout context with theme and measurer
 * @returns Intrinsic width in inches, or 0 if node has no intrinsic width
 */
export function getIntrinsicWidth(
  node: ElementNode,
  constraintHeight: number,
  ctx: LayoutContext
): number {
  const { theme, measurer } = ctx;

  switch (node.type) {
    case NODE_TYPE.IMAGE: {
      // Image width from aspect ratio at constraint height
      const dimensions = imageSize((node as ImageNode).src);
      const aspectRatio = dimensions.width! / dimensions.height!;
      return constraintHeight * aspectRatio;
    }

    case NODE_TYPE.TEXT: {
      // Use measurer to get actual text width
      const textNode = node as TextNode;
      const styleName = textNode.style ?? TEXT_STYLE.BODY;
      const style = theme.textStyles[styleName];
      return measurer.getContentWidth(textNode.content, style);
    }

    case NODE_TYPE.SLIDE_NUMBER: {
      // Slide numbers: measure width for "99" as reasonable max
      const slideNumNode = node as SlideNumberNode;
      const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
      const style = theme.textStyles[styleName];
      return measurer.getContentWidth('99', style);
    }

    case NODE_TYPE.LINE: {
      // Lines: minimal width based on border
      return ptToIn(theme.borders.width);
    }

    default:
      // Other types (List, Table, Card, containers): no intrinsic width
      // They expand to fill available space
      return 0;
  }
}
