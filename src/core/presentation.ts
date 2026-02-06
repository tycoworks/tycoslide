// Declarative Presentation
// Main public API for creating presentations with declarative nodes

import type { Theme } from './types.js';
import type { ElementNode } from './nodes.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import { Bounds } from './bounds.js';
import { Canvas } from './canvas.js';
import { PptxRenderer } from './renderer.js';
import { computeLayout } from './compute-layout.js';
import { render } from './render.js';
import { fontkitMeasurer } from '../utils/fontkit-measurer.js';

// ============================================
// MASTER TYPE (declarative)
// ============================================

export interface Master {
  name: string;
  background?: string;
  getContent(theme: Theme): {
    content: ElementNode;      // Footer/fixed elements as declarative nodes
    contentBounds: Bounds;     // Where slide content goes
  };
}

// ============================================
// SLIDE TYPE (declarative)
// ============================================

export interface Slide {
  master?: Master;
  background?: string;
  notes?: string;
  content: ElementNode;
}

// ============================================
// PRESENTATION CLASS
// ============================================

export class Presentation {
  private renderer: PptxRenderer;
  private _theme: Theme;
  private measurer: TextMeasurer;
  private masters = new Map<string, { contentBounds: Bounds; canvas: Canvas }>();
  private fullBounds: Bounds;
  private slideCount = 0;

  constructor(theme: Theme, measurer?: TextMeasurer) {
    this._theme = theme;
    this.measurer = measurer ?? fontkitMeasurer;
    this.renderer = new PptxRenderer(theme);

    // Calculate full slide bounds (no master - just margins)
    const { margin } = theme.spacing;
    const { width, height } = theme.slide;
    this.fullBounds = new Bounds(width, height, margin);
  }

  get theme(): Theme {
    return this._theme;
  }

  add(slide: Slide): void {
    this.slideCount++;
    const { master, content } = slide;

    // Initialize and define master on first use
    if (master && !this.masters.has(master.name)) {
      const { content: masterContent, contentBounds } = master.getContent(this._theme);

      // Render master elements using the SAME declarative pipeline
      const masterCanvas = new Canvas();
      const footerBounds = this.getFooterBounds(contentBounds);
      const positioned = computeLayout(masterContent, footerBounds, this._theme, this.measurer);
      render(positioned, masterCanvas, this._theme);

      this.renderer.defineMaster(master.name, master.background, masterCanvas, this._theme);
      this.masters.set(master.name, { contentBounds, canvas: masterCanvas });
    }

    // Get content bounds from master or use full bounds
    const bounds = master
      ? this.masters.get(master.name)!.contentBounds
      : this.fullBounds;

    // Create canvas
    const canvas = new Canvas();

    try {
      // DECLARATIVE PIPELINE:
      // 1. Compute layout (measures + positions all nodes)
      const positioned = computeLayout(content, bounds, this._theme, this.measurer);

      // 2. Render to canvas
      render(positioned, canvas, this._theme);
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

  /** Calculate footer bounds (bottom margin area) */
  private getFooterBounds(contentBounds: Bounds): Bounds {
    const { margin } = this._theme.spacing;
    const { width, height } = this._theme.slide;
    const footerHeight = margin * 0.6; // Footer takes ~60% of bottom margin
    return new Bounds(
      margin,
      height - margin + (margin - footerHeight) / 2,
      width - margin * 2,
      footerHeight,
    );
  }

  writeFile(fileName: string, options: { includeNotes?: boolean } = {}): Promise<void> {
    return this.renderer.writeFile(fileName, options);
  }
}
