// Declarative Presentation
// Main public API for creating presentations with declarative nodes
//
// All slides are stored during add() and processed during writeFile().
// This enables batching all text measurements in a single browser call.

import type { Theme } from './core/types.js';
import type { ElementNode, PositionedNode, SlideContent } from './core/nodes.js';
import { Bounds } from './core/bounds.js';
import { PptxRenderer, type Renderer } from './core/pptxRenderer.js';
import { LayoutValidator } from './layout/validator.js';
import { log } from './utils/log.js';
import { componentRegistry } from './core/componentRegistry.js';
import { LayoutPipeline } from './layout/pipeline.js';

// Footer height as proportion of margin (footer sits in bottom margin area)
const FOOTER_HEIGHT_RATIO = 0.6;

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
  content: SlideContent;
}

// ============================================
// DEFERRED SLIDE (internal)
// ============================================

interface DeferredSlide {
  slide: Slide;
  slideIndex: number;
}

// ============================================
// PRESENTATION CLASS
// ============================================

export class Presentation {
  private renderer: Renderer;
  private _theme: Theme;
  private masters = new Map<string, { contentBounds: Bounds; positioned: PositionedNode }>();
  private fullBounds: Bounds;
  private slideCount = 0;
  private deferredSlides: DeferredSlide[] = [];

  constructor(theme: Theme) {
    this._theme = theme;
    this.renderer = new PptxRenderer(theme);

    // Calculate full slide bounds (no master - just margins)
    const { margin } = theme.spacing;
    const { width, height } = theme.slide;
    this.fullBounds = new Bounds(width, height, margin);
  }

  get theme(): Theme {
    return this._theme;
  }

  /**
   * Add a slide to the presentation.
   * Slides are stored and processed in writeFile() to enable batched text measurement.
   */
  add(slide: Slide): void {
    this.slideCount++;
    log.pptx.slide('STORE slide #%d master=%s (deferred)', this.slideCount, slide.master?.name ?? 'none');
    this.deferredSlides.push({ slide, slideIndex: this.slideCount });
  }

  /** Calculate footer bounds (bottom margin area) */
  private getFooterBounds(contentBounds: Bounds): Bounds {
    const { margin } = this._theme.spacing;
    const { width, height } = this._theme.slide;
    const footerHeight = margin * FOOTER_HEIGHT_RATIO;
    return new Bounds(
      margin,
      height - margin + (margin - footerHeight) / 2,
      width - margin * 2,
      footerHeight,
    );
  }

  /**
   * Write the presentation to a file.
   * All slides are processed here with browser-based layout.
   */
  async writeFile(fileName: string, options: { includeNotes?: boolean } = {}): Promise<void> {
    if (this.deferredSlides.length > 0) {
      await this.processDeferredSlides();
    }

    return this.renderer.writeFile(fileName, options);
  }

  /**
   * Process all deferred slides using browser-based layout.
   * The browser computes all positions via CSS flexbox.
   * @internal
   */
  private async processDeferredSlides(): Promise<void> {
    const pipeline = new LayoutPipeline();

    try {
      // Phase 1: Collect all masters and their content
      log.pptx._('PIPELINE: Collecting masters and slides...');
      const pendingMasters = new Map<string, {
        master: Master;
        content: ElementNode;
        contentBounds: Bounds;
        footerBounds: Bounds;
      }>();

      // First pass: identify unique masters and get their bounds
      for (const deferred of this.deferredSlides) {
        const { master } = deferred.slide;
        if (master && !this.masters.has(master.name) && !pendingMasters.has(master.name)) {
          const { content: masterContent, contentBounds } = master.getContent(this._theme);
          const footerBounds = this.getFooterBounds(contentBounds);
          pendingMasters.set(master.name, {
            master,
            content: masterContent,
            contentBounds,
            footerBounds,
          });
          // Collect measurements from master content
          pipeline.collectFromTree(masterContent, footerBounds);
        }
      }

      // Phase 2: Expand all slides and collect measurements
      log.pptx._('PIPELINE: Expanding %d slides...', this.deferredSlides.length);
      const expandedSlides: Array<{
        deferred: DeferredSlide;
        expanded: ElementNode;
        bounds: Bounds;
      }> = [];

      for (const deferred of this.deferredSlides) {
        const { slide, slideIndex } = deferred;
        const { master, content } = slide;

        // Get bounds from pending or existing master
        let bounds: Bounds;
        if (master) {
          const pending = pendingMasters.get(master.name);
          const existing = this.masters.get(master.name);
          bounds = pending?.contentBounds ?? existing?.contentBounds ?? this.fullBounds;
        } else {
          bounds = this.fullBounds;
        }

        // Expand components
        const expanded = componentRegistry.expandTree(content, { theme: this._theme, slideIndex });

        // Collect measurements from expanded tree
        pipeline.collectFromTree(expanded, bounds);

        expandedSlides.push({ deferred, expanded, bounds });
      }

      // Phase 3: Execute browser measurements (computes ALL positions)
      log.pptx._('PIPELINE: Measuring %d slides...', pipeline.measurementCount);
      await pipeline.executeMeasurements(this._theme);

      // Phase 4: Define masters (build positioned trees from browser measurements)
      for (const [name, { master, content, contentBounds, footerBounds }] of pendingMasters) {
        log.pptx.master('DEFINE master "%s" (with measurements)', name);
        const positioned = pipeline.computeLayout(content, footerBounds);
        this.renderer.defineMaster({ name, background: master.background, content: positioned }, this._theme);
        this.masters.set(name, { contentBounds, positioned });
      }

      // Phase 5: Process each slide with browser-computed positions
      log.pptx._('PIPELINE: Processing slides with measurements...');
      for (const { deferred, expanded, bounds } of expandedSlides) {
        const { slide, slideIndex } = deferred;
        const { master } = slide;

        let positioned: PositionedNode;
        try {
          // Build positioned tree from browser measurements
          positioned = pipeline.computeLayout(expanded, bounds);

          // Validate that positioned content is within content bounds
          const validator = new LayoutValidator({
            width: bounds.x + bounds.w,   // Absolute right edge
            height: bounds.y + bounds.h,  // Absolute bottom edge (excludes footer)
          });
          const result = validator.validate(positioned);
          if (result.overflows.length > 0 || result.boundsEscapes.length > 0) {
            log.pptx._('WARNING: Slide %d has layout issues: %d overflows, %d bounds escapes',
              slideIndex + 1, result.overflows.length, result.boundsEscapes.length);
          }
        } catch (error) {
          if (error instanceof Error && !error.message.startsWith('Slide ')) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        // Render to pptx
        this.renderer.renderSlide(positioned, {
          masterName: master?.name,
          masterContent: master ? this.masters.get(master.name)!.positioned : undefined,
          background: slide.background,
          notes: slide.notes,
        }, this._theme);

        log.pptx.slide('  slide #%d complete', slideIndex);
      }

      // Clear deferred slides
      this.deferredSlides = [];

    } finally {
      // Clean up
      await pipeline.close();
    }
  }
}
