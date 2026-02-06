// Declarative Layout Computation
// Computes positions and sizes for all nodes in the tree

import { NODE_TYPE, type ElementNode, type PositionedNode, type ImageNode } from './nodes.js';
import type { Theme, Direction } from './types.js';
import { type LayoutOptions, checkOverflow } from './errors.js';
import type { TextMeasurer } from '../utils/text-measurer.js';
import { Bounds } from './bounds.js';
import { TEXT_STYLE, VALIGN, HALIGN, SIZE, DIRECTION } from './types.js';
import { resolveGap } from '../utils/node-utils.js';
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

    case NODE_TYPE.RECTANGLE: {
      // Rectangle is a pure visual shape - no intrinsic height, fills bounds
      log.layout.height('HEIGHT rectangle -> 0 (fills bounds)');
      return 0;
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

      // Account for padding
      const padding = node.padding ?? 0;
      const innerWidth = width - padding * 2;

      // Otherwise, compute intrinsic height from children
      const gap = resolveGap(node.gap, theme);
      log.layout.column('HEIGHT column children=%d gap=%f width=%f padding=%f',
        node.children.length, gap, width, padding);

      let totalHeight = padding * 2; // Start with top + bottom padding
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) totalHeight += gap;
        const childHeight = getNodeHeight(node.children[i], innerWidth, theme, measurer);
        log.layout.column('  child[%d] height=%f type=%s',
          i, childHeight, node.children[i].type);
        totalHeight += childHeight;
      }
      log.layout.column('  -> totalHeight=%f', totalHeight);
      return totalHeight;
    }

    case NODE_TYPE.STACK: {
      // Stack height is max of children heights (they overlap at same position)
      let maxHeight = 0;
      for (const child of node.children) {
        const h = getNodeHeight(child, width, theme, measurer);
        maxHeight = Math.max(maxHeight, h);
      }
      log.layout._('HEIGHT stack children=%d -> %f', node.children.length, maxHeight);
      return maxHeight;
    }
  }
}

// ============================================
// MINIMUM HEIGHT COMPUTATION
// ============================================

/**
 * Compute the minimum height a node can be compressed to.
 * - Text, Line, SlideNumber: incompressible (returns intrinsic height)
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
    case NODE_TYPE.LINE:
    case NODE_TYPE.SLIDE_NUMBER:
      return getNodeHeight(node, width, theme, measurer);

    // Fully compressible - images can shrink to nothing
    case NODE_TYPE.IMAGE:
    case NODE_TYPE.DIAGRAM:
      return 0;

    case NODE_TYPE.RECTANGLE: {
      // Rectangle is a pure visual shape - no minimum height
      return 0;
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

      // Account for padding
      const padding = node.padding ?? 0;
      const innerWidth = width - padding * 2;

      const gap = resolveGap(node.gap, theme);
      let minHeight = padding * 2; // Start with top + bottom padding
      for (let i = 0; i < node.children.length; i++) {
        if (i > 0) minHeight += gap;
        minHeight += getMinNodeHeight(node.children[i], innerWidth, theme, measurer);
      }
      return minHeight;
    }

    case NODE_TYPE.STACK: {
      // Stack min height is max of children min heights (they overlap)
      let maxMinHeight = 0;
      for (const child of node.children) {
        maxMinHeight = Math.max(maxMinHeight, getMinNodeHeight(child, width, theme, measurer));
      }
      return maxMinHeight;
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
  measurer: TextMeasurer,
  parentDirection?: Direction,
  options?: LayoutOptions
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
    case NODE_TYPE.SLIDE_NUMBER: {
      // Check for overflow if strict mode enabled
      checkOverflow(node.type, height, bounds.h, bounds.x, bounds.y, options);
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

    case NODE_TYPE.LINE: {
      // Context-aware line: orientation depends on parent container
      // In Row: vertical line (width = stroke, height = row height)
      // In Column (or default): horizontal line (width = column width, height = stroke)
      const strokeHeight = ptToIn(theme.borders.width);

      if (parentDirection === DIRECTION.ROW) {
        // Vertical line in Row - spans row height
        const lineHeight = bounds.h > 0 ? bounds.h : strokeHeight;
        log.layout._('  -> positioned vertical line {x=%f y=%f w=%f h=%f}',
          bounds.x, bounds.y, strokeHeight, lineHeight);
        return {
          node,
          x: bounds.x,
          y: bounds.y,
          width: strokeHeight,
          height: lineHeight,
        };
      } else {
        // Horizontal line in Column (default) - spans column width
        log.layout._('  -> positioned horizontal line {x=%f y=%f w=%f h=%f}',
          bounds.x, bounds.y, bounds.w, strokeHeight);
        return {
          node,
          x: bounds.x,
          y: bounds.y,
          width: bounds.w,
          height: strokeHeight,
        };
      }
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

    case NODE_TYPE.RECTANGLE: {
      // Rectangle is a pure visual shape - just fills its bounds
      const rectHeight = bounds.h > 0 ? bounds.h : 0;

      log.layout._('LAYOUT rectangle {x=%f y=%f w=%f h=%f}',
        bounds.x, bounds.y, bounds.w, rectHeight);

      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: rectHeight,
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
        // Pass DIRECTION.ROW so lines know to render vertically
        const childBounds = new Bounds(x, y, childWidth, rowHeight);
        children.push(computeLayout(node.children[i], childBounds, theme, measurer, DIRECTION.ROW, options));
        x += childWidth + gap;
      }

      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: rowHeight, children };
    }

    case NODE_TYPE.COLUMN: {
      // Account for padding
      const padding = node.padding ?? 0;
      const innerX = bounds.x + padding;
      const innerY = bounds.y + padding;
      const innerW = bounds.w - padding * 2;
      const innerH = bounds.h > 0 ? bounds.h - padding * 2 : 0;

      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);
      const availableHeight = innerH > 0 ? innerH - totalGap : Infinity;

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
        const h = getNodeHeight(child, innerW, theme, measurer);
        const minH = getMinNodeHeight(child, innerW, theme, measurer);
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
        log.layout.column('  COMPRESSED: %f -> %f (innerH=%f)', totalIntrinsic + totalGap, totalFitted + totalGap, innerH);
      }

      if (fillIndex !== -1) {
        const nonFillHeight = childHeights.reduce((a, b) => a + b, 0) - childHeights[fillIndex];
        log.layout.column('  child[%d] fill resolved to height=%f (innerH=%f - gap=%f - nonFill=%f)',
          fillIndex, childHeights[fillIndex], innerH, totalGap, nonFillHeight);
      }

      // Calculate content height for justify positioning
      const contentHeight = childHeights.reduce((a, b) => a + b, 0) + totalGap;

      let y = innerY;
      if (node.vAlign === VALIGN.MIDDLE) {
        y = innerY + (innerH - contentHeight) / 2;
      } else if (node.vAlign === VALIGN.BOTTOM) {
        y = innerY + innerH - contentHeight;
      }

      log.layout.column('LAYOUT column gap=%f contentHeight=%f vAlign=%s startY=%f padding=%f',
        gap, contentHeight, node.vAlign, y, padding);

      const children: PositionedNode[] = [];
      for (let i = 0; i < n; i++) {
        const childHeight = childHeights[i];
        const child = node.children[i];

        // Calculate child x position based on hAlign
        let childX = innerX;
        let childWidth = innerW;

        // For hAlign CENTER/RIGHT, calculate intrinsic width for images
        if (node.hAlign && node.hAlign !== HALIGN.LEFT && child.type === NODE_TYPE.IMAGE) {
          const intrinsicWidth = getIntrinsicWidth(child, childHeight, { theme, measurer });
          if (intrinsicWidth < innerW) {
            childWidth = intrinsicWidth;
            if (node.hAlign === HALIGN.CENTER) {
              childX = innerX + (innerW - intrinsicWidth) / 2;
            } else if (node.hAlign === HALIGN.RIGHT) {
              childX = innerX + innerW - intrinsicWidth;
            }
          }
        }

        log.layout.column('  child[%d] x=%f y=%f w=%f h=%f type=%s', i, childX, y, childWidth, childHeight, child.type);
        const childBounds = new Bounds(childX, y, childWidth, childHeight);
        // Pass DIRECTION.COLUMN so lines know to render horizontally
        children.push(computeLayout(child, childBounds, theme, measurer, DIRECTION.COLUMN, options));
        y += childHeight + gap;
      }

      return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h, children };
    }

    case NODE_TYPE.STACK: {
      // Stack: all children occupy the same bounds, rendered in order (z-order)
      // Child [0] is rendered first (back), child [n-1] is rendered last (front)
      const stackHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

      log.layout._('LAYOUT stack children=%d bounds={x=%f y=%f w=%f h=%f}',
        node.children.length, bounds.x, bounds.y, bounds.w, stackHeight);

      const children: PositionedNode[] = [];
      for (const child of node.children) {
        // All children get the SAME bounds
        const childBounds = new Bounds(bounds.x, bounds.y, bounds.w, stackHeight);
        children.push(computeLayout(child, childBounds, theme, measurer, undefined, options));
      }

      return {
        node,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: stackHeight,
        children,
      };
    }
  }
}
