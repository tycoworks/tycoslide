// HTML Measurement Generator V2
// 3-phase pipeline: styleNode (pure data) → StyledDiv (JSX) → renderToString (HTML)
//
// Phase 1 (styleNode): All CSS decisions in one place. Pure functions, testable without a browser.
// Phase 2 (StyledDiv): Single generic JSX component. No logic, just maps styles to <div>.
// Phase 3 (generateLayoutHTML): Hono renderToString, unchanged.

import fs from 'fs';
import path from 'path';
import { renderToString } from 'hono/jsx/dom/server';
import type { FC } from 'hono/jsx';
import type { Page } from 'playwright';
import type { ElementNode, TextNode, ImageNode, LineNode, ContainerNode, StackNode, SlideNumberNode, TableNode, TableCellData } from '../model/nodes.js';
import { NODE_TYPE } from '../model/nodes.js';
import type { Theme, TextStyle, FontWeight, VerticalAlignment, HorizontalAlignment, SizeValue, NormalizedRun, Direction } from '../model/types.js';
import { FONT_WEIGHT, SIZE, VALIGN, HALIGN, DIRECTION } from '../model/types.js';
import type { Bounds } from '../model/bounds.js';
import { normalizeContent, fontWeightToNumeric, getFontFromFamily } from '../../utils/font.js';
import { readImageDimensions } from '../../utils/image.js';
import { inToPx, ptToPx } from '../../utils/units.js';

// ============================================
// TYPES
// ============================================

/** Intermediate representation: one per node, all CSS decisions resolved */
export interface StyledNode {
  nodeId: string;
  styles: Record<string, string | number>;
  children: StyledNode[];
  innerHTML?: string;     // pre-built rich text (bullets, spans)
  textContent?: string;   // plain text (slide number placeholder)
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

const SLIDE_NUMBER_PLACEHOLDER = '999';

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
  if (typeof mainSize === 'number') {
    styles.flex = `0 0 ${inToPx(mainSize)}px`;
  } else if (mainSize === SIZE.FILL) {
    styles.flex = '1 1 0';
    // Horizontal: min-width: 0 lets text reflow.
    // Vertical: min-height stays auto (padding boundary preserved).
    // Images opt into compression via their own min-height: 0 (see styleImage).
    if (isInRow) {
      styles.minWidth = 0;
    }
  } else { // SIZE.HUG
    styles.flexShrink = 0;
  }

  // Cross axis → explicit CSS dimension
  if (typeof crossSize === 'number') {
    if (isInRow) { styles.height = `${inToPx(crossSize)}px`; }
    else { styles.width = `${inToPx(crossSize)}px`; }
  } else if (crossSize === SIZE.FILL) {
    if (isInRow) { styles.height = '100%'; }
    else { styles.width = '100%'; }
  }
  // HUG cross-axis: omit (auto sizing)

  return styles;
}

/** Compute child context for Container or Stack nodes.
 *  heightIsConstrained propagation: number→true, HUG→false, FILL→inherit. */
export function childContext(
  node: ContainerNode | StackNode,
  parent: ParentCtx,
): ParentCtx {
  const heightIsConstrained =
    typeof node.height === 'number' ? true
    : node.height === SIZE.HUG ? false
    : parent.heightIsConstrained;

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
    case VALIGN.BOTTOM: return 'safe flex-end';
    case VALIGN.MIDDLE: return 'safe center';
    case VALIGN.TOP: return 'flex-start';
  }
}

/** Row align-items: vertical cross-axis. TOP→stretch for equal-height children. */
function vAlignToAlignItems(vAlign: VerticalAlignment): string {
  switch (vAlign) {
    case VALIGN.TOP: return 'stretch';
    case VALIGN.BOTTOM: return 'flex-end';
    case VALIGN.MIDDLE: return 'center';
  }
}

function hAlignToCSS(hAlign: HorizontalAlignment): string {
  switch (hAlign) {
    case HALIGN.RIGHT: return 'flex-end';
    case HALIGN.CENTER: return 'center';
    case HALIGN.LEFT: return 'stretch';
  }
}

// ─── Per-Node Style Functions ─────────────────

function styleContainer(
  node: ContainerNode,
  parent: ParentCtx,
  nodeId: string,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios?: FontNormalRatios,
): StyledNode {
  const isRow = node.direction === DIRECTION.ROW;
  const gapPx = inToPx(node.gap);
  const paddingPx = node.padding ? inToPx(node.padding) : 0;

  const justifyContent = isRow
    ? (node.hAlign === HALIGN.CENTER ? 'center' : node.hAlign === HALIGN.RIGHT ? 'flex-end' : 'flex-start')
    : vAlignToJustify(node.vAlign);
  const alignItems = isRow
    ? vAlignToAlignItems(node.vAlign)
    : hAlignToCSS(node.hAlign);

  const styles: Record<string, string | number> = {
    display: 'flex',
    flexDirection: node.direction,
    gap: `${gapPx}px`,
    justifyContent,
    alignItems,
    ...flexItem(node.width, node.height, parent.direction),
    // Containment requires definite inline size. HUG columns are content-sized —
    // containment would zero their intrinsic width, collapsing the column.
    ...(!isRow && node.width !== SIZE.HUG ? { containerType: 'inline-size' } : {}),
  };
  if (paddingPx > 0) {
    styles.padding = `${paddingPx}px`;
  }

  const ctx = childContext(node, parent);
  return {
    nodeId,
    styles,
    children: node.children.map(child => styleNode(child, ctx, idCtx, nodeIds, fontRatios)),
  };
}

function styleStack(
  node: StackNode,
  parent: ParentCtx,
  nodeId: string,
  idCtx: IdContext,
  nodeIds: Map<ElementNode, string>,
  fontRatios?: FontNormalRatios,
): StyledNode {
  const gridMin = 'min-content';
  const styles: Record<string, string | number> = {
    position: 'relative',
    display: 'grid',
    gridTemplate: `minmax(${gridMin}, 1fr) / minmax(${gridMin}, 1fr)`,
    ...flexItem(node.width, node.height, parent.direction),
  };

  const ctx = childContext(node, parent);
  return {
    nodeId,
    styles,
    children: node.children.map(child => ({
      // Stack child wrapper: same grid cell, flex column
      nodeId: '',
      styles: { gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: DIRECTION.COLUMN, containerType: 'inline-size' },
      children: [styleNode(child, ctx, idCtx, nodeIds, fontRatios)],
    })),
  };
}

function styleText(
  node: TextNode,
  parent: ParentCtx,
  nodeId: string,
  fontRatios?: FontNormalRatios,
): StyledNode {
  const style = node.resolvedStyle;
  const runs = normalizeContent(node.content);
  const defaultWeight = style.defaultWeight;
  const defaultFont = getFontFromFamily(style.fontFamily, defaultWeight);
  const lineSpacingMultiple = node.lineHeightMultiplier;
  const fontSizePx = ptToPx(style.fontSize);
  const normalRatio = fontRatios?.get(defaultFont.name);
  const cssLineHeight = normalRatio ? lineSpacingMultiple * normalRatio : lineSpacingMultiple;
  const bulletIndentPx = ptToPx(node.bulletIndentPt);
  const textAlign = node.hAlign === HALIGN.RIGHT ? 'right' : node.hAlign === HALIGN.CENTER ? 'center' : 'left';
  const isInRow = parent.direction === DIRECTION.ROW;

  const styles: Record<string, string | number> = {
    fontFamily: `'${defaultFont.name}'`,
    fontSize: `${fontSizePx}px`,
    lineHeight: `${cssLineHeight}`,
    textAlign,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    ...(isInRow
      ? { flex: '1 1 0', minWidth: 0 }
      : { width: '100%', flexShrink: 0 }),
  };

  return {
    nodeId,
    styles,
    children: [],
    innerHTML: renderTextRunsToHTML(runs, style, defaultWeight, bulletIndentPx),
  };
}

function styleImage(
  node: ImageNode,
  parent: ParentCtx,
  nodeId: string,
): StyledNode {
  const dims = readImageDimensions(node.src);
  if (!dims) {
    throw new Error(`Cannot read image dimensions: ${node.src}`);
  }

  const maxWidthPx = dims.width * node.maxScale;
  const maxHeightPx = dims.height * node.maxScale;

  const styles: Record<string, string | number> = {
    aspectRatio: `${dims.aspectRatio}`,
  };

  if (parent.direction === DIRECTION.ROW) {
    styles.height = '100%';
    styles.minWidth = 0;
    styles.flex = parent.hasDefiniteCrossSize ? '0 1 auto' : '1 1 0';
  } else {
    styles.width = '100%';
    if (parent.heightIsConstrained) {
      styles.flex = '1 1 0';
      styles.minHeight = 0;
    } else {
      styles.flex = '0 1 auto';
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
    styles.maxHeight = maxHeightPx
      ? `min(${maxHeightPx}px, ${proportionalCap})`
      : proportionalCap;
  }

  return { nodeId, styles, children: [] };
}

function styleLine(
  node: LineNode,
  parent: ParentCtx,
  nodeId: string,
): StyledNode {
  const borderWidthPx = ptToPx(node.width);

  if (parent.direction === DIRECTION.ROW) {
    return { nodeId, styles: { flex: `0 0 ${borderWidthPx}px`, alignSelf: 'stretch' }, children: [] };
  }
  return { nodeId, styles: { flex: `0 0 ${borderWidthPx}px`, width: '100%' }, children: [] };
}

function styleSlideNumber(
  node: SlideNumberNode,
  nodeId: string,
): StyledNode {
  const style = node.resolvedStyle;
  const fontSizePx = ptToPx(style.fontSize);
  const defaultFont = getFontFromFamily(style.fontFamily, style.defaultWeight);

  return {
    nodeId,
    styles: {
      display: 'flex',
      flexDirection: DIRECTION.COLUMN,
      justifyContent: vAlignToJustify(node.vAlign),
      fontFamily: `'${defaultFont.name}'`,
      fontSize: `${fontSizePx}px`,
      whiteSpace: 'nowrap',
      flex: '0 0 auto',
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
  fontRatios?: FontNormalRatios,
): StyledNode {
  const cellNodes = getTableCellNodes(node);
  const numCols = node.rows[0]?.length ?? 0;
  const cellPadding = node.cellPadding;
  const cellPaddingPx = inToPx(cellPadding);
  const isInRow = parent.direction === DIRECTION.ROW;

  const styles: Record<string, string | number> = {
    display: 'grid',
    gridTemplateColumns: `repeat(${numCols}, 1fr)`,
    ...(isInRow ? { flex: '1 1 0', minWidth: 0 } : { width: '100%' }),
  };

  // Each cell: padding wrapper → text StyledNode
  const cellChildren: StyledNode[] = cellNodes.flatMap((row: TextNode[]) =>
    row.map((cellTextNode: TextNode) => {
      const cellNodeId = generateNodeId(idCtx);
      nodeIds.set(cellTextNode, cellNodeId);

      const textStyled = styleText(cellTextNode, { direction: DIRECTION.COLUMN, heightIsConstrained: false }, cellNodeId, fontRatios);
      return {
        nodeId: '',
        styles: { padding: `${cellPaddingPx}px` },
        children: [textStyled],
      };
    })
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
  fontRatios?: FontNormalRatios,
): StyledNode {
  const nodeId = generateNodeId(idCtx);
  nodeIds.set(node, nodeId);

  switch (node.type) {
    case NODE_TYPE.CONTAINER:
      return styleContainer(node as ContainerNode, parent, nodeId, idCtx, nodeIds, fontRatios);
    case NODE_TYPE.STACK:
      return styleStack(node as StackNode, parent, nodeId, idCtx, nodeIds, fontRatios);
    case NODE_TYPE.TEXT:
      return styleText(node as TextNode, parent, nodeId, fontRatios);
    case NODE_TYPE.IMAGE:
      return styleImage(node as ImageNode, parent, nodeId);
    case NODE_TYPE.LINE:
      return styleLine(node as LineNode, parent, nodeId);
    case NODE_TYPE.SHAPE:
      return { nodeId, styles: { width: '100%', height: '100%' }, children: [] };
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
 *  Groups runs into lines: bullet/breakLine starts a new group, plain runs join current.
 *  Consecutive bullet lines are wrapped in a single <ul> with native disc markers. */
function renderTextRunsToHTML(
  runs: NormalizedRun[],
  style: TextStyle,
  defaultWeight: FontWeight,
  bulletIndentPx: number,
): string {
  // Step 1: Group runs into renderable lines
  const groups: NormalizedRun[][] = [];
  let currentGroup: NormalizedRun[] = [];
  for (const run of runs) {
    if (run.bullet || run.breakLine) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [run];
    } else {
      currentGroup.push(run);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Step 2: Render groups, collecting consecutive bullets into <ul>
  const parts: string[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      parts.push(`<ul style="margin:0;padding:0 0 0 ${bulletIndentPx}px;list-style:disc outside">${bulletBuffer.join('')}</ul>`);
      bulletBuffer = [];
    }
  };

  for (const group of groups) {
    const first = group[0];
    const spans = group.map(run => renderRunSpanHTML(run, style, defaultWeight)).join('');

    if (first.bullet) {
      bulletBuffer.push(`<li style="margin:0;padding:0">${spans}</li>`);
    } else {
      flushBullets();
      if (first.breakLine) {
        parts.push(`<div style="margin-top:1em">${spans}</div>`);
      } else {
        parts.push(`<span>${spans}</span>`);
      }
    }
  }
  flushBullets();

  return parts.join('');
}

/** Render a single run as an inline <span> HTML string. */
function renderRunSpanHTML(
  run: NormalizedRun,
  style: TextStyle,
  defaultWeight: FontWeight,
): string {
  const css: string[] = [];

  if (run.weight && run.weight !== defaultWeight) {
    const font = style.fontFamily[run.weight];
    if (font) {
      css.push(`font-family:'${font.name}'`);
      css.push(`font-weight:${fontWeightToNumeric(run.weight)}`);
    }
  }

  if (run.bold) {
    const boldFont = style.fontFamily.bold;
    if (boldFont) {
      css.push(`font-family:'${boldFont.name}'`);
      css.push(`font-weight:${fontWeightToNumeric(FONT_WEIGHT.BOLD)}`);
    }
  }

  if (run.italic) {
    css.push('font-style:italic');
  }

  if (run.color) {
    css.push(`color:#${run.color}`);
  }

  if (run.highlight) {
    css.push(`background-color:#${run.highlight.bg}`);
    css.push(`color:#${run.highlight.text}`);
  }

  const escaped = escapeHtml(run.text);
  if (css.length > 0) {
    return `<span style="${css.join(';')}">${escaped}</span>`;
  }
  return `<span>${escaped}</span>`;
}

/** Escape HTML special characters in text content */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Table Cell Nodes ─────────────────────────

function getTableCellNodes(node: TableNode): TextNode[][] {
  return node.rows.map((row) =>
    row.map((cell: TableCellData): TextNode => ({
      type: NODE_TYPE.TEXT,
      content: cell.content,
      style: cell.textStyle,
      resolvedStyle: cell.resolvedStyle,
      color: cell.color,
      hAlign: cell.hAlign,
      vAlign: cell.vAlign,
      lineHeightMultiplier: cell.lineHeightMultiplier,
      bulletIndentPt: 0,  // Table cells never have bullets
    }))
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
    attrs['data-node-id'] = node.nodeId;
  }

  // innerHTML: apply dangerouslySetInnerHTML directly on the div (no wrapper span).
  // This matches V1's DOM structure where text content is direct children of the div.
  if (node.innerHTML) {
    return <div {...attrs} style={node.styles} dangerouslySetInnerHTML={{ __html: node.innerHTML }} />;
  }

  return (
    <div {...attrs} style={node.styles}>
      {node.textContent
        ? node.textContent
        : node.children.map((child, i) => <StyledDiv key={i} node={child} />)}
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
  perSlideHtml: string[];
}

/** Font descriptor for explicit preloading */
export interface FontDescriptor {
  name: string;
  weight: number;
}

export function generateLayoutHTML(
  slides: Array<{ tree: ElementNode; bounds: Bounds }>,
  theme: Theme,
  labels: string[],
  fontNormalRatios?: FontNormalRatios,
): LayoutHtmlResult {
  const idCtx: IdContext = { counter: 0 };
  const slideNodeIds: Array<Map<ElementNode, string>> = [];
  const { css: fontFaceCSS } = generateFontFaceCSS(theme);

  // Phase 1 + 2: style each slide, then wrap in JSX
  const slideJsx = slides.map((slide, i) => {
    const nodeIds: Map<ElementNode, string> = new Map();
    slideNodeIds.push(nodeIds);

    const widthPx = inToPx(slide.bounds.w);
    const heightPx = inToPx(slide.bounds.h);

    const rootCtx: ParentCtx = { direction: DIRECTION.COLUMN, heightIsConstrained: true };
    const styled = styleNode(slide.tree, rootCtx, idCtx, nodeIds, fontNormalRatios);

    return (
      <div class="root" data-slide-index={`${i}`} style={{ width: `${widthPx}px`, height: `${heightPx}px` }}>
        <StyledDiv node={styled} />
      </div>
    );
  });

  // Shared CSS reset — single source of truth for measurement HTML
  const baseCSS = `
    ${fontFaceCSS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; }
    .root { display: flex; flex-direction: column; }
    .root > * { flex: 1 1 0; min-height: 0; }
  `;

  // Phase 3: render to HTML string (clean measurement — no debug visuals)
  const fullJsx = (
    <html>
      <head>
        <meta charset="UTF-8" />
        <style dangerouslySetInnerHTML={{ __html: baseCSS }} />
      </head>
      <body>
        {slideJsx}
      </body>
    </html>
  );

  const html = '<!DOCTYPE html>' + renderToString(fullJsx);

  // Always build per-slide debug HTML with nav bar
  const debugCSS = `
    [data-node-id] { outline: 1px solid rgba(255, 0, 0, 0.3); }
    body { overflow: auto; }
  `;
  const perSlideHtml = slideJsx.map((jsx, i) => {
    const label = labels[i];
    const prevLabel = i > 0 ? labels[i - 1] : null;
    const nextLabel = i < labels.length - 1 ? labels[i + 1] : null;

    // Build nav bar HTML
    const navParts: string[] = [];
    if (prevLabel) navParts.push(`<a href="${prevLabel}.html" style="color:#fff;text-decoration:none">\u2190 prev</a>`);
    navParts.push(`<strong>${label}</strong>`);
    if (nextLabel) navParts.push(`<a href="${nextLabel}.html" style="color:#fff;text-decoration:none">next \u2192</a>`);
    const navBarHtml = `<div style="background:#333;color:#fff;padding:4px 8px;font:14px monospace;display:flex;justify-content:center;align-items:center;gap:12px">${navParts.join('')}</div>`;

    const slideDoc = (
      <html>
        <head>
          <meta charset="UTF-8" />
          <style dangerouslySetInnerHTML={{ __html: baseCSS + debugCSS }} />
        </head>
        <body>
          <div dangerouslySetInnerHTML={{ __html: navBarHtml }} />
          {jsx}
        </body>
      </html>
    );
    return '<!DOCTYPE html>' + renderToString(slideDoc);
  });

  return { html, slideNodeIds, perSlideHtml };
}

// ============================================
// FONT INFRASTRUCTURE
// ============================================

const FONT_FORMATS: Record<string, { mime: string; format: string }> = {
  '.woff2': { mime: 'font/woff2', format: 'woff2' },
  '.woff': { mime: 'font/woff', format: 'woff' },
  '.ttf': { mime: 'font/ttf', format: 'truetype' },
  '.otf': { mime: 'font/opentype', format: 'opentype' },
};

const fontFaceCSSCache = new Map<string, { css: string; fonts: FontDescriptor[] }>();

export function generateFontFaceCSS(theme: Theme): { css: string; fonts: FontDescriptor[] } {
  const fontPaths: string[] = [];
  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    for (const weight of Object.keys(style.fontFamily) as FontWeight[]) {
      const font = style.fontFamily[weight];
      if (font && font.path) fontPaths.push(font.path);
    }
  }
  const cacheKey = JSON.stringify(fontPaths.sort());
  const cached = fontFaceCSSCache.get(cacheKey);
  if (cached) return cached;

  const fontFaces: string[] = [];
  const fonts: FontDescriptor[] = [];
  const seenPaths = new Set<string>();

  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    const family = style.fontFamily;
    for (const weight of Object.keys(family) as FontWeight[]) {
      const font = family[weight];
      if (!font || !font.path) continue;
      if (seenPaths.has(font.path)) continue;
      seenPaths.add(font.path);
      const numericWeight = fontWeightToNumeric(weight);
      fonts.push({ name: font.name, weight: numericWeight });
      const fontData = fs.readFileSync(font.path);
      const base64 = fontData.toString('base64');
      const ext = path.extname(font.path).toLowerCase();
      const fontFormat = FONT_FORMATS[ext];
      if (!fontFormat) {
        throw new Error(`Unsupported font format "${ext}" for ${font.path}. Supported: ${Object.keys(FONT_FORMATS).join(', ')}`);
      }
      fontFaces.push(`
          @font-face {
            font-family: '${font.name}';
            src: url('data:${fontFormat.mime};base64,${base64}') format('${fontFormat.format}');
            font-weight: ${numericWeight};
          }
        `);
    }
  }

  const result = { css: fontFaces.join('\n'), fonts };
  fontFaceCSSCache.set(cacheKey, result);
  return result;
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
    throw new Error(`Fonts failed to load in Playwright: ${failures.join(', ')}. Check @font-face CSS and font file paths.`);
  }
}

export async function measureFontNormalRatios(page: Page, theme: Theme): Promise<{ ratios: FontNormalRatios; fonts: FontDescriptor[] }> {
  const { css: fontFaceCSS, fonts } = generateFontFaceCSS(theme);
  await page.setContent(
    `<!DOCTYPE html><html><head><style>${fontFaceCSS}</style></head><body></body></html>`
  );
  await preloadFonts(page, fonts);

  const fontNames = new Set<string>();
  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    for (const font of Object.values(style.fontFamily)) {
      if (font?.name) fontNames.add(font.name);
    }
  }

  const ratios = await page.evaluate((names: string[]) => {
    const results: Array<{ name: string; ratio: number }> = [];
    for (const name of names) {
      const el = document.createElement('div');
      el.style.fontFamily = `'${name}'`;
      el.style.fontSize = '100px';
      el.style.lineHeight = 'normal';
      el.style.position = 'absolute';
      el.textContent = 'X';
      document.body.appendChild(el);
      const ratio = el.getBoundingClientRect().height / 100;
      document.body.removeChild(el);
      results.push({ name, ratio });
    }
    return results;
  }, [...fontNames]);

  const result: FontNormalRatios = new Map();
  for (const { name, ratio } of ratios) {
    result.set(name, ratio);
  }
  return { ratios: result, fonts };
}
