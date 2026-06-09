// PPTX Config Builder
// Pure translation layer: converts tycoslide domain types to pptxgenjs option shapes.
// No pptxgenjs dependency — every method takes typed inputs and returns plain data.

import { stripHash } from "../../utils/color.js";
import { getParagraphGapRatio, normalizeContent, resolveFontFace } from "../../utils/font.js";
import { pxToIn } from "../../utils/units.js";
import type {
  ImageNode,
  LineNode,
  PositionedNode,
  ShadowEffect,
  ShapeNode,
  SlideNumberNode,
  Stroke,
  TableCellData,
  TableNode,
  TextNode,
} from "../model/nodes.js";
import type { Dash, Strike, TextContent, TextStyle, Underline } from "../model/types.js";
import { DASH, DIRECTION, FIT, GRID_STYLE, LINE_SHAPE, STRIKE, UNDERLINE } from "../model/types.js";

/** Map CSS-compatible dash type names to pptxgenjs values. */
function pptxDash(dt: Dash): string {
  switch (dt) {
    case DASH.SOLID:
      return "solid";
    case DASH.DASHED:
      return "dash";
    case DASH.DOTTED:
      return "sysDot";
    default:
      throw new Error(`Unknown dash type: '${dt as string}'`);
  }
}

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
  strike?: Strike;
  underline?: { style: Underline; color?: string };
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

/** Convert tycoslide Stroke to pptxgenjs ShapeLineProps. */
function buildLineOptions(stroke: Stroke): Record<string, unknown> {
  return {
    color: stripHash(stroke.color),
    width: stroke.width,
    dashType: pptxDash(stroke.dashType),
  };
}

/** Convert tycoslide ShadowEffect to pptxgenjs ShadowProps. */
function buildShadowOptions(shadow: ShadowEffect): Record<string, unknown> {
  return {
    type: shadow.type,
    color: stripHash(shadow.color),
    opacity: shadow.opacity / 100,
    blur: shadow.blur,
    offset: shadow.offset,
    angle: shadow.angle,
  };
}

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

    const normalRatio = style.fontFamily.normalRatio;

    const options: Record<string, unknown> = {
      x: pxToIn(positioned.x),
      y: pxToIn(positioned.y),
      w: pxToIn(positioned.width),
      h: pxToIn(positioned.height),
      fontSize: style.fontSize,
      fontFace: style.fontFamily.name, // default — per-run fontFace from resolveFontFace() overrides this
      color: stripHash(textNode.color),
      margin: 0,
      wrap: true,
      lineSpacingMultiple: textNode.lineHeight / normalRatio,
      // WORKAROUND: pptxgenjs bug - align option breaks bullet rendering
      ...(hasBullets ? {} : { align: textNode.hAlign }),
      valign: textNode.vAlign,
    };

    if (textNode.border && textNode.border.width > 0) {
      options.line = buildLineOptions(textNode.border);
    }
    if (textNode.shadow) {
      options.shadow = buildShadowOptions(textNode.shadow);
    }

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
      if (run.strikethrough) options.strike = STRIKE.SINGLE;
      if (run.underline) options.underline = { style: UNDERLINE.SINGLE };
      if (run.hyperlink) {
        options.hyperlink = { url: run.hyperlink };
        // Apply link token styling unless run has explicit overrides
        if (!run.color && linkColor) options.color = stripHash(linkColor);
        if (!run.underline && linkUnderline) options.underline = { style: UNDERLINE.SINGLE };
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

  buildImageConfig(imageNode: ImageNode, positioned: PositionedNode): Record<string, unknown> {
    const x = pxToIn(positioned.x);
    const y = pxToIn(positioned.y);
    const w = pxToIn(positioned.width);
    const h = pxToIn(positioned.height);

    const result: Record<string, unknown> = {
      path: imageNode.src,
      x, y, w, h,
      ...(imageNode.fit !== FIT.STRETCH && { sizing: { type: imageNode.fit, w, h } }),
    };
    if (imageNode.alt) {
      result.altText = imageNode.alt;
    }
    if (imageNode.shadow) {
      result.shadow = buildShadowOptions(imageNode.shadow);
    }
    if (imageNode.tint) {
      result.tint = stripHash(imageNode.tint);
    }
    return result;
  }

  buildShapeConfig(
    shapeNode: ShapeNode,
    positioned: PositionedNode,
  ): { shapeType: string; options: Record<string, unknown> } {
    const options: Record<string, unknown> = {
      x: pxToIn(positioned.x),
      y: pxToIn(positioned.y),
      w: pxToIn(positioned.width),
      h: pxToIn(positioned.height),
      fill: {
        color: stripHash(shapeNode.fill.color),
        transparency: 100 - shapeNode.fill.opacity,
      },
    };

    if (shapeNode.border && shapeNode.border.width > 0) {
      options.line = buildLineOptions(shapeNode.border);
    }

    options.rectRadius = pxToIn(shapeNode.cornerRadius);

    if (shapeNode.shadow) {
      options.shadow = buildShadowOptions(shapeNode.shadow);
    }

    return { shapeType: shapeNode.shape, options };
  }

  buildLineConfig(
    lineNode: LineNode,
    positioned: PositionedNode,
  ): { shapeType: string; options: Record<string, unknown> } {
    const isVertical = lineNode.direction === DIRECTION.COLUMN;

    const options: Record<string, unknown> = {
      x: pxToIn(positioned.x),
      y: pxToIn(positioned.y),
      w: isVertical ? 0 : pxToIn(positioned.width),
      h: isVertical ? pxToIn(positioned.height) : 0,
      line: buildLineOptions(lineNode.stroke),
    };

    if (lineNode.shadow) {
      options.shadow = buildShadowOptions(lineNode.shadow);
    }

    return { shapeType: LINE_SHAPE, options };
  }

  buildSlideNumberOptions(slideNumNode: SlideNumberNode, positioned: PositionedNode): Record<string, unknown> {
    const style = slideNumNode.resolvedStyle;

    return {
      x: pxToIn(positioned.x),
      y: pxToIn(positioned.y),
      w: pxToIn(positioned.width),
      h: pxToIn(positioned.height),
      fontFace: style.fontFamily.name, // slide numbers have no bold/italic runs
      fontSize: style.fontSize,
      color: stripHash(slideNumNode.color),
      align: slideNumNode.hAlign,
      valign: slideNumNode.vAlign,
      margin: 0,
    };
  }

  buildColumnWidths(numCols: number, totalWidth: number): number[] {
    const colWidth = pxToIn(totalWidth) / numCols;
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
      margin: pxToIn(cellPadding),
      lineSpacingMultiple: textStyle.lineHeight / textStyle.fontFamily.normalRatio,
    };

    // Background fill: cell-level override wins, then 3-zone cascade (headerRow > headerCol > cell)
    if (cell.fill) {
      options.fill = { color: stripHash(cell.fill), transparency: 0 };
    } else {
      const isHeaderRow = rowIndex < headerRows;
      const isHeaderCol = !isHeaderRow && colIndex < headerColumns;
      let bg: string | undefined;
      let opacity: number;
      if (isHeaderRow && tableNode.headerRow) {
        bg = tableNode.headerRow.background;
        opacity = tableNode.headerRow.backgroundOpacity;
      } else if (isHeaderCol && tableNode.headerCol) {
        bg = tableNode.headerCol.background;
        opacity = tableNode.headerCol.backgroundOpacity;
      } else {
        bg = tableNode.cellBackground;
        opacity = tableNode.cellBackgroundOpacity;
      }
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
    const none = { type: "none" as const };

    // Resolve outer-border stroke for this cell's edges (if present)
    const outerStroke = tableNode.border
      ? { pt: tableNode.border.width, color: stripHash(tableNode.border.color), type: "solid" as const }
      : none;

    // Resolve grid stroke for internal lines (if present)
    const gridStroke = tableNode.gridStroke
      ? { pt: tableNode.gridStroke.width, color: stripHash(tableNode.gridStroke.color), type: "solid" as const }
      : none;

    const isFirstRow = rowIndex === 0;
    const isLastRow = rowIndex === numRows - 1;
    const isFirstCol = colIndex === 0;
    const isLastCol = colIndex === numCols - 1;

    // Determine grid line eligibility for each edge
    const gridStyle = tableNode.gridStyle;
    const hasHGrid = gridStyle === GRID_STYLE.HORIZONTAL || gridStyle === GRID_STYLE.BOTH;
    const hasVGrid = gridStyle === GRID_STYLE.VERTICAL || gridStyle === GRID_STYLE.BOTH;

    // top edge: outer border if first row, grid if internal horizontal
    const top = isFirstRow ? outerStroke : hasHGrid ? gridStroke : none;
    // right edge: outer border if last col, grid if internal vertical
    const right = isLastCol ? outerStroke : hasVGrid ? gridStroke : none;
    // bottom edge: outer border if last row, grid if internal horizontal
    const bottom = isLastRow ? outerStroke : hasHGrid ? gridStroke : none;
    // left edge: outer border if first col, grid if internal vertical
    const left = isFirstCol ? outerStroke : hasVGrid ? gridStroke : none;

    // If all edges resolve to "none", skip the border entirely
    if (top === none && right === none && bottom === none && left === none) return undefined;

    return [top, right, bottom, left];
  }
}
