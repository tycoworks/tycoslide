// Layout Measurement Engine
// Browser-based measurement using Playwright
// The browser is the single source of truth for all layout positions.

import fs from 'fs';
import path from 'path';
import type { Page } from 'playwright';
import type { Theme, Background } from '../model/types.js';
import type { ElementNode } from '../model/nodes.js';
import { Bounds } from '../model/bounds.js';
import type { HeadlessBrowser } from './browser.js';
import { generateLayoutHTML, preloadFonts, measureFontNormalRatios, type FontNormalRatios, type FontDescriptor } from './layoutHtml.js';
import { pxToIn } from '../../utils/units.js';
import { log } from '../../utils/log.js';

// ============================================
// LAYOUT MEASURER
// ============================================

/**
 * Browser-based layout measurer using Playwright.
 * Generates HTML with CSS flexbox, lets the browser compute all positions,
 * then extracts {x, y, width, height} for every node.
 */
export class LayoutMeasurer {
  private page: Page | null = null;
  private fontNormalRatios: FontNormalRatios = new Map();
  private fontDescriptors: FontDescriptor[] = [];

  constructor(private browser: HeadlessBrowser) {}

  async init(): Promise<void> {
    if (!this.page) {
      this.page = await this.browser.newPage();
    }
  }

  /**
   * Measure all slides in a single browser round-trip.
   * Generates one HTML page with all slides, loads fonts once,
   * and extracts all measurements in one page.evaluate().
   */
  async measureLayout(
    slides: Array<{ tree: ElementNode; bounds: Bounds; label: string; background: Background }>,
    theme: Theme,
    outputDir: string,
  ): Promise<{ measurements: Map<ElementNode, Bounds>; outputFiles: string[] }> {
    if (!this.page) {
      throw new Error('Measurer not initialized. Call init() first.');
    }

    // Ensure font metrics are measured (idempotent)
    if (this.fontNormalRatios.size === 0) {
      const result = await measureFontNormalRatios(this.page, theme);
      this.fontNormalRatios = result.ratios;
      this.fontDescriptors = result.fonts;
    }

    // Generate single HTML page containing all slides
    const labels = slides.map(s => s.label);
    const { html, slideNodeIds, perSlideHtml } = generateLayoutHTML(slides, theme, labels, this.fontNormalRatios);

    const outputFiles: string[] = [];
    for (let i = 0; i < perSlideHtml.length; i++) {
      const label = labels[i]!;
      const filePath = path.join(outputDir, `${label}.html`);
      fs.writeFileSync(filePath, perSlideHtml[i]!);
      outputFiles.push(filePath);
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

    const screenshotPath = path.join(outputDir, 'screenshot.png');
    await this.page!.screenshot({ path: screenshotPath, fullPage: true });
    log.layout.measure('saved output files to %s', outputDir);
    if (log.layout.measure.enabled) {
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

    return { measurements: allResults, outputFiles };
  }

  /** Log measured dimensions for every node across all slides. */
  private async logNodeDimensions(): Promise<void> {
    const allDims = await this.page!.evaluate(() => {
      const results: string[] = [];
      document.querySelectorAll('.root[data-slide-index]').forEach(root => {
        const slideIndex = (root as HTMLElement).dataset.slideIndex;
        const rootRect = root.getBoundingClientRect();
        results.push(`[slide ${slideIndex}] ROOT: ${rootRect.width.toFixed(1)}x${rootRect.height.toFixed(1)} at (${rootRect.left.toFixed(1)},${rootRect.top.toFixed(1)})`);

        root.querySelectorAll('[data-node-id]').forEach(el => {
          const div = el as HTMLElement;
          const rect = div.getBoundingClientRect();
          const computed = getComputedStyle(div);
          const text = div.textContent?.substring(0, 40)?.trim() || '';
          const display = computed.display;
          const width = computed.width;
          const font = computed.fontFamily?.substring(0, 30);
          results.push(`[slide ${slideIndex}] ${div.dataset.nodeId}: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} at (${rect.left.toFixed(1)},${rect.top.toFixed(1)}) display=${display} cssW=${width} font="${font}" "${text}"`);
        });
      });
      return results;
    });
    allDims.forEach(d => log.layout.measure('node-dim: %s', d));
  }
}
