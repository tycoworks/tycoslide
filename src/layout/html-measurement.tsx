// HTML Measurement Generator
// Generates HTML that mirrors TycoSlide layout structure for accurate browser measurement

import { renderToString } from 'hono/jsx/dom/server';
import type { FC, PropsWithChildren } from 'hono/jsx';
import type { ElementNode, TextNode, ImageNode, RowNode, ColumnNode, StackNode, SlideNumberNode } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { Theme, TextStyle, FontWeight, GapSize, VerticalAlignment, HorizontalAlignment, SizeValue, TextContent, NormalizedRun } from '../core/types.js';
import { TEXT_STYLE, FONT_WEIGHT, SIZE, VALIGN, HALIGN } from '../core/types.js';
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
    case VALIGN.TOP: return 'flex-start';
    case VALIGN.BOTTOM: return 'flex-end';
    case VALIGN.MIDDLE:
    default: return 'center';
  }
}

function hAlignToCSS(hAlign: HorizontalAlignment | undefined): string {
  switch (hAlign) {
    case HALIGN.LEFT: return 'flex-start';
    case HALIGN.RIGHT: return 'flex-end';
    case HALIGN.CENTER:
    default: return 'center';
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

interface LayoutRowProps {
  nodeId: string;
  width?: number | SizeValue;
  height?: number | SizeValue;
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  theme: Theme;
}

const LayoutRow: FC<PropsWithChildren<LayoutRowProps>> = ({
  nodeId,
  width,
  height,
  gap,
  vAlign,
  theme,
  children,
}) => {
  const gapPx = inToPx(resolveGap(gap, theme));
  const alignItems = vAlignToCSS(vAlign);
  const widthStyle = widthToCSS(width);
  const heightStyle = heightToCSS(height);

  const style = [
    'display: flex',
    'flex-direction: row',
    `gap: ${gapPx}px`,
    `align-items: ${alignItems}`,
    widthStyle,
    heightStyle,
  ].filter(Boolean).join('; ');

  return (
    <div data-node-id={nodeId} style={style}>
      {children}
    </div>
  );
};

interface LayoutColumnProps {
  nodeId: string;
  width?: number | SizeValue;
  height?: number | SizeValue;
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number;
  theme: Theme;
}

const LayoutColumn: FC<PropsWithChildren<LayoutColumnProps>> = ({
  nodeId,
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
  const justifyContent = vAlignToCSS(vAlign);  // Column uses justify-content for vertical
  const alignItems = hAlignToCSS(hAlign);      // and align-items for horizontal
  const widthStyle = widthToCSS(width);
  const heightStyle = heightToCSS(height);
  const paddingPx = padding ? inToPx(padding) : 0;

  const style = [
    'display: flex',
    'flex-direction: column',
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

  const textAlign = hAlign === HALIGN.RIGHT ? 'right' : hAlign === HALIGN.CENTER ? 'center' : 'left';

  const containerStyle = [
    `font-family: '${defaultFont.name}', sans-serif`,
    `font-size: ${fontSizePx}px`,
    `line-height: ${lineHeight}`,
    `text-align: ${textAlign}`,
    'white-space: pre-wrap',
    'word-wrap: break-word',
  ].join('; ');

  return (
    <div data-node-id={nodeId} style={containerStyle}>
      {runs.map((run, i) => renderTextRun(run, i, style, defaultWeight))}
    </div>
  );
};

function renderTextRun(
  run: NormalizedRun,
  index: number,
  style: TextStyle,
  defaultWeight: string
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

  const styleAttr = spanStyles.length > 0 ? spanStyles.join('; ') : undefined;
  const text = escapeHtml(run.text);

  // Handle line breaks - bullet implies a new paragraph
  const prefix = (run.breakLine || run.bullet) ? <br /> : null;

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
  // Images are placeholders - we just need to reserve space
  return (
    <div
      data-node-id={nodeId}
      style={`aspect-ratio: ${aspectRatio}; min-width: 0; min-height: 0`}
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
        <LayoutRow
          nodeId={nodeId}
          width={rowNode.width}
          height={rowNode.height}
          gap={rowNode.gap}
          vAlign={rowNode.vAlign}
          theme={theme}
        >
          {rowNode.children.map((child) => nodeToJsx(child, theme, nodeIds))}
        </LayoutRow>
      );
    }

    case NODE_TYPE.COLUMN: {
      const colNode = node as ColumnNode;
      return (
        <LayoutColumn
          nodeId={nodeId}
          width={colNode.width}
          height={colNode.height}
          gap={colNode.gap}
          vAlign={colNode.vAlign}
          hAlign={colNode.hAlign}
          padding={colNode.padding}
          theme={theme}
        >
          {colNode.children.map((child) => nodeToJsx(child, theme, nodeIds))}
        </LayoutColumn>
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
