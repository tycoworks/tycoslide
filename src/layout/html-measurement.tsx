// HTML Measurement Generator
// Generates HTML that mirrors TycoSlide layout structure for accurate browser measurement

import { renderToString } from 'hono/jsx/dom/server';
import type { FC, PropsWithChildren } from 'hono/jsx';
import type { ElementNode, TextNode, ImageNode, RowNode, ColumnNode, StackNode, SlideNumberNode, TableNode } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import { getTableCellSyntheticNodes, DEFAULT_CELL_PADDING } from '../elements/table.js';
import type { Theme, TextStyle, FontWeight, GapSize, VerticalAlignment, HorizontalAlignment, SizeValue, TextContent, NormalizedRun, Direction } from '../core/types.js';
import { TEXT_STYLE, FONT_WEIGHT, SIZE, VALIGN, HALIGN, DIRECTION } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { normalizeContent } from '../utils/text.js';
import { inToPx, ptToPx } from '../utils/units.js';
import { escapeHtml } from '../utils/html.js';
import { resolveGap } from '../utils/node.js';

// ============================================
// TYPES
// ============================================

/** Maps node instances to their assigned IDs */
export type NodeIdMap = Map<ElementNode, string>;

/** Result of HTML generation */
export interface LayoutHtmlResult {
  html: string;
  nodeIds: NodeIdMap;
}

// ============================================
// ID GENERATION
// ============================================

let idCounter = 0;

function generateNodeId(): string {
  return `node-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================
// CSS HELPERS
// ============================================

function vAlignToCSS(vAlign: VerticalAlignment | undefined): string {
  switch (vAlign) {
    case VALIGN.BOTTOM: return 'flex-end';
    case VALIGN.MIDDLE: return 'center';
    case VALIGN.TOP:
    default: return 'flex-start';  // Default: TOP (matches PPTX renderer)
  }
}

function hAlignToCSS(hAlign: HorizontalAlignment | undefined): string {
  switch (hAlign) {
    case HALIGN.RIGHT: return 'flex-end';
    case HALIGN.CENTER: return 'center';
    case HALIGN.LEFT:
    default: return 'stretch';  // Default: stretch for accurate width measurement (LEFT behavior with width:100%)
  }
}

function widthToCSS(width: number | SizeValue | undefined, defaultPx?: number): string {
  if (width === SIZE.FILL) {
    return 'flex: 1 1 0; min-width: 0';
  }
  if (typeof width === 'number') {
    return `flex: 0 0 ${inToPx(width)}px; width: ${inToPx(width)}px`;
  }
  if (defaultPx !== undefined) {
    return `width: ${defaultPx}px`;
  }
  return 'flex: 1 1 0; min-width: 0';  // Default to fill
}

function heightToCSS(height: number | SizeValue | undefined): string {
  if (height === SIZE.FILL) {
    return 'flex: 1 1 0; min-height: 0';
  }
  if (typeof height === 'number') {
    return `height: ${inToPx(height)}px`;
  }
  return '';
}

// ============================================
// FONT FACE CSS
// ============================================

function generateFontFaceCSS(theme: Theme): string {
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
            font-weight: ${weight === FONT_WEIGHT.LIGHT ? 300 : weight === FONT_WEIGHT.BOLD ? 700 : 400};
          }
        `);
      }
    }
  }

  return fontFaces.join('\n');
}

// ============================================
// LAYOUT COMPONENTS
// ============================================

// Unified container props - Row and Column are just flex containers with different direction
interface LayoutContainerProps {
  nodeId: string;
  direction: Direction;
  width?: number | SizeValue;
  height?: number | SizeValue;
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number;
  theme: Theme;
}

const LayoutContainer: FC<PropsWithChildren<LayoutContainerProps>> = ({
  nodeId,
  direction,
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
  const widthStyle = widthToCSS(width);
  const heightStyle = heightToCSS(height);
  const paddingPx = padding ? inToPx(padding) : 0;

  // In flexbox:
  // - justify-content controls main axis (row: horizontal, column: vertical)
  // - align-items controls cross axis (row: vertical, column: horizontal)
  const isRow = direction === DIRECTION.ROW;
  const justifyContent = isRow
    ? (hAlign === HALIGN.CENTER ? 'center' : hAlign === HALIGN.RIGHT ? 'flex-end' : 'flex-start')
    : vAlignToCSS(vAlign);
  const alignItems = isRow
    ? vAlignToCSS(vAlign)
    : hAlignToCSS(hAlign);

  const style = [
    'display: flex',
    `flex-direction: ${direction}`,
    `gap: ${gapPx}px`,
    `justify-content: ${justifyContent}`,
    `align-items: ${alignItems}`,
    widthStyle,
    heightStyle,
    paddingPx > 0 ? `padding: ${paddingPx}px` : '',
  ].filter(Boolean).join('; ');

  return (
    <div data-node-id={nodeId} style={style}>
      {children}
    </div>
  );
};

const LayoutStack: FC<PropsWithChildren<{ nodeId: string }>> = ({
  nodeId,
  children,
}) => {
  // Stack positions all children at the same location (overlapping)
  const style = 'position: relative; display: grid; grid-template: 1fr / 1fr';

  return (
    <div data-node-id={nodeId} style={style}>
      {children}
    </div>
  );
};

const LayoutStackChild: FC<PropsWithChildren> = ({ children }) => {
  // Each child in a stack occupies the same grid cell
  return (
    <div style="grid-area: 1 / 1 / 2 / 2">
      {children}
    </div>
  );
};

interface LayoutTextProps {
  nodeId: string;
  content: TextContent;
  style: TextStyle;
  theme: Theme;
  hAlign?: HorizontalAlignment;
  lineHeightMultiplier?: number;
}

const LayoutText: FC<LayoutTextProps> = ({
  nodeId,
  content,
  style,
  theme,
  hAlign,
  lineHeightMultiplier,
}) => {
  const runs = normalizeContent(content);
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;
  const defaultFont = style.fontFamily[defaultWeight] ?? style.fontFamily.normal;
  const lineHeight = lineHeightMultiplier ?? style.lineHeightMultiplier ?? 1.2;
  const fontSizePx = ptToPx(style.fontSize);

  // Bullet indent: fontSize * multiplier, converted to px
  const bulletIndentPx = ptToPx(style.fontSize * theme.spacing.bulletIndentMultiplier);

  const textAlign = hAlign === HALIGN.RIGHT ? 'right' : hAlign === HALIGN.CENTER ? 'center' : 'left';

  const containerStyle = [
    `font-family: '${defaultFont.name}', sans-serif`,
    `font-size: ${fontSizePx}px`,
    `line-height: ${lineHeight}`,
    `text-align: ${textAlign}`,
    'white-space: pre-wrap',
    'word-wrap: break-word',
    'width: 100%',  // Fill container width (prevents centering in flex parent)
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
      spanStyles.push(`font-weight: ${run.weight === 'bold' ? 700 : run.weight === 'light' ? 300 : 400}`);
    }
  }

  // Handle bold shorthand
  if (run.bold) {
    const boldFont = style.fontFamily.bold;
    if (boldFont) {
      spanStyles.push(`font-family: '${boldFont.name}'`);
      spanStyles.push('font-weight: 700');
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
  aspectRatio?: number;
}

const LayoutImage: FC<LayoutImageProps> = ({
  nodeId,
  aspectRatio = 1.5,  // Default 3:2 aspect ratio
}) => {
  // Images are placeholders - need flex: 1 1 0 to participate in row layout
  return (
    <div
      data-node-id={nodeId}
      style={`flex: 1 1 0; min-width: 0; min-height: 0; aspect-ratio: ${aspectRatio}`}
    />
  );
};

const LayoutRectangle: FC<{ nodeId: string }> = ({ nodeId }) => {
  // Rectangles are purely visual - they don't affect text measurement
  return <div data-node-id={nodeId} />;
};

const LayoutLine: FC<{ nodeId: string }> = ({ nodeId }) => {
  // Lines don't affect text measurement
  return <div data-node-id={nodeId} style="flex: 0 0 1px" />;
};

const LayoutSlideNumber: FC<{ nodeId: string; style: TextStyle }> = ({
  nodeId,
  style,
}) => {
  const fontSizePx = ptToPx(style.fontSize);
  const defaultFont = style.fontFamily.normal;

  // Use "999" as placeholder for max reasonable slide number
  return (
    <div
      data-node-id={nodeId}
      style={`font-family: '${defaultFont.name}', sans-serif; font-size: ${fontSizePx}px; white-space: nowrap`}
    >
      999
    </div>
  );
};

// ============================================
// NODE TREE TO JSX
// ============================================

function nodeToJsx(
  node: ElementNode,
  theme: Theme,
  nodeIds: NodeIdMap
) {
  const nodeId = generateNodeId();
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
        />
      );
    }

    case NODE_TYPE.ROW: {
      const rowNode = node as RowNode;
      return (
        <LayoutContainer
          nodeId={nodeId}
          direction={DIRECTION.ROW}
          width={rowNode.width}
          height={rowNode.height}
          gap={rowNode.gap}
          vAlign={rowNode.vAlign}
          hAlign={rowNode.hAlign}
          padding={rowNode.padding}
          theme={theme}
        >
          {rowNode.children.map((child) => nodeToJsx(child, theme, nodeIds))}
        </LayoutContainer>
      );
    }

    case NODE_TYPE.COLUMN: {
      const colNode = node as ColumnNode;
      return (
        <LayoutContainer
          nodeId={nodeId}
          direction={DIRECTION.COLUMN}
          width={colNode.width}
          height={colNode.height}
          gap={colNode.gap}
          vAlign={colNode.vAlign}
          hAlign={colNode.hAlign}
          padding={colNode.padding}
          theme={theme}
        >
          {colNode.children.map((child) => nodeToJsx(child, theme, nodeIds))}
        </LayoutContainer>
      );
    }

    case NODE_TYPE.STACK: {
      const stackNode = node as StackNode;
      return (
        <LayoutStack nodeId={nodeId}>
          {stackNode.children.map((child) => (
            <LayoutStackChild>
              {nodeToJsx(child, theme, nodeIds)}
            </LayoutStackChild>
          ))}
        </LayoutStack>
      );
    }

    case NODE_TYPE.IMAGE: {
      return <LayoutImage nodeId={nodeId} />;
    }

    case NODE_TYPE.LINE: {
      return <LayoutLine nodeId={nodeId} />;
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
      const syntheticGrid = getTableCellSyntheticNodes(tableNode);
      const numCols = tableNode.rows[0]?.length ?? 0;

      // Calculate column widths (proportional -> flex basis)
      const columnWidths = tableNode.columnWidths ?? Array(numCols).fill(1);
      const totalWeight = columnWidths.reduce((a, b) => a + b, 0);

      // Render table as CSS grid with cells as measurable children
      const cellPadding = tableNode.style?.cellPadding ?? DEFAULT_CELL_PADDING;
      const cellPaddingPx = inToPx(cellPadding);

      return (
        <div
          data-node-id={nodeId}
          style={`display: grid; grid-template-columns: ${columnWidths.map(w => `${(w / totalWeight) * 100}%`).join(' ')}; width: 100%`}
        >
          {syntheticGrid.flatMap((row) =>
            row.map((cellTextNode) => {
              const cellNodeId = generateNodeId();
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
  theme: Theme
): LayoutHtmlResult {
  resetIdCounter();
  const nodeIds: NodeIdMap = new Map();

  const fontFaceCSS = generateFontFaceCSS(theme);
  const widthPx = inToPx(bounds.w);
  const heightPx = inToPx(bounds.h);

  // Build the JSX tree
  const jsxTree = nodeToJsx(tree, theme, nodeIds);

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

/**
 * Generate HTML for multiple slides (batched measurement).
 * Each slide gets its own section for independent layout.
 */
export function generateBatchLayoutHTML(
  slides: Array<{ tree: ElementNode; bounds: Bounds }>,
  theme: Theme
): { html: string; allNodeIds: NodeIdMap[] } {
  resetIdCounter();
  const allNodeIds: NodeIdMap[] = [];

  const fontFaceCSS = generateFontFaceCSS(theme);

  // Build JSX for each slide
  const slideSections = slides.map((slide, slideIndex) => {
    const nodeIds: NodeIdMap = new Map();
    allNodeIds.push(nodeIds);

    const widthPx = inToPx(slide.bounds.w);
    const heightPx = inToPx(slide.bounds.h);
    const jsxTree = nodeToJsx(slide.tree, theme, nodeIds);

    return (
      <div
        data-slide-index={slideIndex}
        style={`width: ${widthPx}px; height: ${heightPx}px; display: flex; flex-direction: column; position: absolute; visibility: hidden`}
      >
        {jsxTree}
      </div>
    );
  });

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
            position: relative;
          }
        `}} />
      </head>
      <body>
        {slideSections}
      </body>
    </html>
  );

  const html = '<!DOCTYPE html>' + renderToString(fullJsx);

  return { html, allNodeIds };
}
