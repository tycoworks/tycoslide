// PptxRenderer — All PPTXGen.js-specific rendering logic
// Centralises the mapping from Canvas objects to PPTXGen.js API calls

import PptxGenJSDefault from 'pptxgenjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (PptxGenJSDefault as any).default || PptxGenJSDefault;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;

import { LAYER, CUSTOM_LAYOUT, type Theme } from './types.js';
import { Canvas, CANVAS_OBJECT_TYPE, type CanvasObject } from './canvas.js';

// Extend PptxGenJS type to include slides array (exists at runtime but not in types)
type PptxGenJSExtended = InstanceType<typeof PptxGenJS> & {
  slides: PptxSlide[];
};

export interface RenderSlideOptions {
  masterName?: string;
  masterCanvas?: Canvas;
  background?: string;
  notes?: string;
}

export class PptxRenderer {
  private pres: InstanceType<typeof PptxGenJS>;

  constructor(theme: Theme) {
    this.pres = new PptxGenJS();
    const { layout, width, height } = theme.slide;
    if (layout === CUSTOM_LAYOUT) {
      this.pres.defineLayout({ name: CUSTOM_LAYOUT, width, height });
    }
    this.pres.layout = layout;
  }

  defineMaster(name: string, background: string | undefined, canvas: Canvas, theme: Theme): void {
    const masterObjects = canvas.getObjects(LAYER.SLIDE);

    // Filter out slideNumber — PPTXGen.js doesn't support it as a master object.
    // SlideNumber is propagated per-slide in renderSlide() via the master canvas.
    const regularObjects = masterObjects.filter(obj => obj.type !== CANVAS_OBJECT_TYPE.SLIDE_NUMBER);

    this.pres.defineSlideMaster({
      title: name,
      background: background
        ? { path: background }
        : { color: theme.colors.background },
      objects: regularObjects.map(obj => this.formatForMaster(obj)),
    });
  }

  renderSlide(canvas: Canvas, options: RenderSlideOptions, theme: Theme): void {
    const { masterName, masterCanvas, background, notes } = options;

    // Create pptx slide (with master if specified)
    const pptxSlide = this.pres.addSlide(
      masterName ? { masterName } : undefined
    );

    // Slide background overrides master background
    if (background) {
      pptxSlide.background = { path: background };
    } else if (!masterName) {
      pptxSlide.background = { color: theme.colors.background };
    }

    // Propagate master's slideNumber as default (PPTXGen.js doesn't do this itself)
    if (masterCanvas) {
      const masterSlideNum = masterCanvas.getObjects(LAYER.SLIDE)
        .find(obj => obj.type === CANVAS_OBJECT_TYPE.SLIDE_NUMBER);
      if (masterSlideNum) {
        pptxSlide.slideNumber = masterSlideNum.options;
      }
    }

    // Render slide-layer canvas objects (slideNumber here overrides master default)
    for (const obj of canvas.getObjects(LAYER.SLIDE)) {
      this.renderObject(obj, pptxSlide);
    }

    // Speaker notes
    if (notes) {
      pptxSlide.addNotes(notes);
    }
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

  private renderObject(obj: CanvasObject, slide: PptxSlide): void {
    if (obj.type === CANVAS_OBJECT_TYPE.TEXT) {
      slide.addText(obj.content, obj.options);
    } else if (obj.type === CANVAS_OBJECT_TYPE.SHAPE) {
      slide.addShape(obj.shapeType, obj.options);
    } else if (obj.type === CANVAS_OBJECT_TYPE.IMAGE) {
      slide.addImage(obj.options);
    } else if (obj.type === CANVAS_OBJECT_TYPE.SLIDE_NUMBER) {
      slide.slideNumber = obj.options;
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
    if (obj.type === CANVAS_OBJECT_TYPE.SHAPE) {
      return { [String(obj.shapeType)]: obj.options };
    }
    // SlideNumber objects are handled separately, not as master objects
    return {};
  }
}
