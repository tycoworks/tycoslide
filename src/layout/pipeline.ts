// Text Measurement Pipeline
// Uses full layout HTML to accurately measure text within CSS flexbox containers
//
// Design: Layout-based measurement
// - Generates HTML that mirrors slide structure with CSS flexbox
// - Browser computes actual widths via flexbox algorithm
// - Measurements extracted from positioned elements

import type { ElementNode, TextNode, SlideNumberNode } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import { Bounds } from '../core/bounds.js';
import type { Theme } from '../core/types.js';
import {
  createLayoutMeasurer,
  type LayoutMeasurer,
  type LayoutMeasurementResults,
} from './measurement.js';

// ============================================
// TYPES
// ============================================

/** Result of a text measurement (internal format for layout) */
interface MeasurementResult {
  componentId: string;
  lines: number;
  lineHeight: number;
  totalHeight: number;
  contentWidth: number;
}

/** Stored data for a slide that needs measurement */
interface SlideMeasurementEntry {
  tree: ElementNode;
  bounds: Bounds;
}

/** Results stored for lookup during layout */
export interface MeasurementResults {
  /** Get measurement result for a TextNode or SlideNumberNode instance */
  get(node: TextNode | SlideNumberNode): MeasurementResult | undefined;
  /** Check if a node has been measured */
  has(node: TextNode | SlideNumberNode): boolean;
}

// ============================================
// RESULT ADAPTER
// ============================================

/**
 * Adapts LayoutMeasurementResults to the MeasurementResults interface.
 * In the layout HTML system, both TextNode and SlideNumberNode are measured directly.
 */
function adaptLayoutResults(
  layoutResults: LayoutMeasurementResults
): MeasurementResults {
  return {
    get: (node: TextNode | SlideNumberNode): MeasurementResult | undefined => {
      // Both TextNode and SlideNumberNode are measured directly in layout HTML
      const layout = layoutResults.get(node);
      if (!layout) return undefined;

      // Convert LayoutMeasurement to MeasurementResult format
      // The layout engine expects totalHeight and contentWidth
      return {
        componentId: '', // Not used in new system
        lines: 1,        // Could be computed if needed
        lineHeight: layout.computedHeight,
        totalHeight: layout.computedHeight,
        contentWidth: layout.intrinsicWidth,
      };
    },
    has: (node: TextNode | SlideNumberNode): boolean => {
      return layoutResults.has(node);
    },
  };
}

// ============================================
// MEASUREMENT PIPELINE
// ============================================

/**
 * Pipeline that coordinates text measurement for presentations.
 * Uses layout-based HTML generation for accurate flexbox measurements.
 *
 * Usage:
 *   const pipeline = new TextMeasurementPipeline();
 *
 *   // Collect from all slides
 *   for (const slide of slides) {
 *     pipeline.collectFromTree(expandedTree, bounds, theme);
 *   }
 *
 *   // Execute all measurements
 *   const results = await pipeline.executeMeasurements(theme);
 *
 *   // Use results in layout
 *   const height = results.get(textNode)?.totalHeight;
 */
export class TextMeasurementPipeline {
  private slides: SlideMeasurementEntry[] = [];
  private measurer: LayoutMeasurer | null = null;
  private resultsMap: MeasurementResults | null = null;

  /**
   * Collect measurements from an expanded node tree.
   * Call this for each slide after component expansion.
   */
  collectFromTree(node: ElementNode, bounds: Bounds, _theme: Theme): void {
    // Store the slide for layout-based measurement
    this.slides.push({ tree: node, bounds });
  }

  /**
   * Execute all collected measurements using layout-based HTML.
   * Returns a results map for lookup during layout.
   */
  async executeMeasurements(theme: Theme): Promise<MeasurementResults> {
    if (this.slides.length === 0) {
      // No slides to measure - return empty map
      this.resultsMap = {
        get: () => undefined,
        has: () => false,
      };
      return this.resultsMap;
    }

    // Launch measurer if needed
    if (!this.measurer) {
      this.measurer = createLayoutMeasurer();
      await this.measurer.launch();
    }

    // Measure each slide and merge results
    const allResults = new Map<ElementNode, {
      computedWidth: number;
      computedHeight: number;
      intrinsicWidth: number;
    }>();

    for (const slide of this.slides) {
      const slideResults = await this.measurer.measureLayout(
        slide.tree,
        slide.bounds,
        theme
      );

      // Merge into combined results
      // Walk the tree to get all nodes and their measurements
      this.collectNodeMeasurements(slide.tree, slideResults, allResults);
    }

    // Create combined LayoutMeasurementResults
    const combinedResults: LayoutMeasurementResults = {
      get: (node: ElementNode) => allResults.get(node),
      has: (node: ElementNode) => allResults.has(node),
    };

    // Adapt to MeasurementResults interface
    this.resultsMap = adaptLayoutResults(combinedResults);
    return this.resultsMap;
  }

  /**
   * Recursively collect measurements from a tree.
   */
  private collectNodeMeasurements(
    node: ElementNode,
    slideResults: LayoutMeasurementResults,
    allResults: Map<ElementNode, { computedWidth: number; computedHeight: number; intrinsicWidth: number }>
  ): void {
    const measurement = slideResults.get(node);
    if (measurement) {
      allResults.set(node, measurement);
    }

    // Recurse into containers
    if (node.type === NODE_TYPE.ROW || node.type === NODE_TYPE.COLUMN || node.type === NODE_TYPE.STACK) {
      const container = node as { children: ElementNode[] };
      for (const child of container.children) {
        this.collectNodeMeasurements(child, slideResults, allResults);
      }
    }
  }

  /**
   * Get the results map (after executeMeasurements).
   */
  getResultsMap(): MeasurementResults | null {
    return this.resultsMap;
  }

  /**
   * Get count of collected slides.
   */
  get measurementCount(): number {
    return this.slides.length;
  }

  /**
   * Close the browser and clean up.
   */
  async close(): Promise<void> {
    if (this.measurer) {
      await this.measurer.close();
      this.measurer = null;
    }
    this.slides = [];
    this.resultsMap = null;
  }
}
