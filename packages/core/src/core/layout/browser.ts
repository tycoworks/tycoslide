// Browser Lifecycle
// Shared headless browser for layout measurement and HTML rendering.

import { chromium, type Browser, type Page } from 'playwright';

export class HeadlessBrowser {
  private browser: Browser | null = null;
  private pages: Page[] = [];

  async launch(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({ headless: true });
  }

  isLaunched(): boolean {
    return this.browser !== null;
  }

  async newPage(options?: { width?: number; height?: number; deviceScaleFactor?: number }): Promise<Page> {
    if (!this.browser) throw new Error('Browser not launched. Call launch() first.');
    const { width, height, deviceScaleFactor } = options ?? {};
    const page = await this.browser.newPage(deviceScaleFactor ? { deviceScaleFactor } : undefined);
    if (width && height) await page.setViewportSize({ width, height });
    this.pages.push(page);
    return page;
  }

  async close(): Promise<void> {
    for (const page of this.pages) {
      await page.close();
    }
    this.pages = [];
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
