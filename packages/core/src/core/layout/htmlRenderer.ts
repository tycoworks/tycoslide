// HTML-to-Image Renderer
// Renders arbitrary HTML to PNG using a dedicated Playwright page.
// Theme fonts are injected automatically for brand compliance.

import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright-core";
import type { Theme } from "../model/types.js";
import type { HeadlessBrowser } from "./browser.js";
import { generateFontFaceCSS, preloadFonts } from "./layoutHtml.js";

const DEVICE_SCALE_FACTOR = 3;

export class HtmlRenderer {
  private page: Page | null = null;
  private renderCount = 0;
  private renderLock: Promise<void> = Promise.resolve();

  constructor(
    private browser: HeadlessBrowser,
    private outputDir: string,
  ) {}

  async renderHtmlToImage(html: string, theme: Theme, transparent?: boolean): Promise<string> {
    let releaseLock: () => void;
    const acquired = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const waiting = this.renderLock;
    this.renderLock = acquired;
    await waiting;

    try {
      return await this.renderHtmlToImageImpl(html, theme, transparent);
    } finally {
      releaseLock!();
    }
  }

  private async renderHtmlToImageImpl(html: string, theme: Theme, transparent?: boolean): Promise<string> {
    if (!this.page) {
      this.page = await this.browser.newPage({
        width: Math.round(theme.slide.width),
        height: Math.round(theme.slide.height),
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      });
      this.page.on("pageerror", (err) => {
        throw new Error(`Render page error: ${err.message}`);
      });
    }

    // Inject theme fonts for brand compliance
    const { css: fontCSS, fonts: fontDescs } = generateFontFaceCSS(theme);
    const htmlWithFonts = injectFontCSS(html, fontCSS);

    // Write HTML to file and navigate with file:// origin
    const htmlPath = path.join(this.outputDir, `_render-${this.renderCount}.html`);
    fs.writeFileSync(htmlPath, htmlWithFonts);
    await this.page.goto(`file://${htmlPath}`, { waitUntil: "load" });
    await preloadFonts(this.page, fontDescs);

    // Wait for async rendering signaled by data-render-signal attribute
    const hasSignal = await this.page.evaluate(() => !!document.querySelector("[data-render-signal]"));
    if (hasSignal) {
      await this.page.waitForFunction(
        () => document.querySelector("[data-render-signal]")?.getAttribute("data-render-signal") === "done",
        { timeout: 30000 },
      );

      // Check if the in-page render reported an error
      const renderError = await this.page.evaluate(() =>
        document.querySelector("[data-render-error]")?.getAttribute("data-render-error"),
      );
      if (renderError) {
        throw new Error(`In-page render failed: ${renderError}`);
      }
    }

    // Screenshot the first child element of body
    const locator = this.page.locator("body > *:first-child");

    const imagesDir = path.join(this.outputDir, "images");
    fs.mkdirSync(imagesDir, { recursive: true });
    const outputPath = path.join(imagesDir, `_render-${this.renderCount++}.png`);
    await locator.screenshot({
      path: outputPath,
      type: "png",
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
  if (html.includes("</head>")) {
    return html.replace("</head>", `<style>${fontCSS}</style></head>`);
  }
  return `<!DOCTYPE html><html><head><style>${fontCSS}</style></head><body>${html}</body></html>`;
}
