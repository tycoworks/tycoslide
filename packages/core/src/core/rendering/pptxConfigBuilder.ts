// PPTX Config Builder
// Pure translation layer: converts tycoslide domain types to pptxgenjs option shapes.
// No pptxgenjs dependency — every method takes typed inputs and returns plain data.

import type { PositionedNode, TextNode, ImageNode, LineNode, ShapeNode, SlideNumberNode, TableNode, TableCellData } from '../model/nodes.js';
import type { Theme, TextStyleName, TextContent } from '../model/types.js';
import { TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT, BORDER_STYLE, LINE_SHAPE } from '../model/types.js';
import { getFontFromFamily, normalizeContent, resolveLineHeight, getParagraphGapRatio } from '../../utils/font.js';
import { readImageDimensions, containFit } from '../../utils/image.js';

// ============================================
// TYPES
// ============================================

export interface TextFragmentOptions {
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

export interface TextFragment {
  text: string;
  options?: TextFragmentOptions;
}

// ============================================
// PPTX CONFIG BUILDER
// ============================================

/**
 * Translates tycoslide domain objects (nodes, positioned, theme)
 * into pptxgenjs configuration objects.
 *
 * Pure translation layer — no side effects, no pptxgenjs dependency.
 * Every method takes typed inputs and returns plain data.
 */
export class PptxConfigBuilder {

  buildTextConfig(
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
      ...(hasBullets ? {} : { align: textNode.hAlign }),
      valign: textNode.vAlign,
    };

    return { fragments, options };
  }

  buildTextFragments(
    content: TextContent,
    styleName: TextStyleName,
    theme: Theme,
    colorOverride?: string
  ): TextFragment[] {
    const style = theme.textStyles[styleName];
    const defaultColor = colorOverride ?? style.color ?? theme.colors.text;
    const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;

    const normalized = normalizeContent(content);
    // Track which runs need a paragraph break before them
    const breakBeforeIndices = new Set<number>();
    const fragments: TextFragment[] = normalized.map((run, i) => {
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
      // Record break-before for post-processing shift
      if (run.breakLine && !run.bullet) breakBeforeIndices.add(i);
      if (run.bullet) options.bullet = run.bullet;
      return { text: run.text, options };
    });

    // pptxgenjs breakLine means "break AFTER this run".
    // Our semantic is "break BEFORE run N" → set breakLine on fragment N-1.
    // Also add paragraph spacing on the new paragraph's first fragment.
    // paraSpaceBefore = fontSize × getParagraphGapRatio() matches the CSS
    // 1em spacer div in the HTML renderer (see layoutHtml.tsx renderTextRun).
    for (const idx of breakBeforeIndices) {
      if (idx > 0 && fragments[idx - 1].options) {
        fragments[idx - 1].options!.breakLine = true;
      }
      if (fragments[idx].options) {
        fragments[idx].options!.paraSpaceBefore = style.fontSize * getParagraphGapRatio();
      }
    }

    return fragments;
  }

  buildImageConfig(
    imageNode: ImageNode,
    positioned: PositionedNode,
  ): { path: string; x: number; y: number; w: number; h: number } {
    // Compute contain placement ourselves.
    // pptxgenjs sizing: { type: 'contain' } is broken — it uses the placement
    // dimensions as both imgSize and boxDim, making it a no-op.
    const dims = readImageDimensions(imageNode.src);
    const fitted = dims
      ? containFit(positioned.x, positioned.y, positioned.width, positioned.height, dims.aspectRatio)
      : { x: positioned.x, y: positioned.y, w: positioned.width, h: positioned.height };

    return { path: imageNode.src, ...fitted };
  }

  buildShapeConfig(
    shapeNode: ShapeNode,
    positioned: PositionedNode,
    theme: Theme
  ): { shapeType: string; options: Record<string, unknown> } | null {
    // Only draw if fill or border is specified
    if (!shapeNode.fill && !shapeNode.border) {
      return null;
    }

    const options: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
    };

    if (shapeNode.fill) {
      options.fill = {
        color: shapeNode.fill.color,
        transparency: shapeNode.fill.opacity !== undefined ? 100 - shapeNode.fill.opacity : 0,
      };
    }

    if (shapeNode.border) {
      const border = shapeNode.border;
      const allSides = border.top !== false && border.right !== false &&
                       border.bottom !== false && border.left !== false;

      if (allSides) {
        options.line = {
          color: border.color ?? theme.colors.secondary,
          width: border.width ?? theme.borders.width,
        };
      }
    }

    if (shapeNode.cornerRadius) {
      options.rectRadius = shapeNode.cornerRadius;
    }

    return { shapeType: shapeNode.shape, options };
  }

  buildLineConfig(
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

    return {
      shapeType: LINE_SHAPE,
      options: {
        x: positioned.x,
        y: positioned.y,
        w: isVertical ? 0 : positioned.width,
        h: isVertical ? positioned.height : 0,
        line: lineOpts,
      },
    };
  }

  buildSlideNumberOptions(
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

  buildColumnWidths(numCols: number, totalWidth: number): number[] {
    const colWidth = totalWidth / numCols;
    return Array(numCols).fill(colWidth);
  }

  buildTableCell(
    cell: TableCellData,
    rowIndex: number,
    colIndex: number,
    numRows: number,
    numCols: number,
    headerRows: number,
    headerColumns: number,
    tableNode: TableNode,
    theme: Theme
  ): { text: TextFragment[]; options: Record<string, unknown> } {
    const isHeaderRow = rowIndex < headerRows;
    const isHeaderCol = colIndex < headerColumns;
    const isHeader = isHeaderRow || isHeaderCol;

    // Determine text style (cell-level override wins over table-level)
    const styleName = cell.textStyle
      ?? (isHeader ? tableNode.headerTextStyle : tableNode.cellTextStyle)
      ?? TEXT_STYLE.BODY;
    const textStyle = theme.textStyles[styleName];
    const font = getFontFromFamily(textStyle.fontFamily, textStyle.defaultWeight ?? FONT_WEIGHT.NORMAL);

    // Determine alignment
    const hAlign = cell.hAlign ?? tableNode.hAlign ?? HALIGN.LEFT;
    const vAlign = cell.vAlign ?? tableNode.vAlign ?? VALIGN.MIDDLE;

    // Cell padding
    const cellPadding = tableNode.cellPadding ?? theme.spacing.cellPadding ?? 0.05;

    // Build border config based on border style and cell position
    const border = this.buildCellBorder(tableNode, theme, rowIndex, colIndex, numRows, numCols);

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

    // Background fill: cell-level override wins, then token-driven (opacity 0 = no fill)
    if (cell.fill) {
      options.fill = { color: cell.fill, transparency: 0 };
    } else {
      const bg = isHeader ? tableNode.headerBackground : tableNode.cellBackground;
      const opacity = isHeader ? tableNode.headerBackgroundOpacity : tableNode.cellBackgroundOpacity;
      if (bg && opacity !== undefined && opacity > 0) {
        options.fill = { color: bg, transparency: 100 - opacity };
      }
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

  buildCellBorder(
    tableNode: TableNode,
    theme: Theme,
    rowIndex: number,
    colIndex: number,
    numRows: number,
    numCols: number
  ): Array<{ pt?: number; color?: string; type?: string }> | undefined {
    const borderStyle = tableNode.borderStyle ?? BORDER_STYLE.FULL;
    if (borderStyle === BORDER_STYLE.NONE) return undefined;

    const borderWidth = tableNode.borderWidth ?? theme.borders.width;
    const borderColor = tableNode.borderColor ?? theme.colors.secondary;

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
}
