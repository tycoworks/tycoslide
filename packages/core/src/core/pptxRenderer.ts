// PPTX Renderer
// Renders PositionedNode trees directly to PowerPoint via pptxgenjs

import PptxGenJSDefault from 'pptxgenjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (PptxGenJSDefault as any).default || PptxGenJSDefault;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;

import type { PositionedNode, TextNode, ImageNode, LineNode, ShapeNode, SlideNumberNode, TableNode } from './nodes.js';
import { NODE_TYPE } from './nodes.js';
import type { Theme } from './types.js';
import { CUSTOM_LAYOUT } from './types.js';
import { PptxConfigBuilder } from './pptxConfigBuilder.js';
import { log, contentPreview } from '../utils/log.js';

// ============================================
// RENDERER INTERFACE
// ============================================

/** Options for rendering a slide */
export interface RenderSlideOptions {
  masterName?: string;
  masterContent?: PositionedNode;  // Master's positioned footer/fixed content
  background?: string;
  notes?: string;
}

/** Options for defining a master slide */
export interface MasterDefinition {
  name: string;
  background?: string;
  content: PositionedNode;  // Positioned footer/fixed elements
}

/** Options for writing output */
export interface WriteOptions {
  includeNotes?: boolean;
}

// ============================================
// TEXT FRAGMENT TYPES (for pptxgenjs)
// ============================================

// Extend PptxGenJS type to include slides array (exists at runtime but not in types)
type PptxGenJSExtended = InstanceType<typeof PptxGenJS> & {
  slides: PptxSlide[];
};

// ============================================
// PPTX RENDERER
// ============================================

export class PptxRenderer {
  private pres: InstanceType<typeof PptxGenJS>;
  private masters = new Map<string, { slideNumberOptions?: object }>();
  private theme: Theme;
  private config = new PptxConfigBuilder();

  constructor(theme: Theme) {
    this.theme = theme;
    this.pres = new PptxGenJS();
    const { layout, width, height } = theme.slide;
    if (layout === CUSTOM_LAYOUT) {
      this.pres.defineLayout({ name: CUSTOM_LAYOUT, width, height });
    }
    this.pres.layout = layout;
  }

  defineMaster(master: MasterDefinition, theme: Theme): void {
    const { name, background, content } = master;

    // Collect master objects (excluding slideNumber which is handled separately)
    const masterObjects: object[] = [];
    let slideNumberOptions: object | undefined;

    this.collectMasterObjects(content, masterObjects, (opts) => {
      slideNumberOptions = opts;
    }, theme);

    this.pres.defineSlideMaster({
      title: name,
      background: background
        ? { path: background }
        : { color: theme.colors.background },
      objects: masterObjects,
    });

    this.masters.set(name, { slideNumberOptions });
  }

  renderSlide(content: PositionedNode, options: RenderSlideOptions, theme: Theme): void {
    const { masterName, masterContent, background, notes } = options;

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
    if (masterName) {
      const master = this.masters.get(masterName);
      if (master?.slideNumberOptions) {
        pptxSlide.slideNumber = master.slideNumberOptions;
      }
    }

    // Render the positioned tree directly to the slide
    this.renderNode(content, pptxSlide, theme);

    // Speaker notes
    if (notes) {
      pptxSlide.addNotes(notes);
    }
  }

  async writeFile(fileName: string, options: WriteOptions = {}): Promise<void> {
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

    await this.pres.writeFile({ fileName });
  }

  // ============================================
  // PRIVATE: Render PositionedNode tree
  // ============================================

  private renderNode(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const { node, x, y, width, height, children } = positioned;

    log.render._('render %s x=%f y=%f w=%f h=%f', node.type, x, y, width, height);

    switch (node.type) {
      case NODE_TYPE.TEXT:
        this.renderText(positioned, slide, theme);
        break;
      case NODE_TYPE.IMAGE:
        this.renderImage(positioned, slide);
        break;
      case NODE_TYPE.SHAPE:
        this.renderShape(positioned, slide, theme);
        break;
      case NODE_TYPE.LINE:
        this.renderLine(positioned, slide, theme);
        break;
      case NODE_TYPE.SLIDE_NUMBER:
        this.renderSlideNumber(positioned, slide, theme);
        break;
      case NODE_TYPE.TABLE:
        this.renderTable(positioned, slide, theme);
        break;
      case NODE_TYPE.CONTAINER:
      case NODE_TYPE.STACK:
        // Containers just render their children
        log.render._('  container %s with %d children', node.type.toUpperCase(), children?.length ?? 0);
        if (children) {
          for (const child of children) {
            this.renderNode(child, slide, theme);
          }
        }
        break;
    }
  }

  // ============================================
  // ELEMENT-SPECIFIC RENDER METHODS
  // ============================================

  private renderText(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const textNode = positioned.node as TextNode;
    log.render.text('RENDER text x=%f y=%f w=%f h=%f "%s"',
      positioned.x, positioned.y, positioned.width, positioned.height, contentPreview(textNode.content));

    const { fragments, options } = this.config.buildTextConfig(textNode, positioned, theme);
    slide.addText(fragments, options);
  }

  private renderImage(positioned: PositionedNode, slide: PptxSlide): void {
    const imageNode = positioned.node as ImageNode;
    log.render.image('RENDER image x=%f y=%f w=%f h=%f src=%s',
      positioned.x, positioned.y, positioned.width, positioned.height, imageNode.src.split('/').pop());
    slide.addImage(this.config.buildImageConfig(imageNode, positioned));
  }

  private renderShape(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const shapeNode = positioned.node as ShapeNode;
    log.render.shape('RENDER shape(%s) x=%f y=%f w=%f h=%f',
      shapeNode.shape, positioned.x, positioned.y, positioned.width, positioned.height);

    const config = this.config.buildShapeConfig(shapeNode, positioned, theme);
    if (config) {
      slide.addShape(config.shapeType, config.options);
    }
  }

  private renderLine(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const lineNode = positioned.node as LineNode;
    log.render.shape('RENDER line x=%f y=%f w=%f h=%f', positioned.x, positioned.y, positioned.width, positioned.height);
    const { shapeType, options } = this.config.buildLineConfig(lineNode, positioned, theme);
    slide.addShape(shapeType, options);
  }

  private renderSlideNumber(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const slideNumNode = positioned.node as SlideNumberNode;
    log.render.text('RENDER slideNumber x=%f y=%f w=%f h=%f',
      positioned.x, positioned.y, positioned.width, positioned.height);

    slide.slideNumber = this.config.buildSlideNumberOptions(slideNumNode, positioned, theme);
  }

  private renderTable(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const tableNode = positioned.node as TableNode;
    const { rows, headerRows = 0, headerColumns = 0, style } = tableNode;

    log.render._('RENDER table x=%f y=%f w=%f h=%f rows=%d cols=%d',
      positioned.x, positioned.y, positioned.width, positioned.height,
      rows.length, rows[0]?.length ?? 0);

    if (rows.length === 0) return;

    const numCols = rows[0]?.length ?? 0;
    if (numCols === 0) return;

    const colW = this.config.buildColumnWidths(numCols, positioned.width);

    const numRows = rows.length;
    const tableRows = rows.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        this.config.buildTableCell(cell, rowIndex, colIndex, numRows, numCols, headerRows, headerColumns, style, theme)
      )
    );

    const tableOptions: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      colW,
      margin: 0,
    };

    slide.addTable(tableRows, tableOptions);
  }

  // ============================================
  // MASTER OBJECT COLLECTION
  // ============================================

  private collectMasterObjects(
    positioned: PositionedNode,
    objects: object[],
    onSlideNumber: (opts: object) => void,
    theme: Theme
  ): void {
    const { node, children } = positioned;

    switch (node.type) {
      case NODE_TYPE.TEXT: {
        const textNode = node as TextNode;
        const { fragments, options } = this.config.buildTextConfig(textNode, positioned, theme);
        // Pass fragments array — patched pptxgenjs handles Array.isArray in createSlideMaster.
        // See patches/pptxgenjs+4.0.1.patch (root level for hoisted node_modules).
        objects.push({ text: { text: fragments, options } });
        break;
      }
      case NODE_TYPE.IMAGE: {
        const imageNode = node as ImageNode;
        objects.push({ image: this.config.buildImageConfig(imageNode, positioned) });
        break;
      }
      case NODE_TYPE.SHAPE: {
        const shapeNode = node as ShapeNode;
        const config = this.config.buildShapeConfig(shapeNode, positioned, theme);
        if (config) {
          objects.push({ [config.shapeType]: config.options });
        }
        break;
      }
      case NODE_TYPE.LINE: {
        const lineNode = node as LineNode;
        const { shapeType, options } = this.config.buildLineConfig(lineNode, positioned, theme);
        objects.push({ [shapeType]: options });
        break;
      }
      case NODE_TYPE.SLIDE_NUMBER: {
        const slideNumNode = node as SlideNumberNode;
        onSlideNumber(this.config.buildSlideNumberOptions(slideNumNode, positioned, theme));
        break;
      }
      case NODE_TYPE.CONTAINER:
      case NODE_TYPE.STACK:
        // Recurse into children
        if (children) {
          for (const child of children) {
            this.collectMasterObjects(child, objects, onSlideNumber, theme);
          }
        }
        break;
    }
  }
}
