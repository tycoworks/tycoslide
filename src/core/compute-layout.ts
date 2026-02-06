// Declarative Layout Computation
// Computes positions and sizes for all nodes in the tree

import { NODE_TYPE, type ElementNode, type PositionedNode } from './nodes.js';
import type { Theme } from './types.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import { Bounds } from './bounds.js';
import { TEXT_STYLE, VALIGN, JUSTIFY } from './types.js';
import { toTextContent, resolveGap } from '../utils/node-utils.js';
import { log, contentPreview } from '../utils/log.js';

// ============================================
// HEIGHT COMPUTATION
// ============================================

export function getNodeHeight(
  node: ElementNode,
  width: number,
  theme: Theme,
  measurer: TextMeasurer
): number {
  switch (node.type) {
    case NODE_TYPE.TEXT: {
      const styleName = node.style ?? TEXT_STYLE.BODY;
      const style = theme.textStyles[styleName];
      const lineHeight = measurer.getStyleLineHeight(style);
      const lines = measurer.estimateLines(node.content, style, width);
      const height = lineHeight * lines;
      log.layout.text('HEIGHT text style=%s width=%f lineHeight=%f lines=%d -> %f "%s"',
        styleName, width, lineHeight, lines, height, contentPreview(node.content));
      return height;
    }

    case NODE_TYPE.LIST: {
      const styleName = node.style ?? TEXT_STYLE.BODY;
      const style = theme.textStyles[styleName];
      const lineHeight = measurer.getStyleLineHeight(style);
      const bulletSpacing = theme.spacing.bulletSpacing;
      let totalHeight = 0;
      const indentedWidth = width - theme.spacing.gap;
      log.layout.list('HEIGHT list items=%d style=%s indentedWidth=%f',
        node.items.length, styleName, indentedWidth);
      for (const item of node.items) {
        const lines = measurer.estimateLines(toTextContent(item), style, indentedWidth);
        const itemHeight = lineHeight * lines * bulletSpacing;
        totalHeight += itemHeight;
        log.layout.list('  item lines=%d itemHeight=%f "%s"',
          lines, itemHeight, contentPreview(toTextContent(item)));
      }
      log.layout.list('  -> totalHeight=%f', totalHeight);
      return totalHeight;
    }

    case NODE_TYPE.CARD: {
      const innerWidth = width - theme.spacing.padding * 2;
      let height = theme.spacing.padding * 2;
      log.layout.card('HEIGHT card width=%f innerWidth=%f padding=%f',
        width, innerWidth, theme.spacing.padding);

      if (node.image || node.icon) {
        height += 1.5 + theme.spacing.gapTight;
        log.layout.card('  +image/icon: 1.5 + gapTight=%f -> height=%f',
          theme.spacing.gapTight, height);
      }

      if (node.title) {
        const style = theme.textStyles[TEXT_STYLE.H4];
        const lineHeight = measurer.getStyleLineHeight(style);
        const lines = measurer.estimateLines(node.title, style, innerWidth);
        const titleHeight = lineHeight * lines;
        height += titleHeight;
        log.layout.card('  +title: lineHeight=%f lines=%d -> +%f -> height=%f "%s"',
          lineHeight, lines, titleHeight, height, contentPreview(node.title));
      }

      if (node.title && node.description) {
        height += theme.spacing.gapTight;
        log.layout.card('  +gap between title/desc: %f -> height=%f',
          theme.spacing.gapTight, height);
      }

      if (node.description) {
        const style = theme.textStyles[TEXT_STYLE.BODY];
        const lineHeight = measurer.getStyleLineHeight(style);
        const lines = measurer.estimateLines(node.description, style, innerWidth);
        const descHeight = lineHeight * lines;
        height += descHeight;
        log.layout.card('  +desc: lineHeight=%f lines=%d -> +%f -> height=%f "%s"',
          lineHeight, lines, descHeight, height, contentPreview(node.description));
      }

      log.layout.card('  -> final height=%f', height);
      return height;
    }

    case NODE_TYPE.TABLE: {
      const style = theme.textStyles[TEXT_STYLE.BODY];
      const lineHeight = measurer.getStyleLineHeight(style);
      const rowHeight = lineHeight + theme.spacing.cellPadding * 2;
      const height = rowHeight * node.data.length;
      log.layout.table('HEIGHT table rows=%d lineHeight=%f cellPadding=%f rowHeight=%f -> %f',
        node.data.length, lineHeight, theme.spacing.cellPadding, rowHeight, height);
      return height;
    }

    case NODE_TYPE.IMAGE: {
      const height = node.maxHeight ?? 2.0;
      log.layout.height('HEIGHT image maxHeight=%s -> %f', node.maxHeight ?? 'default', height);
      return height;
    }

    case NODE_TYPE.LINE: {
      log.layout.height('HEIGHT line -> 0.02');
      return 0.02;
    }

    case NODE_TYPE.SLIDE_NUMBER: {
      const styleName = node.style ?? TEXT_STYLE.FOOTER;
      const style = theme.textStyles[styleName];
      const height = measurer.getStyleLineHeight(style);
      log.layout.height('HEIGHT slideNumber style=%s -> %f', styleName, height);
      return height;
    }

    case NODE_TYPE.DIAGRAM: {
      log.layout.height('HEIGHT diagram -> 2.5');
      return 2.5; // Diagrams typically need more vertical space
    }

    case NODE_TYPE.ROW: {
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = width - totalGap;
      const proportions = node.proportions ?? node.children.map(() => 1);
      const totalProp = proportions.reduce((a, b) => a + b, 0);

      log.layout.row('HEIGHT row children=%d gap=%f availableWidth=%f proportions=%o totalProp=%f',
        n, gap, availableWidth, proportions, totalProp);

      let maxHeight = 0;
      for (let i = 0; i < n; i++) {
        const childWidth = (proportions[i] / totalProp) * availableWidth;
        const childHeight = getNodeHeight(node.children[i], childWidth, theme, measurer);
        log.layout.row('  child[%d] prop=%f width=%f height=%f type=%s',
          i, proportions[i], childWidth, childHeight, node.children[i].type);
        maxHeight = Math.max(maxHeight, childHeight);
      }
      log.layout.row('  -> maxHeight=%f', maxHeight);
      return maxHeight;
    }

    case NODE_TYPE.COLUMN: {
      const gap = resolveGap(node.gap, theme);
      log.layout.column('HEIGHT column children=%d gap=%f width=%f',
        node.children.length, gap, width);
      let totalHeight = 0;
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) totalHeight += gap;
        const childHeight = getNodeHeight(node.children[i], width, theme, measurer);
        log.layout.column('  child[%d] height=%f type=%s',
          i, childHeight, node.children[i].type);
        totalHeight += childHeight;
      }
      log.layout.column('  -> totalHeight=%f', totalHeight);
      return totalHeight;
    }

    case NODE_TYPE.GROUP: {
      const gap = resolveGap(node.gap, theme);
      const cols = node.columns ?? node.children.length;
      const totalGap = gap * (cols - 1);
      const cellWidth = (width - totalGap) / cols;

      const rows = Math.ceil(node.children.length / cols);
      log.layout.group('HEIGHT group children=%d cols=%d rows=%d gap=%f cellWidth=%f',
        node.children.length, cols, rows, gap, cellWidth);

      let totalHeight = 0;
      for (let row = 0; row < rows; row++) {
        let rowMax = 0;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
            const h = getNodeHeight(node.children[idx], cellWidth, theme, measurer);
            rowMax = Math.max(rowMax, h);
          }
        }
        log.layout.group('  row[%d] maxHeight=%f', row, rowMax);
        if (row > 0) totalHeight += gap;
        totalHeight += rowMax;
      }
      log.layout.group('  -> totalHeight=%f', totalHeight);
      return totalHeight;
    }
  }
}

// ============================================
// LAYOUT COMPUTATION
// ============================================

export function computeLayout(
  node: ElementNode,
  bounds: Bounds,
  theme: Theme,
  measurer: TextMeasurer
): PositionedNode {
  const height = getNodeHeight(node, bounds.w, theme, measurer);

  log.layout._('LAYOUT %s bounds={x=%f y=%f w=%f h=%f} computedHeight=%f',
    node.type, bounds.x, bounds.y, bounds.w, bounds.h, height);

  switch (node.type) {
    case NODE_TYPE.TEXT:
    case NODE_TYPE.IMAGE:
    case NODE_TYPE.LINE:
    case NODE_TYPE.SLIDE_NUMBER:
    case NODE_TYPE.DIAGRAM:
    case NODE_TYPE.LIST:
    case NODE_TYPE.CARD:
    case NODE_TYPE.TABLE: {
      log.layout._('  -> positioned {x=%f y=%f w=%f h=%f}',
        bounds.x, bounds.y, bounds.w, height);
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height,
      };
    }

    case NODE_TYPE.ROW: {
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = bounds.w - totalGap;
      const proportions = node.proportions ?? node.children.map(() => 1);
      const totalProp = proportions.reduce((a, b) => a + b, 0);

      log.layout.row('LAYOUT row gap=%f availableWidth=%f proportions=%o vAlign=%s',
        gap, availableWidth, proportions, node.vAlign);

      const children: PositionedNode[] = [];
      let x = bounds.x;

      for (let i = 0; i < n; i++) {
        const childWidth = (proportions[i] / totalProp) * availableWidth;
        const childHeight = getNodeHeight(node.children[i], childWidth, theme, measurer);

        let y = bounds.y;
        if (node.vAlign === VALIGN.MIDDLE) {
          y = bounds.y + (height - childHeight) / 2;
        } else if (node.vAlign === VALIGN.BOTTOM) {
          y = bounds.y + height - childHeight;
        }

        log.layout.row('  child[%d] x=%f y=%f w=%f h=%f (vAlign adjust=%f)',
          i, x, y, childWidth, childHeight, y - bounds.y);

        const childBounds = new Bounds(x, y, childWidth, childHeight);
        children.push(computeLayout(node.children[i], childBounds, theme, measurer));
        x += childWidth + gap;
      }

      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height, children };
    }

    case NODE_TYPE.COLUMN: {
      const gap = resolveGap(node.gap, theme);
      const contentHeight = height;

      let y = bounds.y;
      if (node.justify === JUSTIFY.CENTER) {
        y = bounds.y + (bounds.h - contentHeight) / 2;
      } else if (node.justify === JUSTIFY.END) {
        y = bounds.y + bounds.h - contentHeight;
      }

      log.layout.column('LAYOUT column gap=%f contentHeight=%f justify=%s startY=%f (adjust=%f)',
        gap, contentHeight, node.justify, y, y - bounds.y);

      const children: PositionedNode[] = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childHeight = getNodeHeight(child, bounds.w, theme, measurer);
        log.layout.column('  child[%d] y=%f h=%f type=%s', i, y, childHeight, child.type);
        const childBounds = new Bounds(bounds.x, y, bounds.w, childHeight);
        children.push(computeLayout(child, childBounds, theme, measurer));
        y += childHeight + gap;
      }

      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h, children };
    }

    case NODE_TYPE.GROUP: {
      const gap = resolveGap(node.gap, theme);
      const cols = node.columns ?? node.children.length;
      const totalGap = gap * (cols - 1);
      const cellWidth = (bounds.w - totalGap) / cols;

      const children: PositionedNode[] = [];
      const rows = Math.ceil(node.children.length / cols);

      log.layout.group('LAYOUT group cols=%d rows=%d gap=%f cellWidth=%f',
        cols, rows, gap, cellWidth);

      let y = bounds.y;
      for (let row = 0; row < rows; row++) {
        let rowMax = 0;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
            const h = getNodeHeight(node.children[idx], cellWidth, theme, measurer);
            rowMax = Math.max(rowMax, h);
          }
        }

        log.layout.group('  row[%d] y=%f rowMax=%f', row, y, rowMax);

        let x = bounds.x;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
            log.layout.group('    cell[%d,%d] x=%f y=%f w=%f h=%f',
              row, col, x, y, cellWidth, rowMax);
            const childBounds = new Bounds(x, y, cellWidth, rowMax);
            children.push(computeLayout(node.children[idx], childBounds, theme, measurer));
          }
          x += cellWidth + gap;
        }

        y += rowMax + gap;
      }

      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height, children };
    }
  }
}
