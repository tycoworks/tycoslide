// PPTX Config Builder
// Pure translation layer: converts tycoslide domain types to pptxgenjs option shapes.
// No pptxgenjs dependency — every method takes typed inputs and returns plain data.

import { stripHash } from "../../utils/color.js";
import { getParagraphGapRatio, normalizeContent, resolveFontFace } from "../../utils/font.js";
import { containFit, readImageDimensions } from "../../utils/image.js";
import type {
  ImageNode,
  LineNode,
  PositionedNode,
  ShapeNode,
  SlideNumberNode,
  TableCellData,
  TableNode,
  TextNode,
} from "../model/nodes.js";
import type { StrikeType, TextContent, TextStyle, UnderlineStyle } from "../model/types.js";
import { BORDER_STYLE, LINE_SHAPE, STRIKE_TYPE, UNDERLINE_STYLE } from "../model/types.js";

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
  bullet?: boolean | { type?: string; indent?: number };
  bold?: boolean;
  italic?: boolean;
  strike?: StrikeType;
  underline?: { style: UnderlineStyle; color?: string };
  hyperlink?: { url: string };
  paraSpaceBefore?: number;
  paraSpaceAfter?: number;
}

export interface TextFragment {
  text: string;
  options: TextFragmentOptions;
}

// ============================================
// PPTX CONFIG BUILDER
// ============================================

/**
 * Translates tycoslide domain objects (nodes, positioned)
 * into pptxgenjs configuration objects.
 *
 * Pure translation layer — no side effects, no pptxgenjs dependency.
 * Every method takes typed inputs and returns plain data.
 */
export class PptxConfigBuilder {
  buildTextConfig(
    textNode: TextNode,
    positioned: PositionedNode,
  ): { fragments: TextFragment[]; options: Record<string, unknown> } {
    const style = textNode.resolvedStyle;
    const fragments = this.buildTextFragments(
      textNode.content,
      style,
      textNode.color,
      textNode.linkColor,
      textNode.linkUnderline,
      textNode.bulletIndentPt,
    );

    // Check if any fragment has bullets - affects alignment
    const hasBullets = fragments.some((f) => f.options.bullet);

    const lineSpacing = textNode.lineHeightMultiplier;

    const options: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
      fontSize: style.fontSize,
      fontFace: style.fontFamily.name, // default — per-run fontFace from resolveFontFace() overrides this
      color: stripHash(textNode.color),
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
    style: TextStyle,
    color: string,
    linkColor?: string,
    linkUnderline?: boolean,
    bulletIndentPt: number = 0,
  ): TextFragment[] {
    const normalized = normalizeContent(content);
    // Track which runs need a paragraph break before them
    const breakBeforeIndices = new Set<number>();
    const fragments: TextFragment[] = normalized.map((run, i) => {
      const options: TextFragmentOptions = {
        color: stripHash(run.color ?? run.highlight?.text ?? color),
        fontFace: resolveFontFace(style.fontFamily, run.bold, run.italic),
      };
      if (run.highlight) options.highlight = stripHash(run.highlight.bg);
      // Pass through paragraph-level options
      if (run.bold) options.bold = true;
      if (run.italic) options.italic = true;
      if (run.strikethrough) options.strike = STRIKE_TYPE.SINGLE;
      if (run.underline) options.underline = { style: UNDERLINE_STYLE.SINGLE };
      if (run.hyperlink) {
        options.hyperlink = { url: run.hyperlink };
        // Apply link token styling unless run has explicit overrides
        if (!run.color && linkColor) options.color = stripHash(linkColor);
        if (!run.underline && linkUnderline) options.underline = { style: UNDERLINE_STYLE.SINGLE };
      }
      // Record break-before for post-processing shift
      if (run.paragraphBreak && !run.bullet) breakBeforeIndices.add(i);
      if (run.softBreak) options.softBreakBefore = true;
      if (run.bullet) {
        const base = run.bullet === true ? {} : run.bullet;
        options.bullet = { ...base, indent: bulletIndentPt };
      }
      return { text: run.text, options };
    });

    // pptxgenjs breakLine means "break AFTER this run".
    // Our semantic is "break BEFORE run N" → set breakLine on fragment N-1.
    // Also add paragraph spacing on the new paragraph's first fragment.
    // paraSpaceBefore = fontSize × getParagraphGapRatio() matches the CSS
    // 1em spacer div in the HTML renderer (see layoutHtml.tsx renderTextRun).
    for (const idx of breakBeforeIndices) {
      if (idx > 0 && fragments[idx - 1].options) {
        fragments[idx - 1].options.breakLine = true;
      }
      if (fragments[idx].options) {
        fragments[idx].options.paraSpaceBefore = style.fontSize * getParagraphGapRatio();
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
  ): { shapeType: string; options: Record<string, unknown> } {
    const options: Record<string, unknown> = {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
      fill: {
        color: stripHash(shapeNode.fill.color),
        transparency: 100 - shapeNode.fill.opacity,
      },
    };

    const border = shapeNode.border;
    if (border.width > 0) {
      options.line = {
        color: stripHash(border.color),
        width: border.width,
      };
    }

    if (shapeNode.cornerRadius > 0) {
      options.rectRadius = shapeNode.cornerRadius;
    }

    if (shapeNode.shadow) {
      options.shadow = {
        type: shapeNode.shadow.type,
        color: stripHash(shapeNode.shadow.color),
        opacity: shapeNode.shadow.opacity / 100,
        blur: shapeNode.shadow.blur,
        offset: shapeNode.shadow.offset,
        angle: shapeNode.shadow.angle,
      };
    }

    return { shapeType: shapeNode.shape, options };
  }

  buildLineConfig(
    lineNode: LineNode,
    positioned: PositionedNode,
  ): { shapeType: string; options: Record<string, unknown> } {
    const color = lineNode.color;
    const lineWidth = lineNode.width;
    const isVertical = positioned.height > positioned.width;

    const lineOpts: Record<string, unknown> = { color: stripHash(color), width: lineWidth };
    if (lineNode.beginArrow) lineOpts.beginArrowType = lineNode.beginArrow;
    if (lineNode.endArrow) lineOpts.endArrowType = lineNode.endArrow;
    lineOpts.dashType = lineNode.dashType;

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

  buildSlideNumberOptions(slideNumNode: SlideNumberNode, positioned: PositionedNode): Record<string, unknown> {
    const style = slideNumNode.resolvedStyle;

    return {
      x: positioned.x,
      y: positioned.y,
      w: positioned.width,
      h: positioned.height,
      fontFace: style.fontFamily.name, // slide numbers have no bold/italic runs
      fontSize: style.fontSize,
      color: stripHash(slideNumNode.color),
      align: slideNumNode.hAlign,
      valign: slideNumNode.vAlign,
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
  ): { text: TextFragment[]; options: Record<string, unknown> } {
    const isHeader = rowIndex < headerRows || colIndex < headerColumns;

    // Cell values are pre-resolved by component render
    const textStyle = cell.resolvedStyle;

    // Cell padding
    const cellPadding = tableNode.cellPadding;

    // Build border config based on border style and cell position
    const border = this.buildCellBorder(tableNode, rowIndex, colIndex, numRows, numCols);

    // Build rich text fragments for cell content
    const textFragments = this.buildTextFragments(
      cell.content,
      textStyle,
      cell.color,
      cell.linkColor,
      cell.linkUnderline,
    );

    const options: Record<string, unknown> = {
      fontFace: textStyle.fontFamily.name, // default — per-run fontFace from resolveFontFace() overrides this
      fontSize: textStyle.fontSize,
      color: stripHash(cell.color),
      align: cell.hAlign,
      valign: cell.vAlign,
      margin: cellPadding,
    };

    // Background fill: cell-level override wins, then token-driven (opacity 0 = no fill)
    if (cell.fill) {
      options.fill = { color: stripHash(cell.fill), transparency: 0 };
    } else {
      const bg = isHeader ? tableNode.headerBackground : tableNode.cellBackground;
      const opacity = isHeader ? tableNode.headerBackgroundOpacity : tableNode.cellBackgroundOpacity;
      if (bg && opacity > 0) {
        options.fill = { color: stripHash(bg), transparency: 100 - opacity };
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
    rowIndex: number,
    colIndex: number,
    numRows: number,
    numCols: number,
  ): Array<{ pt?: number; color?: string; type?: string }> | undefined {
    const borderStyle = tableNode.borderStyle;
    if (borderStyle === BORDER_STYLE.NONE) return undefined;

    const borderWidth = tableNode.borderWidth;
    const borderColor = tableNode.borderColor;

    const solid = { pt: borderWidth, color: stripHash(borderColor), type: "solid" as const };
    const none = { type: "none" as const };

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
          isFirstRow ? none : solid, // top
          isLastCol ? none : solid, // right
          isLastRow ? none : solid, // bottom
          isFirstCol ? none : solid, // left
        ];
      default: {
        const _exhaustive: never = borderStyle;
        return _exhaustive;
      }
    }
  }
}
