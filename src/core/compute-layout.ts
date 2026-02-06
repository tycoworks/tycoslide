// Declarative Layout Computation
// Computes positions and sizes for all nodes in the tree

import { NODE_TYPE, type ElementNode, type PositionedNode, type CardNode, type ImageNode, type RowNode, type ColumnNode, type BoxNode } from './nodes.js';
import type { Theme } from './types.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import { Bounds } from './bounds.js';
import { TEXT_STYLE, VALIGN, JUSTIFY, SIZE } from './types.js';
import { toTextContent, resolveGap } from '../utils/node-utils.js';
import { log, contentPreview } from '../utils/log.js';
import { ptToIn } from '../utils/font-utils.js';
import { distributeFlexSpace, type FlexChild, getIntrinsicWidth } from './layout/index.js';
import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

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
      // Card is a container - layout children like Column but with padding
      const padding = node.padding ?? theme.spacing.padding;
      const innerWidth = width - padding * 2;
      const gap = resolveGap(node.gap ?? 'tight', theme);

      log.layout.card('HEIGHT card children=%d width=%f innerWidth=%f padding=%f gap=%f',
        node.children.length, width, innerWidth, padding, gap);

      let contentHeight = 0;
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) contentHeight += gap;
        const childHeight = getNodeHeight(node.children[i], innerWidth, theme, measurer);
        log.layout.card('  child[%d] height=%f type=%s', i, childHeight, node.children[i].type);
        contentHeight += childHeight;
      }

      const height = contentHeight + padding * 2;
      log.layout.card('  -> contentHeight=%f + padding*2=%f -> height=%f',
        contentHeight, padding * 2, height);
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
      // Read actual image dimensions and calculate height preserving aspect ratio
      // Image fills available width, height determined by aspect ratio
      // Constrained by DPI limit to prevent upscaling beyond native resolution
      const dimensions = imageSize(node.src);
      if (!dimensions.width || !dimensions.height) {
        throw new Error(`Cannot determine dimensions of image: ${node.src}`);
      }
      const pixelWidth = dimensions.width;
      const pixelHeight = dimensions.height;
      const aspectRatio = pixelWidth / pixelHeight;
      const maxHeightFromDPI = pixelHeight / theme.spacing.minDisplayDPI;
      const naturalHeight = width / aspectRatio;
      const height = Math.min(naturalHeight, maxHeightFromDPI);
      log.layout.height('HEIGHT image %dx%d ar=%f -> %f', pixelWidth, pixelHeight, aspectRatio, height);
      return height;
    }

    case NODE_TYPE.LINE: {
      // Line height is minimal - just enough to be visible (border width in inches)
      const height = ptToIn(theme.borders.width);
      log.layout.height('HEIGHT line -> %f', height);
      return height;
    }

    case NODE_TYPE.SLIDE_NUMBER: {
      const styleName = node.style ?? TEXT_STYLE.FOOTER;
      const style = theme.textStyles[styleName];
      const height = measurer.getStyleLineHeight(style);
      log.layout.height('HEIGHT slideNumber style=%s -> %f', styleName, height);
      return height;
    }

    case NODE_TYPE.DIAGRAM: {
      // Diagrams are rendered externally - height cannot be computed at layout time
      // Return 0; computeLayout will use bounds.h instead
      log.layout.height('HEIGHT diagram -> 0 (will use bounds)');
      return 0;
    }

    case NODE_TYPE.BOX: {
      // If box has explicit height, use it
      if (typeof node.height === 'number') {
        log.layout.height('HEIGHT box explicit height=%f', node.height);
        return node.height;
      }
      // SIZE.FILL boxes take remaining space from parent
      if (node.height === SIZE.FILL) {
        log.layout.height('HEIGHT box fill -> 0 (will use bounds)');
        return 0;
      }

      // Compute from child + padding
      const padding = node.padding ?? 0;
      const innerWidth = width - padding * 2;
      const childHeight = node.child ? getNodeHeight(node.child, innerWidth, theme, measurer) : 0;
      const height = childHeight + padding * 2;
      log.layout.height('HEIGHT box padding=%f childHeight=%f -> %f', padding, childHeight, height);
      return height;
    }

    case NODE_TYPE.ROW: {
      // If row has explicit height, use it (constrains cross-axis)
      if (typeof node.height === 'number') {
        log.layout.row('HEIGHT row explicit height=%f', node.height);
        return node.height;
      }

      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = width - totalGap;

      log.layout.row('HEIGHT row children=%d gap=%f availableWidth=%f', n, gap, availableWidth);

      // Build FlexChild array for width distribution
      const flexChildren: FlexChild[] = node.children.map((child) => {
        if (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) {
          if (child.width === SIZE.FILL) {
            return { fillsRemaining: true };
          } else if (typeof child.width === 'number') {
            return { fixedSize: child.width };
          }
        }
        return {}; // Flex child - shares remaining equally
      });

      const { sizes: childWidths } = distributeFlexSpace(flexChildren, availableWidth);

      // Calculate max height
      let maxHeight = 0;
      for (let i = 0; i < n; i++) {
        const childHeight = getNodeHeight(node.children[i], childWidths[i], theme, measurer);
        log.layout.row('  child[%d] width=%f height=%f type=%s',
          i, childWidths[i], childHeight, node.children[i].type);
        maxHeight = Math.max(maxHeight, childHeight);
      }
      log.layout.row('  -> maxHeight=%f', maxHeight);
      return maxHeight;
    }

    case NODE_TYPE.COLUMN: {
      // If column has explicit height, use it
      if (typeof node.height === 'number') {
        log.layout.column('HEIGHT column explicit height=%f', node.height);
        return node.height;
      }

      // If column has height: SIZE.FILL, it takes remaining space from parent
      // Return 0 as sentinel - computeLayout will use bounds.h
      if (node.height === SIZE.FILL) {
        log.layout.column('HEIGHT column fill -> 0 (will use bounds)');
        return 0;
      }

      // Otherwise, compute intrinsic height from children
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
// MINIMUM HEIGHT COMPUTATION
// ============================================

/**
 * Compute the minimum height a node can be compressed to.
 * - Text, List, Table, Line, SlideNumber: incompressible (returns intrinsic height)
 * - Image, Diagram: fully compressible (returns 0)
 * - Containers: sum/max of children's min heights
 */
export function getMinNodeHeight(
  node: ElementNode,
  width: number,
  theme: Theme,
  measurer: TextMeasurer
): number {
  switch (node.type) {
    // Incompressible content - must show all text
    case NODE_TYPE.TEXT:
    case NODE_TYPE.LIST:
    case NODE_TYPE.TABLE:
    case NODE_TYPE.LINE:
    case NODE_TYPE.SLIDE_NUMBER:
      return getNodeHeight(node, width, theme, measurer);

    // Fully compressible - images can shrink to nothing
    case NODE_TYPE.IMAGE:
    case NODE_TYPE.DIAGRAM:
      return 0;

    case NODE_TYPE.CARD: {
      const padding = node.padding ?? theme.spacing.padding;
      const innerWidth = width - padding * 2;
      const gap = resolveGap(node.gap ?? 'tight', theme);

      let minContentHeight = 0;
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) minContentHeight += gap;
        minContentHeight += getMinNodeHeight(node.children[i], innerWidth, theme, measurer);
      }
      return minContentHeight + padding * 2;
    }

    case NODE_TYPE.BOX: {
      // If box has explicit height, that's the minimum
      if (typeof node.height === 'number') {
        return node.height;
      }
      // SIZE.FILL boxes can shrink to 0
      if (node.height === SIZE.FILL) {
        return 0;
      }

      const padding = node.padding ?? 0;
      const innerWidth = width - padding * 2;
      const minChildHeight = node.child ? getMinNodeHeight(node.child, innerWidth, theme, measurer) : 0;
      return minChildHeight + padding * 2;
    }

    case NODE_TYPE.ROW: {
      // If row has explicit height, that's also the minimum
      if (typeof node.height === 'number') {
        return node.height;
      }

      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = width - totalGap;

      // Simplified: equal width distribution for min height calc
      const childWidth = availableWidth / n;
      let maxMinHeight = 0;
      for (const child of node.children) {
        maxMinHeight = Math.max(maxMinHeight, getMinNodeHeight(child, childWidth, theme, measurer));
      }
      return maxMinHeight;
    }

    case NODE_TYPE.COLUMN: {
      // If column has explicit height, that's the minimum
      if (typeof node.height === 'number') {
        return node.height;
      }
      // SIZE.FILL columns can shrink to 0
      if (node.height === SIZE.FILL) {
        return 0;
      }

      const gap = resolveGap(node.gap, theme);
      let minHeight = 0;
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) minHeight += gap;
        minHeight += getMinNodeHeight(node.children[i], width, theme, measurer);
      }
      return minHeight;
    }

    case NODE_TYPE.GROUP: {
      const gap = resolveGap(node.gap, theme);
      const cols = node.columns ?? node.children.length;
      const totalGap = gap * (cols - 1);
      const cellWidth = (width - totalGap) / cols;
      const rows = Math.ceil(node.children.length / cols);

      let minHeight = 0;
      for (let row = 0; row < rows; row++) {
        let rowMax = 0;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
            rowMax = Math.max(rowMax, getMinNodeHeight(node.children[idx], cellWidth, theme, measurer));
          }
        }
        if (row > 0) minHeight += gap;
        minHeight += rowMax;
      }
      return minHeight;
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
  // Diagram height cannot be computed - use bounds height (container determines size)
  if (node.type === NODE_TYPE.DIAGRAM) {
    log.layout._('LAYOUT diagram bounds={x=%f y=%f w=%f h=%f} (using bounds height)',
      bounds.x, bounds.y, bounds.w, bounds.h);
    return {
      node,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: bounds.h,
    };
  }

  const height = getNodeHeight(node, bounds.w, theme, measurer);

  log.layout._('LAYOUT %s bounds={x=%f y=%f w=%f h=%f} computedHeight=%f',
    node.type, bounds.x, bounds.y, bounds.w, bounds.h, height);

  switch (node.type) {
    case NODE_TYPE.TEXT:
    case NODE_TYPE.LINE:
    case NODE_TYPE.SLIDE_NUMBER:
    case NODE_TYPE.TABLE: {
      // Constrain height to bounds.h if overflow (content will clip)
      const constrainedHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;
      log.layout._('  -> positioned {x=%f y=%f w=%f h=%f}%s',
        bounds.x, bounds.y, bounds.w, constrainedHeight,
        constrainedHeight < height ? ' (clipped)' : '');
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: constrainedHeight,
      };
    }

    case NODE_TYPE.IMAGE: {
      // Image must fit within bounds while preserving aspect ratio
      // Constrain to BOTH bounds.w AND bounds.h
      const imgNode = node as ImageNode;
      const dimensions = imageSize(imgNode.src);
      const aspectRatio = dimensions.width! / dimensions.height!;

      // Start with intrinsic height (from getNodeHeight, already DPI-constrained)
      // Then also constrain to bounds.h if bounds has a meaningful height
      const constrainedHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

      // Calculate width from constrained height
      const widthFromHeight = constrainedHeight * aspectRatio;

      // Final dimensions: fit within both width and height constraints
      let finalWidth = Math.min(widthFromHeight, bounds.w);
      let finalHeight = finalWidth / aspectRatio;

      // If height constraint was the limiting factor, use that
      if (constrainedHeight < height && widthFromHeight <= bounds.w) {
        finalHeight = constrainedHeight;
        finalWidth = widthFromHeight;
      }

      log.layout._('  -> positioned image {x=%f y=%f w=%f h=%f} (ar=%f, bounds.h=%f)',
        bounds.x, bounds.y, finalWidth, finalHeight, aspectRatio, bounds.h);
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: finalWidth,
        height: finalHeight,
      };
    }

    case NODE_TYPE.LIST: {
      // List is a simple positioned node - render.ts handles item layout
      // Constrain height to bounds.h if overflow (content will clip)
      const constrainedHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;
      log.layout._('  -> positioned list {x=%f y=%f w=%f h=%f}%s',
        bounds.x, bounds.y, bounds.w, constrainedHeight,
        constrainedHeight < height ? ' (clipped)' : '');
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: constrainedHeight,
      };
    }

    case NODE_TYPE.CARD: {
      // Card is a container - layout children like Column but with padding
      // Uses proportional compression when content overflows
      const cardNode = node as CardNode;
      const padding = cardNode.padding ?? theme.spacing.padding;
      const innerWidth = bounds.w - padding * 2;
      const innerHeight = bounds.h > 0 ? bounds.h - padding * 2 : 0;
      const gap = resolveGap(cardNode.gap ?? 'tight', theme);
      const n = cardNode.children.length;

      log.layout.card('LAYOUT card children=%d padding=%f innerWidth=%f innerHeight=%f gap=%f',
        n, padding, innerWidth, innerHeight, gap);

      // Build FlexChild array with compression support
      const totalGap = gap * (n - 1);
      const availableHeight = innerHeight > 0 ? innerHeight - totalGap : Infinity;
      const flexChildren: FlexChild[] = cardNode.children.map((child, i) => {
        const h = getNodeHeight(child, innerWidth, theme, measurer);
        const minH = getMinNodeHeight(child, innerWidth, theme, measurer);
        log.layout.card('  child[%d] intrinsic=%f min=%f type=%s', i, h, minH, child.type);
        return { intrinsicSize: h, minSize: minH };
      });

      // Use proportional compression if content overflows
      const { sizes: childHeights, wasCompressed } = distributeFlexSpace(flexChildren, availableHeight);
      if (wasCompressed) {
        const totalIntrinsic = flexChildren.reduce((sum, c) => sum + (c.intrinsicSize ?? 0), 0);
        const totalFitted = childHeights.reduce((a, b) => a + b, 0);
        log.layout.card('  COMPRESSED: %f -> %f (innerHeight=%f)', totalIntrinsic, totalFitted, innerHeight);
      }

      // Layout children with fitted heights
      const children: PositionedNode[] = [];
      let y = bounds.y + padding;

      for (let i = 0; i < n; i++) {
        const childHeight = childHeights[i];
        log.layout.card('  child[%d] y=%f h=%f type=%s', i, y, childHeight, cardNode.children[i].type);

        const childBounds = new Bounds(bounds.x + padding, y, innerWidth, childHeight);
        children.push(computeLayout(cardNode.children[i], childBounds, theme, measurer));
        y += childHeight + gap;
      }

      // Use constrained height if bounds.h is meaningful
      const cardHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

      log.layout._('  -> positioned card {x=%f y=%f w=%f h=%f} with %d children',
        bounds.x, bounds.y, bounds.w, cardHeight, children.length);
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: cardHeight,
        children,
      };
    }

    case NODE_TYPE.BOX: {
      // Box is a visual container with optional padding and single child
      const boxNode = node as BoxNode;
      const padding = boxNode.padding ?? 0;
      const innerWidth = bounds.w - padding * 2;
      const innerHeight = bounds.h > 0 ? bounds.h - padding * 2 : 0;

      log.layout._('LAYOUT box padding=%f innerWidth=%f innerHeight=%f', padding, innerWidth, innerHeight);

      // Layout child if present
      let children: PositionedNode[] | undefined;
      if (boxNode.child) {
        const childHeight = innerHeight > 0
          ? innerHeight
          : getNodeHeight(boxNode.child, innerWidth, theme, measurer);
        const childBounds = new Bounds(bounds.x + padding, bounds.y + padding, innerWidth, childHeight);
        children = [computeLayout(boxNode.child, childBounds, theme, measurer)];
      }

      // Use constrained height if bounds.h is meaningful
      const boxHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

      log.layout._('  -> positioned box {x=%f y=%f w=%f h=%f}%s',
        bounds.x, bounds.y, bounds.w, boxHeight,
        children ? ' with child' : '');
      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: boxHeight,
        children,
      };
    }

    case NODE_TYPE.ROW: {
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableWidth = bounds.w - totalGap;

      // Calculate row height first (needed for intrinsic width calculation)
      const rowHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

      // Check if there's a fill child (need to know for intrinsic width calc)
      const hasFillChild = node.children.some((child) =>
        (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) &&
        child.width === SIZE.FILL
      );

      // Build FlexChild array for width distribution
      const flexChildren: FlexChild[] = node.children.map((child) => {
        if (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) {
          if (child.width === SIZE.FILL) {
            return { fillsRemaining: true };
          } else if (typeof child.width === 'number') {
            return { fixedSize: child.width };
          }
        }
        // Flex child - if there's a fill sibling, calculate intrinsic width
        if (hasFillChild) {
          return { intrinsicSize: getIntrinsicWidth(child, rowHeight, { theme, measurer }) };
        }
        return {}; // Shares remaining equally
      });

      const { sizes: childWidths } = distributeFlexSpace(flexChildren, availableWidth);

      log.layout.row('LAYOUT row gap=%f availableWidth=%f vAlign=%s rowHeight=%f (bounds.h=%f)',
        gap, availableWidth, node.vAlign, rowHeight, bounds.h);

      const children: PositionedNode[] = [];
      let x = bounds.x;

      for (let i = 0; i < n; i++) {
        const childWidth = childWidths[i];
        // Pass bounds.h to children so they can constrain themselves
        // Calculate intrinsic height for vAlign positioning only
        const childIntrinsicHeight = getNodeHeight(node.children[i], childWidth, theme, measurer);

        let y = bounds.y;
        if (node.vAlign === VALIGN.MIDDLE) {
          const effectiveChildHeight = Math.min(childIntrinsicHeight, rowHeight);
          y = bounds.y + (rowHeight - effectiveChildHeight) / 2;
        } else if (node.vAlign === VALIGN.BOTTOM) {
          const effectiveChildHeight = Math.min(childIntrinsicHeight, rowHeight);
          y = bounds.y + rowHeight - effectiveChildHeight;
        }

        log.layout.row('  child[%d] x=%f y=%f w=%f h=%f (constraint bounds.h=%f)',
          i, x, y, childWidth, rowHeight, bounds.h);

        // Pass rowHeight as the height constraint to children
        const childBounds = new Bounds(x, y, childWidth, rowHeight);
        children.push(computeLayout(node.children[i], childBounds, theme, measurer));
        x += childWidth + gap;
      }

      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: rowHeight, children };
    }

    case NODE_TYPE.COLUMN: {
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableHeight = bounds.h > 0 ? bounds.h - totalGap : Infinity;

      // Build FlexChild array for height distribution with compression support
      const flexChildren: FlexChild[] = node.children.map((child, i) => {
        if (child.type === NODE_TYPE.COLUMN) {
          if (child.height === SIZE.FILL) {
            log.layout.column('  child[%d] fill (deferred)', i);
            return { fillsRemaining: true };
          } else if (typeof child.height === 'number') {
            log.layout.column('  child[%d] explicit height=%f', i, child.height);
            return { fixedSize: child.height };
          }
        }
        // Intrinsic child with compression support
        const h = getNodeHeight(child, bounds.w, theme, measurer);
        const minH = getMinNodeHeight(child, bounds.w, theme, measurer);
        log.layout.column('  child[%d] intrinsic height=%f minHeight=%f type=%s', i, h, minH, child.type);
        return { intrinsicSize: h, minSize: minH };
      });

      // Distribute height using unified algorithm with compression
      const { sizes: childHeights, fillIndex, wasCompressed } = distributeFlexSpace(
        flexChildren,
        availableHeight
      );

      if (wasCompressed) {
        const totalIntrinsic = flexChildren.reduce((sum, c) => sum + (c.intrinsicSize ?? c.fixedSize ?? 0), 0);
        const totalFitted = childHeights.reduce((a, b) => a + b, 0);
        log.layout.column('  COMPRESSED: %f -> %f (bounds.h=%f)', totalIntrinsic + totalGap, totalFitted + totalGap, bounds.h);
      }

      if (fillIndex !== -1) {
        const nonFillHeight = childHeights.reduce((a, b) => a + b, 0) - childHeights[fillIndex];
        log.layout.column('  child[%d] fill resolved to height=%f (bounds.h=%f - gap=%f - nonFill=%f)',
          fillIndex, childHeights[fillIndex], bounds.h, totalGap, nonFillHeight);
      }

      // Calculate content height for justify positioning
      const contentHeight = childHeights.reduce((a, b) => a + b, 0) + totalGap;

      let y = bounds.y;
      if (node.justify === JUSTIFY.CENTER) {
        y = bounds.y + (bounds.h - contentHeight) / 2;
      } else if (node.justify === JUSTIFY.END) {
        y = bounds.y + bounds.h - contentHeight;
      }

      log.layout.column('LAYOUT column gap=%f contentHeight=%f justify=%s startY=%f (adjust=%f)',
        gap, contentHeight, node.justify, y, y - bounds.y);

      const children: PositionedNode[] = [];
      for (let i = 0; i < n; i++) {
        const childHeight = childHeights[i];
        log.layout.column('  child[%d] y=%f h=%f type=%s', i, y, childHeight, node.children[i].type);
        const childBounds = new Bounds(bounds.x, y, bounds.w, childHeight);
        children.push(computeLayout(node.children[i], childBounds, theme, measurer));
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
      const numRows = Math.ceil(node.children.length / cols);

      log.layout.group('LAYOUT group cols=%d rows=%d gap=%f cellWidth=%f',
        cols, numRows, gap, cellWidth);

      // First pass: calculate intrinsic and min heights for each row
      const rowFlexChildren: FlexChild[] = [];
      for (let row = 0; row < numRows; row++) {
        let rowMaxIntrinsic = 0;
        let rowMaxMin = 0;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
            const h = getNodeHeight(node.children[idx], cellWidth, theme, measurer);
            const minH = getMinNodeHeight(node.children[idx], cellWidth, theme, measurer);
            rowMaxIntrinsic = Math.max(rowMaxIntrinsic, h);
            rowMaxMin = Math.max(rowMaxMin, minH);
          }
        }
        rowFlexChildren.push({ intrinsicSize: rowMaxIntrinsic, minSize: rowMaxMin });
      }

      // Apply compression if content overflows bounds.h
      const rowGapTotal = gap * (numRows - 1);
      const availableRowHeight = bounds.h > 0 ? bounds.h - rowGapTotal : Infinity;
      const { sizes: rowHeights } = distributeFlexSpace(rowFlexChildren, availableRowHeight);

      // Second pass: layout children with fitted row heights
      let y = bounds.y;
      for (let row = 0; row < numRows; row++) {
        const rowHeight = rowHeights[row];
        log.layout.group('  row[%d] y=%f rowHeight=%f', row, y, rowHeight);

        let x = bounds.x;
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (idx < node.children.length) {
            log.layout.group('    cell[%d,%d] x=%f y=%f w=%f h=%f',
              row, col, x, y, cellWidth, rowHeight);
            const childBounds = new Bounds(x, y, cellWidth, rowHeight);
            children.push(computeLayout(node.children[idx], childBounds, theme, measurer));
          }
          x += cellWidth + gap;
        }

        y += rowHeight + gap;
      }

      // Constrain total height to bounds.h
      const groupHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;
      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: groupHeight, children };
    }
  }
}
