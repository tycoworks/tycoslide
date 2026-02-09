// PPTX Renderer
// Renders PositionedNode trees directly to PowerPoint via pptxgenjs

import PptxGenJSDefault from 'pptxgenjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (PptxGenJSDefault as any).default || PptxGenJSDefault;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;

import type { PositionedNode, TextNode, ImageNode, RectangleNode, LineNode, SlideNumberNode } from './nodes.js';
import { NODE_TYPE } from './nodes.js';
import type { Theme, TextStyleName, TextContent } from './types.js';
import { CUSTOM_LAYOUT, SHAPE, TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT } from './types.js';
import { getFontFromFamily, normalizeContent } from '../utils/text.js';
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

    // Priority: node override > style override > theme default
    const lineSpacing = textNode.lineHeightMultiplier ?? style.lineHeightMultiplier ?? theme.spacing.lineSpacing;

    // Check if any fragment has bullets - pptxgenjs bug: align breaks bullet rendering
    const hasBullets = fragments.some(f => f.options?.bullet);

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
    slide.addImage({
      path: imageNode.src,
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
    });
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
    const color = lineNode.color ?? theme.colors.secondary;
    const width = lineNode.width ?? theme.borders.width;

    // Detect orientation from positioned dimensions
    // Vertical if height > width, horizontal otherwise
    const isVertical = positioned.height > positioned.width;

    const w = isVertical ? 0 : positioned.width;
    const h = isVertical ? positioned.height : 0;
    log.render.shape('RENDER %s line x=%f y=%f w=%f h=%f', isVertical ? 'vertical' : 'horizontal', positioned.x, positioned.y, w, h);
    slide.addShape(SHAPE.LINE, {
      x: positioned.x,
      y: positioned.y,
      w,
      h,
      line: { color, width },
    });
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
      align: slideNumNode.hAlign ?? HALIGN.RIGHT,
      valign: VALIGN.MIDDLE,
      margin: 0,
    };
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
    const { node, x, y, width, height, children } = positioned;

    switch (node.type) {
      case NODE_TYPE.TEXT: {
        const textNode = node as TextNode;
        const { fragments, options } = this.buildTextConfig(textNode, positioned, theme);
        objects.push({ text: { text: fragments, options } });
        break;
      }
      case NODE_TYPE.IMAGE: {
        const imageNode = node as ImageNode;
        objects.push({
          image: {
            path: imageNode.src,
            x, y, w: width, h: height,
          },
        });
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
        const color = lineNode.color ?? theme.colors.secondary;
        const lineWidth = lineNode.width ?? theme.borders.width;
        const isVertical = height > width;
        objects.push({
          [String(SHAPE.LINE)]: {
            x, y,
            w: isVertical ? 0 : width,
            h: isVertical ? height : 0,
            line: { color, width: lineWidth },
          },
        });
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
