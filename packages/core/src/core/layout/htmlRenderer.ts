// HTML-to-Image Renderer
// Renders arbitrary HTML to PNG using a dedicated Playwright page.
// Theme fonts are injected automatically for brand compliance.

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Page } from 'playwright';
import type { Theme } from '../model/types.js';
import type { HeadlessBrowser } from './browser.js';
import { generateFontFaceCSS, preloadFonts } from './layoutHtml.js';
import { inToPx } from '../../utils/units.js';

export class HtmlRenderer {
  private page: Page | null = null;
  private tmpDir: string | null = null;
  private renderCount = 0;

  constructor(private browser: HeadlessBrowser) {}

  async renderHtmlToImage(
    html: string,
    theme: Theme,
    transparent?: boolean,
  ): Promise<string> {
    // Create dedicated render page on first use, sized to slide dimensions
    if (!this.page) {
      this.page = await this.browser.newPage({
        width: Math.round(inToPx(theme.slide.width)),
        height: Math.round(inToPx(theme.slide.height)),
      });
      this.page.on('pageerror', err => {
        throw new Error(`Render page error: ${err.message}`);
      });
    }

    // Create temp dir once, reuse for all renders
    if (!this.tmpDir) {
      this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoslide-render-'));
    }

    // Inject theme fonts for brand compliance
    const { css: fontCSS, fonts: fontDescs } = generateFontFaceCSS(theme);
    const htmlWithFonts = injectFontCSS(html, fontCSS);

    await this.page.setContent(htmlWithFonts, { waitUntil: 'load' });
    await preloadFonts(this.page, fontDescs);

    // Wait for async rendering signaled by data-render-signal attribute
    const hasSignal = await this.page.evaluate(
      () => !!document.querySelector('[data-render-signal]'),
    );
    if (hasSignal) {
      await this.page.waitForFunction(
        () => document.querySelector('[data-render-signal]')
          ?.getAttribute('data-render-signal') === 'done',
        { timeout: 30000 },
      );
    }

    // Screenshot the first child element of body
    const locator = this.page.locator('body > *:first-child');

    const outputPath = path.join(this.tmpDir, `render-${this.renderCount++}.png`);
    await locator.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: transparent ?? false,
    });

    return outputPath;
  }
}

/**
 * Inject font CSS into HTML. If the HTML has a </head> tag, inject before it.
 * Otherwise wrap the fragment in a minimal document structure.
 */
function injectFontCSS(html: string, fontCSS: string): string {
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style>${fontCSS}</style></head>`);
  }
  return `<!DOCTYPE html><html><head><style>${fontCSS}</style></head><body>${html}</body></html>`;
}
