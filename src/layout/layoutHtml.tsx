// HTML Measurement Generator
// Generates HTML that mirrors tycoslide layout structure for accurate browser measurement

import fs from 'fs';
import path from 'path';
import { renderToString } from 'hono/jsx/dom/server';
import type { FC, PropsWithChildren } from 'hono/jsx';
import type { Page } from 'playwright';
import type { ElementNode, TextNode, ImageNode, LineNode, ContainerNode, StackNode, SlideNumberNode, TableNode, TableCellData } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { Theme, TextStyle, FontWeight, GapSize, VerticalAlignment, HorizontalAlignment, SizeValue, TextContent, NormalizedRun, Direction } from '../core/types.js';
import { TEXT_STYLE, FONT_WEIGHT, SIZE, VALIGN, HALIGN, DIRECTION } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { normalizeContent, fontWeightToNumeric, resolveLineHeight } from '../utils/text.js';
import { readImageDimensions } from '../utils/image.js';
import { inToPx, ptToPx, SCREEN_DPI } from '../utils/units.js';
import { resolveGap } from '../utils/units.js';

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

/** Row align-items: how children are positioned on the cross-axis (vertically) in a row.
 *  TOP maps to 'stretch' so children fill the row height natively (equal-height cards).
 *  MIDDLE/BOTTOM use center/flex-end — children keep intrinsic height and get positioned. */
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
): Record<string, string | number> {
  const styles: Record<string, string | number> = {};
  const isInRow = parentDirection === DIRECTION.ROW;

  // Main axis sizing (controlled by `flex` property)
  const mainSize = isInRow ? width : height;

  if (typeof mainSize === 'number') {
    styles.flex = `0 0 ${inToPx(mainSize)}px`;
  } else if (mainSize === SIZE.FILL) {
    styles.flex = '1 1 0';
    if (isInRow) { styles.minWidth = 0; } else { styles.minHeight = 0; }
  } else if (isInRow) {
    // In a row: children share width equally by default
    // min-height: 0 allows vertical compression when constrained by align-self: stretch
    styles.flex = '1 1 0';
    styles.minWidth = 0;
    styles.minHeight = 0;
  } else {
    // In a column: children use intrinsic height by default (no flex grow).
    // min-height: 0 allows containers to compress when parent is constrained
    // (without this, min-height: auto prevents shrinking below content size).
    // The root wrapper's CSS forces the top-level node to fill the slide.
    styles.minHeight = 0;
  }

  // Cross axis sizing (explicit CSS property)
  const crossSize = isInRow ? height : width;

  if (typeof crossSize === 'number') {
    if (isInRow) {
      styles.height = `${inToPx(crossSize)}px`;
    } else {
      styles.width = `${inToPx(crossSize)}px`;
    }
  } else if (crossSize === SIZE.FILL) {
    // Explicit SIZE.FILL: always fill parent's cross dimension.
    if (isInRow) { styles.height = '100%'; } else { styles.width = '100%'; }
  } else if (!isInRow) {
    // In columns: width: 100% prevents shrink-to-content from align-items.
    styles.width = '100%';
  }
  // In rows with undefined cross-size: omit height entirely.
  // align-items: stretch (VALIGN.TOP) fills natively; center/flex-end position at intrinsic height.

  return styles;
}

// ============================================
// FONT FACE CSS
// ============================================

/** Font descriptor for explicit preloading */
export interface FontDescriptor {
  name: string;
  weight: number;
}

/** MIME type and CSS format() hint for supported font formats */
const FONT_FORMATS: Record<string, { mime: string; format: string }> = {
  '.woff2': { mime: 'font/woff2', format: 'woff2' },
  '.woff': { mime: 'font/woff', format: 'woff' },
  '.ttf': { mime: 'font/ttf', format: 'truetype' },
  '.otf': { mime: 'font/opentype', format: 'opentype' },
};

/** Cache for generateFontFaceCSS() to avoid redundant file I/O */
const fontFaceCSSCache = new Map<string, { css: string; fonts: FontDescriptor[] }>();

export function generateFontFaceCSS(theme: Theme): { css: string; fonts: FontDescriptor[] } {
  // Build cache key from font paths (unique per theme)
  const fontPaths: string[] = [];
  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    for (const weight of Object.keys(style.fontFamily) as FontWeight[]) {
      const font = style.fontFamily[weight];
      if (font) fontPaths.push(font.path);
    }
  }
  const cacheKey = JSON.stringify(fontPaths.sort());

  // Return cached result if available
  const cached = fontFaceCSSCache.get(cacheKey);
  if (cached) return cached;
  const fontFaces: string[] = [];
  const fonts: FontDescriptor[] = [];
  const seenPaths = new Set<string>();

  // Collect fonts from all text styles
  for (const styleName of Object.keys(theme.textStyles) as (keyof typeof theme.textStyles)[]) {
    const style = theme.textStyles[styleName];
    const family = style.fontFamily;

    for (const weight of Object.keys(family) as FontWeight[]) {
      const font = family[weight];
      if (font && !seenPaths.has(font.path)) {
        seenPaths.add(font.path);
        const numericWeight = fontWeightToNumeric(weight);
        fonts.push({ name: font.name, weight: numericWeight });
        // Embed font as base64 data URI so it loads in Playwright's setContent()
        // (file:// URLs don't work because the page has no file origin)
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
  }

  const result = { css: fontFaces.join('\n'), fonts };
  fontFaceCSSCache.set(cacheKey, result);
  return result;
}

/**
 * Explicitly preload all fonts in Playwright.
 * document.fonts.ready can resolve before base64 fonts are fully parsed.
 * document.fonts.load() forces the browser to load each font and waits.
 */
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
export async function measureFontNormalRatios(page: Page, theme: Theme): Promise<{ ratios: FontNormalRatios; fonts: FontDescriptor[] }> {
  const { css: fontFaceCSS, fonts } = generateFontFaceCSS(theme);
  await page.setContent(
    `<!DOCTYPE html><html><head><style>${fontFaceCSS}</style></head><body></body></html>`
  );
  await preloadFonts(page, fonts);

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
  return { ratios: result, fonts };
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

  const style: Record<string, string | number> = {
    display: 'flex',
    flexDirection: direction,
    gap: `${gapPx}px`,
    justifyContent,
    alignItems,
    ...itemStyles,
    ...(paddingPx > 0 ? { padding: `${paddingPx}px` } : {}),
  };

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
  const style: Record<string, string | number> = {
    position: 'relative',
    display: 'grid',
    gridTemplate: 'minmax(0, 1fr) / minmax(0, 1fr)',
    ...itemStyles,
  };

  return (
    <div data-node-id={nodeId} style={style}>
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
    <div style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
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
  parentDirection?: Direction;
}

const LayoutText: FC<LayoutTextProps> = ({
  nodeId,
  content,
  style,
  theme,
  hAlign,
  lineHeightMultiplier,
  fontNormalRatios,
  parentDirection,
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

  const isInRow = parentDirection === DIRECTION.ROW;

  const containerStyle: Record<string, string | number> = {
    fontFamily: `'${defaultFont.name}'`,
    fontSize: `${fontSizePx}px`,
    lineHeight: `${cssLineHeight}`,
    textAlign,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    // Direction-aware sizing:
    // In a column: fill width (cross-axis), don't shrink height (main-axis)
    // In a row: share width equally (main-axis), allow wrapping within allocated space
    ...(isInRow
      ? { flex: '1 1 0', minWidth: 0 }
      : { width: '100%', flexShrink: 0 }),
  };

  // Group runs into renderable lines.
  // A bullet or breakLine starts a new group; subsequent plain runs join the current group.
  // This ensures multi-run bullets (e.g. "- **Bold:** plain text") render in one <div>.
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

  return (
    <div data-node-id={nodeId} style={containerStyle}>
      {groups.map((group, gi) => {
        const first = group[0];
        const spans = group.map((run, ri) => renderRunSpan(run, gi * 100 + ri, style, defaultWeight));

        if (first.bullet) {
          return (
            <div key={gi} style={{ paddingLeft: `${bulletIndentPx}px` }}>
              <span style={{ display: 'inline-block', width: '1em', marginLeft: '-1em' }}>•</span>
              {spans}
            </div>
          );
        }

        if (first.breakLine) {
          return (
            <div key={gi}>
              <div style={{ height: '1em' }} />
              {spans}
            </div>
          );
        }

        return <span key={gi}>{spans}</span>;
      })}
    </div>
  );
};

/** Render a single run as an inline <span> (no block wrappers). */
function renderRunSpan(
  run: NormalizedRun,
  index: number,
  style: TextStyle,
  defaultWeight: string,
) {
  const spanStyles: Record<string, string | number> = {};

  if (run.weight && run.weight !== defaultWeight) {
    const font = style.fontFamily[run.weight];
    if (font) {
      spanStyles.fontFamily = `'${font.name}'`;
      spanStyles.fontWeight = fontWeightToNumeric(run.weight as FontWeight);
    }
  }

  if (run.bold) {
    const boldFont = style.fontFamily.bold;
    if (boldFont) {
      spanStyles.fontFamily = `'${boldFont.name}'`;
      spanStyles.fontWeight = fontWeightToNumeric(FONT_WEIGHT.BOLD);
    }
  }

  if (run.italic) {
    spanStyles.fontStyle = 'italic';
  }

  if (run.color) {
    spanStyles.color = `#${run.color}`;
  }

  if (run.highlight) {
    spanStyles.backgroundColor = `#${run.highlight.bg}`;
    spanStyles.color = `#${run.highlight.text}`;
  }

  const styleAttr = Object.keys(spanStyles).length > 0 ? spanStyles : undefined;
  return <span key={index} style={styleAttr}>{run.text}</span>;
}

interface LayoutImageProps {
  nodeId: string;
  aspectRatio: number;
  maxWidthPx?: number;
  maxHeightPx?: number;
  parentDirection?: Direction;
  parentHasDefiniteCrossSize?: boolean;
}

const LayoutImage: FC<LayoutImageProps> = ({
  nodeId,
  aspectRatio,
  maxWidthPx,
  maxHeightPx,
  parentDirection,
  parentHasDefiniteCrossSize,
}) => {
  // Image contain behavior: fit within parent bounds preserving aspect ratio.
  // CSS strategy depends on parent direction and whether parent has definite cross-axis size:
  // - In a column: width is the constraint axis, derive height from aspect ratio
  // - In a row with definite height: height: 100% resolves, aspect-ratio derives width naturally
  // - In a row with auto height: no anchor for aspect-ratio, share space equally with siblings
  const style: Record<string, string | number> = { aspectRatio: `${aspectRatio}` };

  if (parentDirection === DIRECTION.ROW) {
    style.height = '100%';
    style.minWidth = 0;
    if (parentHasDefiniteCrossSize) {
      // Row has definite height → browser resolves height: 100%, then aspect-ratio derives width
      style.flex = '0 1 auto';
    } else {
      // Row has auto height → no anchor for aspect-ratio width derivation, share space equally
      style.flex = '1 1 0';
    }
  } else {
    // In a column (or root): fill available width, derive height from aspect ratio
    // Fully compressible: can shrink to 0 (flex-shrink: 1, min-height: 0)
    style.width = '100%';
    style.flex = '0 1 auto';
    style.minHeight = 0;
  }

  // maxScaleFactor: prevent upscaling beyond native resolution
  if (maxWidthPx) style.maxWidth = `${maxWidthPx}px`;
  if (maxHeightPx) style.maxHeight = `${maxHeightPx}px`;

  return (
    <div
      data-node-id={nodeId}
      style={style}
    />
  );
};

interface LayoutLineProps {
  nodeId: string;
  parentDirection?: Direction;
  borderWidthPx: number;
}

const LayoutLine: FC<LayoutLineProps> = ({ nodeId, parentDirection, borderWidthPx }) => {
  if (parentDirection === DIRECTION.ROW) {
    // Vertical separator in a row: fixed width, stretch to row height
    return <div data-node-id={nodeId} style={{ flex: `0 0 ${borderWidthPx}px`, alignSelf: 'stretch' }} />;
  }
  // Horizontal separator in a column (default): full width, fixed height
  return <div data-node-id={nodeId} style={{ flex: `0 0 ${borderWidthPx}px`, width: '100%' }} />;
};

const LayoutShape: FC<{ nodeId: string }> = ({ nodeId }) => {
  // Area shapes: fill parent bounds completely (bounding box only — visual shape rendered in PPTX)
  return <div data-node-id={nodeId} style={{ width: '100%', height: '100%' }} />;
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
      style={{ fontFamily: `'${defaultFont.name}'`, fontSize: `${fontSizePx}px`, whiteSpace: 'nowrap', flex: '0 0 auto' }}
    >
      {SLIDE_NUMBER_PLACEHOLDER}
    </div>
  );
};

// ============================================
// TABLE CELL NODES
// ============================================

/**
 * Get or create TextNodes for a TableNode's cells.
 * Each cell becomes a TextNode with its content and styling for measurement.
 */
function getTableCellNodes(node: TableNode): TextNode[][] {
  return node.rows.map((row, rowIndex) =>
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
}

// ============================================
// NODE TREE TO JSX
// ============================================

/** Context about the parent container, passed to children during JSX tree construction */
interface ParentContext {
  direction: Direction;
  /** True when the parent has a definite cross-axis size (height for rows, width for columns).
   *  Images use this to decide whether aspect-ratio can derive their width from height: 100%. */
  hasDefiniteCrossSize?: boolean;
}

function nodeToJsx(
  node: ElementNode,
  theme: Theme,
  nodeIds: Map<ElementNode, string>,
  idCtx: IdContext,
  parent: ParentContext,
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
          parentDirection={parent.direction}
        />
      );
    }

    case NODE_TYPE.CONTAINER: {
      const container = node as ContainerNode;
      const isRow = container.direction === DIRECTION.ROW;
      return (
        <LayoutContainer
          nodeId={nodeId}
          direction={container.direction}
          parentDirection={parent.direction}
          width={container.width}
          height={container.height}
          gap={container.gap}
          vAlign={container.vAlign}
          hAlign={container.hAlign}
          padding={container.padding}
          theme={theme}
        >
          {container.children.map((child) => nodeToJsx(child, theme, nodeIds, idCtx, { direction: container.direction, hasDefiniteCrossSize: isRow ? container.height !== undefined : undefined }, fontNormalRatios))}
        </LayoutContainer>
      );
    }

    case NODE_TYPE.STACK: {
      const stackNode = node as StackNode;
      return (
        <LayoutStack nodeId={nodeId} width={stackNode.width} height={stackNode.height} parentDirection={parent.direction}>
          {stackNode.children.map((child) => (
            <LayoutStackChild>
              {nodeToJsx(child, theme, nodeIds, idCtx, { direction: DIRECTION.COLUMN }, fontNormalRatios)}
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

      return <LayoutImage nodeId={nodeId} aspectRatio={dims.aspectRatio} maxWidthPx={maxWidthPx} maxHeightPx={maxHeightPx} parentDirection={parent.direction} parentHasDefiniteCrossSize={parent.hasDefiniteCrossSize} />;
    }

    case NODE_TYPE.LINE: {
      const lineNode = node as LineNode;
      const borderWidthPx = ptToPx(lineNode.width ?? theme.borders.width);
      return <LayoutLine nodeId={nodeId} parentDirection={parent.direction} borderWidthPx={borderWidthPx} />;
    }

    case NODE_TYPE.SHAPE: {
      return <LayoutShape nodeId={nodeId} />;
    }

    case NODE_TYPE.SLIDE_NUMBER: {
      const slideNumNode = node as SlideNumberNode;
      const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
      const style = theme.textStyles[styleName];
      return <LayoutSlideNumber nodeId={nodeId} style={style} />;
    }

    case NODE_TYPE.TABLE: {
      const tableNode = node as TableNode;
      const cellNodes = getTableCellNodes(tableNode);
      const numCols = tableNode.rows[0]?.length ?? 0;

      // Render table as CSS grid with cells as measurable children
      const cellPadding = tableNode.style?.cellPadding ?? theme.spacing.cellPadding;
      const cellPaddingPx = inToPx(cellPadding);

      // In rows: share width equally. In columns: fill width.
      const isInRow = parent.direction === 'row';
      const tableStyle: Record<string, string | number> = {
        display: 'grid',
        gridTemplateColumns: `repeat(${numCols}, 1fr)`,
        ...(isInRow ? { flex: '1 1 0', minWidth: 0 } : { width: '100%' }),
      };

      return (
        <div
          data-node-id={nodeId}
          style={tableStyle}
        >
          {cellNodes.flatMap((row: TextNode[]) =>
            row.map((cellTextNode: TextNode) => {
              const cellNodeId = generateNodeId(idCtx);
              nodeIds.set(cellTextNode, cellNodeId);

              const styleName = cellTextNode.style ?? TEXT_STYLE.BODY;
              const style = theme.textStyles[styleName];

              return (
                <div style={{ padding: `${cellPaddingPx}px` }}>
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
// HTML GENERATION
// ============================================

/** Result of batch HTML generation */
export interface LayoutHtmlResult {
  html: string;
  slideNodeIds: Array<Map<ElementNode, string>>;
  perSlideHtml?: string[];
}

/**
 * Generate a single HTML document containing ALL slides for batch measurement.
 * Each slide is in its own .root container with inline dimensions.
 * Node IDs are globally unique (shared counter across all slides).
 * Fonts are included once. One browser round-trip measures everything.
 */
export function generateLayoutHTML(
  slides: Array<{ tree: ElementNode; bounds: Bounds }>,
  theme: Theme,
  fontNormalRatios?: FontNormalRatios,
  labels?: string[],
): LayoutHtmlResult {
  const idCtx: IdContext = { counter: 0 };
  const slideNodeIds: Array<Map<ElementNode, string>> = [];

  const { css: fontFaceCSS } = generateFontFaceCSS(theme);

  // Build JSX for each slide's tree
  const slideJsx = slides.map((slide, i) => {
    const nodeIds: Map<ElementNode, string> = new Map();
    slideNodeIds.push(nodeIds);

    const widthPx = inToPx(slide.bounds.w);
    const heightPx = inToPx(slide.bounds.h);

    const jsxTree = nodeToJsx(slide.tree, theme, nodeIds, idCtx, { direction: DIRECTION.COLUMN }, fontNormalRatios);

    return (
      <>
        {process.env.DEBUG_HTML && (
          <div style={{ background: '#333', color: '#fff', padding: '4px 8px', font: 'bold 14px monospace' }}>
            {labels?.[i] ?? `slide-${i}`}
          </div>
        )}
        <div class="root" data-slide-index={`${i}`} style={{ width: `${widthPx}px`, height: `${heightPx}px` }}>
          {jsxTree}
        </div>
      </>
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
            overflow: hidden;
          }

          .root {
            display: flex;
            flex-direction: column;
          }

          /* Top-level node fills the slide (column children default to intrinsic) */
          .root > * {
            flex: 1 1 0;
            min-height: 0;
          }

${process.env.DEBUG_HTML ? `
          /* Debug borders - outline doesn't affect layout */
          [data-node-id] {
            outline: 1px solid rgba(255, 0, 0, 0.3);
          }
          ` : ''}
        `}} />
      </head>
      <body>
        {slideJsx}
      </body>
    </html>
  );

  const html = '<!DOCTYPE html>' + renderToString(fullJsx);

  // In debug mode, render each slide individually for standalone per-slide files.
  // This captures what we generated BEFORE concatenation — no regex reconstruction needed.
  let perSlideHtml: string[] | undefined;
  if (process.env.DEBUG_HTML) {
    perSlideHtml = slideJsx.map(jsx => {
      const slideDoc = (
        <html>
          <head>
            <meta charset="UTF-8" />
            <style dangerouslySetInnerHTML={{ __html: `
              ${fontFaceCSS}
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { overflow: hidden; }
              .root { display: flex; flex-direction: column; }
              .root > * { flex: 1 1 0; min-height: 0; }
              [data-node-id] { outline: 1px solid rgba(255, 0, 0, 0.3); }
            `}} />
          </head>
          <body>{jsx}</body>
        </html>
      );
      return '<!DOCTYPE html>' + renderToString(slideDoc);
    });
  }

  return { html, slideNodeIds, perSlideHtml };
}

