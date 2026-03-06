// Declarative Presentation
// Main public API for creating presentations with declarative nodes
//
// All slides are stored during add() and processed during writeFile().
// This enables batching all text measurements in a single browser call.

import path from 'path';
import type { Theme, Slide, Master } from '../model/types.js';
import type { ElementNode, PositionedNode } from '../model/nodes.js';
import { Bounds } from '../model/bounds.js';
import { PptxRenderer } from './pptxRenderer.js';
import { LayoutValidator, LayoutValidationError } from '../layout/validator.js';
import type { SlideValidationResult, ValidationResult } from '../layout/validator.js';
import { log } from '../../utils/log.js';
import { componentRegistry, type ExpansionContext } from './registry.js';
import { LayoutPipeline } from '../layout/pipeline.js';

export type { Slide, Master } from '../model/types.js';

// ============================================
// DEFERRED SLIDE (internal)
// ============================================

interface DeferredSlide {
  slide: Slide;
  slideIndex: number;
}

// ============================================
// WRITE RESULT
// ============================================

export interface WriteResult {
  outputPath: string;
  validationErrors: SlideValidationResult[];
  slides: SlideLayout[];
}

// ============================================
// SLIDE LAYOUT TYPES
// ============================================

export interface SlideLayout {
  slideIndex: number;
  slideName?: string;
  positioned: PositionedNode;
  bounds: Bounds;
  validationResult?: ValidationResult;
}

// ============================================
// PRESENTATION CLASS
// ============================================

export class Presentation {
  private renderer: PptxRenderer;
  private _theme: Theme;
  private _assets?: Record<string, unknown>;
  private masters = new Map<string, { contentBounds: Bounds; positioned: PositionedNode }>();
  private fullBounds: Bounds;
  private masterBounds: Bounds;
  private slideCount = 0;
  private deferredSlides: DeferredSlide[] = [];

  constructor(theme: Theme, assets?: Record<string, unknown>) {
    this._theme = theme;
    this._assets = assets;
    this.renderer = new PptxRenderer(theme);

    // Calculate full slide bounds (no master - just margins)
    const { margin } = theme.spacing;
    const { width, height } = theme.slide;
    this.fullBounds = new Bounds(width, height, margin);
    this.masterBounds = new Bounds(width, height);  // Full slide — masters position their own content
  }

  get theme(): Theme {
    return this._theme;
  }

  /**
   * Add a slide to the presentation.
   * Slides are stored and processed in writeFile() to enable batched text measurement.
   */
  add(slide: Slide): void {
    const slideIndex = this.slideCount;
    this.slideCount++;
    log.pptx.slide('STORE slide #%d master=%s (deferred)', slideIndex + 1, slide.master?.name ?? 'none');
    this.deferredSlides.push({ slide, slideIndex });
  }

  /**
   * Write the presentation to a file.
   * All slides are processed here with browser-based layout.
   *
   * By default, throws LayoutValidationError if any slides have validation errors.
   * Pass `force: true` to write the PPTX despite errors (for visual debugging).
   */
  async writeFile(fileName: string, options: { includeNotes?: boolean; force?: boolean; outputDir: string; renderScale?: number }): Promise<WriteResult> {
    const resolvedPath = path.resolve(fileName);
    log.pptx._('writing to: %s', resolvedPath);

    let validationErrors: SlideValidationResult[] = [];
    let slides: SlideLayout[] = [];
    if (this.deferredSlides.length > 0) {
      const result = await this.processDeferredSlides({ outputDir: options.outputDir, renderScale: options.renderScale });
      validationErrors = result.validationErrors;
      slides = result.slides;
    }

    // Gate: fail by default if there are validation errors
    if (validationErrors.length > 0 && !options.force) {
      throw new LayoutValidationError(validationErrors, this.slideCount);
    }

    // Write the file (either clean, or force=true with errors)
    await this.renderer.writeFile(resolvedPath, { includeNotes: options.includeNotes });

    if (validationErrors.length > 0) {
      // force=true path: warn but don't throw
      console.warn(new LayoutValidationError(validationErrors, this.slideCount).message);
    }

    return { outputPath: resolvedPath, validationErrors, slides };
  }

  /**
   * Process all deferred slides using browser-based layout.
   * The browser computes all positions via CSS flexbox.
   * When preview is true, skips renderer calls and does not clear deferredSlides.
   * @internal
   */
  private async processDeferredSlides(options: {
    outputDir: string;
    renderScale?: number;
    preview?: boolean;
  }): Promise<{ slides: SlideLayout[]; validationErrors: SlideValidationResult[]; outputFiles: string[] }> {
    const pipeline = new LayoutPipeline(options?.renderScale ? { deviceScaleFactor: options.renderScale } : undefined);

    try {
      // Launch browser early so components can use it during expansion
      await pipeline.launch();

      // Build expansion context with canvas capability
      const expansionContext: ExpansionContext = {
        theme: this._theme,
        assets: this._assets,
        canvas: {
          renderHtml: (html, transparent) =>
            pipeline.renderHtmlToImage(html, this._theme, transparent),
        },
      };

      // Phase 1: Expand masters (collect unique masters, expand component trees, collect measurements)
      log.pptx._('PIPELINE: Collecting masters and slides...');
      const pendingMasters = new Map<string, {
        master: Master;
        content: ElementNode;
        contentBounds: Bounds;
      }>();

      for (const deferred of this.deferredSlides) {
        const { master } = deferred.slide;
        if (master && !this.masters.has(master.name) && !pendingMasters.has(master.name)) {
          const { content: rawMasterContent, contentBounds } = master.getContent(this._theme);
          const masterContent = await componentRegistry.expandTree(rawMasterContent, expansionContext);
          pendingMasters.set(master.name, {
            master,
            content: masterContent,
            contentBounds,
          });
          // Collect measurements from master content (full slide — masters position their own elements)
          pipeline.collectFromTree(masterContent, this.masterBounds, `master-${master.name}`);
        }
      }

      // Phase 2: Expand slides (expand each slide's component tree, collect measurements)
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
        let expanded: ElementNode;
        try {
          expanded = await componentRegistry.expandTree(content, expansionContext);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        // Collect measurements from expanded tree
        pipeline.collectFromTree(expanded, bounds, `slide-${slideIndex + 1}`);

        expandedSlides.push({ deferred, expanded, bounds });
      }

      // Phase 3: Browser measurement (execute all measurements)
      log.pptx._('PIPELINE: Measuring %d slides...', pipeline.measurementCount);
      await pipeline.executeMeasurements(this._theme, options.outputDir);

      // Phase 4: Compute master layouts
      const masterPositionedMap = new Map<string, PositionedNode>();
      for (const [name, { master, content, contentBounds }] of pendingMasters) {
        log.pptx.master('DEFINE master "%s" (with measurements)', name);
        const positioned = pipeline.computeLayout(content, this.masterBounds);
        masterPositionedMap.set(name, positioned);
        if (!options?.preview) {
          this.renderer.defineMaster({ name, background: master.background, content: positioned });
          this.masters.set(name, { contentBounds, positioned });
        }
      }

      // Phase 5: Compute slide layouts + validate
      log.pptx._('PIPELINE: Processing slides with measurements...');
      const slides: SlideLayout[] = [];
      const validationErrors: SlideValidationResult[] = [];

      for (const { deferred, expanded, bounds } of expandedSlides) {
        const { slide, slideIndex } = deferred;

        // Build positioned tree — computation crashes are still fatal
        let positioned: PositionedNode;
        try {
          positioned = pipeline.computeLayout(expanded, bounds);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        // Validate (non-throwing) and collect errors
        const validator = new LayoutValidator({
          width: bounds.x + bounds.w,   // Absolute right edge
          height: bounds.y + bounds.h,  // Absolute bottom edge
        });
        const result = validator.validate(positioned);

        const slideLayout: SlideLayout = {
          slideIndex,
          slideName: slide.name,
          positioned,
          bounds,
        };

        if (result.overflows.length > 0 || result.overlaps.length > 0 || result.boundsEscapes.length > 0) {
          slideLayout.validationResult = result;
          validationErrors.push({ slideIndex, slideName: slide.name, result });
        }

        slides.push(slideLayout);

        if (!options?.preview) {
          const { master } = slide;
          const masterPositioned = master
            ? (masterPositionedMap.get(master.name) ?? this.masters.get(master.name)?.positioned)
            : undefined;

          this.renderer.renderSlide(positioned, {
            masterName: master?.name,
            masterContent: masterPositioned,
            background: slide.background,
            notes: slide.notes,
          });

          log.pptx.slide('  slide #%d complete', slideIndex);
        }
      }

      if (!options?.preview) {
        this.deferredSlides = [];
      }

      const outputFiles = pipeline.getOutputFiles();
      return { slides, validationErrors, outputFiles };

    } finally {
      await pipeline.close();
    }
  }

  /**
   * Preview all deferred slides — runs the full layout pipeline without generating PPTX.
   * Returns positioned node trees and validation results.
   *
   * When outputDir is provided, writes navigable HTML files for browser preview.
   * Does NOT clear deferred slides — writeFile() can still be called after.
   */
  async preview(options: { outputDir: string; renderScale?: number }): Promise<{ slides: SlideLayout[]; validationErrors: SlideValidationResult[]; outputFiles: string[] }> {
    return this.processDeferredSlides({ outputDir: options.outputDir, renderScale: options.renderScale, preview: true });
  }
}
