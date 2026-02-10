// Layout Measurement Engine
// Browser-based measurement using Playwright
// The browser is the single source of truth for all layout positions.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium, type Browser, type Page } from 'playwright';
import type { Theme } from '../core/types.js';
import type { ElementNode } from '../core/nodes.js';
import { Bounds } from '../core/bounds.js';
import { generateLayoutHTML, measureFontNormalRatios, type FontNormalRatios } from './layoutHtml.js';
import { pxToIn } from '../utils/units.js';
// ============================================
// LAYOUT MEASURER
// ============================================

/**
 * Browser-based layout measurer using Playwright.
 * Generates HTML with CSS flexbox, lets the browser compute all positions,
 * then extracts {x, y, width, height} for every node.
 */
export class LayoutMeasurer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private fontNormalRatios: FontNormalRatios = new Map();

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
   * Generates HTML that mirrors the slide structure with CSS flexbox,
   * lets the browser compute all positions, then extracts full
   * {x, y, width, height} for every node relative to the root.
   */
  async measureLayout(
    tree: ElementNode,
    bounds: Bounds,
    theme: Theme
  ): Promise<Map<ElementNode, Bounds>> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Ensure font metrics are measured (idempotent — only runs once per measurer lifetime)
    if (this.fontNormalRatios.size === 0) {
      this.fontNormalRatios = await measureFontNormalRatios(this.page, theme);
    }

    // Generate layout HTML with CSS flexbox structure
    const { html, nodeIds } = generateLayoutHTML(tree, bounds, theme, this.fontNormalRatios);

    if (process.env.DEBUG_HTML) this.saveDebugHtml(html);

    // Load HTML and wait for fonts
    await this.page.setContent(html);
    await this.page.evaluate(() => document.fonts.ready);

    // Extract full positions for all nodes, relative to root
    const measurements = await this.page.evaluate(() => {
      const root = document.querySelector('.root')!;
      const rootRect = root.getBoundingClientRect();
      const results: Array<{
        nodeId: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      document.querySelectorAll('[data-node-id]').forEach(el => {
        const div = el as HTMLElement;
        const rect = div.getBoundingClientRect();
        results.push({
          nodeId: div.dataset.nodeId!,
          x: rect.left - rootRect.left,
          y: rect.top - rootRect.top,
          width: rect.width,
          height: rect.height,
        });
      });

      return results;
    });

    // Build result map keyed by node identity
    const results = new Map<ElementNode, Bounds>();

    for (const [node, nodeId] of nodeIds) {
      const m = measurements.find(r => r.nodeId === nodeId);

      if (m) {
        results.set(node, new Bounds(
          pxToIn(m.x),
          pxToIn(m.y),
          pxToIn(m.width),
          pxToIn(m.height),
        ));
      }
    }

    return results;
  }

  /** Save debug HTML to disk.
   *  DEBUG_HTML=1 writes to <tmpdir>/debug-N.html; DEBUG_HTML=/path/prefix writes to /path/prefix-N.html */
  private saveDebugHtml(html: string): void {
    const counter = (global as any).__debugHtmlCounter ?? 0;
    (global as any).__debugHtmlCounter = counter + 1;
    const debugHtml = process.env.DEBUG_HTML!;
    const prefix = debugHtml === '1'
      ? path.join(os.tmpdir(), 'debug')
      : debugHtml.replace('.html', '');
    const filePath = `${prefix}-${counter}.html`;
    fs.writeFileSync(filePath, html);
    console.log(`DEBUG: Saved measurement HTML to ${filePath}`);
  }
}
