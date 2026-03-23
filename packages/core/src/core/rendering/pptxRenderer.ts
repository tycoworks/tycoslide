// PPTX Renderer
// Renders PositionedNode trees directly to PowerPoint via pptxgenjs

import PptxGenJSDefault from "@tycoworks/pptxgenjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- CJS/ESM interop: .default exists at runtime but not in types
const PptxGenJS = (PptxGenJSDefault as any).default || PptxGenJSDefault;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>;

import { stripHash } from "../../utils/color.js";
import { contentPreview, log } from "../../utils/log.js";
import type {
  ImageNode,
  LineNode,
  PositionedNode,
  ShapeNode,
  SlideNumberNode,
  TableNode,
  TextNode,
} from "../model/nodes.js";
import { NODE_TYPE } from "../model/nodes.js";
import type { Background, Theme } from "../model/types.js";
import { CUSTOM_LAYOUT } from "../model/types.js";
import { PptxConfigBuilder } from "./pptxConfigBuilder.js";

// ============================================
// RENDERER INTERFACE
// ============================================

/** Options for rendering a slide */
export interface RenderSlideOptions {
  masterName?: string;
  masterContent?: PositionedNode; // Master's positioned content
  background?: Background;
  notes?: string;
}

/** Options for defining a master slide */
export interface MasterDefinition {
  name: string;
  background: Background;
  content: PositionedNode; // Positioned master elements
}

/** Options for writing output */
export interface WriteOptions {
  includeNotes?: boolean;
}

// ============================================
// TEXT FRAGMENT TYPES (for pptxgenjs)
// ============================================

// Extend PptxGenJS types to include internal properties (exist at runtime but not in types)
type PptxSlideInternal = PptxSlide & {
  _slideObjects?: Array<{ _type: string; [key: string]: unknown }>;
};

type PptxGenJSExtended = InstanceType<typeof PptxGenJS> & {
  slides: PptxSlideInternal[];
};

// ============================================
// PPTX RENDERER
// ============================================

export class PptxRenderer {
  private pres: InstanceType<typeof PptxGenJS>;
  private masters = new Map<string, { slideNumberOptions?: object }>();
  private config = new PptxConfigBuilder();

  constructor(theme: Theme) {
    this.pres = new PptxGenJS();
    const { layout, width, height } = theme.slide;
    if (layout === CUSTOM_LAYOUT) {
      this.pres.defineLayout({ name: CUSTOM_LAYOUT, width, height });
    }
    this.pres.layout = layout;
  }

  defineMaster(master: MasterDefinition): void {
    const { name, background, content } = master;

    // Collect master objects (excluding slideNumber which is handled separately)
    const masterObjects: object[] = [];
    let slideNumberOptions: object | undefined;

    this.collectMasterObjects(content, masterObjects, (opts) => {
      slideNumberOptions = opts;
    });

    this.pres.defineSlideMaster({
      title: name,
      background: {
        ...(background.color != null && { color: stripHash(background.color) }),
        ...(background.opacity != null && { transparency: 100 - background.opacity }),
        ...(background.path != null && { path: background.path }),
      },
      objects: masterObjects,
    });

    this.masters.set(name, { slideNumberOptions });
  }

  renderSlide(content: PositionedNode, options: RenderSlideOptions): void {
    const { masterName, masterContent: _masterContent, background, notes } = options;

    // Create pptx slide (with master if specified)
    const pptxSlide = this.pres.addSlide(masterName ? { masterName } : undefined);

    // Slide background overrides master background
    if (background) {
      pptxSlide.background = {
        ...(background.color != null && { color: stripHash(background.color) }),
        ...(background.opacity != null && { transparency: 100 - background.opacity }),
        ...(background.path != null && { path: background.path }),
      };
    }

    // Propagate master's slideNumber as default (PPTXGen.js doesn't do this itself)
    if (masterName) {
      const master = this.masters.get(masterName);
      if (master?.slideNumberOptions) {
        pptxSlide.slideNumber = master.slideNumberOptions;
      }
    }

    // Render the positioned tree directly to the slide
    this.renderNode(content, pptxSlide);

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
        slide._slideObjects = slide._slideObjects?.filter((obj: { _type: string }) => obj._type !== "notes");
      }
    }

    await this.pres.writeFile({ fileName });
  }

  // ============================================
  // PRIVATE: Render PositionedNode tree
  // ============================================

  private renderNode(positioned: PositionedNode, slide: PptxSlide): void {
    const { node, x, y, width, height, children } = positioned;

    log.render._("render %s x=%f y=%f w=%f h=%f", node.type, x, y, width, height);

    switch (node.type) {
      case NODE_TYPE.TEXT:
        this.renderText(positioned, slide);
        break;
      case NODE_TYPE.IMAGE:
        this.renderImage(positioned, slide);
        break;
      case NODE_TYPE.SHAPE:
        this.renderShape(positioned, slide);
        break;
      case NODE_TYPE.LINE:
        this.renderLine(positioned, slide);
        break;
      case NODE_TYPE.SLIDE_NUMBER:
        this.renderSlideNumber(positioned, slide);
        break;
      case NODE_TYPE.TABLE:
        this.renderTable(positioned, slide);
        break;
      case NODE_TYPE.CONTAINER:
      case NODE_TYPE.STACK:
        // Containers just render their children
        log.render._("  container %s with %d children", node.type.toUpperCase(), children?.length ?? 0);
        if (children) {
          for (const child of children) {
            this.renderNode(child, slide);
          }
        }
        break;
    }
  }

  // ============================================
  // ELEMENT-SPECIFIC RENDER METHODS
  // ============================================

  private renderText(positioned: PositionedNode, slide: PptxSlide): void {
    const textNode = positioned.node as TextNode;
    log.render.text(
      'RENDER text x=%f y=%f w=%f h=%f "%s"',
      positioned.x,
      positioned.y,
      positioned.width,
      positioned.height,
      contentPreview(textNode.content),
    );

    const { fragments, options } = this.config.buildTextConfig(textNode, positioned);
    slide.addText(fragments, options);
  }

  private renderImage(positioned: PositionedNode, slide: PptxSlide): void {
    const imageNode = positioned.node as ImageNode;
    log.render.image(
      "RENDER image x=%f y=%f w=%f h=%f src=%s",
      positioned.x,
      positioned.y,
      positioned.width,
      positioned.height,
      imageNode.src.split("/").pop(),
    );
    slide.addImage(this.config.buildImageConfig(imageNode, positioned));
  }

  private renderShape(positioned: PositionedNode, slide: PptxSlide): void {
    const shapeNode = positioned.node as ShapeNode;
    log.render.shape(
      "RENDER shape(%s) x=%f y=%f w=%f h=%f",
      shapeNode.shape,
      positioned.x,
      positioned.y,
      positioned.width,
      positioned.height,
    );

    const config = this.config.buildShapeConfig(shapeNode, positioned);
    slide.addShape(config.shapeType, config.options);
  }

  private renderLine(positioned: PositionedNode, slide: PptxSlide): void {
    const lineNode = positioned.node as LineNode;
    log.render.shape(
      "RENDER line x=%f y=%f w=%f h=%f",
      positioned.x,
      positioned.y,
      positioned.width,
      positioned.height,
    );
    const { shapeType, options } = this.config.buildLineConfig(lineNode, positioned);
    slide.addShape(shapeType, options);
  }

  private renderSlideNumber(positioned: PositionedNode, slide: PptxSlide): void {
    const slideNumNode = positioned.node as SlideNumberNode;
    log.render.text(
      "RENDER slideNumber x=%f y=%f w=%f h=%f",
      positioned.x,
      positioned.y,
      positioned.width,
      positioned.height,
    );

    slide.slideNumber = this.config.buildSlideNumberOptions(slideNumNode, positioned);
  }

  private renderTable(positioned: PositionedNode, slide: PptxSlide): void {
    const tableNode = positioned.node as TableNode;
    const { rows } = tableNode;
    const headerRows = tableNode.headerRow ? 1 : 0;
    const headerColumns = tableNode.headerCol ? 1 : 0;

    log.render._(
      "RENDER table x=%f y=%f w=%f h=%f rows=%d cols=%d",
      positioned.x,
      positioned.y,
      positioned.width,
      positioned.height,
      rows.length,
      rows[0]?.length ?? 0,
    );

    if (rows.length === 0) return;

    const numCols = rows[0]?.length ?? 0;
    if (numCols === 0) return;

    const colW = this.config.buildColumnWidths(numCols, positioned.width);

    const numRows = rows.length;
    const tableRows = rows.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        this.config.buildTableCell(cell, rowIndex, colIndex, numRows, numCols, headerRows, headerColumns, tableNode),
      ),
    );

    const tableOptions: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      colW,
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
  ): void {
    const { node, children } = positioned;

    switch (node.type) {
      case NODE_TYPE.TEXT: {
        const textNode = node as TextNode;
        const { fragments, options } = this.config.buildTextConfig(textNode, positioned);
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
        const config = this.config.buildShapeConfig(shapeNode, positioned);
        objects.push({ [config.shapeType]: config.options });
        break;
      }
      case NODE_TYPE.LINE: {
        const lineNode = node as LineNode;
        const { shapeType, options } = this.config.buildLineConfig(lineNode, positioned);
        objects.push({ [shapeType]: options });
        break;
      }
      case NODE_TYPE.SLIDE_NUMBER: {
        const slideNumNode = node as SlideNumberNode;
        onSlideNumber(this.config.buildSlideNumberOptions(slideNumNode, positioned));
        break;
      }
      case NODE_TYPE.CONTAINER:
      case NODE_TYPE.STACK:
        // Recurse into children
        if (children) {
          for (const child of children) {
            this.collectMasterObjects(child, objects, onSlideNumber);
          }
        }
        break;
    }
  }
}
