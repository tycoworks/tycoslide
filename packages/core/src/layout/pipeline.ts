// Layout Pipeline
// Coordinates browser-based layout measurement and position tree construction.
// The browser computes all positions via CSS flexbox in a single pass per slide.

import type { ElementNode, PositionedNode, ContainerNode, StackNode, TextNode } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { Bounds } from '../core/bounds.js';
import type { Theme } from '../core/types.js';
import { LayoutMeasurer } from './measurement.js';
import { log } from '../utils/log.js';

// ============================================
// TYPES
// ============================================

/** Stored data for a slide that needs measurement */
interface SlideMeasurementEntry {
  tree: ElementNode;
  bounds: Bounds;
  label: string;
}

// ============================================
// LAYOUT PIPELINE
// ============================================

/**
 * Pipeline that coordinates browser-based layout measurement for presentations.
 * Collects slides, measures them via the browser, and builds positioned trees.
 *
 * Usage:
 *   const pipeline = new LayoutPipeline();
 *
 *   // Collect from all slides
 *   for (const slide of slides) {
 *     pipeline.collectFromTree(expandedTree, bounds);
 *   }
 *
 *   // Execute all measurements
 *   await pipeline.executeMeasurements(theme);
 *
 *   // Build positioned tree for each slide
 *   const positioned = pipeline.computeLayout(tree, bounds);
 */
export class LayoutPipeline {
  private slides: SlideMeasurementEntry[] = [];
  private measurer = new LayoutMeasurer();
  private measurements: Map<ElementNode, Bounds> | null = null;

  /**
   * Collect a slide for measurement.
   * Call this for each slide after component expansion.
   */
  collectFromTree(node: ElementNode, bounds: Bounds, label: string): void {
    this.slides.push({ tree: node, bounds, label });
  }

  /**
   * Execute all collected measurements using the browser.
   * Stores results internally for use by computeLayout.
   */
  async executeMeasurements(theme: Theme, debugDir?: string): Promise<void> {
    if (this.slides.length === 0) {
      this.measurements = new Map();
      return;
    }

    // Launch browser if needed (idempotent)
    if (!this.measurer.isLaunched()) {
      await this.measurer.launch();
    }

    // Measure ALL slides in a single browser round-trip
    this.measurements = await this.measurer.measureLayout(this.slides, theme, debugDir);
  }

  /**
   * Build a PositionedNode tree from browser measurements.
   * Must be called after executeMeasurements().
   *
   * @param tree - Root of the element node tree
   * @param bounds - Content area bounds (used to offset from root-relative to slide-absolute)
   */
  computeLayout(tree: ElementNode, bounds: Bounds): PositionedNode {
    if (!this.measurements) {
      throw new Error('No measurements available. Call executeMeasurements() first.');
    }
    const positioned = this.buildPositionedTree(tree, bounds);
    if (log.layout._.enabled) {
      this.debugDumpTree(positioned);
    }
    return positioned;
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
    await this.measurer.close();
    this.slides = [];
    this.measurements = null;
  }

  // ============================================
  // PRIVATE: Position tree construction
  // ============================================

  /**
   * Build a PositionedNode tree from browser measurements.
   * The browser has already computed all positions via CSS flexbox.
   * This walks the node tree and constructs PositionedNode using
   * the browser's computed {x, y, width, height} for each node.
   */
  private buildPositionedTree(node: ElementNode, bounds: Bounds): PositionedNode {
    const m = this.measurements!.get(node);
    if (!m) {
      throw new Error(`No browser measurement for node type: ${node.type}`);
    }

    const positioned: PositionedNode = {
      node,
      x: bounds.x + m.x,
      y: bounds.y + m.y,
      width: m.w,
      height: m.h,
    };

    // Recurse into container children
    if (node.type === NODE_TYPE.CONTAINER || node.type === NODE_TYPE.STACK) {
      const container = node as ContainerNode | StackNode;
      positioned.children = container.children.map(child =>
        this.buildPositionedTree(child, bounds)
      );
    }

    return positioned;
  }

  private debugDumpTree(node: PositionedNode, indent = 0): void {
    const pad = '  '.repeat(indent);
    const type = node.node.type;
    let label: string = type;
    if (type === NODE_TYPE.TEXT) {
      const content = (node.node as TextNode).content;
      const preview = typeof content === 'string' ? content.substring(0, 50)
        : Array.isArray(content) ? content.map((c: any) => typeof c === 'string' ? c : c.text).join('').substring(0, 50)
        : '';
      label = `TEXT "${preview}"`;
    }
    log.layout._(`${pad}${label}: x=${node.x.toFixed(3)} y=${node.y.toFixed(3)} w=${node.width.toFixed(3)} h=${node.height.toFixed(3)}`);
    if (node.children) {
      for (const child of node.children) {
        this.debugDumpTree(child, indent + 1);
      }
    }
  }
}
