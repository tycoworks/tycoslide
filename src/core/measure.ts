// Measurement Collection
// Traverses node tree to collect text measurement requests
//
// This module collects text measurements needed for browser-based layout.
// Handlers provide collectMeasurements() for their specific node types.

import { NODE_TYPE, type ElementNode } from './nodes.js';
import type { Theme, TextStyleName, TextContent, TextStyle } from './types.js';
import { Bounds } from './bounds.js';
import { SIZE } from './types.js';
import { resolveGap } from '../utils/node-utils.js';
import { distributeFlexSpace, type FlexChild, nodeHandlerRegistry } from './layout/index.js';

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

/**
 * Collect all text measurement requests needed for a node tree.
 * Recursively traverses containers and delegates to handlers.
 */
export function collectMeasurements(
  node: ElementNode,
  bounds: Bounds,
  theme: Theme
): MeasurementRequests {
  const text: TextMeasurementRequest[] = [];
  const styles: StyleMeasurementRequest[] = [];
  const seenTextIds = new Set<string>();
  const seenStyleIds = new Set<string>();

  function mergeRequests(requests: MeasurementRequests): void {
    for (const req of requests.text) {
      if (!seenTextIds.has(req.id)) {
        seenTextIds.add(req.id);
        text.push(req);
      }
    }
    for (const req of requests.styles) {
      if (!seenStyleIds.has(req.id)) {
        seenStyleIds.add(req.id);
        styles.push(req);
      }
    }
  }

  function collect(node: ElementNode, bounds: Bounds): void {
    // First, check if the handler provides collectMeasurements
    const handler = nodeHandlerRegistry.get(node.type);
    if (handler?.collectMeasurements) {
      const requests = handler.collectMeasurements(node, bounds, theme);
      mergeRequests(requests);
    }

    // For containers, recursively collect from children
    if (node.type === NODE_TYPE.ROW) {
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = bounds.w - totalGap;

      const flexChildren: FlexChild[] = node.children.map((child) => {
        if (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) {
          if (child.width === SIZE.FILL) return { fillsRemaining: true };
          if (typeof child.width === 'number') return { fixedSize: child.width };
        }
        return {};
      });

      const { sizes: childWidths } = distributeFlexSpace(flexChildren, availableWidth);

      let x = bounds.x;
      for (let i = 0; i < n; i++) {
        const childBounds = new Bounds(x, bounds.y, childWidths[i], bounds.h);
        collect(node.children[i], childBounds);
        x += childWidths[i] + gap;
      }
    } else if (node.type === NODE_TYPE.COLUMN) {
      for (const child of node.children) {
        collect(child, bounds);
      }
    } else if (node.type === NODE_TYPE.STACK) {
      for (const child of node.children) {
        collect(child, bounds);
      }
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
