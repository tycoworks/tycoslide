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
import { generateLayoutHTML, preloadFonts, measureFontNormalRatios, type FontNormalRatios, type FontDescriptor } from './layoutHtml.js';
import { pxToIn } from '../utils/units.js';
import { log } from '../utils/log.js';
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
  private fontDescriptors: FontDescriptor[] = [];
  private debugCounter = 0;

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
      const result = await measureFontNormalRatios(this.page, theme);
      this.fontNormalRatios = result.ratios;
      this.fontDescriptors = result.fonts;
    }

    // Generate layout HTML with CSS flexbox structure
    const { html, nodeIds } = generateLayoutHTML(tree, bounds, theme, this.fontNormalRatios);

    if (process.env.DEBUG_HTML) {
      this.saveDebugHtml(html);
    }

    // Load HTML and explicitly preload all fonts
    // document.fonts.ready alone is unreliable — base64 fonts may not be parsed in time
    await this.page.setContent(html);
    await preloadFonts(this.page, this.fontDescriptors);

    // Verify all fonts loaded — silent fallback produces wrong measurements
    const failedFonts = await this.page.evaluate(() => {
      return Array.from(document.fonts)
        .filter(f => f.status !== 'loaded')
        .map(f => `${f.family} (${f.weight}): ${f.status}`);
    });
    if (failedFonts.length > 0) {
      throw new Error(`Font verification failed — these fonts did not load: ${failedFonts.join(', ')}`);
    }

    if (process.env.DEBUG_HTML) {
      await this.saveDebugScreenshot();
      await this.logNodeDimensions();
    }

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

  /** Debug path prefix from DEBUG_HTML env var.
   *  DEBUG_HTML=1 → <tmpdir>/debug; DEBUG_HTML=/path/file.html → /path/file */
  private debugPrefix(): string {
    const debugHtml = process.env.DEBUG_HTML!;
    return debugHtml === '1'
      ? path.join(os.tmpdir(), 'debug')
      : debugHtml.replace('.html', '');
  }

  /** Save debug HTML to disk. Counter auto-increments per slide. */
  private saveDebugHtml(html: string): void {
    const counter = this.debugCounter++;
    const filePath = `${this.debugPrefix()}-${counter}.html`;
    fs.writeFileSync(filePath, html);
    log.layout.html('saved debug HTML to %s', filePath);
  }

  /** Save Playwright screenshot alongside the debug HTML. */
  private async saveDebugScreenshot(): Promise<void> {
    const counter = this.debugCounter - 1; // matches the HTML just saved
    const screenshotPath = `${this.debugPrefix()}-${counter}.png`;
    await this.page!.screenshot({ path: screenshotPath, fullPage: true });
    log.layout.measure('saved Playwright screenshot to %s', screenshotPath);
  }

  /** Log measured dimensions for every node (for visual debugging). */
  private async logNodeDimensions(): Promise<void> {
    const allDims = await this.page!.evaluate(() => {
      const results: string[] = [];
      const root = document.querySelector('.root');
      const rootRect = root?.getBoundingClientRect();
      if (rootRect) {
        results.push(`ROOT: ${rootRect.width.toFixed(1)}x${rootRect.height.toFixed(1)} at (${rootRect.left.toFixed(1)},${rootRect.top.toFixed(1)})`);
      }
      document.querySelectorAll('[data-node-id]').forEach(el => {
        const div = el as HTMLElement;
        const rect = div.getBoundingClientRect();
        const computed = getComputedStyle(div);
        const text = div.textContent?.substring(0, 40)?.trim() || '';
        const display = computed.display;
        const width = computed.width;
        const font = computed.fontFamily?.substring(0, 30);
        results.push(`${div.dataset.nodeId}: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} at (${rect.left.toFixed(1)},${rect.top.toFixed(1)}) display=${display} cssW=${width} font="${font}" "${text}"`);
      });
      return results;
    });
    allDims.forEach(d => log.layout.measure('node-dim: %s', d));
  }
}
