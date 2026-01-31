// Presentation Class
// Main public API for creating themed presentations

import { type Theme, type Bounds, type Slide } from './types.js';
import { Canvas } from './canvas.js';
import { PptxRenderer } from './renderer.js';

// ============================================
// PRESENTATION CLASS
// ============================================

export class Presentation {
  private renderer: PptxRenderer;
  private _theme: Theme;
  private masters = new Map<string, { contentBounds: Bounds; canvas: Canvas }>();
  private fullBounds: Bounds;
  private slideCount = 0;

  constructor(theme: Theme) {
    this._theme = theme;
    this.renderer = new PptxRenderer(theme);

    // Calculate full slide bounds (no master - just margins)
    const { margin } = theme.spacing;
    const { width, height } = theme.slide;
    this.fullBounds = {
      x: margin,
      y: margin,
      w: width - margin * 2,
      h: height - margin * 2,
    };
  }

  get theme(): Theme {
    return this._theme;
  }

  add(slide: Slide): void {
    this.slideCount++;
    const { master, draw } = slide;

    // Initialize and define master on first use
    if (master && !this.masters.has(master.name)) {
      const { render, contentBounds } = master.init(this._theme);

      // Render master elements to canvas
      const masterCanvas = new Canvas();
      render(masterCanvas);

      this.renderer.defineMaster(master.name, master.background, masterCanvas, this._theme);
      this.masters.set(master.name, { contentBounds, canvas: masterCanvas });
    }

    // Get content bounds from master or use full bounds
    const bounds = master
      ? this.masters.get(master.name)!.contentBounds
      : this.fullBounds;

    // Create canvas and draw slide content
    const canvas = new Canvas();
    try {
      draw(canvas, bounds);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Slide ${this.slideCount}: ${error.message}`;
      }
      throw error;
    }

    // Render to pptx
    this.renderer.renderSlide(canvas, {
      masterName: master?.name,
      masterCanvas: master ? this.masters.get(master.name)!.canvas : undefined,
      background: slide.background,
      notes: slide.notes,
    }, this._theme);
  }

  writeFile(fileName: string, options: { includeNotes?: boolean } = {}): Promise<void> {
    return this.renderer.writeFile(fileName, options);
  }
}
