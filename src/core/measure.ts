// Measurement Collection
// Traverses node tree to collect text measurement requests
//
// This module collects text measurements needed for browser-based layout.
// Handlers provide collectMeasurements() for their specific node types.
// Key generation is owned entirely by this module - handlers return raw data.

import type { ElementNode } from './nodes.js';
import type { Theme, TextStyleName, TextContent, TextStyle } from './types.js';
import { Bounds } from './bounds.js';
import { elementHandlerRegistry } from './element-registry.js';

// ============================================
// RAW REQUEST TYPES (from handlers)
// ============================================

/**
 * Raw text measurement request from handlers.
 * Handlers express intent ("measure this text") without generating cache keys.
 */
export interface RawTextMeasurement {
  styleName: TextStyleName;
  content: TextContent;
  style: TextStyle;
  availableWidth: number;
}

/**
 * Raw style measurement request from handlers.
 */
export interface RawStyleMeasurement {
  styleName: TextStyleName;
  style: TextStyle;
}

/**
 * What handlers return from collectMeasurements().
 */
export interface MeasurementRequests {
  text: RawTextMeasurement[];
  styles: RawStyleMeasurement[];
}

// ============================================
// KEYED REQUEST TYPES (internal)
// ============================================

interface KeyedTextMeasurement {
  id: string;
  content: TextContent;
  style: TextStyle;
  availableWidth: number;
}

interface KeyedStyleMeasurement {
  id: string;
  style: TextStyle;
}

/**
 * Final output with cache keys for browser measurement.
 */
export interface KeyedMeasurementRequests {
  text: KeyedTextMeasurement[];
  styles: KeyedStyleMeasurement[];
}

// ============================================
// MEASUREMENT RESULTS
// ============================================

export interface MeasurementResults {
  textHeights: Map<string, number>;   // id -> height in inches
  lineHeights: Map<string, number>;   // style id -> line height in inches
}

// ============================================
// KEY GENERATION (internal only)
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
 * Collects and deduplicates measurement requests.
 * Used by container handlers to aggregate child requests.
 */
export class MeasurementCollector {
  private textRequests: RawTextMeasurement[] = [];
  private styleRequests: RawStyleMeasurement[] = [];
  private seenKeys = new Set<string>();

  /**
   * Merge raw measurement requests, deduplicating by generated key.
   */
  merge(requests: MeasurementRequests): void {
    for (const req of requests.text) {
      const key = makeTextKey(req.styleName, req.availableWidth, req.content);
      if (!this.seenKeys.has(key)) {
        this.seenKeys.add(key);
        this.textRequests.push(req);
      }
    }
    for (const req of requests.styles) {
      const key = makeStyleKey(req.styleName);
      if (!this.seenKeys.has(key)) {
        this.seenKeys.add(key);
        this.styleRequests.push(req);
      }
    }
  }

  /**
   * Get aggregated raw requests (for container handlers to return).
   */
  getRequests(): MeasurementRequests {
    return {
      text: this.textRequests,
      styles: this.styleRequests,
    };
  }

  /**
   * Get keyed requests for browser measurement (for top-level collection).
   */
  getKeyedRequests(): KeyedMeasurementRequests {
    return {
      text: this.textRequests.map(req => ({
        id: makeTextKey(req.styleName, req.availableWidth, req.content),
        content: req.content,
        style: req.style,
        availableWidth: req.availableWidth,
      })),
      styles: this.styleRequests.map(req => ({
        id: makeStyleKey(req.styleName),
        style: req.style,
      })),
    };
  }
}

// ============================================
// COLLECT MEASUREMENTS
// ============================================

/**
 * Collect all text measurement requests needed for a node tree.
 * Recursively traverses containers and delegates to handlers.
 * Returns keyed requests ready for browser measurement.
 */
export function collectMeasurements(
  node: ElementNode,
  bounds: Bounds,
  theme: Theme
): KeyedMeasurementRequests {
  const collector = new MeasurementCollector();

  function collect(node: ElementNode, bounds: Bounds): void {
    const handler = elementHandlerRegistry.get(node.type);
    if (handler?.collectMeasurements) {
      const requests = handler.collectMeasurements(node, bounds, theme);
      collector.merge(requests);
    }
  }

  collect(node, bounds);
  return collector.getKeyedRequests();
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
