// Declarative Presentation
// Main public API for creating presentations with declarative nodes
//
// All slides are stored during add() and processed during writeFile().
// This enables batching all text measurements in a single browser call.

import path from "node:path";
import { MissingFontError, validateFontVariants } from "../../utils/font.js";
import { log } from "../../utils/log.js";
import { LayoutPipeline } from "../layout/pipeline.js";
import type { SlideValidationResult, ValidationResult } from "../layout/validator.js";
import { LayoutValidationError, LayoutValidator } from "../layout/validator.js";
import { Bounds } from "../model/bounds.js";
import type { ElementNode, PositionedNode } from "../model/nodes.js";
import { resolveVariantTokens } from "../model/token.js";
import type { Background, Slide, Theme } from "../model/types.js";
import { PptxRenderer } from "./pptxRenderer.js";
import { componentRegistry, type RenderContext, masterRegistry } from "./registry.js";
import { validateThemeFonts } from "./themeValidator.js";

export type { Slide } from "../model/types.js";

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
  private masters = new Map<string, { contentBounds: Bounds; positioned: PositionedNode; background: Background }>();
  private masterBounds: Bounds;
  private slideCount = 0;
  private deferredSlides: DeferredSlide[] = [];

  constructor(theme: Theme, assets?: Record<string, unknown>) {
    validateThemeFonts(theme);
    this._theme = theme;
    this._assets = assets;
    this.renderer = new PptxRenderer(theme);

    const { width, height } = theme.slide;
    this.masterBounds = new Bounds(width, height); // Full slide — masters position their own content
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
    log.pptx.slide("STORE slide #%d master=%s (deferred)", slideIndex + 1, slide.masterName);
    this.deferredSlides.push({ slide, slideIndex });
  }

  /**
   * Write the presentation to a file.
   * All slides are processed here with browser-based layout.
   *
   * By default, throws MissingFontError or LayoutValidationError on validation failures.
   * Pass `force: true` to write the PPTX despite errors (for visual debugging).
   */
  async writeFile(
    fileName: string,
    options: { includeNotes?: boolean; force?: boolean; outputDir: string; renderScale?: number },
  ): Promise<WriteResult> {
    const resolvedPath = path.resolve(fileName);
    log.pptx._("writing to: %s", resolvedPath);

    let validationErrors: SlideValidationResult[] = [];
    let slides: SlideLayout[] = [];
    if (this.deferredSlides.length > 0) {
      const result = await this.processDeferredSlides({
        outputDir: options.outputDir,
        renderScale: options.renderScale,
        force: options.force,
      });
      validationErrors = result.validationErrors;
      slides = result.slides;
    }

    // Write the file (either clean, or force=true with errors)
    await this.renderer.writeFile(resolvedPath, { includeNotes: options.includeNotes });

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
    force?: boolean;
  }): Promise<{ slides: SlideLayout[]; validationErrors: SlideValidationResult[]; outputFiles: string[] }> {
    const pipeline = new LayoutPipeline({ deviceScaleFactor: options?.renderScale, outputDir: options.outputDir });

    try {
      // Launch browser — also copies fonts into outputDir for @font-face CSS
      await pipeline.launch(this._theme);

      // Build render context with canvas capability
      const renderContext: RenderContext = {
        theme: this._theme,
        assets: this._assets,
        canvas: {
          renderHtml: (html, transparent) => pipeline.renderHtmlToImage(html, this._theme, transparent),
        },
      };

      // Phase 1: Render masters (collect unique master+variant combos, render component trees)
      log.pptx._("PIPELINE: Collecting masters and slides...");
      const { width, height } = this._theme.slide;
      const pendingMasters = new Map<
        string,
        {
          content: ElementNode;
          contentBounds: Bounds;
          background: Background;
        }
      >();

      for (const deferred of this.deferredSlides) {
        const { masterName, masterVariant } = deferred.slide;
        const masterKey = `${masterName}/${masterVariant}`;

        if (!this.masters.has(masterKey) && !pendingMasters.has(masterKey)) {
          const def = masterRegistry.get(masterName);
          if (!def) {
            throw new Error(`Unknown master: '${masterName}'. Did you forget to register it?`);
          }
          const tokens = resolveVariantTokens(
            this._theme.masters?.[masterName], masterName, masterVariant, def.tokenShape, "Master",
          );
          const { content: rawMasterContent, contentBounds, background } = def.render(tokens, { width, height });
          const masterContent = await componentRegistry.renderTree(rawMasterContent, renderContext);
          pendingMasters.set(masterKey, { content: masterContent, contentBounds, background });
          // Collect measurements from master content (full slide — masters position their own elements)
          pipeline.collectFromTree(
            masterContent,
            this.masterBounds,
            `master-${masterName}-${masterVariant}`,
            background,
          );
        }
      }

      // Phase 2: Render slides (render each slide's component tree, collect measurements)
      log.pptx._("PIPELINE: Rendering %d slides...", this.deferredSlides.length);
      const renderedSlides: Array<{
        deferred: DeferredSlide;
        rendered: ElementNode;
        bounds: Bounds;
        masterKey: string;
      }> = [];

      for (const deferred of this.deferredSlides) {
        const { slide, slideIndex } = deferred;
        const { masterName, masterVariant } = slide;
        const masterKey = `${masterName}/${masterVariant}`;

        // Get bounds from pending or existing master
        const pending = pendingMasters.get(masterKey);
        const existing = this.masters.get(masterKey);
        const bounds = pending?.contentBounds ?? existing?.contentBounds;
        if (!bounds) {
          throw new Error(`Slide ${slideIndex + 1}: master '${masterKey}' not found.`);
        }

        // Render components
        let rendered: ElementNode;
        try {
          rendered = await componentRegistry.renderTree(slide.content, renderContext);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        // Collect measurements from rendered tree (slide background overrides master)
        const effectiveBg = slide.background ?? pending?.background ?? existing!.background;
        pipeline.collectFromTree(rendered, bounds, `slide-${slideIndex + 1}`, effectiveBg);

        renderedSlides.push({ deferred, rendered, bounds, masterKey });
      }

      // Missing font validation: check for bold/italic on fonts without those slots
      const allRenderedTrees = [
        ...[...pendingMasters.values()].map((m) => m.content),
        ...renderedSlides.map((s) => s.rendered),
      ];
      const rawViolations = allRenderedTrees.flatMap((tree) => validateFontVariants(tree));
      const seenViolations = new Set<string>();
      const fontVariantViolations = rawViolations.filter((v) => {
        const key = `${v.fontName}:${v.slot}`;
        if (seenViolations.has(key)) return false;
        seenViolations.add(key);
        return true;
      });

      if (fontVariantViolations.length > 0) {
        const error = new MissingFontError(fontVariantViolations);
        if (!options.force) throw error;
        console.warn(error.message);
      }

      // Phase 3: Browser measurement (execute all measurements)
      log.pptx._("PIPELINE: Measuring %d slides...", pipeline.measurementCount);
      await pipeline.executeMeasurements(this._theme);

      // Phase 4: Compute master layouts
      const masterPositionedMap = new Map<string, PositionedNode>();
      for (const [masterKey, { content, contentBounds, background }] of pendingMasters) {
        log.pptx.master('DEFINE master "%s" (with measurements)', masterKey);
        const positioned = pipeline.computeLayout(content, this.masterBounds);
        masterPositionedMap.set(masterKey, positioned);
        if (!options?.preview) {
          this.renderer.defineMaster({ name: masterKey, background, content: positioned });
          this.masters.set(masterKey, { contentBounds, positioned, background });
        }
      }

      // Phase 5: Compute slide layouts + validate
      log.pptx._("PIPELINE: Processing slides with measurements...");
      const slides: SlideLayout[] = [];
      const validationErrors: SlideValidationResult[] = [];

      for (const { deferred, rendered, bounds, masterKey } of renderedSlides) {
        const { slide, slideIndex } = deferred;

        // Build positioned tree — computation crashes are still fatal
        let positioned: PositionedNode;
        try {
          positioned = pipeline.computeLayout(rendered, bounds);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        // Validate (non-throwing) and collect errors
        const validator = new LayoutValidator({
          width: bounds.x + bounds.w, // Absolute right edge
          height: bounds.y + bounds.h, // Absolute bottom edge
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
          const masterPositioned = masterPositionedMap.get(masterKey) ?? this.masters.get(masterKey)?.positioned;

          this.renderer.renderSlide(positioned, {
            masterName: masterKey,
            masterContent: masterPositioned,
            background: slide.background,
            notes: slide.notes,
          });

          log.pptx.slide("  slide #%d complete", slideIndex);
        }
      }

      // Gate: fail by default if there are layout validation errors
      if (validationErrors.length > 0) {
        const error = new LayoutValidationError(validationErrors, this.slideCount);
        if (!options.force) throw error;
        console.warn(error.message);
      }

      if (!options?.preview) {
        this.deferredSlides = [];
      }

      // Build composite preview HTML: master chrome behind, slide content positioned within
      const fragmentMap = pipeline.getSlideFragments();
      const compositeSlides = renderedSlides.map(({ deferred, bounds }) => {
        const { slide, slideIndex } = deferred;
        const masterLabel = `master-${slide.masterName}-${slide.masterVariant}`;
        return {
          masterFragment: fragmentMap.get(masterLabel)!,
          slideFragment: fragmentMap.get(`slide-${slideIndex + 1}`)!,
          contentBounds: bounds,
          label: `slide-${slideIndex + 1}`,
        };
      });
      const outputFiles = pipeline.writePreviewFiles(compositeSlides, this._theme);

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
  async preview(options: {
    outputDir: string;
    renderScale?: number;
    force?: boolean;
  }): Promise<{ slides: SlideLayout[]; validationErrors: SlideValidationResult[]; outputFiles: string[] }> {
    return this.processDeferredSlides({
      outputDir: options.outputDir,
      renderScale: options.renderScale,
      preview: true,
      force: options.force,
    });
  }
}
