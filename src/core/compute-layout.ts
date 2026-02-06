// Declarative Layout Computation
// Computes positions and sizes for all nodes in the tree

import { NODE_TYPE, type ElementNode, type PositionedNode } from './nodes.js';
import type { Theme } from './types.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import { Bounds } from './bounds.js';
import { TEXT_STYLE, VALIGN, JUSTIFY } from './types.js';
import { toTextContent, resolveGap } from '../utils/node-utils.js';

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
      return lineHeight * lines;
    }

    case NODE_TYPE.LIST: {
      const styleName = node.style ?? TEXT_STYLE.BODY;
      const style = theme.textStyles[styleName];
      const lineHeight = measurer.getStyleLineHeight(style);
      const bulletSpacing = theme.spacing.bulletSpacing;
      let totalHeight = 0;
      const indentedWidth = width - theme.spacing.gap;
      for (const item of node.items) {
        const lines = measurer.estimateLines(toTextContent(item), style, indentedWidth);
        totalHeight += lineHeight * lines * bulletSpacing;
      }
      return totalHeight;
    }

    case NODE_TYPE.CARD: {
      const innerWidth = width - theme.spacing.padding * 2;
      let height = theme.spacing.padding * 2;

      if (node.image || node.icon) {
        height += 1.5 + theme.spacing.gapTight;
      }

      if (node.title) {
        const style = theme.textStyles[TEXT_STYLE.H4];
        const lineHeight = measurer.getStyleLineHeight(style);
        const lines = measurer.estimateLines(node.title, style, innerWidth);
        height += lineHeight * lines;
      }

      if (node.title && node.description) {
        height += theme.spacing.gapTight;
      }

      if (node.description) {
        const style = theme.textStyles[TEXT_STYLE.BODY];
        const lineHeight = measurer.getStyleLineHeight(style);
        const lines = measurer.estimateLines(node.description, style, innerWidth);
        height += lineHeight * lines;
      }

      return height;
    }

    case NODE_TYPE.TABLE: {
      const style = theme.textStyles[TEXT_STYLE.BODY];
      const lineHeight = measurer.getStyleLineHeight(style);
      const rowHeight = lineHeight + theme.spacing.cellPadding * 2;
      return rowHeight * node.data.length;
    }

    case NODE_TYPE.IMAGE: {
      return node.maxHeight ?? 2.0;
    }

    case NODE_TYPE.LINE: {
      return 0.02;
    }

    case NODE_TYPE.SLIDE_NUMBER: {
      const styleName = node.style ?? TEXT_STYLE.FOOTER;
      const style = theme.textStyles[styleName];
      return measurer.getStyleLineHeight(style);
    }

    case NODE_TYPE.DIAGRAM: {
      return 2.5; // Diagrams typically need more vertical space
    }

    case NODE_TYPE.ROW: {
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = width - totalGap;
      const proportions = node.proportions ?? node.children.map(() => 1);
      const totalProp = proportions.reduce((a, b) => a + b, 0);

      let maxHeight = 0;
      for (let i = 0; i < n; i++) {
        const childWidth = (proportions[i] / totalProp) * availableWidth;
        const childHeight = getNodeHeight(node.children[i], childWidth, theme, measurer);
        maxHeight = Math.max(maxHeight, childHeight);
      }
      return maxHeight;
    }

    case NODE_TYPE.COLUMN: {
      const gap = resolveGap(node.gap, theme);
      let totalHeight = 0;
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) totalHeight += gap;
        totalHeight += getNodeHeight(node.children[i], width, theme, measurer);
      }
      return totalHeight;
    }

    case NODE_TYPE.GROUP: {
      const gap = resolveGap(node.gap, theme);
      const cols = node.columns ?? node.children.length;
      const totalGap = gap * (cols - 1);
      const cellWidth = (width - totalGap) / cols;

      const rows = Math.ceil(node.children.length / cols);
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
        if (row > 0) totalHeight += gap;
        totalHeight += rowMax;
      }
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

  switch (node.type) {
    case NODE_TYPE.TEXT:
    case NODE_TYPE.IMAGE:
    case NODE_TYPE.LINE:
    case NODE_TYPE.SLIDE_NUMBER:
    case NODE_TYPE.DIAGRAM:
    case NODE_TYPE.LIST:
    case NODE_TYPE.CARD:
    case NODE_TYPE.TABLE: {
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

      const children: PositionedNode[] = [];
      for (const child of node.children) {
        const childHeight = getNodeHeight(child, bounds.w, theme, measurer);
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

        let x = bounds.x;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
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
