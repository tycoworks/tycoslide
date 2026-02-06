// Measurement Collection
// Traverses node tree to collect text measurement requests

import { NODE_TYPE, type ElementNode } from './nodes.js';
import type { Theme, TextStyleName, TextContent, TextStyle } from './types.js';
import { Bounds } from './bounds.js';
import { TEXT_STYLE, SIZE } from './types.js';
import { toTextContent, resolveGap } from '../utils/node-utils.js';
import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

// ============================================
// MEASUREMENT REQUEST TYPES
// ============================================

export interface TextMeasurementRequest {
  id: string;
  content: TextContent;
  style: TextStyle;
  availableWidth: number;
}

export interface StyleMeasurementRequest {
  id: string;
  style: TextStyle;
}

export interface MeasurementRequests {
  text: TextMeasurementRequest[];
  styles: StyleMeasurementRequest[];
}

// ============================================
// MEASUREMENT RESULTS
// ============================================

export interface MeasurementResults {
  textHeights: Map<string, number>;   // id -> height in inches
  lineHeights: Map<string, number>;   // style id -> line height in inches
}

// ============================================
// KEY GENERATION
// ============================================

function textToString(content: TextContent): string {
  if (typeof content === 'string') return content;
  return content.map(run => typeof run === 'string' ? run : run.text).join('');
}

function makeTextKey(styleName: TextStyleName, availableWidth: number, content: TextContent): string {
  return `text|${styleName}|${availableWidth.toFixed(4)}|${textToString(content)}`;
}

function makeStyleKey(styleName: TextStyleName): string {
  return `style|${styleName}`;
}

// ============================================
// MEASUREMENT COLLECTOR
// ============================================

export function collectMeasurements(
  node: ElementNode,
  bounds: Bounds,
  theme: Theme
): MeasurementRequests {
  const text: TextMeasurementRequest[] = [];
  const styles: StyleMeasurementRequest[] = [];
  const seenTextIds = new Set<string>();
  const seenStyleIds = new Set<string>();

  function addTextRequest(content: TextContent, styleName: TextStyleName, width: number) {
    const id = makeTextKey(styleName, width, content);
    if (!seenTextIds.has(id)) {
      seenTextIds.add(id);
      text.push({ id, content, style: theme.textStyles[styleName], availableWidth: width });
    }
  }

  function addStyleRequest(styleName: TextStyleName) {
    const id = makeStyleKey(styleName);
    if (!seenStyleIds.has(id)) {
      seenStyleIds.add(id);
      styles.push({ id, style: theme.textStyles[styleName] });
    }
  }

  function collect(node: ElementNode, bounds: Bounds): void {
    switch (node.type) {
      case NODE_TYPE.TEXT: {
        const styleName = node.style ?? TEXT_STYLE.BODY;
        addTextRequest(node.content, styleName, bounds.w);
        addStyleRequest(styleName);
        break;
      }

      case NODE_TYPE.LIST: {
        const styleName = node.style ?? TEXT_STYLE.BODY;
        addStyleRequest(styleName);
        // Each list item needs measurement
        for (const item of node.items) {
          // Account for bullet indent (approximate)
          const indentedWidth = bounds.w - theme.spacing.gap;
          addTextRequest(toTextContent(item), styleName, indentedWidth);
        }
        break;
      }

      case NODE_TYPE.CARD: {
        // Card is a container - recursively collect from children
        const padding = node.padding ?? theme.spacing.padding;
        const cardBounds = bounds.inset(padding);
        for (const child of node.children) {
          collect(child, cardBounds);
        }
        break;
      }

      case NODE_TYPE.TABLE: {
        // Table cells use BODY style
        addStyleRequest(TEXT_STYLE.BODY);
        const cellWidth = bounds.w / (node.data[0]?.length || 1);
        const cellContentWidth = cellWidth - theme.spacing.cellPadding * 2;
        for (const row of node.data) {
          for (const cell of row) {
            addTextRequest(toTextContent(cell), TEXT_STYLE.BODY, cellContentWidth);
          }
        }
        break;
      }

      case NODE_TYPE.ROW: {
        const gap = resolveGap(node.gap, theme);
        const n = node.children.length;
        const totalGap = gap * (n - 1);
        const availableWidth = bounds.w - totalGap;

        // Calculate widths: explicit widths, fill, or equal distribution
        let fillChildIndex = -1;
        let fixedWidth = 0;
        let flexChildCount = 0;
        const childWidths: number[] = [];

        for (let i = 0; i < n; i++) {
          const child = node.children[i];
          if (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) {
            if (child.width === SIZE.FILL) {
              fillChildIndex = i;
              childWidths[i] = 0;
            } else if (typeof child.width === 'number') {
              childWidths[i] = child.width;
              fixedWidth += child.width;
            } else {
              childWidths[i] = -1;
              flexChildCount++;
            }
          } else {
            childWidths[i] = -1;
            flexChildCount++;
          }
        }

        const remainingWidth = Math.max(0, availableWidth - fixedWidth);
        if (fillChildIndex !== -1) {
          childWidths[fillChildIndex] = remainingWidth;
          for (let i = 0; i < n; i++) {
            if (childWidths[i] === -1) childWidths[i] = 0;
          }
        } else if (flexChildCount > 0) {
          const equalShare = remainingWidth / flexChildCount;
          for (let i = 0; i < n; i++) {
            if (childWidths[i] === -1) childWidths[i] = equalShare;
          }
        }

        let x = bounds.x;
        for (let i = 0; i < n; i++) {
          const childWidth = childWidths[i];
          const childBounds = new Bounds(x, bounds.y, childWidth, bounds.h);
          collect(node.children[i], childBounds);
          x += childWidth + gap;
        }
        break;
      }

      case NODE_TYPE.COLUMN: {
        const gap = resolveGap(node.gap, theme);
        // For measurement, we give each child the full width
        // Height will be computed in layout phase
        for (const child of node.children) {
          collect(child, bounds);
        }
        break;
      }

      case NODE_TYPE.GROUP: {
        const gap = resolveGap(node.gap, theme);
        const cols = node.columns ?? node.children.length;
        const totalGap = gap * (cols - 1);
        const cellWidth = (bounds.w - totalGap) / cols;

        for (const child of node.children) {
          const childBounds = new Bounds(bounds.x, bounds.y, cellWidth, bounds.h);
          collect(child, childBounds);
        }
        break;
      }

      case NODE_TYPE.DIAGRAM: {
        // Diagram text uses SMALL style
        addStyleRequest(TEXT_STYLE.SMALL);
        for (const box of node.nodes) {
          // Approximate box width
          addTextRequest(box.label, TEXT_STYLE.SMALL, bounds.w / node.nodes.length);
        }
        break;
      }

      case NODE_TYPE.IMAGE:
      case NODE_TYPE.LINE:
      case NODE_TYPE.SLIDE_NUMBER:
        // No text measurement needed
        break;
    }
  }

  collect(node, bounds);
  return { text, styles };
}

// ============================================
// MEASUREMENT LOOKUP
// ============================================

export function getTextHeight(
  results: MeasurementResults,
  content: TextContent,
  styleName: TextStyleName,
  availableWidth: number
): number {
  const id = makeTextKey(styleName, availableWidth, content);
  const height = results.textHeights.get(id);
  if (height === undefined) {
    throw new Error(`Text measurement not found: ${id.slice(0, 60)}...`);
  }
  return height;
}

export function getLineHeight(
  results: MeasurementResults,
  styleName: TextStyleName
): number {
  const id = makeStyleKey(styleName);
  const height = results.lineHeights.get(id);
  if (height === undefined) {
    throw new Error(`Line height not found for style: ${styleName}`);
  }
  return height;
}
