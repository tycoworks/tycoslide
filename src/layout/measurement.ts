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
   * Measure all slides in a single browser round-trip.
   * Generates one HTML page with all slides, loads fonts once,
   * and extracts all measurements in one page.evaluate().
   */
  async measureLayout(
    slides: Array<{ tree: ElementNode; bounds: Bounds }>,
    theme: Theme
  ): Promise<Map<ElementNode, Bounds>> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Ensure font metrics are measured (idempotent)
    if (this.fontNormalRatios.size === 0) {
      const result = await measureFontNormalRatios(this.page, theme);
      this.fontNormalRatios = result.ratios;
      this.fontDescriptors = result.fonts;
    }

    // Generate single HTML page containing all slides
    const { html, slideNodeIds } = generateLayoutHTML(slides, theme, this.fontNormalRatios);

    if (process.env.DEBUG_HTML) {
      this.saveDebugHtml(html);
    }

    // One setContent, one font preload
    await this.page.setContent(html);
    await preloadFonts(this.page, this.fontDescriptors);

    // Verify all fonts loaded
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

    // Extract measurements for ALL slides in one evaluate
    const allMeasurements = await this.page.evaluate(() => {
      const results: Array<{
        slideIndex: number;
        nodeId: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      document.querySelectorAll('.root[data-slide-index]').forEach(root => {
        const slideIndex = parseInt((root as HTMLElement).dataset.slideIndex!, 10);
        const rootRect = root.getBoundingClientRect();

        root.querySelectorAll('[data-node-id]').forEach(el => {
          const div = el as HTMLElement;
          const rect = div.getBoundingClientRect();
          results.push({
            slideIndex,
            nodeId: div.dataset.nodeId!,
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
            width: rect.width,
            height: rect.height,
          });
        });
      });

      return results;
    });

    // Build merged result map keyed by node identity
    // Pre-index by nodeId (globally unique from shared IdContext) for O(N) lookup
    const measurementsByNodeId = new Map(allMeasurements.map(m => [m.nodeId, m]));
    const allResults = new Map<ElementNode, Bounds>();

    for (const nodeIds of slideNodeIds) {
      for (const [node, nodeId] of nodeIds) {
        const m = measurementsByNodeId.get(nodeId);
        if (m) {
          allResults.set(node, new Bounds(
            pxToIn(m.x),
            pxToIn(m.y),
            pxToIn(m.width),
            pxToIn(m.height),
          ));
        }
      }
    }

    return allResults;
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
