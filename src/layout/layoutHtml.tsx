// HTML Measurement Generator
// Generates HTML that mirrors TycoSlide layout structure for accurate browser measurement

import { renderToString } from 'hono/jsx/dom/server';
import type { FC, PropsWithChildren } from 'hono/jsx';
import type { Page } from 'playwright';
import type { ElementNode, TextNode, ImageNode, RowNode, ColumnNode, StackNode, SlideNumberNode, TableNode, TableCellData } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { Theme, TextStyle, FontWeight, GapSize, VerticalAlignment, HorizontalAlignment, SizeValue, TextContent, NormalizedRun, Direction } from '../core/types.js';
import { TEXT_STYLE, FONT_WEIGHT, SIZE, VALIGN, HALIGN, DIRECTION } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { normalizeContent, fontWeightToNumeric, resolveLineHeight } from '../utils/text.js';
import { readImageDimensions } from '../utils/image.js';
import { inToPx, ptToPx, SCREEN_DPI } from '../utils/units.js';
import { escapeHtml } from '../utils/html.js';
import { resolveGap } from '../utils/node.js';

// ============================================
// CONSTANTS
// ============================================

/** Placeholder text for measuring slide number width (widest reasonable number) */
const SLIDE_NUMBER_PLACEHOLDER = '999';

/**
 * Map of font name → line-height: normal ratio (normalHeight / fontSize).
 * Used to convert PowerPoint's lineSpacingMultiple to CSS line-height.
 * Measured by the browser via measureFontNormalRatios().
 */
export type FontNormalRatios = Map<string, number>;

// ============================================
// TYPES
// ============================================

/** Result of HTML generation */
export interface LayoutHtmlResult {
  html: string;
  nodeIds: Map<ElementNode, string>;
}

// ============================================
// ID GENERATION
// ============================================

interface IdContext {
  counter: number;
}

function generateNodeId(ctx: IdContext): string {
  return `node-${++ctx.counter}`;
}

// ============================================
// CSS HELPERS
// ============================================

/** Column justify-content: how content is positioned vertically in a column */
function vAlignToJustifyContent(vAlign: VerticalAlignment): string {
  // 'safe' keyword: falls back to 'start' when content overflows the container.
  // Without 'safe', justify-content: center pushes content above the parent
  // when content is taller than available space.
  switch (vAlign) {
    case VALIGN.BOTTOM: return 'safe flex-end';
    case VALIGN.MIDDLE: return 'safe center';
    case VALIGN.TOP: return 'flex-start';
  }
}

/** Row align-items: how children are positioned on the cross-axis (vertically) in a row */
function vAlignToAlignItems(vAlign: VerticalAlignment): string {
  switch (vAlign) {
    case VALIGN.TOP: return 'flex-start';
    case VALIGN.BOTTOM: return 'flex-end';
    case VALIGN.MIDDLE: return 'center';
  }
}

function hAlignToCSS(hAlign: HorizontalAlignment): string {
  switch (hAlign) {
    case HALIGN.RIGHT: return 'flex-end';
    case HALIGN.CENTER: return 'center';
    case HALIGN.LEFT: return 'stretch';  // stretch for accurate width measurement (LEFT behavior with width:100%)
  }
}

/**
 * Compute flex-item CSS for a node based on its parent's flex direction.
 *
 * CSS `flex` controls the PARENT's main axis, so:
 * - In a row parent (main=horizontal): `flex` controls width, explicit `height` for cross-axis
 * - In a column parent (main=vertical): `flex` controls height, explicit `width` for cross-axis
 */
function flexItemStyles(
  width: number | SizeValue | undefined,
  height: number | SizeValue | undefined,
  parentDirection?: Direction
): string {
  const styles: string[] = [];
  const isInRow = parentDirection === DIRECTION.ROW;

  // Main axis sizing (controlled by `flex` property)
  const mainSize = isInRow ? width : height;
  const minMain = isInRow ? 'min-width: 0' : 'min-height: 0';

  if (typeof mainSize === 'number') {
    styles.push(`flex: 0 0 ${inToPx(mainSize)}px`);
  } else if (mainSize === SIZE.FILL) {
    styles.push('flex: 1 1 0', minMain);
  } else if (isInRow) {
    // In a row: children share width equally by default
    // min-height: 0 allows vertical compression when constrained by align-self: stretch
    styles.push('flex: 1 1 0', minMain, 'min-height: 0');
  } else {
    // In a column: children use intrinsic height by default (no flex grow).
    // min-height: 0 allows containers to compress when parent is constrained
    // (without this, min-height: auto prevents shrinking below content size).
    // The root wrapper's CSS forces the top-level node to fill the slide.
    styles.push('min-height: 0');
  }

  // Cross axis sizing (explicit CSS property)
  const crossSize = isInRow ? height : width;
  const crossProp = isInRow ? 'height' : 'width';

  if (typeof crossSize === 'number') {
    styles.push(`${crossProp}: ${inToPx(crossSize)}px`);
  } else {
    // SIZE.FILL or undefined: fill parent's cross dimension (100%).
    // In rows: height: 100% makes containers match the tallest sibling.
    // In columns: width: 100% prevents shrink-to-content from align-items.
    styles.push(`${crossProp}: 100%`);
  }

  return styles.join('; ');
}

// ============================================
// FONT FACE CSS
// ============================================

export function generateFontFaceCSS(theme: Theme): string {
  const fontFaces: string[] = [];
  const seenPaths = new Set<string>();

  // Collect fonts from all text styles
  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    const family = style.fontFamily;

    for (const weight of Object.keys(family) as FontWeight[]) {
      const font = family[weight];
      if (font && !seenPaths.has(font.path)) {
        seenPaths.add(font.path);
        fontFaces.push(`
          @font-face {
            font-family: '${font.name}';
            src: url('file://${font.path}');
            font-weight: ${fontWeightToNumeric(weight)};
          }
        `);
      }
    }
  }

  return fontFaces.join('\n');
}

/**
 * Measure line-height: normal ratio for each font in the theme.
 * Loads fonts in the browser and measures their natural line height
 * as a ratio of font-size, for converting PowerPoint's lineSpacingMultiple to CSS.
 *
 * PowerPoint's lineSpacingMultiple 1.0 = "single spacing" = font's natural line height.
 * CSS line-height: normal = same thing. But CSS line-height as a unitless number
 * is relative to font-size, not the font's natural height.
 * We measure the browser's line-height: normal as a ratio of font-size,
 * then use: cssLineHeight = lineSpacingMultiple × normalRatio
 */
export async function measureFontNormalRatios(page: Page, theme: Theme): Promise<FontNormalRatios> {
  const fontFaceCSS = generateFontFaceCSS(theme);
  await page.setContent(
    `<!DOCTYPE html><html><head><style>${fontFaceCSS}</style></head><body></body></html>`
  );
  await page.evaluate(() => document.fonts.ready);

  // Collect unique font names from all text styles
  const fontNames = new Set<string>();
  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    for (const font of Object.values(style.fontFamily)) {
      if (font?.name) fontNames.add(font.name);
    }
  }

  // Measure line-height: normal for each font as a ratio of font-size
  // Use a large font-size (100px) for precision
  const ratios = await page.evaluate((names: string[]) => {
    const results: Array<{ name: string; ratio: number }> = [];
    for (const name of names) {
      const el = document.createElement('div');
      el.style.fontFamily = `'${name}'`;
      el.style.fontSize = '100px';
      el.style.lineHeight = 'normal';
      el.style.position = 'absolute';
      el.textContent = 'X';  // Any text; line-height: normal is a fixed font metric
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
  return result;
}

// ============================================
// LAYOUT COMPONENTS
// ============================================

// Unified container props - Row and Column are just flex containers with different direction
interface LayoutContainerProps {
  nodeId: string;
  direction: Direction;
  parentDirection?: Direction;
  width?: number | SizeValue;
  height?: number | SizeValue;
  gap?: GapSize;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  padding?: number;
  theme: Theme;
}

const LayoutContainer: FC<PropsWithChildren<LayoutContainerProps>> = ({
  nodeId,
  direction,
  parentDirection,
  width,
  height,
  gap,
  vAlign,
  hAlign,
  padding,
  theme,
  children,
}) => {
  const gapPx = inToPx(resolveGap(gap, theme));
  const itemStyles = flexItemStyles(width, height, parentDirection);
  const paddingPx = padding ? inToPx(padding) : 0;

  // In flexbox:
  // - justify-content controls main axis (row: horizontal, column: vertical)
  // - align-items controls cross axis (row: vertical, column: horizontal)
  const isRow = direction === DIRECTION.ROW;
  const justifyContent = isRow
    ? (hAlign === HALIGN.CENTER ? 'center' : hAlign === HALIGN.RIGHT ? 'flex-end' : 'flex-start')
    : vAlignToJustifyContent(vAlign);
  const alignItems = isRow
    ? vAlignToAlignItems(vAlign)
    : hAlignToCSS(hAlign);

  const style = [
    'display: flex',
    `flex-direction: ${direction}`,
    `gap: ${gapPx}px`,
    `justify-content: ${justifyContent}`,
    `align-items: ${alignItems}`,
    itemStyles,
    paddingPx > 0 ? `padding: ${paddingPx}px` : '',
  ].filter(Boolean).join('; ');

  return (
    <div data-node-id={nodeId} style={style}>
      {children}
    </div>
  );
};

const LayoutStack: FC<PropsWithChildren<{ nodeId: string; width?: number | SizeValue; height?: number | SizeValue; parentDirection?: Direction }>> = ({
  nodeId,
  width,
  height,
  parentDirection,
  children,
}) => {
  // Stack positions all children at the same location (overlapping)
  // Uses direction-aware sizing via flexItemStyles (same as other containers):
  // - Row parent: flex: 1 1 0 (share width equally), stretch for height
  // - Column parent: intrinsic height (content-sized), width: 100%
  // minmax(0, 1fr) allows grid tracks to shrink below content size
  const itemStyles = flexItemStyles(width, height, parentDirection);
  const styles = [
    'position: relative',
    'display: grid',
    'grid-template: minmax(0, 1fr) / minmax(0, 1fr)',
    itemStyles,
  ];

  return (
    <div data-node-id={nodeId} style={styles.filter(Boolean).join('; ')}>
      {children}
    </div>
  );
};

const LayoutStackChild: FC<PropsWithChildren> = ({ children }) => {
  // Each child in a stack occupies the same grid cell.
  // display: flex + flex-direction: column so children (e.g., card content column)
  // fill the grid cell height. min-height: 0 allows shrinking, overflow: hidden clips.
  // This works because the height chain is definite: SIZE.FILL on row → stretch → grid → here.
  return (
    <div style="grid-area: 1 / 1 / 2 / 2; display: flex; flex-direction: column; min-height: 0; overflow: hidden">
      {children}
    </div>
  );
};

interface LayoutTextProps {
  nodeId: string;
  content: TextContent;
  style: TextStyle;
  theme: Theme;
  hAlign: HorizontalAlignment;
  lineHeightMultiplier?: number;
  fontNormalRatios?: FontNormalRatios;
}

const LayoutText: FC<LayoutTextProps> = ({
  nodeId,
  content,
  style,
  theme,
  hAlign,
  lineHeightMultiplier,
  fontNormalRatios,
}) => {
  const runs = normalizeContent(content);
  const hasBullets = runs.some(r => r.bullet);
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
  const defaultFont = style.fontFamily[defaultWeight] ?? style.fontFamily.normal;
  const lineSpacingMultiple = resolveLineHeight(lineHeightMultiplier, style, theme, hasBullets);
  const fontSizePx = ptToPx(style.fontSize);

  // Convert PowerPoint's lineSpacingMultiple to CSS line-height.
  // PPTX lineSpacingMultiple is relative to "single spacing" (font's natural line height).
  // CSS line-height as a unitless number is relative to font-size.
  // The font's normal ratio (measured in the browser) bridges the gap.
  const normalRatio = fontNormalRatios?.get(defaultFont.name);
  const cssLineHeight = normalRatio ? lineSpacingMultiple * normalRatio : lineSpacingMultiple;

  // Bullet indent: fontSize * multiplier, converted to px
  const bulletIndentPx = ptToPx(style.fontSize * theme.spacing.bulletIndentMultiplier);

  const textAlign = hAlign === HALIGN.RIGHT ? 'right' : hAlign === HALIGN.CENTER ? 'center' : 'left';

  const containerStyle = [
    `font-family: '${defaultFont.name}'`,
    `font-size: ${fontSizePx}px`,
    `line-height: ${cssLineHeight}`,
    `text-align: ${textAlign}`,
    'white-space: pre-wrap',
    'word-wrap: break-word',
    'width: 100%',  // Fill container width (prevents centering in flex parent)
    'flex-shrink: 0',  // Incompressible: text should not shrink below measured height
  ].join('; ');

  return (
    <div data-node-id={nodeId} style={containerStyle}>
      {runs.map((run, i) => renderTextRun(run, i, style, defaultWeight, bulletIndentPx))}
    </div>
  );
};

function renderTextRun(
  run: NormalizedRun,
  index: number,
  style: TextStyle,
  defaultWeight: string,
  bulletIndentPx: number
) {
  const spanStyles: string[] = [];

  // Handle weight changes
  if (run.weight && run.weight !== defaultWeight) {
    const font = style.fontFamily[run.weight];
    if (font) {
      spanStyles.push(`font-family: '${font.name}'`);
      spanStyles.push(`font-weight: ${fontWeightToNumeric(run.weight as FontWeight)}`);
    }
  }

  // Handle bold shorthand
  if (run.bold) {
    const boldFont = style.fontFamily.bold;
    if (boldFont) {
      spanStyles.push(`font-family: '${boldFont.name}'`);
      spanStyles.push(`font-weight: ${fontWeightToNumeric(FONT_WEIGHT.BOLD)}`);
    }
  }

  // Handle italic
  if (run.italic) {
    spanStyles.push('font-style: italic');
  }

  // Handle color
  if (run.color) {
    spanStyles.push(`color: #${run.color}`);
  }

  // Handle highlight
  if (run.highlight) {
    spanStyles.push(`background-color: #${run.highlight.bg}`);
    spanStyles.push(`color: #${run.highlight.text}`);
  }

  // Handle paragraph spacing
  if (run.paraSpaceBefore) {
    spanStyles.push(`margin-top: ${ptToPx(run.paraSpaceBefore)}px`);
  }
  if (run.paraSpaceAfter) {
    spanStyles.push(`margin-bottom: ${ptToPx(run.paraSpaceAfter)}px`);
  }

  const styleAttr = spanStyles.length > 0 ? spanStyles.join('; ') : undefined;
  const text = escapeHtml(run.text);

  // Handle bullets - simple left padding for indent
  if (run.bullet) {
    return (
      <div key={index} style={`padding-left: ${bulletIndentPx}px`}>
        <span style="display: inline-block; width: 1em; margin-left: -1em">•</span>
        <span style={styleAttr}>{text}</span>
      </div>
    );
  }

  // Handle plain line breaks
  const prefix = run.breakLine ? <br /> : null;

  return (
    <>
      {prefix}
      <span key={index} style={styleAttr}>{text}</span>
    </>
  );
}

interface LayoutImageProps {
  nodeId: string;
  aspectRatio: number;
  maxWidthPx?: number;
  maxHeightPx?: number;
  parentDirection?: Direction;
}

const LayoutImage: FC<LayoutImageProps> = ({
  nodeId,
  aspectRatio,
  maxWidthPx,
  maxHeightPx,
  parentDirection,
}) => {
  // Image contain behavior: fit within parent bounds preserving aspect ratio.
  // CSS strategy depends on parent direction:
  // - In a column: width is the constraint axis, derive height from aspect ratio
  // - In a row: height is the constraint axis, derive width from aspect ratio
  const styles: string[] = [`aspect-ratio: ${aspectRatio}`];

  if (parentDirection === DIRECTION.ROW) {
    // In a row: constrain to parent height, derive width from aspect ratio
    // Fully compressible: can shrink to 0 (flex-shrink: 1, min-width: 0)
    styles.push('height: 100%', 'flex: 0 1 auto', 'min-width: 0');
  } else {
    // In a column (or root): fill available width, derive height from aspect ratio
    // Fully compressible: can shrink to 0 (flex-shrink: 1, min-height: 0)
    styles.push('width: 100%', 'flex: 0 1 auto', 'min-height: 0');
  }

  // maxScaleFactor: prevent upscaling beyond native resolution
  if (maxWidthPx) styles.push(`max-width: ${maxWidthPx}px`);
  if (maxHeightPx) styles.push(`max-height: ${maxHeightPx}px`);

  return (
    <div
      data-node-id={nodeId}
      style={styles.join('; ')}
    />
  );
};

const LayoutRectangle: FC<{ nodeId: string }> = ({ nodeId }) => {
  // Rectangle fills its parent bounds completely
  return <div data-node-id={nodeId} style="width: 100%; height: 100%" />;
};

interface LayoutLineProps {
  nodeId: string;
  parentDirection?: Direction;
  borderWidthPx: number;
}

const LayoutLine: FC<LayoutLineProps> = ({ nodeId, parentDirection, borderWidthPx }) => {
  // Direction-aware: horizontal in column, vertical in row
  if (parentDirection === DIRECTION.ROW) {
    // Vertical separator in a row: fixed width, stretch to row height
    return <div data-node-id={nodeId} style={`flex: 0 0 ${borderWidthPx}px; align-self: stretch`} />;
  }
  // Horizontal separator in a column (default): full width, fixed height
  return <div data-node-id={nodeId} style={`flex: 0 0 ${borderWidthPx}px; width: 100%`} />;
};

const LayoutSlideNumber: FC<{ nodeId: string; style: TextStyle }> = ({
  nodeId,
  style,
}) => {
  const fontSizePx = ptToPx(style.fontSize);
  const defaultFont = style.fontFamily.normal;

  return (
    <div
      data-node-id={nodeId}
      style={`font-family: '${defaultFont.name}'; font-size: ${fontSizePx}px; white-space: nowrap`}
    >
      {SLIDE_NUMBER_PLACEHOLDER}
    </div>
  );
};

// ============================================
// TABLE CELL NODES
// ============================================

/** Cache of table cell TextNodes for measurement (one per cell) */
const tableCellNodesCache = new WeakMap<TableNode, TextNode[][]>();

/**
 * Get or create TextNodes for a TableNode's cells.
 * Each cell becomes a TextNode with its content and styling for measurement.
 */
function getTableCellNodes(node: TableNode): TextNode[][] {
  let cells = tableCellNodesCache.get(node);
  if (!cells) {
    cells = node.rows.map((row, rowIndex) =>
      row.map((cell: TableCellData) => {
        const isHeaderRow = (node.headerRows ?? 0) > rowIndex;
        // Cell-level override wins over table-level
        const style = cell.textStyle
          ?? (isHeaderRow ? node.style?.headerTextStyle : node.style?.cellTextStyle)
          ?? TEXT_STYLE.BODY;

        const textNode: TextNode = {
          type: NODE_TYPE.TEXT,
          content: cell.content,
          style,
          hAlign: cell.hAlign ?? node.style?.hAlign ?? HALIGN.LEFT,
          vAlign: cell.vAlign ?? node.style?.vAlign ?? VALIGN.TOP,
        };
        return textNode;
      })
    );
    tableCellNodesCache.set(node, cells);
  }
  return cells;
}

// ============================================
// NODE TREE TO JSX
// ============================================

function nodeToJsx(
  node: ElementNode,
  theme: Theme,
  nodeIds: Map<ElementNode, string>,
  idCtx: IdContext,
  parentDirection?: Direction,
  fontNormalRatios?: FontNormalRatios,
) {
  const nodeId = generateNodeId(idCtx);
  nodeIds.set(node, nodeId);

  switch (node.type) {
    case NODE_TYPE.TEXT: {
      const textNode = node as TextNode;
      const styleName = textNode.style ?? TEXT_STYLE.BODY;
      const style = theme.textStyles[styleName];
      return (
        <LayoutText
          nodeId={nodeId}
          content={textNode.content}
          style={style}
          theme={theme}
          hAlign={textNode.hAlign}
          lineHeightMultiplier={textNode.lineHeightMultiplier}
          fontNormalRatios={fontNormalRatios}
        />
      );
    }

    case NODE_TYPE.ROW: {
      const rowNode = node as RowNode;
      return (
        <LayoutContainer
          nodeId={nodeId}
          direction={DIRECTION.ROW}
          parentDirection={parentDirection}
          width={rowNode.width}
          height={rowNode.height}
          gap={rowNode.gap}
          vAlign={rowNode.vAlign}
          hAlign={rowNode.hAlign}
          padding={rowNode.padding}
          theme={theme}
        >
          {rowNode.children.map((child) => nodeToJsx(child, theme, nodeIds, idCtx, DIRECTION.ROW, fontNormalRatios))}
        </LayoutContainer>
      );
    }

    case NODE_TYPE.COLUMN: {
      const colNode = node as ColumnNode;
      return (
        <LayoutContainer
          nodeId={nodeId}
          direction={DIRECTION.COLUMN}
          parentDirection={parentDirection}
          width={colNode.width}
          height={colNode.height}
          gap={colNode.gap}
          vAlign={colNode.vAlign}
          hAlign={colNode.hAlign}
          padding={colNode.padding}
          theme={theme}
        >
          {colNode.children.map((child) => nodeToJsx(child, theme, nodeIds, idCtx, DIRECTION.COLUMN, fontNormalRatios))}
        </LayoutContainer>
      );
    }

    case NODE_TYPE.STACK: {
      const stackNode = node as StackNode;
      return (
        <LayoutStack nodeId={nodeId} width={stackNode.width} height={stackNode.height} parentDirection={parentDirection}>
          {stackNode.children.map((child) => (
            <LayoutStackChild>
              {nodeToJsx(child, theme, nodeIds, idCtx, DIRECTION.COLUMN, fontNormalRatios)}
            </LayoutStackChild>
          ))}
        </LayoutStack>
      );
    }

    case NODE_TYPE.IMAGE: {
      const imgNode = node as ImageNode;
      const dims = readImageDimensions(imgNode.src);
      if (!dims) {
        throw new Error(`Cannot read image dimensions: ${imgNode.src}`);
      }

      const maxScaleFactor = theme.spacing.maxScaleFactor ?? 1.0;
      const maxWidthPx = (dims.width / SCREEN_DPI) * maxScaleFactor * SCREEN_DPI;
      const maxHeightPx = (dims.height / SCREEN_DPI) * maxScaleFactor * SCREEN_DPI;

      return <LayoutImage nodeId={nodeId} aspectRatio={dims.aspectRatio} maxWidthPx={maxWidthPx} maxHeightPx={maxHeightPx} parentDirection={parentDirection} />;
    }

    case NODE_TYPE.LINE: {
      const borderWidthPx = ptToPx(theme.borders.width);
      return <LayoutLine nodeId={nodeId} parentDirection={parentDirection} borderWidthPx={borderWidthPx} />;
    }

    case NODE_TYPE.SLIDE_NUMBER: {
      const slideNumNode = node as SlideNumberNode;
      const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
      const style = theme.textStyles[styleName];
      return <LayoutSlideNumber nodeId={nodeId} style={style} />;
    }

    case NODE_TYPE.RECTANGLE: {
      return <LayoutRectangle nodeId={nodeId} />;
    }

    case NODE_TYPE.TABLE: {
      const tableNode = node as TableNode;
      const cellNodes = getTableCellNodes(tableNode);
      const numCols = tableNode.rows[0]?.length ?? 0;

      // Calculate column widths (proportional -> flex basis)
      const columnWidths = tableNode.columnWidths ?? Array(numCols).fill(1);
      const totalWeight = columnWidths.reduce((a, b) => a + b, 0);

      // Render table as CSS grid with cells as measurable children
      const cellPadding = tableNode.style?.cellPadding ?? theme.spacing.cellPadding;
      const cellPaddingPx = inToPx(cellPadding);

      return (
        <div
          data-node-id={nodeId}
          style={`display: grid; grid-template-columns: ${columnWidths.map(w => `${(w / totalWeight) * 100}%`).join(' ')}; width: 100%`}
        >
          {cellNodes.flatMap((row: TextNode[]) =>
            row.map((cellTextNode: TextNode) => {
              const cellNodeId = generateNodeId(idCtx);
              nodeIds.set(cellTextNode, cellNodeId);

              const styleName = cellTextNode.style ?? TEXT_STYLE.BODY;
              const style = theme.textStyles[styleName];

              return (
                <div style={`padding: ${cellPaddingPx}px`}>
                  <LayoutText
                    nodeId={cellNodeId}
                    content={cellTextNode.content}
                    style={style}
                    theme={theme}
                    hAlign={cellTextNode.hAlign}
                    fontNormalRatios={fontNormalRatios}
                  />
                </div>
              );
            })
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// ============================================
// MAIN GENERATORS
// ============================================

/**
 * Generate HTML that mirrors the slide layout structure.
 * Uses CSS flexbox to replicate the layout algorithm.
 *
 * @param tree - Root node of the expanded element tree
 * @param bounds - Available bounds (typically slide content area)
 * @param theme - Theme for styling
 * @returns HTML string and map of node instances to their IDs
 */
export function generateLayoutHTML(
  tree: ElementNode,
  bounds: Bounds,
  theme: Theme,
  fontNormalRatios?: FontNormalRatios,
): LayoutHtmlResult {
  const idCtx: IdContext = { counter: 0 };
  const nodeIds: Map<ElementNode, string> = new Map();

  const fontFaceCSS = generateFontFaceCSS(theme);
  const widthPx = inToPx(bounds.w);
  const heightPx = inToPx(bounds.h);

  // Build the JSX tree (root wrapper is flex-direction: column)
  const jsxTree = nodeToJsx(tree, theme, nodeIds, idCtx, DIRECTION.COLUMN, fontNormalRatios);

  // Wrap in HTML document with proper sizing
  const fullJsx = (
    <html>
      <head>
        <meta charset="UTF-8" />
        <style dangerouslySetInnerHTML={{ __html: `
          ${fontFaceCSS}

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            width: ${widthPx}px;
            height: ${heightPx}px;
            overflow: hidden;
          }

          .root {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          /* Top-level node fills the slide (column children default to intrinsic) */
          .root > * {
            flex: 1 1 0;
            min-height: 0;
          }
        `}} />
      </head>
      <body>
        <div class="root">
          {jsxTree}
        </div>
      </body>
    </html>
  );

  const html = '<!DOCTYPE html>' + renderToString(fullJsx);

  return { html, nodeIds };
}

