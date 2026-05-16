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

/** pptxgenjs layout name for custom dimensions */
const PPTX_CUSTOM_LAYOUT = "CUSTOM";

import { PptxConfigBuilder } from "./pptxConfigBuilder.js";

// ============================================
// RENDERER INTERFACE
// ============================================

/** Options for rendering a slide */
export interface RenderSlideOptions {
  layoutName?: string;
  background?: Background;
  notes?: string;
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
  private definedMasters = new Set<string>();
  private config = new PptxConfigBuilder();

  constructor(theme: Theme) {
    this.pres = new PptxGenJS();
    const { width, height } = theme.slide;
    this.pres.defineLayout({ name: PPTX_CUSTOM_LAYOUT, width, height });
    this.pres.layout = PPTX_CUSTOM_LAYOUT;
  }

  /**
   * Define a PPTX slide master with background and optional master-layer objects.
   * Deduped by name — subsequent calls with the same name are no-ops.
   */
  defineMaster(name: string, background: Background, masterNodes: PositionedNode[]): void {
    if (this.definedMasters.has(name)) return;
    this.definedMasters.add(name);

    const { objects, slideNumber } = this.collectMasterObjects(masterNodes);

    this.pres.defineSlideMaster({
      title: name,
      background: {
        ...(background.color != null && { color: stripHash(background.color) }),
        ...(background.opacity != null && { transparency: 100 - background.opacity }),
        ...(background.path != null && { path: background.path }),
      },
      ...(objects.length > 0 && { objects }),
      ...(slideNumber && { slideNumber }),
    });
  }

  renderSlide(content: PositionedNode, options: RenderSlideOptions): void {
    const { layoutName, background, notes } = options;

    // Create pptx slide (with master if specified)
    const pptxSlide = this.pres.addSlide(layoutName ? { masterName: layoutName } : undefined);

    // Slide background overrides master background
    if (background) {
      pptxSlide.background = {
        ...(background.color != null && { color: stripHash(background.color) }),
        ...(background.opacity != null && { transparency: 100 - background.opacity }),
        ...(background.path != null && { path: background.path }),
      };
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
      case NODE_TYPE.GRID:
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

  private collectMasterObjects(nodes: PositionedNode[]): {
    objects: Record<string, unknown>[];
    slideNumber?: Record<string, unknown>;
  } {
    const objects: Record<string, unknown>[] = [];
    let slideNumber: Record<string, unknown> | undefined;

    const collect = (positioned: PositionedNode): void => {
      const { node, children } = positioned;
      switch (node.type) {
        case NODE_TYPE.TEXT: {
          const { fragments, options } = this.config.buildTextConfig(node as TextNode, positioned);
          objects.push({ text: { text: fragments, options } });
          break;
        }
        case NODE_TYPE.IMAGE:
          objects.push({ image: this.config.buildImageConfig(node as ImageNode, positioned) });
          break;
        case NODE_TYPE.SHAPE: {
          const { options } = this.config.buildShapeConfig(node as ShapeNode, positioned);
          objects.push({ rect: options });
          break;
        }
        case NODE_TYPE.LINE: {
          const { options } = this.config.buildLineConfig(node as LineNode, positioned);
          objects.push({ line: options });
          break;
        }
        case NODE_TYPE.SLIDE_NUMBER:
          slideNumber = this.config.buildSlideNumberOptions(node as SlideNumberNode, positioned);
          break;
        case NODE_TYPE.CONTAINER:
        case NODE_TYPE.STACK:
        case NODE_TYPE.GRID:
          if (children) {
            for (const child of children) {
              collect(child);
            }
          }
          break;
        default:
          log.render._("  master-unsupported %s, skipped", node.type);
          break;
      }
    };

    for (const node of nodes) {
      collect(node);
    }

    return { objects, slideNumber };
  }
}
