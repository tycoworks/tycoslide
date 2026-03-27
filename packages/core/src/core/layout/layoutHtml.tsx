// HTML Measurement Generator V2
// 3-phase pipeline: styleNode (pure data) → StyledDiv (JSX) → renderToString (HTML)
//
// Phase 1 (styleNode): All CSS decisions in one place. Pure functions, testable without a browser.
// Phase 2 (StyledDiv): Single generic JSX component. No logic, just maps styles to <div>.
// Phase 3 (generateLayoutHTML): Hono renderToString, unchanged.

import fs from "node:fs";
import path from "node:path";
import type { FC } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import type { Page } from "playwright";
import { bgColor, hexToRgba } from "../../utils/color.js";
import { FONT_FORMATS, getFontForRun, normalizeContent } from "../../utils/font.js";
import { readImageDimensions } from "../../utils/image.js";
import { inToPx, ptToPx } from "../../utils/units.js";
import type { Bounds } from "../model/bounds.js";
import type {
  ContainerNode,
  ElementNode,
  GridNode,
  ImageNode,
  LayoutNode,
  LineNode,
  Shadow,
  ShapeNode,
  SlideNumberNode,
  StackNode,
  TableCellData,
  TableNode,
  TextNode,
} from "../model/nodes.js";
import { NODE_TYPE } from "../model/nodes.js";
import type {
  Background,
  DashType,
  Direction,
  HorizontalAlignment,
  NormalizedRun,
  SizeValue,
  TextStyle,
  Theme,
  VerticalAlignment,
} from "../model/types.js";
import {
  DASH_TYPE,
  DIRECTION,
  GRID_STYLE,
  FONT_SLOT,
  HALIGN,
  SHAPE,
  SIZE,
  SPACING_MODE,
  VALIGN,
} from "../model/types.js";

// ============================================
// TYPES
// ============================================

/** Intermediate representation: one per node, all CSS decisions resolved */
export interface StyledNode {
  nodeId: string;
  styles: Record<string, string | number>;
  children: StyledNode[];
  innerHTML?: string; // pre-built rich text (bullets, spans)
  textContent?: string; // plain text (slide number placeholder)
}

/** Context about the parent, passed down during tree walk */
export interface ParentCtx {
  direction: Direction;
  /** True when parent row has definite height (not HUG). Images use this for flex strategy. */
  hasDefiniteCrossSize?: boolean;
  /** True when the vertical size chain provides a definite height budget.
   *  number → true (new anchor), HUG → false (chain broken), FILL → inherit. */
  heightIsConstrained: boolean;
}

interface IdContext {
  counter: number;
}

const SLIDE_NUMBER_PLACEHOLDER = "999";

// ============================================
// PHASE 1: PURE STYLE COMPUTATION
// ============================================

// ─── Core Helpers ─────────────────────────────

function generateNodeId(ctx: IdContext): string {
  return `node-${++ctx.counter}`;
}

/** Map of font name → line-height: normal ratio. */
export type FontNormalRatios = Map<string, number>;

/** Compute flex CSS for a node based on its parent's direction.
 *  Three size types: number (fixed inches), SIZE.FILL (share space), SIZE.HUG (content-sized). */
export function flexSize(
  width: number | SizeValue,
  height: number | SizeValue,
  parentDir: Direction,
): Record<string, string | number> {
  const styles: Record<string, string | number> = {};
  const isInRow = parentDir === DIRECTION.ROW;
  const mainSize = isInRow ? width : height;
  const crossSize = isInRow ? height : width;

  // Main axis → flex property
  if (typeof mainSize === "number") {
    styles.flex = `0 0 ${inToPx(mainSize)}px`;
  } else if (mainSize === SIZE.FILL) {
    styles.flex = "1 1 0";
    // Row: min-width: 0 overrides the flex default (min-width: auto) so FILL items
    // can share space. Without it, items refuse to shrink below content width.
    // Column: min-height stays auto — vertical content can't reflow, so shrinking
    // below content height causes overlap. Images opt in to minHeight:0 separately.
    if (isInRow) {
      styles.minWidth = 0;
    }
  } else {
    // SIZE.HUG
    styles.flexShrink = 0;
  }

  // Cross axis → explicit CSS dimension
  if (typeof crossSize === "number") {
    if (isInRow) {
      styles.height = `${inToPx(crossSize)}px`;
    } else {
      styles.width = `${inToPx(crossSize)}px`;
    }
  } else if (crossSize === SIZE.FILL) {
    if (isInRow) {
      styles.height = "100%";
    } else {
      styles.width = "100%";
    }
  }
  // HUG cross-axis: omit (auto sizing)

  return styles;
}

/** Compute child context for Container, Stack, or Grid nodes.
 *  heightIsConstrained propagation: number→true, HUG→false, FILL→inherit. */
export function childContext(node: LayoutNode, parent: ParentCtx): ParentCtx {
  const heightIsConstrained =
    typeof node.height === "number" ? true : node.height === SIZE.HUG ? false : parent.heightIsConstrained;

  switch (node.type) {
    case NODE_TYPE.CONTAINER: {
      const isRow = (node as ContainerNode).direction === DIRECTION.ROW;
      return {
        direction: (node as ContainerNode).direction,
        hasDefiniteCrossSize: isRow ? node.height !== SIZE.HUG : undefined,
        heightIsConstrained,
      };
    }
    case NODE_TYPE.GRID:
      // Grid items fill left-to-right in rows of N columns.
      // Width comes from column tracks (main axis), height from row tracks (cross axis).
      return {
        direction: DIRECTION.ROW,
        hasDefiniteCrossSize: node.height !== SIZE.HUG,
        heightIsConstrained,
      };
    case NODE_TYPE.STACK:
      return {
        direction: DIRECTION.COLUMN,
        heightIsConstrained,
      };
  }
}

// ─── Alignment Helpers ────────────────────────

/** Column justify-content: vertical positioning. Uses 'safe' to prevent bounds escape on overflow. */
function vAlignToJustify(vAlign: VerticalAlignment): string {
  switch (vAlign) {
    case VALIGN.BOTTOM:
      return "safe flex-end";
    case VALIGN.MIDDLE:
      return "safe center";
    case VALIGN.TOP:
      return "flex-start";
  }
}

/** Row align-items: vertical cross-axis. TOP→stretch for equal-height children. */
function vAlignToAlignItems(vAlign: VerticalAlignment): string {
  switch (vAlign) {
    case VALIGN.TOP:
      return "stretch";
    case VALIGN.BOTTOM:
      return "flex-end";
    case VALIGN.MIDDLE:
      return "center";
  }
}

/** Column align-items: horizontal positioning of children. */
function hAlignToAlignItems(hAlign: HorizontalAlignment): string {
  switch (hAlign) {
    case HALIGN.RIGHT:
      return "flex-end";
    case HALIGN.CENTER:
      return "center";
    case HALIGN.LEFT:
      return "stretch";
  }
}

/** Row justify-content: horizontal positioning. */
function hAlignToJustify(hAlign: HorizontalAlignment): string {
  switch (hAlign) {
    case HALIGN.RIGHT:
      return "flex-end";
    case HALIGN.CENTER:
      return "center";
    case HALIGN.LEFT:
      return "flex-start";
  }
}

/** CSS text-align from horizontal alignment. */
function hAlignToTextAlign(hAlign: HorizontalAlignment): string {
  switch (hAlign) {
    case HALIGN.RIGHT:
      return "right";
    case HALIGN.CENTER:
      return "center";
    case HALIGN.LEFT:
      return "left";
  }
}

// ─── Per-Node Style Functions ─────────────────

function styleContainer(
  node: ContainerNode,
  parent: ParentCtx,
  nodeId: string,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios: FontNormalRatios,
  imagePathMap: Map<string, string>,
): StyledNode {
  const isRow = node.direction === DIRECTION.ROW;
  const spacingPx = inToPx(node.spacing);
  const basePaddingPx = node.padding ? inToPx(node.padding) : 0;
  const mainAxisPad = basePaddingPx + (node.spacingMode === SPACING_MODE.AROUND ? spacingPx : 0);
  const crossAxisPad = basePaddingPx;

  const justifyContent = isRow ? hAlignToJustify(node.hAlign) : vAlignToJustify(node.vAlign);
  const alignItems = isRow ? vAlignToAlignItems(node.vAlign) : hAlignToAlignItems(node.hAlign);

  const styles: Record<string, string | number> = {
    display: "flex",
    flexDirection: node.direction,
    gap: `${spacingPx}px`, // CSS gap property
    justifyContent,
    alignItems,
    ...flexSize(node.width, node.height, parent.direction),
    // Containment requires definite inline size. HUG columns are content-sized —
    // containment would zero their intrinsic width, collapsing the column.
    ...(!isRow && node.width !== SIZE.HUG ? { containerType: "inline-size" } : {}),
  };
  if (mainAxisPad > 0 || crossAxisPad > 0) {
    styles.padding = isRow ? `${crossAxisPad}px ${mainAxisPad}px` : `${mainAxisPad}px ${crossAxisPad}px`;
  }

  const ctx = childContext(node, parent);
  return {
    nodeId,
    styles,
    children: node.children.map((child) => styleNode(child, ctx, idCtx, nodeIds, fontRatios, imagePathMap)),
  };
}

function styleStack(
  node: StackNode,
  parent: ParentCtx,
  nodeId: string,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios: FontNormalRatios,
  imagePathMap: Map<string, string>,
): StyledNode {
  const gridMin = "min-content";
  const styles: Record<string, string | number> = {
    position: "relative",
    display: "grid",
    gridTemplate: `minmax(${gridMin}, 1fr) / minmax(${gridMin}, 1fr)`,
    ...flexSize(node.width, node.height, parent.direction),
  };

  const ctx = childContext(node, parent);
  return {
    nodeId,
    styles,
    children: node.children.map((child, i) => {
      // Stack child wrapper: same grid cell, flex column.
      // Explicit zIndex ensures array order = visual z-order even when
      // children create new stacking contexts (e.g. filter, box-shadow).
      const wrapperStyles: Record<string, string | number> = {
        gridArea: "1 / 1 / 2 / 2",
        display: "flex",
        flexDirection: DIRECTION.COLUMN,
        containerType: "inline-size",
        zIndex: i,
      };
      // Propagate child alignment to wrapper so overlay layers can position
      // content within the grid cell (e.g. vAlign: MIDDLE centers vertically).
      // Without this, the wrapper defaults to flex-start and the child's own
      // justify-content has no effect when the child is content-sized.
      if ("vAlign" in child) {
        wrapperStyles.justifyContent = vAlignToJustify((child as { vAlign: VerticalAlignment }).vAlign);
      }
      if ("hAlign" in child) {
        wrapperStyles.alignItems = hAlignToAlignItems((child as { hAlign: HorizontalAlignment }).hAlign);
      }
      return {
        nodeId: "",
        styles: wrapperStyles,
        children: [styleNode(child, ctx, idCtx, nodeIds, fontRatios, imagePathMap)],
      };
    }),
  };
}

function styleGrid(
  node: GridNode,
  parent: ParentCtx,
  nodeId: string,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios: FontNormalRatios,
  imagePathMap: Map<string, string>,
): StyledNode {
  const spacingPx = inToPx(node.spacing);

  const styles: Record<string, string | number> = {
    display: "grid",
    gridTemplateColumns: `repeat(${node.columns}, 1fr)`,
    gap: `${spacingPx}px`,
    ...flexSize(node.width, node.height, parent.direction),
  };

  // When the grid has definite height (FILL or fixed inches), distribute rows equally.
  // Without this, rows hug content and empty space pools at the bottom.
  if (node.height === SIZE.FILL || typeof node.height === "number") {
    styles.gridAutoRows = "1fr";
  }

  const ctx = childContext(node, parent);

  return {
    nodeId,
    styles,
    children: node.children.map((child) => styleNode(child, ctx, idCtx, nodeIds, fontRatios, imagePathMap)),
  };
}

function styleText(node: TextNode, parent: ParentCtx, nodeId: string, fontRatios: FontNormalRatios): StyledNode {
  const style = node.resolvedStyle;
  const runs = normalizeContent(node.content);
  const defaultFont = getFontForRun(style.fontFamily);
  const lineSpacingMultiple = node.lineHeightMultiplier;
  const fontSizePx = ptToPx(style.fontSize);
  const normalRatio = fontRatios.get(style.fontFamily.name);
  const cssLineHeight = normalRatio ? lineSpacingMultiple * normalRatio : lineSpacingMultiple;
  const bulletIndentPx = ptToPx(node.bulletIndentPt);
  const styles: Record<string, string | number> = {
    display: "flex",
    flexDirection: "column",
    justifyContent: vAlignToJustify(node.vAlign),
    fontFamily: `'${style.fontFamily.name}'`,
    fontWeight: defaultFont.weight,
    fontSize: `${fontSizePx}px`,
    lineHeight: `${cssLineHeight}`,
    color: node.color,
    textAlign: hAlignToTextAlign(node.hAlign),
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    ...flexSize(node.width, node.height, parent.direction),
  };

  if (node.border) {
    const bw = ptToPx(node.border.width);
    if (bw > 0) styles.border = `${bw}px ${node.border.dashType} ${node.border.color}`;
  }
  applyShadowCSS(node.shadow, styles);

  return {
    nodeId,
    styles,
    children: [],
    innerHTML: `<div>${renderTextRunsToHTML(runs, style, bulletIndentPx, node.linkColor, node.linkUnderline)}</div>`,
  };
}

// Image does NOT use flexSize() — aspect-ratio coupling requires a different flex strategy
// per parent context (hasDefiniteCrossSize, heightIsConstrained). See architect review.
function styleImage(node: ImageNode, parent: ParentCtx, nodeId: string, imagePathMap: Map<string, string>): StyledNode {
  const dims = readImageDimensions(node.src);
  if (!dims) {
    throw new Error(`Cannot read image dimensions: ${node.src}`);
  }

  const maxWidthPx = dims.width;
  const maxHeightPx = dims.height;

  const styles: Record<string, string | number> = {
    aspectRatio: `${dims.aspectRatio}`,
  };

  if (parent.direction === DIRECTION.ROW) {
    styles.height = "100%";
    styles.minWidth = 0;
    styles.flex = parent.hasDefiniteCrossSize ? "0 1 auto" : "1 1 0";
  } else {
    styles.width = "100%";
    if (parent.heightIsConstrained) {
      styles.flex = "1 1 0";
      styles.minHeight = 0;
    } else {
      styles.flex = "0 1 auto";
    }
  }

  if (maxWidthPx) styles.maxWidth = `${maxWidthPx}px`;
  if (parent.direction === DIRECTION.ROW) {
    // Row: simple pixel cap (height is the cross axis, no cqw needed)
    if (maxHeightPx) styles.maxHeight = `${maxHeightPx}px`;
  } else {
    // Column: cap at the SMALLER of native pixels and proportional height
    // from container width. Uses container query units (cqw) to sidestep
    // the aspect-ratio-in-flex problem entirely.
    const proportionalCap = `calc(100cqw / ${dims.aspectRatio})`;
    styles.maxHeight = maxHeightPx ? `min(${maxHeightPx}px, ${proportionalCap})` : proportionalCap;
  }

  const resolved = path.resolve(node.src);
  const imgSrc = imagePathMap.get(resolved) ?? resolved;

  styles.position = "relative";
  styles.overflow = node.shadow ? "visible" : "hidden";

  let imgStyle = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block";
  if (node.shadow) {
    // Use drop-shadow (not box-shadow) so the shadow follows the PNG's
    // alpha channel — e.g. rounded corners from code blocks.
    const { x, y, rgba } = shadowOffsets(node.shadow);
    imgStyle += `;filter:drop-shadow(${ptToPx(x)}px ${ptToPx(y)}px ${ptToPx(node.shadow.blur)}px ${rgba})`;
  }

  return {
    nodeId,
    styles,
    children: [],
    innerHTML: `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(node.alt ?? "")}" style="${imgStyle}" />`,
  };
}

/** Dash patterns as multiples of stroke width. */
function dashTypeMultipliers(dt: DashType): number[] | undefined {
  switch (dt) {
    case DASH_TYPE.SOLID:
      return undefined;
    case DASH_TYPE.DASHED:
      return [4, 3];
    case DASH_TYPE.DOTTED:
      return [1, 1];
    default:
      return undefined;
  }
}

function styleLine(node: LineNode, parent: ParentCtx, nodeId: string): StyledNode {
  const { color, width: strokePt, dashType } = node.stroke;
  const isVertical = node.direction === DIRECTION.COLUMN;
  const strokePx = ptToPx(strokePt);

  const x1 = isVertical ? "50%" : "0";
  const y1 = isVertical ? "0" : "50%";
  const x2 = isVertical ? "50%" : "100%";
  const y2 = isVertical ? "100%" : "50%";

  const multipliers = dashTypeMultipliers(dashType);
  const dashAttr = multipliers ? ` stroke-dasharray="${multipliers.map((m) => m * strokePx).join(" ")}"` : "";

  // display:block prevents the inline SVG line-box problem — without it the browser
  // creates a line box whose height (based on inherited font metrics) inflates the
  // flex item's min-height:auto beyond the intended stroke-width basis.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" overflow="visible" style="display:block"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokePx}"${dashAttr}/></svg>`;

  // Line has no width/height fields — derive from direction:
  // Main axis of the line itself FILLs, cross axis HUGs (overridden with stroke px below).
  const lineWidth = isVertical ? SIZE.HUG : SIZE.FILL;
  const lineHeight = isVertical ? SIZE.FILL : SIZE.HUG;
  const styles: Record<string, string | number> = flexSize(lineWidth, lineHeight, parent.direction);

  // Override cross-axis with the stroke pixel dimension so the SVG has an explicit size.
  if (isVertical) {
    styles.width = `${strokePx}px`;
  } else {
    styles.height = `${strokePx}px`;
  }

  applyShadowCSS(node.shadow, styles);
  return { nodeId, styles, children: [], innerHTML: svg };
}

/** Compute shadow x/y offsets and rgba color from a Shadow config. */
function shadowOffsets(shadow: Shadow): { x: number; y: number; rgba: string } {
  const rad = (shadow.angle * Math.PI) / 180;
  return {
    x: shadow.offset * Math.sin(rad),
    y: -shadow.offset * Math.cos(rad),
    rgba: hexToRgba(shadow.color, shadow.opacity / 100),
  };
}

/** Apply box-shadow CSS from a Shadow config. Mutates styles in place. */
function applyShadowCSS(shadow: Shadow | undefined, styles: Record<string, string | number>): void {
  if (!shadow) return;
  const { x, y, rgba } = shadowOffsets(shadow);
  styles.boxShadow = `${ptToPx(x)}px ${ptToPx(y)}px ${ptToPx(shadow.blur)}px ${rgba}`;
}

function styleShape(node: ShapeNode, parent: ParentCtx, nodeId: string): StyledNode {
  const styles: Record<string, string | number> = {
    ...flexSize(node.width, node.height, parent.direction),
  };
  // Exhaustive switch ensures new shapes must be handled here at compile time.
  // Rectangle/ellipse use pure CSS (borders follow border-radius naturally).
  // Polygon shapes use inline SVG so stroke follows the shape outline.
  switch (node.shape) {
    case SHAPE.RECTANGLE:
      styles.backgroundColor = bgColor(node.fill.color, node.fill.opacity);
      if (node.cornerRadius) styles.borderRadius = `${inToPx(node.cornerRadius)}px`;
      applyCSSBorder(node, styles);
      applyShadowCSS(node.shadow, styles);
      return { nodeId, styles, children: [] };
    case SHAPE.ELLIPSE:
      styles.backgroundColor = bgColor(node.fill.color, node.fill.opacity);
      styles.borderRadius = "50%";
      applyCSSBorder(node, styles);
      applyShadowCSS(node.shadow, styles);
      return { nodeId, styles, children: [] };
    case SHAPE.TRIANGLE:
      return styleSvgPolygon(node, nodeId, styles, "50,0 0,100 100,100");
    case SHAPE.DIAMOND:
      return styleSvgPolygon(node, nodeId, styles, "50,0 100,50 50,100 0,50");
    default: {
      const _exhaustive: never = node.shape;
      throw new Error(`Unsupported shape: ${_exhaustive}`);
    }
  }
}

function applyCSSBorder(node: ShapeNode, styles: Record<string, string | number>): void {
  if (!node.border) return;
  const bw = ptToPx(node.border.width);
  if (bw > 0) styles.border = `${bw}px ${node.border.dashType} ${node.border.color}`;
}

/** Render a polygon shape as inline SVG. */
function styleSvgPolygon(
  node: ShapeNode,
  nodeId: string,
  styles: Record<string, string | number>,
  points: string,
): StyledNode {
  const fillOpacity = node.fill.opacity / 100;
  const bw = node.border ? ptToPx(node.border.width) : 0;
  let stroke = "";
  if (bw > 0 && node.border) {
    const multipliers = dashTypeMultipliers(node.border.dashType);
    const dashAttr = multipliers ? ` stroke-dasharray="${multipliers.map((m) => m * bw).join(" ")}"` : "";
    stroke = ` stroke="${node.border.color}" stroke-width="${bw}" vector-effect="non-scaling-stroke"${dashAttr}`;
  }
  // Shadow: CSS filter drop-shadow follows the visual shape (unlike box-shadow which follows the box)
  if (node.shadow) {
    const { x, y, rgba } = shadowOffsets(node.shadow);
    styles.filter = `drop-shadow(${ptToPx(x)}px ${ptToPx(y)}px ${ptToPx(node.shadow.blur)}px ${rgba})`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${points}" fill="${node.fill.color}" fill-opacity="${fillOpacity}"${stroke}/></svg>`;
  return { nodeId, styles, children: [], innerHTML: svg };
}

function styleSlideNumber(node: SlideNumberNode, parent: ParentCtx, nodeId: string): StyledNode {
  const style = node.resolvedStyle;
  const fontSizePx = ptToPx(style.fontSize);
  const defaultFont = getFontForRun(style.fontFamily);

  return {
    nodeId,
    styles: {
      display: "flex",
      flexDirection: DIRECTION.COLUMN,
      justifyContent: vAlignToJustify(node.vAlign),
      fontFamily: `'${style.fontFamily.name}'`,
      fontWeight: defaultFont.weight,
      fontSize: `${fontSizePx}px`,
      color: node.color,
      textAlign: hAlignToTextAlign(node.hAlign),
      whiteSpace: "nowrap",
      ...flexSize(node.width, node.height, parent.direction),
    },
    children: [],
    textContent: SLIDE_NUMBER_PLACEHOLDER,
  };
}

function styleTable(
  node: TableNode,
  parent: ParentCtx,
  nodeId: string,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios: FontNormalRatios,
): StyledNode {
  const cellNodes = getTableCellNodes(node);
  const numCols = node.rows[0]?.length ?? 0;
  const cellPadding = node.cellPadding;
  const cellPaddingPx = inToPx(cellPadding);

  const headerRows = node.headerRow ? 1 : 0;
  const headerCols = node.headerCol ? 1 : 0;

  const styles: Record<string, string | number> = {
    display: "grid",
    gridTemplateColumns: `repeat(${numCols}, 1fr)`,
    ...flexSize(node.width, node.height, parent.direction),
  };

  // Outer border — present only when node.border is set
  if (node.border) {
    const outerWidthPx = ptToPx(node.border.width);
    styles.outline = `${outerWidthPx}px solid ${node.border.color}`;
    styles.outlineOffset = `-${outerWidthPx}px`;
  }

  const numRows = cellNodes.length;

  // Each cell: padding wrapper → text StyledNode
  const cellChildren: StyledNode[] = cellNodes.flatMap((row: TextNode[], ri: number) =>
    row.map((cellTextNode: TextNode, colIdx: number) => {
      const cellNodeId = generateNodeId(idCtx);
      nodeIds.set(cellTextNode, cellNodeId);

      const cellStyles: Record<string, string | number> = {
        padding: `${cellPaddingPx}px`,
      };

      // Cell grid lines — directional based on gridStyle + gridStroke
      if (node.gridStroke && node.gridStyle !== GRID_STYLE.NONE) {
        const gridWidthPx = ptToPx(node.gridStroke.width);
        const gs = `${gridWidthPx}px solid ${node.gridStroke.color}`;
        switch (node.gridStyle) {
          case GRID_STYLE.BOTH: {
            if (ri < numRows - 1) cellStyles.borderBottom = gs;
            if (colIdx < numCols - 1) cellStyles.borderRight = gs;
            break;
          }
          case GRID_STYLE.HORIZONTAL: {
            if (ri < numRows - 1) cellStyles.borderBottom = gs;
            break;
          }
          case GRID_STYLE.VERTICAL: {
            if (colIdx < numCols - 1) cellStyles.borderRight = gs;
            break;
          }
          // NONE: no cell borders
        }
      }

      // Cell background: cell-level fill overrides, then 3-zone cascade (headerRow > headerCol > cell)
      const rawCell = node.rows[ri][colIdx];
      if (rawCell.fill) {
        cellStyles.backgroundColor = rawCell.fill;
      } else {
        const isHeaderRow = ri < headerRows;
        const isHeaderCol = !isHeaderRow && colIdx < headerCols;
        if (isHeaderRow && node.headerRow) {
          cellStyles.backgroundColor = bgColor(node.headerRow.background, node.headerRow.backgroundOpacity);
        } else if (isHeaderCol && node.headerCol) {
          cellStyles.backgroundColor = bgColor(node.headerCol.background, node.headerCol.backgroundOpacity);
        } else if (!isHeaderRow && !isHeaderCol && node.cellBackground && node.cellBackgroundOpacity > 0) {
          cellStyles.backgroundColor = bgColor(node.cellBackground, node.cellBackgroundOpacity);
        }
      }

      // colspan / rowspan: CSS grid span
      if (rawCell.colspan && rawCell.colspan > 1) {
        cellStyles.gridColumn = `span ${rawCell.colspan}`;
      }
      if (rawCell.rowspan && rawCell.rowspan > 1) {
        cellStyles.gridRow = `span ${rawCell.rowspan}`;
      }

      const textStyled = styleText(
        cellTextNode,
        { direction: DIRECTION.COLUMN, heightIsConstrained: false },
        cellNodeId,
        fontRatios,
      );
      return {
        nodeId: "",
        styles: cellStyles,
        children: [textStyled],
      };
    }),
  );

  return { nodeId, styles, children: cellChildren };
}

// ─── The Dispatch ─────────────────────────────

/** Phase 1: Recursively compute CSS styles for every node. Pure data, no JSX. */
export function styleNode(
  node: ElementNode,
  parent: ParentCtx,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios: FontNormalRatios,
  imagePathMap: Map<string, string>,
): StyledNode {
  const nodeId = generateNodeId(idCtx);
  nodeIds.set(node, nodeId);

  switch (node.type) {
    case NODE_TYPE.CONTAINER:
      return styleContainer(node as ContainerNode, parent, nodeId, idCtx, nodeIds, fontRatios, imagePathMap);
    case NODE_TYPE.STACK:
      return styleStack(node as StackNode, parent, nodeId, idCtx, nodeIds, fontRatios, imagePathMap);
    case NODE_TYPE.GRID:
      return styleGrid(node as GridNode, parent, nodeId, idCtx, nodeIds, fontRatios, imagePathMap);
    case NODE_TYPE.TEXT:
      return styleText(node as TextNode, parent, nodeId, fontRatios);
    case NODE_TYPE.IMAGE:
      return styleImage(node as ImageNode, parent, nodeId, imagePathMap);
    case NODE_TYPE.LINE:
      return styleLine(node as LineNode, parent, nodeId);
    case NODE_TYPE.SHAPE:
      return styleShape(node as ShapeNode, parent, nodeId);
    case NODE_TYPE.SLIDE_NUMBER:
      return styleSlideNumber(node as SlideNumberNode, parent, nodeId);
    case NODE_TYPE.TABLE:
      return styleTable(node as TableNode, parent, nodeId, idCtx, nodeIds, fontRatios);
    default:
      return { nodeId, styles: {}, children: [] };
  }
}

// ============================================
// PHASE 1 HELPERS: Text Run HTML
// ============================================

/** Render text runs to an HTML string for innerHTML injection.
 *  Groups runs into lines: bullet/paragraphBreak starts a new group, plain runs join current.
 *  Consecutive bullet lines are wrapped in a single <ul> with native disc markers. */
function renderTextRunsToHTML(
  runs: NormalizedRun[],
  style: TextStyle,
  bulletIndentPx: number,
  linkColor?: string,
  linkUnderline?: boolean,
): string {
  // Step 1: Group runs into renderable lines
  const groups: NormalizedRun[][] = [];
  let currentGroup: NormalizedRun[] = [];
  for (const run of runs) {
    if (run.bullet || run.paragraphBreak || run.softBreak) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [run];
    } else {
      currentGroup.push(run);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Step 2: Render groups, collecting consecutive bullets into <ul>/<ol>
  const parts: string[] = [];
  let bulletBuffer: string[] = [];
  let bulletBufferOrdered = false;

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      const tag = bulletBufferOrdered ? "ol" : "ul";
      const listStyle = bulletBufferOrdered ? "decimal outside" : "disc outside";
      parts.push(
        `<${tag} style="margin:0;padding:0 0 0 ${bulletIndentPx}px;list-style:${listStyle}">${bulletBuffer.join("")}</${tag}>`,
      );
      bulletBuffer = [];
      bulletBufferOrdered = false;
    }
  };

  for (const group of groups) {
    const first = group[0];
    const spans = group.map((run) => renderRunSpanHTML(run, style, linkColor, linkUnderline)).join("");

    if (first.bullet) {
      const isOrdered = typeof first.bullet === "object" && first.bullet.type === "number";
      // Flush if switching between ordered/unordered
      if (bulletBuffer.length > 0 && isOrdered !== bulletBufferOrdered) {
        flushBullets();
      }
      bulletBufferOrdered = isOrdered;
      bulletBuffer.push(`<li style="margin:0;padding:0">${spans}</li>`);
    } else {
      flushBullets();
      if (first.paragraphBreak) {
        parts.push(`<div style="margin-top:1em">${spans}</div>`);
      } else if (first.softBreak) {
        parts.push(`<br/><span>${spans}</span>`);
      } else {
        parts.push(`<span>${spans}</span>`);
      }
    }
  }
  flushBullets();

  return parts.join("");
}

/** Render a single run as an inline <span> HTML string. */
function renderRunSpanHTML(run: NormalizedRun, style: TextStyle, linkColor?: string, linkUnderline?: boolean): string {
  const css: string[] = [];
  const family = style.fontFamily;

  // Bold/italic: resolve font and apply CSS overrides
  if (run.bold || run.italic) {
    const font = getFontForRun(family, run.bold, run.italic);
    if (run.bold) {
      // Use the resolved font's weight if a bold slot exists,
      // otherwise fall back to CSS 'bold' for synthetic bold
      css.push(`font-weight:${font.weight !== family.regular.weight ? font.weight : "bold"}`);
    }
    if (run.italic) {
      css.push("font-style:italic");
    }
  }

  if (run.color) {
    css.push(`color:${run.color}`);
  }

  if (run.highlight) {
    css.push(`background-color:${run.highlight.bg}`);
    css.push(`color:${run.highlight.text}`);
  }

  // Text decorations: strikethrough and underline can combine
  const decorations: string[] = [];
  if (run.strikethrough) decorations.push("line-through");
  if (run.underline) decorations.push("underline");
  if (decorations.length > 0) {
    css.push(`text-decoration:${decorations.join(" ")}`);
  }

  const escaped = escapeHtml(run.text);
  let html: string;
  if (css.length > 0) {
    html = `<span style="${css.join(";")}">${escaped}</span>`;
  } else {
    html = `<span>${escaped}</span>`;
  }

  // Wrap in <a> for hyperlinks — color and underline from tokens
  // Accent color (explicit run.color) wins over link token
  if (run.hyperlink) {
    const linkCss: string[] = [];
    linkCss.push(!run.color && linkColor ? `color:${linkColor}` : "color:inherit");
    linkCss.push(linkUnderline && !run.underline ? "text-decoration:underline" : "text-decoration:inherit");
    html = `<a href="${escapeHtml(run.hyperlink)}" style="${linkCss.join(";")}">${html}</a>`;
  }

  return html;
}

/** Escape HTML special characters in text content */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Table Cell Nodes ─────────────────────────

function getTableCellNodes(node: TableNode): TextNode[][] {
  return node.rows.map((row) =>
    row.map(
      (cell: TableCellData): TextNode => ({
        type: NODE_TYPE.TEXT,
        width: cell.width,
        height: cell.height,
        content: cell.content,
        style: cell.textStyle,
        resolvedStyle: cell.resolvedStyle,
        color: cell.color,
        hAlign: cell.hAlign,
        vAlign: cell.vAlign,
        lineHeightMultiplier: cell.resolvedStyle.lineHeightMultiplier,
        bulletIndentPt: 0, // Table cells never have bullets
        linkColor: cell.linkColor,
        linkUnderline: cell.linkUnderline,
      }),
    ),
  );
}

// ============================================
// PHASE 2: JSX RENDERING (single generic component)
// ============================================

/** Phase 2: Map StyledNode tree to JSX. No logic — just styles to <div>. */
const StyledDiv: FC<{ node: StyledNode }> = ({ node }) => {
  // Skip wrapper divs (stack children, table cell padding) that have no nodeId
  const attrs: Record<string, string> = {};
  if (node.nodeId) {
    attrs["data-node-id"] = node.nodeId;
  }

  // innerHTML: apply dangerouslySetInnerHTML directly on the div (no wrapper span).
  // This matches V1's DOM structure where text content is direct children of the div.
  if (node.innerHTML) {
    return <div {...attrs} style={node.styles} dangerouslySetInnerHTML={{ __html: node.innerHTML }} />;
  }

  return (
    <div {...attrs} style={node.styles}>
      {node.textContent ? node.textContent : node.children.map((child, i) => <StyledDiv key={i} node={child} />)}
    </div>
  );
};

// ============================================
// PHASE 3: DOCUMENT ASSEMBLY
// ============================================

/** Result of batch HTML generation */
export interface LayoutHtmlResult {
  html: string;
  slideNodeIds: Array<Map<ElementNode, string>>;
  slideFragments: string[];
}

/** Font descriptor for explicit preloading */
export interface FontDescriptor {
  name: string;
  weight: number;
}

export function generateLayoutHTML(
  slides: Array<{ tree: ElementNode; bounds: Bounds; background: Background }>,
  theme: Theme,
  _labels: string[],
  fontNormalRatios: FontNormalRatios,
  imagePathMap: Map<string, string>,
): LayoutHtmlResult {
  const idCtx: IdContext = { counter: 0 };
  const slideNodeIds: Array<Map<ElementNode, string>> = [];

  // Phase 1 + 2: style each slide, then wrap in JSX
  const slideJsx = slides.map((slide, i) => {
    const nodeIds: Map<ElementNode, string> = new Map();
    slideNodeIds.push(nodeIds);

    const widthPx = inToPx(slide.bounds.w);
    const heightPx = inToPx(slide.bounds.h);

    const rootCtx: ParentCtx = { direction: DIRECTION.COLUMN, heightIsConstrained: true };
    const styled = styleNode(slide.tree, rootCtx, idCtx, nodeIds, fontNormalRatios, imagePathMap);

    const bg = slide.background;
    const rootStyles: Record<string, string> = {
      width: `${widthPx}px`,
      height: `${heightPx}px`,
    };
    if (bg.color) {
      rootStyles.backgroundColor = bgColor(bg.color, bg.opacity ?? 100);
    }
    if (bg.path) {
      const resolvedBg = path.resolve(bg.path);
      const bgSrc = imagePathMap.get(resolvedBg) ?? resolvedBg;
      rootStyles.backgroundImage = `url('${bgSrc.replace(/'/g, "\\'")}')`;
      rootStyles.backgroundSize = "cover";
    }

    return (
      <div class="root" data-slide-index={`${i}`} style={rootStyles}>
        <StyledDiv node={styled} />
      </div>
    );
  });

  const baseCSS = generateBaseCSS(theme);

  // Phase 3: render to HTML string (clean measurement — no debug visuals)
  const fullJsx = (
    <html>
      <head>
        <meta charset="UTF-8" />
        <style dangerouslySetInnerHTML={{ __html: baseCSS }} />
      </head>
      <body>{slideJsx}</body>
    </html>
  );

  const html = `<!DOCTYPE html>${renderToString(fullJsx)}`;

  // Content-only HTML fragments for each slide (no wrapper, no nav)
  const slideFragments = slideJsx.map((jsx) => renderToString(jsx));

  return { html, slideNodeIds, slideFragments };
}

// ============================================
// PREVIEW HTML GENERATION
// ============================================

/**
 * Generate base CSS for measurement and preview HTML.
 * Includes @font-face rules and CSS reset.
 * Measurement uses overflow:hidden (default); preview overrides with overflow:auto.
 */
export function generateBaseCSS(theme: Theme): string {
  const { css: fontFaceCSS } = generateFontFaceCSS(theme);
  return `${fontFaceCSS}
    * { margin: 0; padding: 0; box-sizing: border-box; font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'calt' 0; }
    body { overflow: hidden; }
    .root { display: flex; flex-direction: column; }
    .root > * { flex: 1 1 0; min-height: 0; }`;
}

/**
 * Generate composite preview HTML pages.
 * Each page layers a master fragment (full slide) behind a slide fragment (content area).
 * Includes nav bar with stable prev/next arrows (dimmed when inactive).
 */
export function generatePreviewHTML(
  slides: Array<{
    masterFragment: string;
    slideFragment: string;
    contentBounds: Bounds;
    label: string;
  }>,
  theme: Theme,
): string[] {
  const baseCSS = generateBaseCSS(theme);
  const slideW = inToPx(theme.slide.width);
  const slideH = inToPx(theme.slide.height);

  return slides.map((slide, i) => {
    const prevSlide = i > 0 ? slides[i - 1] : null;
    const nextSlide = i < slides.length - 1 ? slides[i + 1] : null;

    // Nav bar with stable arrows (both always rendered, dimmed when inactive)
    const prevHtml = prevSlide
      ? `<a href="${prevSlide.label}.html" style="color:#fff;text-decoration:none">\u2190 prev</a>`
      : `<span style="color:#666">\u2190 prev</span>`;
    const nextHtml = nextSlide
      ? `<a href="${nextSlide.label}.html" style="color:#fff;text-decoration:none">next \u2192</a>`
      : `<span style="color:#666">next \u2192</span>`;
    const navBar = `<div style="background:#333;color:#fff;padding:4px 8px;font:14px monospace;display:flex;justify-content:center;align-items:center;gap:12px">${prevHtml}<strong>${slide.label}</strong>${nextHtml}</div>`;

    // Content bounds in pixels
    const cx = inToPx(slide.contentBounds.x);
    const cy = inToPx(slide.contentBounds.y);
    const cw = inToPx(slide.contentBounds.w);
    const ch = inToPx(slide.contentBounds.h);

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${baseCSS} body { overflow: auto; background: #f0f0f0; }</style></head>
<body>
${navBar}
<div style="position:relative;width:${slideW}px;height:${slideH}px;box-shadow:0 0 0 1px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08)">
<div style="position:absolute;inset:0">${slide.masterFragment}</div>
<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px">${slide.slideFragment}</div>
</div>
</body>
</html>`;
  });
}

// ============================================
// FONT INFRASTRUCTURE
// ============================================

/**
 * Generate @font-face CSS rules from theme.fonts.
 * Assumes theme fonts have been pre-validated via validateThemeFonts().
 */
export function generateFontFaceCSS(theme: Theme): { css: string; fonts: FontDescriptor[] } {
  const fontFaces: string[] = [];
  const fonts: FontDescriptor[] = [];
  // Dedup by (font-family name + path) — the same physical file may need
  // separate @font-face rules for different font-family names (e.g. inter.bold
  // and interLight.bold share a file but need distinct CSS font-family entries)
  const seen = new Set<string>();

  for (const family of theme.fonts) {
    const cssFamily = family.name;
    for (const slot of Object.values(FONT_SLOT)) {
      const font = family[slot];
      if (!font || !font.path) continue;
      const key = `${cssFamily}\0${font.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isItalic = slot === FONT_SLOT.ITALIC || slot === FONT_SLOT.BOLD_ITALIC;
      fonts.push({ name: cssFamily, weight: font.weight });
      const ext = path.extname(font.path).toLowerCase();
      const fontFormat = FONT_FORMATS[ext];
      if (!fontFormat) {
        throw new Error(
          `Unsupported font format "${ext}" for ${font.path}. Supported: ${Object.keys(FONT_FORMATS).join(", ")}`,
        );
      }
      fontFaces.push(`
          @font-face {
            font-family: '${cssFamily}';
            src: url('fonts/${path.basename(font.path)}') format('${fontFormat.format}');
            font-weight: ${font.weight};
            font-style: ${isItalic ? "italic" : "normal"};
          }
        `);
    }
  }

  return { css: fontFaces.join("\n"), fonts };
}

export async function preloadFonts(page: Page, fonts: FontDescriptor[]): Promise<void> {
  const failures = await page.evaluate(async (fontList) => {
    const failed: string[] = [];
    for (const f of fontList) {
      const loaded = await document.fonts.load(`${f.weight} 16px "${f.name}"`);
      if (loaded.length === 0) {
        failed.push(`"${f.name}" weight ${f.weight}`);
      }
    }
    return failed;
  }, fonts);

  if (failures.length > 0) {
    throw new Error(
      `Fonts failed to load in Playwright: ${failures.join(", ")}. Check @font-face CSS and font file paths.`,
    );
  }
}

export async function measureFontNormalRatios(
  page: Page,
  theme: Theme,
  outputDir: string,
): Promise<{ ratios: FontNormalRatios; fonts: FontDescriptor[] }> {
  const { css: fontFaceCSS, fonts } = generateFontFaceCSS(theme);
  const html = `<!DOCTYPE html><html><head><style>${fontFaceCSS}</style></head><body></body></html>`;
  const htmlPath = path.join(outputDir, "_font-ratios.html");
  fs.writeFileSync(htmlPath, html);
  await page.goto(`file://${htmlPath}`);
  await preloadFonts(page, fonts);

  const fontNames = new Set<string>();
  for (const styleName of Object.keys(theme.textStyles)) {
    const style = theme.textStyles[styleName];
    fontNames.add(style.fontFamily.name);
  }

  const ratios = await page.evaluate(
    (names: string[]) => {
      const results: Array<{ name: string; ratio: number }> = [];
      for (const name of names) {
        const el = document.createElement("div");
        el.style.fontFamily = `'${name}'`;
        el.style.fontSize = "100px";
        el.style.lineHeight = "normal";
        el.style.position = "absolute";
        el.textContent = "X";
        document.body.appendChild(el);
        const ratio = el.getBoundingClientRect().height / 100;
        document.body.removeChild(el);
        results.push({ name, ratio });
      }
      return results;
    },
    [...fontNames],
  );

  const result: FontNormalRatios = new Map();
  for (const { name, ratio } of ratios) {
    result.set(name, ratio);
  }
  return { ratios: result, fonts };
}
