// Declarative Render
// Renders positioned nodes to Canvas

import { NODE_TYPE, type PositionedNode, type TextNode, type ImageNode, type CardNode, type ListNode, type TableNode, type DiagramNode } from './nodes.js';
import type { Theme, TextStyleName, TextContent, NormalizedRun } from './types.js';
import type { Canvas, TextFragment, TextFragmentOptions } from './canvas.js';
import { SHAPE, TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT } from './types.js';
import { Bounds } from './bounds.js';
import { getFontFromFamily, normalizeContent } from '../utils/font-utils.js';

// ============================================
// TEXT RENDERING HELPERS
// ============================================

function buildTextFragments(
  content: TextContent,
  styleName: TextStyleName,
  theme: Theme,
  colorOverride?: string
): TextFragment[] {
  const style = theme.textStyles[styleName];
  const defaultColor = colorOverride ?? style.color ?? theme.colors.text;
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;

  const normalized = normalizeContent(content);
  return normalized.map(run => {
    const runWeight = run.weight ?? defaultWeight;
    const runFont = getFontFromFamily(style.fontFamily, runWeight);
    const options: TextFragmentOptions = {
      color: run.color ?? run.highlight?.text ?? defaultColor,
      fontFace: runFont.name,
    };
    if (run.highlight) options.highlight = run.highlight.bg;
    return { text: run.text, options };
  });
}

function renderText(
  canvas: Canvas,
  content: TextContent,
  styleName: TextStyleName,
  theme: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  hAlign?: string,
  vAlign?: string,
  colorOverride?: string
): void {
  const style = theme.textStyles[styleName];
  const defaultFont = getFontFromFamily(style.fontFamily, style.defaultWeight ?? FONT_WEIGHT.NORMAL);
  const fragments = buildTextFragments(content, styleName, theme, colorOverride);

  canvas.addText(fragments, {
    x, y, w, h,
    fontSize: style.fontSize,
    fontFace: defaultFont.name,
    color: colorOverride ?? style.color ?? theme.colors.text,
    margin: 0,
    wrap: true,
    lineSpacingMultiple: 1.0,
    align: (hAlign as any) ?? HALIGN.LEFT,
    valign: (vAlign as any) ?? VALIGN.TOP,
  });
}

// ============================================
// NODE RENDERERS
// ============================================

function renderTextNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const textNode = node.node as TextNode;
  renderText(
    canvas,
    textNode.content,
    textNode.style ?? TEXT_STYLE.BODY,
    theme,
    node.x, node.y, node.width, node.height,
    textNode.hAlign,
    textNode.vAlign,
    textNode.color
  );
}

function renderImageNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const imageNode = node.node as ImageNode;
  canvas.addImage({
    path: imageNode.src,
    x: node.x,
    y: node.y,
    w: node.width,
    h: node.height,
  });
}

function renderCardNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const cardNode = node.node as CardNode;
  const padding = theme.spacing.padding;

  // Draw background
  if (cardNode.backgroundColor !== 'none') {
    canvas.addShape(SHAPE.ROUND_RECT, {
      x: node.x,
      y: node.y,
      w: node.width,
      h: node.height,
      fill: {
        color: cardNode.backgroundColor ?? theme.colors.secondary,
        transparency: 100 - theme.colors.subtleOpacity,
      },
      line: {
        color: cardNode.borderColor ?? theme.colors.secondary,
        width: theme.borders.width,
      },
      rectRadius: theme.borders.radius,
    });
  }

  // Inner content area
  let contentY = node.y + padding;
  const contentX = node.x + padding;
  const contentWidth = node.width - padding * 2;

  // Image
  if (cardNode.image) {
    const imageHeight = (node.height - padding * 2) * 0.4;
    canvas.addImage({
      path: cardNode.image,
      x: contentX,
      y: contentY,
      w: contentWidth,
      h: imageHeight,
    });
    contentY += imageHeight + theme.spacing.gapTight;
  }

  // Title
  if (cardNode.title) {
    const style = theme.textStyles[TEXT_STYLE.H4];
    const titleHeight = style.fontSize / 72; // Approximate
    renderText(
      canvas,
      cardNode.title,
      TEXT_STYLE.H4,
      theme,
      contentX, contentY, contentWidth, titleHeight,
      HALIGN.LEFT, VALIGN.TOP,
      cardNode.titleColor
    );
    contentY += titleHeight + theme.spacing.gapTight;
  }

  // Description
  if (cardNode.description) {
    const style = theme.textStyles[TEXT_STYLE.BODY];
    const descHeight = style.fontSize / 72;
    renderText(
      canvas,
      cardNode.description,
      TEXT_STYLE.BODY,
      theme,
      contentX, contentY, contentWidth, descHeight,
      HALIGN.LEFT, VALIGN.TOP,
      cardNode.descriptionColor
    );
  }
}

function renderListNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const listNode = node.node as ListNode;
  const styleName = listNode.style ?? TEXT_STYLE.BODY;
  const style = theme.textStyles[styleName];
  const lineHeight = style.fontSize / 72 * 1.2;
  const bulletSpacing = theme.spacing.bulletSpacing;
  const indent = theme.spacing.gap;

  let y = node.y;
  listNode.items.forEach((item, i) => {
    const bullet = listNode.ordered ? `${i + 1}. ` : '• ';
    const content: TextContent = typeof item === 'string' ? bullet + item : [bullet, ...normalizeContent(item).map(r => r.text)].join('');

    renderText(
      canvas,
      content,
      styleName,
      theme,
      node.x, y, node.width, lineHeight,
      HALIGN.LEFT, VALIGN.TOP,
      listNode.color
    );
    y += lineHeight * bulletSpacing;
  });
}

function renderTableNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const tableNode = node.node as TableNode;
  const style = theme.textStyles[TEXT_STYLE.BODY];
  const cellPadding = theme.spacing.cellPadding;
  const rowHeight = node.height / tableNode.data.length;
  const colWidth = node.width / (tableNode.data[0]?.length || 1);

  tableNode.data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = node.x + colIndex * colWidth;
      const y = node.y + rowIndex * rowHeight;

      // Cell background for headers
      const isHeader = (tableNode.headerRow && rowIndex === 0) ||
                       (tableNode.headerColumn && colIndex === 0);
      if (isHeader && tableNode.headerBackground) {
        canvas.addShape(SHAPE.RECT, {
          x, y, w: colWidth, h: rowHeight,
          fill: { color: tableNode.headerBackground },
        });
      }

      // Cell text
      renderText(
        canvas,
        cell,
        TEXT_STYLE.BODY,
        theme,
        x + cellPadding, y + cellPadding,
        colWidth - cellPadding * 2, rowHeight - cellPadding * 2,
        HALIGN.LEFT, VALIGN.MIDDLE
      );
    });
  });
}

function renderLineNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  canvas.addShape(SHAPE.LINE, {
    x: node.x,
    y: node.y,
    w: node.width,
    h: 0,
    line: {
      color: theme.colors.secondary,
      width: 1,
    },
  });
}

function renderSlideNumberNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const slideNumNode = node.node as import('./nodes.js').SlideNumberNode;
  const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
  const style = theme.textStyles[styleName as keyof typeof theme.textStyles];
  const font = getFontFromFamily(style.fontFamily, FONT_WEIGHT.NORMAL);

  canvas.addSlideNumber({
    x: node.x,
    y: node.y,
    w: node.width,
    h: node.height,
    fontFace: font.name,
    fontSize: style.fontSize,
    color: slideNumNode.color ?? style.color ?? theme.colors.textMuted,
    align: slideNumNode.hAlign ?? HALIGN.RIGHT,
    valign: VALIGN.MIDDLE,
    margin: 0,
  });
}

function renderDiagramNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const diagramNode = node.node as DiagramNode;
  // Simplified diagram rendering - just boxes in a row
  const boxCount = diagramNode.nodes.length;
  const gap = theme.spacing.gap;
  const boxWidth = (node.width - gap * (boxCount - 1)) / boxCount;
  const boxHeight = node.height * 0.6;
  const boxY = node.y + (node.height - boxHeight) / 2;

  diagramNode.nodes.forEach((box, i) => {
    const x = node.x + i * (boxWidth + gap);
    const style = box.style ?? 'primary';
    const color = (theme.colors as any)[style] ?? theme.colors.primary;

    canvas.addShape(SHAPE.ROUND_RECT, {
      x, y: boxY, w: boxWidth, h: boxHeight,
      fill: { color },
      rectRadius: theme.borders.radius,
    });

    renderText(
      canvas,
      box.label,
      TEXT_STYLE.SMALL,
      theme,
      x, boxY, boxWidth, boxHeight,
      HALIGN.CENTER, VALIGN.MIDDLE,
      theme.colors.background
    );
  });
}

// ============================================
// MAIN RENDER FUNCTION
// ============================================

export function render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
  const { node } = positioned;

  switch (node.type) {
    case NODE_TYPE.TEXT:
      renderTextNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.IMAGE:
      renderImageNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.CARD:
      renderCardNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.LIST:
      renderListNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.TABLE:
      renderTableNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.LINE:
      renderLineNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.SLIDE_NUMBER:
      renderSlideNumberNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.DIAGRAM:
      renderDiagramNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.ROW:
    case NODE_TYPE.COLUMN:
    case NODE_TYPE.GROUP:
      // Container nodes: just render children
      if (positioned.children) {
        for (const child of positioned.children) {
          render(child, canvas, theme);
        }
      }
      break;
  }
}
