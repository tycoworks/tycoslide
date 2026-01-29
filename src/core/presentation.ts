// Presentation Class
// Main public API for creating themed presentations

import PptxGenJSDefault from 'pptxgenjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (PptxGenJSDefault as any).default || PptxGenJSDefault;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;

import { LAYER, type Theme, type Drawer, type Bounds, type Slide } from './types.js';
import { Canvas, CANVAS_OBJECT_TYPE, type CanvasObject } from './canvas.js';

// Extend PptxGenJS type to include slides array (exists at runtime but not in types)
type PptxGenJSExtended = InstanceType<typeof PptxGenJS> & {
  slides: PptxSlide[];
};

// ============================================
// PRESENTATION CLASS
// ============================================

export class Presentation {
  private pres: InstanceType<typeof PptxGenJS>;
  private _theme: Theme;
  private masters = new Map<string, { render: Drawer; contentBounds: Bounds }>();
  private fullBounds: Bounds;
  private slideCount = 0;

  constructor(theme: Theme) {
    this._theme = theme;
    this.pres = new PptxGenJS();

    // Calculate full slide bounds (no master - just margins)
    const { margin } = theme.spacing;
    const { width, height } = theme.slide;
    this.fullBounds = {
      x: margin,
      y: margin,
      w: width - margin * 2,
      h: height - margin * 2,
    };

    this.pres.defineLayout({
      name: 'CUSTOM',
      width: theme.slide.width,
      height: theme.slide.height,
    });
    this.pres.layout = 'CUSTOM';
  }

  get theme(): Theme {
    return this._theme;
  }

  add(slide: Slide): PptxSlide {
    this.slideCount++;
    const { master, draw } = slide;

    // Initialize and define master on first use
    if (master && !this.masters.has(master.name)) {
      const { render, contentBounds } = master.init(this._theme);

      // Render master elements to canvas
      const masterCanvas = new Canvas();
      render(masterCanvas);

      // Define pptx master (background required - use color fallback)
      this.pres.defineSlideMaster({
        title: master.name,
        background: master.background
          ? { path: master.background }
          : { color: this._theme.colors.background },
        objects: masterCanvas.getObjects(LAYER.SLIDE).map(obj => this.formatForMaster(obj)),
      });

      this.masters.set(master.name, { render, contentBounds });
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

    // Create pptx slide (with master if specified)
    const pptxSlide = this.pres.addSlide(
      master ? { masterName: master.name } : undefined
    );

    // Apply background only for slides without a master
    if (!master) {
      pptxSlide.background = { color: this._theme.colors.background };
    }

    // Set escape hatch for speaker notes, etc.
    canvas.raw = pptxSlide;

    // Render slide-layer objects
    this.renderToSlide(canvas.getObjects(LAYER.SLIDE), pptxSlide);

    return pptxSlide;
  }

  writeFile(fileName: string, options: { includeNotes?: boolean } = {}): Promise<void> {
    const { includeNotes = true } = options;

    // Strip speaker notes if requested
    if (!includeNotes) {
      for (const slide of (this.pres as PptxGenJSExtended).slides) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (slide as any)._slideObjects = (slide as any)._slideObjects?.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (obj: any) => obj._type !== 'notes'
        );
      }
    }

    return this.pres.writeFile({ fileName }).then(() => {});
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private renderToSlide(objects: CanvasObject[], slide: PptxSlide): void {
    for (const obj of objects) {
      if (obj.type === CANVAS_OBJECT_TYPE.TEXT) {
        slide.addText(obj.content, obj.options);
      } else if (obj.type === CANVAS_OBJECT_TYPE.SHAPE) {
        slide.addShape(obj.shapeType, obj.options);
      } else if (obj.type === CANVAS_OBJECT_TYPE.IMAGE) {
        slide.addImage(obj.options);
      }
    }
  }

  private formatForMaster(obj: CanvasObject): Record<string, unknown> {
    if (obj.type === CANVAS_OBJECT_TYPE.TEXT) {
      // With patch-package fix, pptxgenjs masters now support rich text arrays
      return { text: { text: obj.content, options: obj.options } };
    }
    if (obj.type === CANVAS_OBJECT_TYPE.IMAGE) {
      return { image: obj.options };
    }
    return { [String(obj.shapeType)]: obj.options };
  }
}
