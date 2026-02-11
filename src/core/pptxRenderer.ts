// PPTX Renderer
// Renders PositionedNode trees directly to PowerPoint via pptxgenjs

import PptxGenJSDefault from 'pptxgenjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (PptxGenJSDefault as any).default || PptxGenJSDefault;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;

import type { PositionedNode, TextNode, ImageNode, RectangleNode, LineNode, SlideNumberNode, TableNode, TableCellData } from './nodes.js';
import { NODE_TYPE } from './nodes.js';
import type { Theme, TextStyleName, TextContent } from './types.js';
import { CUSTOM_LAYOUT, SHAPE, TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT, BORDER_STYLE } from './types.js';
import { getFontFromFamily, normalizeContent, resolveLineHeight } from '../utils/text.js';
import { readImageDimensions } from '../utils/image.js';
import { log, contentPreview } from '../utils/log.js';

// ============================================
// HELPERS
// ============================================

/** Center a fitted extent within a box extent, returning [offset, extent]. */
function containFit(boxExtent: number, fitExtent: number, offset: number): [number, number] {
  return [offset + (boxExtent - fitExtent) / 2, fitExtent];
}

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

/**
 * Common interface for all output renderers.
 *
 * Renderers consume PositionedNode trees and produce output in their target format.
 * This enables multiple output formats (PPTX, HTML, PDF) from the same layout.
 */
export interface Renderer {
  /**
   * Define a master slide template.
   * Masters contain fixed elements (footers, logos) that appear on all slides using them.
   */
  defineMaster(master: MasterDefinition, theme: Theme): void;

  /**
   * Render a slide from its positioned content tree.
   */
  renderSlide(content: PositionedNode, options: RenderSlideOptions, theme: Theme): void;

  /**
   * Finalize and write output.
   */
  writeFile(fileName: string, options?: WriteOptions): Promise<void>;
}

// ============================================
// TEXT FRAGMENT TYPES (for pptxgenjs)
// ============================================

// Extend PptxGenJS type to include slides array (exists at runtime but not in types)
type PptxGenJSExtended = InstanceType<typeof PptxGenJS> & {
  slides: PptxSlide[];
};

interface TextFragmentOptions {
  color?: string;
  fontFace?: string;
  fontSize?: number;
  highlight?: string;
  softBreakBefore?: boolean;
  breakLine?: boolean;
  bullet?: boolean | { type?: string; color?: string } | { color: string };
  bold?: boolean;
  italic?: boolean;
  paraSpaceBefore?: number;
  paraSpaceAfter?: number;
}

interface TextFragment {
  text: string;
  options?: TextFragmentOptions;
}

// ============================================
// PPTX RENDERER
// ============================================

export class PptxRenderer implements Renderer {
  private pres: InstanceType<typeof PptxGenJS>;
  private masters = new Map<string, { slideNumberOptions?: object }>();
  private theme: Theme;

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
      case NODE_TYPE.RECTANGLE:
        this.renderRectangle(positioned, slide, theme);
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
      case NODE_TYPE.ROW:
      case NODE_TYPE.COLUMN:
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

    const { fragments, options } = this.buildTextConfig(textNode, positioned, theme);
    slide.addText(fragments, options);
  }

  private buildTextConfig(
    textNode: TextNode,
    positioned: PositionedNode,
    theme: Theme
  ): { fragments: TextFragment[]; options: Record<string, unknown> } {
    const styleName = textNode.style ?? TEXT_STYLE.BODY;
    const style = theme.textStyles[styleName];
    const defaultFont = getFontFromFamily(style.fontFamily, style.defaultWeight ?? FONT_WEIGHT.NORMAL);
    const fragments = this.buildTextFragments(textNode.content, styleName, theme, textNode.color);

    // Check if any fragment has bullets - affects line spacing and alignment
    const hasBullets = fragments.some(f => f.options?.bullet);

    // Priority: node override > style override > theme default (bulletSpacing for bullet text)
    const lineSpacing = resolveLineHeight(textNode.lineHeightMultiplier, style, theme, hasBullets);

    const options: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
      fontSize: style.fontSize,
      fontFace: defaultFont.name,
      color: textNode.color ?? style.color ?? theme.colors.text,
      margin: 0,
      wrap: true,
      lineSpacingMultiple: lineSpacing,
      // WORKAROUND: pptxgenjs bug - align option breaks bullet rendering
      ...(hasBullets ? {} : { align: textNode.hAlign as any }),
      valign: textNode.vAlign as any,
    };

    return { fragments, options };
  }

  private buildTextFragments(
    content: TextContent,
    styleName: TextStyleName,
    theme: Theme,
    colorOverride?: string
  ): TextFragment[] {
    const style = theme.textStyles[styleName];
    const defaultColor = colorOverride ?? style.color ?? theme.colors.text;
    const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;

    const normalized = normalizeContent(content);
    return normalized.map(run => {
      // Bold shorthand overrides weight
      const effectiveWeight = run.bold ? FONT_WEIGHT.BOLD : (run.weight ?? defaultWeight);
      const runFont = getFontFromFamily(style.fontFamily, effectiveWeight);
      const options: TextFragmentOptions = {
        color: run.color ?? run.highlight?.text ?? defaultColor,
        fontFace: runFont.name,
      };
      if (run.highlight) options.highlight = run.highlight.bg;
      // Pass through paragraph-level options
      if (run.bold) options.bold = true;
      if (run.italic) options.italic = true;
      // bullet implies a new paragraph, so breakLine is redundant when bullet is set
      if (run.breakLine && !run.bullet) options.breakLine = true;
      if (run.bullet) options.bullet = run.bullet;
      if (run.paraSpaceBefore !== undefined) options.paraSpaceBefore = run.paraSpaceBefore;
      if (run.paraSpaceAfter !== undefined) options.paraSpaceAfter = run.paraSpaceAfter;
      return { text: run.text, options };
    });
  }

  private renderImage(positioned: PositionedNode, slide: PptxSlide): void {
    const imageNode = positioned.node as ImageNode;
    log.render.image('RENDER image x=%f y=%f w=%f h=%f src=%s',
      positioned.x, positioned.y, positioned.width, positioned.height, imageNode.src.split('/').pop());
    slide.addImage(this.buildImageConfig(imageNode, positioned));
  }

  private buildImageConfig(
    imageNode: ImageNode,
    positioned: PositionedNode,
  ): { path: string; x: number; y: number; w: number; h: number } {
    // Compute contain placement ourselves.
    // pptxgenjs sizing: { type: 'contain' } is broken — it uses the placement
    // dimensions as both imgSize and boxDim, making it a no-op.
    // Instead, read the actual image dimensions and fit within the bounding box.
    let x = positioned.x;
    let y = positioned.y;
    let w = positioned.width;
    let h = positioned.height;

    const dims = readImageDimensions(imageNode.src);
    if (dims) {
      const boxRatio = w / h;

      if (dims.aspectRatio > boxRatio) {
        [y, h] = containFit(h, w / dims.aspectRatio, y);
      } else {
        [x, w] = containFit(w, h * dims.aspectRatio, x);
      }
    }

    return { path: imageNode.src, x, y, w, h };
  }

  private renderRectangle(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const rectNode = positioned.node as RectangleNode;
    log.render.shape('RENDER rectangle x=%f y=%f w=%f h=%f',
      positioned.x, positioned.y, positioned.width, positioned.height);

    const config = this.buildRectangleConfig(rectNode, positioned, theme);
    if (config) {
      slide.addShape(config.shapeType, config.options);
    }
  }

  private buildRectangleConfig(
    rectNode: RectangleNode,
    positioned: PositionedNode,
    theme: Theme
  ): { shapeType: string; options: Record<string, unknown> } | null {
    // Only draw if fill or border is specified
    if (!rectNode.fill && !rectNode.border) {
      return null;
    }

    const shapeType = rectNode.cornerRadius ? SHAPE.ROUND_RECT : SHAPE.RECT;
    const options: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
    };

    // Fill
    if (rectNode.fill) {
      options.fill = {
        color: rectNode.fill.color,
        transparency: rectNode.fill.opacity !== undefined ? 100 - rectNode.fill.opacity : 0,
      };
    }

    // Border - check if any sides are explicitly disabled
    if (rectNode.border) {
      const border = rectNode.border;
      const allSides = border.top !== false && border.right !== false &&
                       border.bottom !== false && border.left !== false;

      if (allSides) {
        options.line = {
          color: border.color ?? theme.colors.secondary,
          width: border.width ?? theme.borders.width,
        };
      }
    }

    // Corner radius
    if (rectNode.cornerRadius) {
      options.rectRadius = rectNode.cornerRadius;
    }

    return { shapeType, options };
  }

  private renderLine(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const lineNode = positioned.node as LineNode;
    log.render.shape('RENDER line x=%f y=%f w=%f h=%f', positioned.x, positioned.y, positioned.width, positioned.height);
    const { shapeType, options } = this.buildLineConfig(lineNode, positioned, theme);
    slide.addShape(shapeType, options);
  }

  private buildLineConfig(
    lineNode: LineNode,
    positioned: PositionedNode,
    theme: Theme
  ): { shapeType: string; options: Record<string, unknown> } {
    const color = lineNode.color ?? theme.colors.secondary;
    const lineWidth = lineNode.width ?? theme.borders.width;
    const isVertical = positioned.height > positioned.width;

    const lineOpts: Record<string, unknown> = { color, width: lineWidth };
    if (lineNode.beginArrow) lineOpts.beginArrowType = lineNode.beginArrow;
    if (lineNode.endArrow) lineOpts.endArrowType = lineNode.endArrow;
    if (lineNode.dashType) lineOpts.dashType = lineNode.dashType;

    const options: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: isVertical ? 0 : positioned.width,
      h: isVertical ? positioned.height : 0,
      line: lineOpts,
    };

    return { shapeType: String(SHAPE.LINE), options };
  }

  private renderSlideNumber(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const slideNumNode = positioned.node as SlideNumberNode;
    log.render.text('RENDER slideNumber x=%f y=%f w=%f h=%f',
      positioned.x, positioned.y, positioned.width, positioned.height);

    slide.slideNumber = this.buildSlideNumberOptions(slideNumNode, positioned, theme);
  }

  private buildSlideNumberOptions(
    slideNumNode: SlideNumberNode,
    positioned: PositionedNode,
    theme: Theme
  ): Record<string, unknown> {
    const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
    const style = theme.textStyles[styleName as keyof typeof theme.textStyles];
    const font = getFontFromFamily(style.fontFamily, FONT_WEIGHT.NORMAL);

    return {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
      fontFace: font.name,
      fontSize: style.fontSize,
      color: slideNumNode.color ?? style.color ?? theme.colors.textMuted,
      align: slideNumNode.hAlign,
      valign: VALIGN.MIDDLE,
      margin: 0,
    };
  }

  private renderTable(positioned: PositionedNode, slide: PptxSlide, theme: Theme): void {
    const tableNode = positioned.node as TableNode;
    const { rows, columnWidths, headerRows = 0, headerColumns = 0, style = {} } = tableNode;

    log.render._('RENDER table x=%f y=%f w=%f h=%f rows=%d cols=%d',
      positioned.x, positioned.y, positioned.width, positioned.height,
      rows.length, rows[0]?.length ?? 0);

    if (rows.length === 0) return;

    const numCols = rows[0]?.length ?? 0;
    if (numCols === 0) return;

    // Build column widths (normalize to fit positioned width)
    const colW = this.buildColumnWidths(columnWidths, numCols, positioned.width);

    // Build table rows for pptxgenjs
    const numRows = rows.length;
    const tableRows = rows.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        this.buildTableCell(cell, rowIndex, colIndex, numRows, numCols, headerRows, headerColumns, style, theme)
      )
    );

    // Table options
    const tableOptions: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      colW,
      margin: 0,
    };

    slide.addTable(tableRows, tableOptions);
  }

  private buildColumnWidths(columnWidths: number[] | undefined, numCols: number, totalWidth: number): number[] {
    if (!columnWidths || columnWidths.length === 0) {
      // Equal widths
      const colWidth = totalWidth / numCols;
      return Array(numCols).fill(colWidth);
    }

    // Normalize proportional widths to actual inches
    const total = columnWidths.reduce((a, b) => a + b, 0);
    return columnWidths.map(w => (w / total) * totalWidth);
  }

  private buildTableCell(
    cell: TableCellData,
    rowIndex: number,
    colIndex: number,
    numRows: number,
    numCols: number,
    headerRows: number,
    headerColumns: number,
    tableStyle: TableNode['style'],
    theme: Theme
  ): { text: TextFragment[]; options: Record<string, unknown> } {
    const isHeaderRow = rowIndex < headerRows;
    const isHeaderCol = colIndex < headerColumns;
    const isHeader = isHeaderRow || isHeaderCol;

    // Determine text style (cell-level override wins over table-level)
    const styleName = cell.textStyle
      ?? (isHeader ? tableStyle?.headerTextStyle : tableStyle?.cellTextStyle)
      ?? TEXT_STYLE.BODY;
    const textStyle = theme.textStyles[styleName];
    const font = getFontFromFamily(textStyle.fontFamily, textStyle.defaultWeight ?? FONT_WEIGHT.NORMAL);

    // Determine background
    const fill = cell.fill
      ?? (isHeader ? tableStyle?.headerBackground : undefined)
      ?? tableStyle?.cellBackground;

    // Determine alignment
    const hAlign = cell.hAlign ?? tableStyle?.hAlign ?? HALIGN.LEFT;
    const vAlign = cell.vAlign ?? tableStyle?.vAlign ?? VALIGN.MIDDLE;

    // Cell padding
    const cellPadding = tableStyle?.cellPadding ?? theme.spacing.cellPadding ?? 0.05;

    // Build border config based on border style and cell position
    const border = this.buildCellBorder(tableStyle, theme, rowIndex, colIndex, numRows, numCols);

    // Build rich text fragments for cell content
    const textFragments = this.buildTextFragments(cell.content, styleName, theme, cell.color);

    const options: Record<string, unknown> = {
      fontFace: font.name,
      fontSize: textStyle.fontSize,
      color: cell.color ?? textStyle.color ?? theme.colors.text,
      align: hAlign,
      valign: vAlign,
      margin: cellPadding,
    };

    if (fill) {
      options.fill = { color: fill };
    }

    if (border) {
      options.border = border;
    }

    if (cell.colspan) {
      options.colspan = cell.colspan;
    }

    if (cell.rowspan) {
      options.rowspan = cell.rowspan;
    }

    return { text: textFragments, options };
  }

  private buildCellBorder(
    tableStyle: TableNode['style'],
    theme: Theme,
    rowIndex: number,
    colIndex: number,
    numRows: number,
    numCols: number
  ): Array<{ pt?: number; color?: string; type?: string }> | undefined {
    const borderStyle = tableStyle?.borderStyle ?? BORDER_STYLE.FULL;
    if (borderStyle === BORDER_STYLE.NONE) return undefined;

    const borderWidth = tableStyle?.borderWidth ?? theme.borders.width ?? 0.5;
    const borderColor = tableStyle?.borderColor ?? theme.colors.secondary ?? '000000';

    const solid = { pt: borderWidth, color: borderColor, type: 'solid' as const };
    const none = { type: 'none' as const };

    // For internal borders, determine which edges are on the table boundary
    const isFirstRow = rowIndex === 0;
    const isLastRow = rowIndex === numRows - 1;
    const isFirstCol = colIndex === 0;
    const isLastCol = colIndex === numCols - 1;

    // Return [top, right, bottom, left] border array
    switch (borderStyle) {
      case BORDER_STYLE.FULL:
        return [solid, solid, solid, solid];
      case BORDER_STYLE.HORIZONTAL:
        return [solid, none, solid, none];
      case BORDER_STYLE.VERTICAL:
        return [none, solid, none, solid];
      case BORDER_STYLE.INTERNAL:
        // Internal borders only - no borders on outer edges
        return [
          isFirstRow ? none : solid,  // top
          isLastCol ? none : solid,   // right
          isLastRow ? none : solid,   // bottom
          isFirstCol ? none : solid,  // left
        ];
      default:
        return [solid, solid, solid, solid];
    }
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
        const { fragments, options } = this.buildTextConfig(textNode, positioned, theme);
        objects.push({ text: { text: fragments, options } });
        break;
      }
      case NODE_TYPE.IMAGE: {
        const imageNode = node as ImageNode;
        objects.push({ image: this.buildImageConfig(imageNode, positioned) });
        break;
      }
      case NODE_TYPE.RECTANGLE: {
        const rectNode = node as RectangleNode;
        const config = this.buildRectangleConfig(rectNode, positioned, theme);
        if (config) {
          objects.push({ [String(config.shapeType)]: config.options });
        }
        break;
      }
      case NODE_TYPE.LINE: {
        const lineNode = node as LineNode;
        const { shapeType, options } = this.buildLineConfig(lineNode, positioned, theme);
        objects.push({ [shapeType]: options });
        break;
      }
      case NODE_TYPE.SLIDE_NUMBER: {
        const slideNumNode = node as SlideNumberNode;
        onSlideNumber(this.buildSlideNumberOptions(slideNumNode, positioned, theme));
        break;
      }
      case NODE_TYPE.ROW:
      case NODE_TYPE.COLUMN:
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
