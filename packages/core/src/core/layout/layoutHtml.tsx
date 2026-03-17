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
  ImageNode,
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
  BORDER_STYLE,
  DASH_TYPE,
  DIRECTION,
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

/** Compute flex-item CSS for a node based on its parent's direction.
 *  Three size types: number (fixed inches), SIZE.FILL (share space), SIZE.HUG (content-sized). */
export function flexItem(
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
    // Horizontal: min-width: 0 lets text reflow.
    // Vertical: min-height stays auto (padding boundary preserved).
    // Images opt into compression via their own min-height: 0 (see styleImage).
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

/** Compute child context for Container or Stack nodes.
 *  heightIsConstrained propagation: number→true, HUG→false, FILL→inherit. */
export function childContext(node: ContainerNode | StackNode, parent: ParentCtx): ParentCtx {
  const heightIsConstrained =
    typeof node.height === "number" ? true : node.height === SIZE.HUG ? false : parent.heightIsConstrained;

  if (node.type === NODE_TYPE.CONTAINER) {
    const isRow = (node as ContainerNode).direction === DIRECTION.ROW;
    return {
      direction: (node as ContainerNode).direction,
      hasDefiniteCrossSize: isRow ? node.height !== SIZE.HUG : undefined,
      heightIsConstrained,
    };
  }

  // Stack: children are in column context
  return {
    direction: DIRECTION.COLUMN,
    heightIsConstrained,
  };
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

function hAlignToCSS(hAlign: HorizontalAlignment): string {
  switch (hAlign) {
    case HALIGN.RIGHT:
      return "flex-end";
    case HALIGN.CENTER:
      return "center";
    case HALIGN.LEFT:
      return "stretch";
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

  const justifyContent = isRow
    ? node.hAlign === HALIGN.CENTER
      ? "center"
      : node.hAlign === HALIGN.RIGHT
        ? "flex-end"
        : "flex-start"
    : vAlignToJustify(node.vAlign);
  const alignItems = isRow ? vAlignToAlignItems(node.vAlign) : hAlignToCSS(node.hAlign);

  const styles: Record<string, string | number> = {
    display: "flex",
    flexDirection: node.direction,
    gap: `${spacingPx}px`, // CSS gap property
    justifyContent,
    alignItems,
    ...flexItem(node.width, node.height, parent.direction),
    // Containment requires definite inline size. HUG columns are content-sized —
    // containment would zero their intrinsic width, collapsing the column.
    ...(!isRow && node.width !== SIZE.HUG ? { containerType: "inline-size" } : {}),
  };
  if (mainAxisPad > 0 || crossAxisPad > 0) {
    styles.padding = isRow
      ? `${crossAxisPad}px ${mainAxisPad}px`
      : `${mainAxisPad}px ${crossAxisPad}px`;
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
    ...flexItem(node.width, node.height, parent.direction),
  };

  const ctx = childContext(node, parent);
  return {
    nodeId,
    styles,
    children: node.children.map((child) => ({
      // Stack child wrapper: same grid cell, flex column
      nodeId: "",
      styles: {
        gridArea: "1 / 1 / 2 / 2",
        display: "flex",
        flexDirection: DIRECTION.COLUMN,
        containerType: "inline-size",
      },
      children: [styleNode(child, ctx, idCtx, nodeIds, fontRatios, imagePathMap)],
    })),
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
  const textAlign = node.hAlign === HALIGN.RIGHT ? "right" : node.hAlign === HALIGN.CENTER ? "center" : "left";
  const isInRow = parent.direction === DIRECTION.ROW;

  const styles: Record<string, string | number> = {
    display: "flex",
    flexDirection: "column",
    justifyContent: vAlignToJustify(node.vAlign),
    fontFamily: `'${style.fontFamily.name}'`,
    fontWeight: defaultFont.weight,
    fontSize: `${fontSizePx}px`,
    lineHeight: `${cssLineHeight}`,
    color: node.color,
    textAlign,
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    ...(isInRow ? { flex: "1 1 0", minWidth: 0 } : { width: "100%", flexShrink: 0 }),
  };

  applyShadowCSS(node.shadow, styles);

  return {
    nodeId,
    styles,
    children: [],
    innerHTML: `<div>${renderTextRunsToHTML(runs, style, bulletIndentPx, node.linkColor, node.linkUnderline)}</div>`,
  };
}

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
    innerHTML: `<img src="${imgSrc}" style="${imgStyle}" />`,
  };
}

/** Map pptxgenjs dash types to closest CSS border-style */
function dashTypeToCss(dt: DashType): string {
  switch (dt) {
    case DASH_TYPE.SOLID:
      return "solid";
    case DASH_TYPE.DASH:
    case DASH_TYPE.LG_DASH:
    case DASH_TYPE.DASH_DOT:
    case DASH_TYPE.LG_DASH_DOT:
      return "dashed";
    case DASH_TYPE.SYS_DASH:
    case DASH_TYPE.SYS_DOT:
      return "dotted";
    default:
      return "solid";
  }
}

function styleLine(node: LineNode, parent: ParentCtx, nodeId: string): StyledNode {
  const widthPx = ptToPx(node.width);
  const color = node.color;
  const borderStyle = dashTypeToCss(node.dashType);

  if (parent.direction === DIRECTION.ROW) {
    // Vertical separator in a row
    const styles: Record<string, string | number> = {
      flex: `0 0 ${widthPx}px`,
      alignSelf: "stretch",
      borderLeft: `${widthPx}px ${borderStyle} ${color}`,
    };
    applyShadowCSS(node.shadow, styles);
    return { nodeId, styles, children: [] };
  }
  // Horizontal separator in a column
  const styles: Record<string, string | number> = {
    flex: `0 0 ${widthPx}px`,
    width: "100%",
    borderTop: `${widthPx}px ${borderStyle} ${color}`,
  };
  applyShadowCSS(node.shadow, styles);
  return { nodeId, styles, children: [] };
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

function styleShape(node: ShapeNode, nodeId: string): StyledNode {
  const styles: Record<string, string | number> = {
    width: "100%",
    height: "100%",
  };
  // Fill: use rgba for partial opacity so borders stay fully opaque
  styles.backgroundColor = bgColor(node.fill.color, node.fill.opacity);
  // Shape type: ellipse gets border-radius: 50%
  if (node.shape === SHAPE.ELLIPSE) {
    styles.borderRadius = "50%";
  } else if (node.cornerRadius) {
    styles.borderRadius = `${inToPx(node.cornerRadius)}px`;
  }
  const bw = ptToPx(node.border.width);
  if (bw > 0) {
    styles.border = `${bw}px solid ${node.border.color}`;
  }
  applyShadowCSS(node.shadow, styles);
  return { nodeId, styles, children: [] };
}

function styleSlideNumber(node: SlideNumberNode, nodeId: string): StyledNode {
  const style = node.resolvedStyle;
  const fontSizePx = ptToPx(style.fontSize);
  const defaultFont = getFontForRun(style.fontFamily);

  const textAlign = node.hAlign === HALIGN.RIGHT ? "right" : node.hAlign === HALIGN.CENTER ? "center" : "left";
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
      textAlign,
      whiteSpace: "nowrap",
      flex: "0 0 auto",
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
  const isInRow = parent.direction === DIRECTION.ROW;

  const borderWidthPx = ptToPx(node.borderWidth);
  const borderColor = node.borderColor;
  const headerRows = node.headerRows ?? 0;
  const headerCols = node.headerColumns ?? 0;

  const styles: Record<string, string | number> = {
    display: "grid",
    gridTemplateColumns: `repeat(${numCols}, 1fr)`,
    ...(isInRow ? { flex: "1 1 0", minWidth: 0 } : { width: "100%" }),
  };

  // Outer border (FULL, HORIZONTAL, VERTICAL get outer border; INTERNAL and NONE do not)
  if (node.borderStyle !== BORDER_STYLE.NONE && node.borderStyle !== BORDER_STYLE.INTERNAL) {
    const bs = `${borderWidthPx}px solid ${borderColor}`;
    if (node.borderStyle === BORDER_STYLE.HORIZONTAL) {
      styles.borderTop = bs;
      styles.borderBottom = bs;
    } else if (node.borderStyle === BORDER_STYLE.VERTICAL) {
      styles.borderLeft = bs;
      styles.borderRight = bs;
    } else {
      // FULL
      styles.outline = `${borderWidthPx}px solid ${borderColor}`;
      styles.outlineOffset = `-${borderWidthPx}px`;
    }
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

      // Cell borders — directional based on borderStyle
      const bs = `${borderWidthPx}px solid ${borderColor}`;
      switch (node.borderStyle) {
        case BORDER_STYLE.FULL:
        case BORDER_STYLE.INTERNAL: {
          // All internal lines. Use border on right/bottom edges to avoid doubling.
          if (ri < numRows - 1) cellStyles.borderBottom = bs;
          if (colIdx < numCols - 1) cellStyles.borderRight = bs;
          break;
        }
        case BORDER_STYLE.HORIZONTAL: {
          if (ri < numRows - 1) cellStyles.borderBottom = bs;
          break;
        }
        case BORDER_STYLE.VERTICAL: {
          if (colIdx < numCols - 1) cellStyles.borderRight = bs;
          break;
        }
        // NONE: no cell borders
      }

      // Cell background: cell-level fill overrides, then header/non-header cascade
      const rawCell = node.rows[ri][colIdx];
      if (rawCell.fill) {
        cellStyles.backgroundColor = rawCell.fill;
      } else {
        const isHeader = ri < headerRows || colIdx < headerCols;
        if (isHeader && node.headerBackground) {
          cellStyles.backgroundColor = bgColor(node.headerBackground, node.headerBackgroundOpacity);
        } else if (!isHeader && node.cellBackground && node.cellBackgroundOpacity > 0) {
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
    case NODE_TYPE.TEXT:
      return styleText(node as TextNode, parent, nodeId, fontRatios);
    case NODE_TYPE.IMAGE:
      return styleImage(node as ImageNode, parent, nodeId, imagePathMap);
    case NODE_TYPE.LINE:
      return styleLine(node as LineNode, parent, nodeId);
    case NODE_TYPE.SHAPE:
      return styleShape(node as ShapeNode, nodeId);
    case NODE_TYPE.SLIDE_NUMBER:
      return styleSlideNumber(node as SlideNumberNode, nodeId);
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
        content: cell.content,
        style: cell.textStyle,
        resolvedStyle: cell.resolvedStyle,
        color: cell.color,
        hAlign: cell.hAlign,
        vAlign: cell.vAlign,
        lineHeightMultiplier: cell.lineHeightMultiplier,
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
      rootStyles.backgroundImage = `url('${bgSrc}')`;
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
