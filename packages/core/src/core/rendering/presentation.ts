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
import type { SlideValidationResult } from '../layout/validator.js';
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
  async writeFile(fileName: string, options: { includeNotes?: boolean; force?: boolean; debugDir?: string } = {}): Promise<WriteResult> {
    const resolvedPath = path.resolve(fileName);
    log.pptx._('writing to: %s', resolvedPath);

    let validationErrors: SlideValidationResult[] = [];
    if (this.deferredSlides.length > 0) {
      validationErrors = await this.processDeferredSlides(options.debugDir);
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

    return { outputPath: resolvedPath, validationErrors };
  }

  /**
   * Process all deferred slides using browser-based layout.
   * The browser computes all positions via CSS flexbox.
   * @internal
   */
  private async processDeferredSlides(debugDir?: string): Promise<SlideValidationResult[]> {
    const pipeline = new LayoutPipeline();

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

      // Phase 1: Collect all masters and their content
      log.pptx._('PIPELINE: Collecting masters and slides...');
      const pendingMasters = new Map<string, {
        master: Master;
        content: ElementNode;
        contentBounds: Bounds;
      }>();

      // First pass: identify unique masters and get their bounds
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

      // Phase 3: Execute browser measurements (computes ALL positions)
      log.pptx._('PIPELINE: Measuring %d slides...', pipeline.measurementCount);
      await pipeline.executeMeasurements(this._theme, debugDir);

      // Phase 4: Define masters (build positioned trees from browser measurements)
      for (const [name, { master, content, contentBounds }] of pendingMasters) {
        log.pptx.master('DEFINE master "%s" (with measurements)', name);
        const positioned = pipeline.computeLayout(content, this.masterBounds);
        this.renderer.defineMaster({ name, background: master.background, content: positioned }, this._theme);
        this.masters.set(name, { contentBounds, positioned });
      }

      // Phase 5: Process each slide with browser-computed positions
      log.pptx._('PIPELINE: Processing slides with measurements...');
      const validationErrors: SlideValidationResult[] = [];

      for (const { deferred, expanded, bounds } of expandedSlides) {
        const { slide, slideIndex } = deferred;
        const { master } = slide;

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
        if (result.overflows.length > 0 || result.overlaps.length > 0 || result.boundsEscapes.length > 0) {
          validationErrors.push({ slideIndex, slideName: slide.name, result });
        }

        // Always render to pptx (pptxgenjs needs sequential slides)
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

      return validationErrors;

    } finally {
      // Clean up
      await pipeline.close();
    }
  }
}
