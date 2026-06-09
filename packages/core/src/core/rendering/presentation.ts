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
import type { ElementNode, Layer, LayoutNode, PositionedNode, SlideNode } from "../model/nodes.js";
import { isComponentNode, isLayeredNode, isLayoutNode, LAYER } from "../model/nodes.js";
import type { Slide, Theme } from "../model/types.js";
import type { Canvas, ComponentDefinition, RenderContext } from "./definitions.js";
import { PptxRenderer } from "./pptxRenderer.js";

// ============================================
// LAYER SPLITTING
// ============================================

interface LayerSplit {
  masterNodes: PositionedNode[];
  contentNodes: PositionedNode[];
}

/**
 * Partition a positioned tree by render layer.
 *
 * Containers tagged with `LAYER.MASTER` pass that preference to their children.
 * A nested container can override back to `LAYER.CONTENT` (or vice versa).
 * Leaf nodes inherit the layer of their nearest tagged ancestor.
 *
 * The root container itself is never included — only its descendants are split.
 */
function splitByLayer(root: PositionedNode): LayerSplit {
  const masterNodes: PositionedNode[] = [];
  const contentNodes: PositionedNode[] = [];

  if (!root.children) {
    return { masterNodes, contentNodes: [root] };
  }

  for (const child of root.children) {
    collectByLayer(child, undefined, masterNodes, contentNodes);
  }

  return { masterNodes, contentNodes };
}

function collectByLayer(
  node: PositionedNode,
  inherited: Layer | undefined,
  master: PositionedNode[],
  content: PositionedNode[],
): void {
  const effective = isLayeredNode(node.node) ? node.node.layer : inherited;

  // Leaf node or container with no children — route by effective layer
  if (!node.children || !isLayoutNode(node.node)) {
    if (effective === LAYER.MASTER) {
      master.push(node);
    } else {
      content.push(node);
    }
    return;
  }

  // Container — recurse into children, passing effective layer down
  for (const child of node.children) {
    collectByLayer(child, effective, master, content);
  }
}

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

/** Configuration for creating a presentation. */
export interface PresentationConfig {
  theme: Theme;
  components: ComponentDefinition<any, any, any>[];
}

/** Create a stateless presentation instance. No global registries needed. */
export function createPresentation(config: PresentationConfig): Presentation {
  return new Presentation(config);
}

export class Presentation {
  private renderer: PptxRenderer;
  private _theme: Theme;
  private componentDefs: Map<string, ComponentDefinition<any, any, any>>;
  private slideBounds: Bounds;
  private slideCount = 0;
  private deferredSlides: DeferredSlide[] = [];

  constructor(config: PresentationConfig) {
    this._theme = config.theme;
    this.renderer = new PptxRenderer(config.theme);
    this.componentDefs = new Map(config.components.map((c) => [c.name, c]));

    const { width, height } = config.theme.slide;
    this.slideBounds = new Bounds(width, height);
  }

  get theme(): Theme {
    return this._theme;
  }

  /** Recursively render a component tree using local component definitions. */
  private async renderTree(node: SlideNode, context: RenderContext): Promise<ElementNode> {
    if (isComponentNode(node)) {
      const def = this.componentDefs.get(node.componentName);
      if (!def) {
        throw new Error(`Unknown component: '${node.componentName}'. Did you forget to register it?`);
      }
      const rendered = await def.render(node.params, node.content, context, node.tokens as any);
      const resolved = await this.renderTree(rendered, context);
      if (node.layer && isLayeredNode(resolved)) {
        resolved.layer = node.layer;
      }
      return resolved;
    }

    if (isLayoutNode(node as ElementNode)) {
      const layout = node as LayoutNode;
      return {
        ...layout,
        children: await Promise.all(layout.children.map((c) => this.renderTree(c, context))),
      } as LayoutNode;
    }

    return node as ElementNode;
  }

  /**
   * Add a slide to the presentation.
   * Slides are stored and processed in writeFile() to enable batched text measurement.
   */
  add(slide: Slide): void {
    const slideIndex = this.slideCount;
    this.slideCount++;
    log.pptx.slide("STORE slide #%d layout=%s (deferred)", slideIndex + 1, slide.layoutName);
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
    options: { includeNotes?: boolean; force?: boolean; outputDir: string },
  ): Promise<WriteResult> {
    const resolvedPath = path.resolve(fileName);
    log.pptx._("writing to: %s", resolvedPath);

    let validationErrors: SlideValidationResult[] = [];
    let slides: SlideLayout[] = [];
    if (this.deferredSlides.length > 0) {
      const result = await this.processDeferredSlides({
        outputDir: options.outputDir,
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
    preview?: boolean;
    force?: boolean;
  }): Promise<{ slides: SlideLayout[]; validationErrors: SlideValidationResult[]; outputFiles: string[] }> {
    const pipeline = new LayoutPipeline({ outputDir: options.outputDir });

    try {
      // Launch browser — also copies fonts into outputDir for @font-face CSS
      await pipeline.launch(this._theme);

      // Build base context (slideNumber set per-slide in the loop)
      const baseCanvas: Canvas = {
        renderHtml: (html, transparent) => pipeline.renderHtmlToImage(html, this._theme, transparent),
      };

      // Phase 1: Render slides (render each slide's component tree, collect measurements)
      log.pptx._("PIPELINE: Rendering %d slides...", this.deferredSlides.length);
      const renderedSlides: Array<{
        deferred: DeferredSlide;
        rendered: ElementNode;
        layoutName: string;
      }> = [];

      for (const deferred of this.deferredSlides) {
        const { slide, slideIndex } = deferred;
        const layoutName = slide.layoutName;

        const renderContext: RenderContext = {
          theme: this._theme,
          canvas: baseCanvas,
          slideNumber: slideIndex + 1,
          renderTree: (node) => this.renderTree(node, renderContext),
        };

        // Render components at full slide bounds (chrome is part of the layout tree)
        let rendered: ElementNode;
        try {
          rendered = await this.renderTree(slide.content, renderContext);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        pipeline.collectFromTree(rendered, this.slideBounds, `slide-${slideIndex + 1}`, slide.background);

        renderedSlides.push({ deferred, rendered, layoutName });
      }

      // Missing font validation: check for bold/italic on fonts without those slots
      const rawViolations = renderedSlides.map((s) => s.rendered).flatMap((tree) => validateFontVariants(tree));
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

      // Phase 2: Browser measurement (execute all measurements)
      log.pptx._("PIPELINE: Measuring %d slides...", pipeline.measurementCount);
      await pipeline.executeMeasurements(this._theme);

      // Phase 3: Layout, layer split, master definition, validation
      log.pptx._("PIPELINE: Processing slides with measurements...");
      const slides: SlideLayout[] = [];
      const validationErrors: SlideValidationResult[] = [];

      for (const { deferred, rendered, layoutName } of renderedSlides) {
        const { slide, slideIndex } = deferred;

        // Build positioned tree
        let positioned: PositionedNode;
        try {
          positioned = pipeline.computeLayout(rendered, this.slideBounds);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Slide ${slideIndex + 1}: ${error.message}`;
          }
          throw error;
        }

        // Validate (non-throwing) and collect errors
        const validator = new LayoutValidator({
          width: this.slideBounds.x + this.slideBounds.w,
          height: this.slideBounds.y + this.slideBounds.h,
        });
        const result = validator.validate(positioned);

        const slideLayout: SlideLayout = {
          slideIndex,
          slideName: slide.name,
          positioned,
          bounds: this.slideBounds,
        };

        if (result.overflows.length > 0 || result.overlaps.length > 0 || result.boundsEscapes.length > 0) {
          slideLayout.validationResult = result;
          validationErrors.push({ slideIndex, slideName: slide.name, result });
        }

        slides.push(slideLayout);

        if (!options?.preview) {
          const layoutConfig = this._theme.layouts[layoutName];
          const { masterNodes, contentNodes } = splitByLayer(positioned);

          // Define master with background + master-layer objects (dedup by layout name)
          if (layoutConfig) {
            this.renderer.defineMaster(layoutName, layoutConfig.background, masterNodes);
          }

          // Render content-only tree to the slide
          const contentRoot: PositionedNode = { ...positioned, children: contentNodes };
          this.renderer.renderSlide(contentRoot, {
            layoutName: layoutConfig ? layoutName : undefined,
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

      // Build preview HTML
      const fragmentMap = pipeline.getSlideFragments();
      const previewSlides = renderedSlides.map(({ deferred }) => ({
        fragment: fragmentMap.get(`slide-${deferred.slideIndex + 1}`)!,
        label: `slide-${deferred.slideIndex + 1}`,
      }));
      const outputFiles = pipeline.writePreviewFiles(previewSlides, this._theme);

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
    force?: boolean;
  }): Promise<{ slides: SlideLayout[]; validationErrors: SlideValidationResult[]; outputFiles: string[] }> {
    return this.processDeferredSlides({
      outputDir: options.outputDir,
      preview: true,
      force: options.force,
    });
  }
}
