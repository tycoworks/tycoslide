// Layout Measurement Engine
// Browser-based measurement using Playwright

import { chromium, type Browser, type Page } from 'playwright';
import type { Theme } from '../core/types.js';
import type { ElementNode } from '../core/nodes.js';
import type { Bounds } from '../core/bounds.js';
import { generateLayoutHTML } from './html-measurement.js';
import { pxToIn } from '../utils/units.js';

// ============================================
// TYPES
// ============================================

/** Result of layout-based measurement for a single node */
export interface LayoutMeasurement {
  computedWidth: number;   // in inches - width computed by browser flexbox
  computedHeight: number;  // in inches - height computed by browser
  intrinsicWidth: number;  // in inches - natural single-line width
}

/** Results of layout-based measurement, keyed by node identity */
export interface LayoutMeasurementResults {
  get(node: ElementNode): LayoutMeasurement | undefined;
  has(node: ElementNode): boolean;
}

/** Layout measurer interface - abstracts browser implementation */
export interface LayoutMeasurer {
  launch(): Promise<void>;
  close(): Promise<void>;
  isLaunched(): boolean;
  measureLayout(tree: ElementNode, bounds: Bounds, theme: Theme): Promise<LayoutMeasurementResults>;
}

// ============================================
// BROWSER LAYOUT MEASURER IMPLEMENTATION
// ============================================

/**
 * Browser-based layout measurer using Playwright.
 * Generates HTML with CSS flexbox to measure text dimensions.
 */
class BrowserLayoutMeasurer implements LayoutMeasurer {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch(): Promise<void> {
    if (this.browser) {
      return; // Already launched
    }

    this.browser = await chromium.launch({
      headless: true,
    });

    this.page = await this.browser.newPage();
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isLaunched(): boolean {
    return this.browser !== null;
  }

  /**
   * Measure a node tree using full layout HTML.
   * This generates HTML that mirrors the slide structure with CSS flexbox,
   * letting the browser compute accurate widths before measuring heights.
   *
   * Two-phase measurement:
   * 1. Intrinsic widths (white-space: nowrap) - natural single-line width
   * 2. Flex layout heights (white-space: pre-wrap) - wrapped height at computed width
   */
  async measureLayout(
    tree: ElementNode,
    bounds: Bounds,
    theme: Theme
  ): Promise<LayoutMeasurementResults> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Generate layout HTML with CSS flexbox structure
    const { html, nodeIds } = generateLayoutHTML(tree, bounds, theme);

    // Debug: save HTML to file if DEBUG_HTML env var is set
    if (process.env.DEBUG_HTML) {
      const fs = await import('fs');
      const counter = (global as any).__debugHtmlCounter ?? 0;
      (global as any).__debugHtmlCounter = counter + 1;
      const path = `${process.env.DEBUG_HTML.replace('.html', '')}-${counter}.html`;
      fs.writeFileSync(path, html);
      console.log(`DEBUG: Saved measurement HTML to ${path}`);
    }

    // Load HTML and wait for fonts
    await this.page.setContent(html);
    await this.page.evaluate(() => document.fonts.ready);

    // Phase 1: Measure intrinsic widths (nowrap mode)
    const intrinsicWidths = await this.page.evaluate(() => {
      const results = new Map<string, number>();
      document.querySelectorAll('[data-node-id]').forEach(el => {
        const div = el as HTMLElement;
        const nodeId = div.dataset.nodeId!;
        // Temporarily set nowrap to measure intrinsic width
        const originalWhiteSpace = div.style.whiteSpace;
        div.style.whiteSpace = 'nowrap';
        results.set(nodeId, div.scrollWidth);
        div.style.whiteSpace = originalWhiteSpace;
      });
      return Array.from(results.entries());
    });
    const intrinsicWidthMap = new Map(intrinsicWidths);

    // Phase 2: Measure flex-computed dimensions (normal wrapping)
    const measurements = await this.page.evaluate(() => {
      const results: Array<{
        nodeId: string;
        width: number;
        height: number;
      }> = [];

      document.querySelectorAll('[data-node-id]').forEach(el => {
        const div = el as HTMLElement;
        const rect = div.getBoundingClientRect();
        results.push({
          nodeId: div.dataset.nodeId!,
          width: rect.width,
          height: rect.height,
        });
      });

      return results;
    });

    // Build result map keyed by node identity
    const nodeToMeasurement = new Map<ElementNode, LayoutMeasurement>();

    for (const [node, nodeId] of nodeIds) {
      const measurement = measurements.find(m => m.nodeId === nodeId);
      const intrinsicWidth = intrinsicWidthMap.get(nodeId) ?? 0;

      if (measurement) {
        nodeToMeasurement.set(node, {
          computedWidth: pxToIn(measurement.width),
          computedHeight: pxToIn(measurement.height),
          intrinsicWidth: pxToIn(intrinsicWidth),
        });
      }
    }

    return {
      get: (node: ElementNode) => nodeToMeasurement.get(node),
      has: (node: ElementNode) => nodeToMeasurement.has(node),
    };
  }
}

// ============================================
// FACTORY AND SINGLETON
// ============================================

/** Singleton instance for default usage */
let defaultMeasurer: LayoutMeasurer | null = null;

/** Create a new layout measurer instance */
export function createLayoutMeasurer(): LayoutMeasurer {
  return new BrowserLayoutMeasurer();
}

/** Get the default layout measurer (singleton) */
export function getLayoutMeasurer(): LayoutMeasurer {
  if (!defaultMeasurer) {
    defaultMeasurer = createLayoutMeasurer();
  }
  return defaultMeasurer;
}

/** Cleanup function for tests and shutdown */
export async function closeLayoutMeasurer(): Promise<void> {
  if (defaultMeasurer) {
    await defaultMeasurer.close();
    defaultMeasurer = null;
  }
}
