// Browser-based Text Measurer
// Uses Puppeteer for accurate text measurement via real CSS layout engine

import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { TextMeasurer } from './text-measurer.js';
import type { TextContent, TextStyle, Theme, Slide } from '../core/types.js';
import { FONT_WEIGHT } from '../core/types.js';
import { Bounds } from '../core/bounds.js';
import { Canvas } from '../core/canvas.js';
import { normalizeContent, getFontFromFamily } from './font-utils.js';

/**
 * Key for looking up stored measurements.
 * Format: fontName|fontSize|fontWeight|availableWidth|content
 */
function makeKey(fontName: string, fontSize: number, fontWeight: string, availableWidth: number, content: string): string {
  return `${fontName}|${fontSize}|${fontWeight}|${availableWidth.toFixed(4)}|${content}`;
}

/**
 * Key for looking up line height by style.
 * Format: fontName|fontSize|fontWeight
 */
function makeStyleKey(fontName: string, fontSize: number, fontWeight: string): string {
  return `${fontName}|${fontSize}|${fontWeight}`;
}

/**
 * BrowserMeasurer provides accurate text measurement using Puppeteer.
 *
 * Usage:
 * 1. const measurer = new BrowserMeasurer();
 * 2. await measurer.initialize(theme);
 * 3. const dsl = createDSL(theme, measurer);
 * 4. const slides = buildPresentation(dsl);
 * 5. await measurer.measure(slides);  // Pass 1: collect and measure
 * 6. // Generate PPTX - getHeight() reads from stored measurements
 * 7. await measurer.shutdown();
 */
export class BrowserMeasurer implements TextMeasurer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private theme: Theme | null = null;

  // Stored measurements from browser
  private lineHeights = new Map<string, number>();
  private lineCounts = new Map<string, number>();

  // For getContentWidth - delegate to fontkit since it's accurate for single-line width
  private fontkitMeasurer: TextMeasurer | null = null;

  /**
   * Initialize the browser and load fonts.
   */
  async initialize(theme: Theme): Promise<void> {
    this.theme = theme;
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();

    // Import fontkit measurer for width calculations
    const { fontkitMeasurer } = await import('./fontkit-measurer.js');
    this.fontkitMeasurer = fontkitMeasurer;

    // Set up page with font-face declarations
    const fontFaces = this.generateFontFaces(theme);
    await this.page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${fontFaces}
          * { margin: 0; padding: 0; box-sizing: border-box; }
        </style>
      </head>
      <body></body>
      </html>
    `);

    // Wait for fonts to load
    await this.page.evaluate(() => document.fonts.ready);
  }

  /**
   * Shutdown the browser.
   */
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Pass 1: Collect all measurements needed by slides, then measure in browser.
   * This does a dry-run of all slides to discover what measurements are needed,
   * then batch-measures them in the browser.
   */
  async measure(slides: Slide[]): Promise<void> {
    if (!this.page || !this.theme) {
      throw new Error('BrowserMeasurer not initialized. Call initialize(theme) first.');
    }

    await this.collectAndMeasure(slides);
  }

  /**
   * Internal implementation of measure() using state-based recording.
   */
  private pendingLines: Array<{ fontName: string; fontSize: number; fontWeight: string; availableWidth: number; content: string }> = [];
  private pendingLineHeights: Array<{ fontName: string; fontSize: number; fontWeight: string }> = [];
  private recording = false;

  private async collectAndMeasure(slides: Slide[]): Promise<void> {
    if (!this.page || !this.theme) return;

    // Phase 1: Recording mode - collect measurement requests
    this.recording = true;
    this.pendingLines = [];
    this.pendingLineHeights = [];

    const mockCanvas = this.createMockCanvas();
    const margin = this.theme.spacing.margin;
    const slideWidth = this.theme.slide.width ?? 13.333;
    const slideHeight = this.theme.slide.height ?? 7.5;
    const defaultBounds = new Bounds(margin, margin, slideWidth - 2 * margin, slideHeight - 2 * margin);

    for (const slide of slides) {
      let bounds = defaultBounds;
      if (slide.master) {
        const masterInit = slide.master.init(this.theme);
        bounds = masterInit.contentBounds;
      }
      try {
        slide.draw(mockCanvas, bounds);
      } catch {
        // Ignore errors during dry run
      }
    }

    this.recording = false;

    // Phase 2: Deduplicate and measure in browser
    await this.measureInBrowser();
  }

  /**
   * Batch measure all pending measurements in the browser.
   */
  private async measureInBrowser(): Promise<void> {
    if (!this.page) return;

    // Deduplicate line height requests
    const uniqueStyleKeys = new Set<string>();
    const styleRequests: Array<{ fontName: string; fontSize: number; fontWeight: string; key: string }> = [];

    for (const req of this.pendingLineHeights) {
      const key = makeStyleKey(req.fontName, req.fontSize, req.fontWeight);
      if (!uniqueStyleKeys.has(key)) {
        uniqueStyleKeys.add(key);
        styleRequests.push({ ...req, key });
      }
    }

    // Deduplicate line count requests
    const uniqueLineKeys = new Set<string>();
    const lineRequests: Array<{ fontName: string; fontSize: number; fontWeight: string; availableWidth: number; content: string; key: string }> = [];

    for (const req of this.pendingLines) {
      const key = makeKey(req.fontName, req.fontSize, req.fontWeight, req.availableWidth, req.content);
      if (!uniqueLineKeys.has(key)) {
        uniqueLineKeys.add(key);
        lineRequests.push({ ...req, key });
      }
    }

    // Measure line heights in browser
    for (const req of styleRequests) {
      const lineHeight = await this.page.evaluate(
        (args: { fontName: string; fontSize: number }) => {
          const div = document.createElement('div');
          div.style.fontFamily = args.fontName;
          div.style.fontSize = `${args.fontSize}pt`;
          div.style.lineHeight = 'normal';
          div.style.position = 'absolute';
          div.style.visibility = 'hidden';
          div.textContent = 'Mg'; // Characters with ascenders and descenders
          document.body.appendChild(div);
          const height = div.offsetHeight;
          document.body.removeChild(div);
          return height; // Returns pixels
        },
        { fontName: req.fontName, fontSize: req.fontSize }
      );
      // Convert pixels to inches (assuming 96 DPI screen)
      this.lineHeights.set(req.key, lineHeight / 96);
    }

    // Measure line counts in browser
    for (const req of lineRequests) {
      const lines = await this.page.evaluate(
        (args: { fontName: string; fontSize: number; availableWidth: number; content: string }) => {
          const div = document.createElement('div');
          div.style.fontFamily = args.fontName;
          div.style.fontSize = `${args.fontSize}pt`;
          div.style.lineHeight = 'normal';
          div.style.width = `${args.availableWidth}in`;
          div.style.position = 'absolute';
          div.style.visibility = 'hidden';
          div.style.whiteSpace = 'pre-wrap';
          div.style.wordWrap = 'break-word';
          div.textContent = args.content;
          document.body.appendChild(div);

          // Get computed line height and total height
          const computed = window.getComputedStyle(div);
          const lineHeightPx = parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) * 1.2);
          const totalHeight = div.offsetHeight;
          document.body.removeChild(div);

          return Math.max(1, Math.round(totalHeight / lineHeightPx));
        },
        { fontName: req.fontName, fontSize: req.fontSize, availableWidth: req.availableWidth, content: req.content }
      );
      this.lineCounts.set(req.key, lines);
    }
  }

  // ============================================
  // TextMeasurer Interface (sync, reads from stored)
  // ============================================

  getStyleLineHeight(style: TextStyle): number {
    const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const font = getFontFromFamily(style.fontFamily, defaultWeight);
    const key = makeStyleKey(font.name, style.fontSize, defaultWeight);

    if (this.recording) {
      // Recording mode: collect request, return dummy
      this.pendingLineHeights.push({
        fontName: font.name,
        fontSize: style.fontSize,
        fontWeight: defaultWeight,
      });
      return 0.25; // Dummy value
    }

    const cached = this.lineHeights.get(key);
    if (cached !== undefined) {
      return cached;
    }

    throw new Error(
      `BrowserMeasurer: line height not found for style "${key}". ` +
      `Ensure measure(slides) was called before layout.`
    );
  }

  estimateLines(content: TextContent, style: TextStyle, availableWidth: number): number {
    const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
    const font = getFontFromFamily(style.fontFamily, defaultWeight);
    const runs = normalizeContent(content);
    const text = runs.map(r => r.text).join('');
    const key = makeKey(font.name, style.fontSize, defaultWeight, availableWidth, text);

    if (this.recording) {
      // Recording mode: collect request, return dummy
      this.pendingLines.push({
        fontName: font.name,
        fontSize: style.fontSize,
        fontWeight: defaultWeight,
        availableWidth,
        content: text,
      });
      return 1; // Dummy value
    }

    const cached = this.lineCounts.get(key);
    if (cached !== undefined) {
      return cached;
    }

    throw new Error(
      `BrowserMeasurer: line count not found for "${text.slice(0, 40)}..." at width ${availableWidth.toFixed(3)}". ` +
      `Ensure measure(slides) was called before layout.`
    );
  }

  getContentWidth(content: TextContent, style: TextStyle): number {
    // Width measurement is accurate with fontkit - no browser needed
    if (this.fontkitMeasurer) {
      return this.fontkitMeasurer.getContentWidth(content, style);
    }
    throw new Error('BrowserMeasurer: fontkitMeasurer not initialized');
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Generate @font-face declarations for all fonts in theme.
   */
  private generateFontFaces(theme: Theme): string {
    const faces: string[] = [];
    const seen = new Set<string>();

    // Collect all fonts from text styles
    for (const style of Object.values(theme.textStyles)) {
      for (const [weight, font] of Object.entries(style.fontFamily)) {
        if (font && !seen.has(font.path)) {
          seen.add(font.path);
          faces.push(`
            @font-face {
              font-family: '${font.name}';
              src: url('file://${font.path}');
              font-weight: ${this.cssWeight(weight)};
            }
          `);
        }
      }
    }

    return faces.join('\n');
  }

  /**
   * Convert font weight name to CSS numeric weight.
   */
  private cssWeight(weight: string): number {
    const weights: Record<string, number> = {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    };
    return weights[weight.toLowerCase()] ?? 400;
  }

  /**
   * Create a mock canvas for dry-run (just collects objects, we don't use them).
   */
  private createMockCanvas(): Canvas {
    return new Canvas();
  }
}
