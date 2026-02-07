// CONTAINER Node Handlers (ROW, COLUMN, STACK)
// Unified flex container logic with parameterized axis

import {
  NODE_TYPE,
  type ElementNode,
  type RowNode,
  type ColumnNode,
  type StackNode,
  type PositionedNode,
} from '../core/nodes.js';
import type { Theme } from '../core/types.js';
import { SIZE, DIRECTION, VALIGN, HALIGN } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { Bounds as BoundsClass } from '../core/bounds.js';
import type { Canvas } from '../core/canvas.js';
import { elementHandlerRegistry, getIntrinsicWidth, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { distributeFlexSpace, type FlexChild } from '../core/flex.js';
import { MeasurementCollector, type MeasurementRequests } from '../core/measure.js';
import { resolveGap } from '../utils/node-utils.js';
import { buildRowFlexChildren } from '../utils/flex-utils.js';
import { ptToIn } from '../utils/font-utils.js';
import { log } from '../utils/log.js';

// Import from layout for child layout (handles overflow checking)
import { getNodeHeight, getMinNodeHeight, computeLayout } from '../core/layout.js';

// ============================================
// CHILD HELPERS
// ============================================

function getChildHeight(node: ElementNode, width: number, ctx: LayoutContext): number {
  const handlerResult = elementHandlerRegistry.getHeight(node, width, ctx);
  if (handlerResult !== undefined) return handlerResult;
  return getNodeHeight(node, width, ctx.theme, ctx.measurer);
}

function getChildMinHeight(node: ElementNode, width: number, ctx: LayoutContext): number {
  const handlerResult = elementHandlerRegistry.getMinHeight(node, width, ctx);
  if (handlerResult !== undefined) return handlerResult;
  return getMinNodeHeight(node, width, ctx.theme, ctx.measurer);
}

function layoutChild(node: ElementNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
  return computeLayout(
    node,
    bounds as BoundsClass,
    ctx.theme,
    ctx.measurer,
    ctx.parentDirection,
    ctx.options
  );
}

// getIntrinsicWidth imported from registry.ts handles fallback to 0

// ============================================
// UNIFIED CONTAINER HANDLER
// ============================================

type ContainerNode = RowNode | ColumnNode;

/** Container axis - use DIRECTION.ROW or DIRECTION.COLUMN */
type Axis = typeof DIRECTION.ROW | typeof DIRECTION.COLUMN;

interface ContainerConfig {
  nodeType: typeof NODE_TYPE.ROW | typeof NODE_TYPE.COLUMN;
  axis: Axis;
}

const ROW_CONFIG: ContainerConfig = {
  nodeType: NODE_TYPE.ROW,
  axis: DIRECTION.ROW,
};

const COLUMN_CONFIG: ContainerConfig = {
  nodeType: NODE_TYPE.COLUMN,
  axis: DIRECTION.COLUMN,
};

function createContainerHandler(config: ContainerConfig): ElementHandler<ContainerNode> {
  const { nodeType, axis } = config;
  const isRow = axis === DIRECTION.ROW;
  const logFn = isRow ? log.layout.row : log.layout.column;
  const logName = axis;

  return {
    nodeType,

    getHeight(node: ContainerNode, width: number, ctx: LayoutContext): number {
      // Explicit height takes precedence
      if (typeof node.height === 'number') {
        logFn('HEIGHT %s explicit height=%f', logName, node.height);
        return node.height;
      }
      // SIZE.FILL defers to bounds
      if (node.height === SIZE.FILL) {
        logFn('HEIGHT %s fill -> 0 (will use bounds)', logName);
        return 0;
      }

      const padding = (node as ColumnNode).padding ?? 0;
      const innerWidth = width - padding * 2;
      const gap = resolveGap(node.gap, ctx.theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);

      if (isRow) {
        // ROW: max height of children
        const availableWidth = innerWidth - totalGap;
        const flexChildren = buildRowFlexChildren(node.children);
        const { sizes: childWidths } = distributeFlexSpace(flexChildren, availableWidth);

        let maxHeight = 0;
        for (let i = 0; i < n; i++) {
          const childHeight = getChildHeight(node.children[i], childWidths[i], ctx);
          logFn('  child[%d] width=%f height=%f type=%s', i, childWidths[i], childHeight, node.children[i].type);
          maxHeight = Math.max(maxHeight, childHeight);
        }
        logFn('  -> maxHeight=%f', maxHeight);
        return maxHeight;
      } else {
        // COLUMN: sum height of children
        logFn('HEIGHT column children=%d gap=%f width=%f padding=%f', n, gap, width, padding);
        let totalHeight = padding * 2;
        for (let i = 0; i < n; i++) {
          if (i > 0) totalHeight += gap;
          const childHeight = getChildHeight(node.children[i], innerWidth, ctx);
          logFn('  child[%d] height=%f type=%s', i, childHeight, node.children[i].type);
          totalHeight += childHeight;
        }
        logFn('  -> totalHeight=%f', totalHeight);
        return totalHeight;
      }
    },

    getMinHeight(node: ContainerNode, width: number, ctx: LayoutContext): number {
      if (typeof node.height === 'number') return node.height;
      if (node.height === SIZE.FILL) return 0;

      const padding = (node as ColumnNode).padding ?? 0;
      const innerWidth = width - padding * 2;
      const gap = resolveGap(node.gap, ctx.theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);

      if (isRow) {
        // ROW: max min-height of children
        const availableWidth = innerWidth - totalGap;
        const childWidth = availableWidth / n;
        let maxMinHeight = 0;
        for (const child of node.children) {
          maxMinHeight = Math.max(maxMinHeight, getChildMinHeight(child, childWidth, ctx));
        }
        return maxMinHeight;
      } else {
        // COLUMN: sum min-height of children
        let minHeight = padding * 2;
        for (let i = 0; i < n; i++) {
          if (i > 0) minHeight += gap;
          minHeight += getChildMinHeight(node.children[i], innerWidth, ctx);
        }
        return minHeight;
      }
    },

    computeLayout(node: ContainerNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
      const padding = (node as ColumnNode).padding ?? 0;
      const gap = resolveGap(node.gap, ctx.theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);

      if (isRow) {
        return computeRowLayout(node as RowNode, bounds, ctx, gap, totalGap, padding);
      } else {
        return computeColumnLayout(node as ColumnNode, bounds, ctx, gap, totalGap, padding);
      }
    },

    render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
      log.render._('  container %s with %d children', logName.toUpperCase(), positioned.children?.length ?? 0);
      if (positioned.children) {
        for (const child of positioned.children) {
          elementHandlerRegistry.render(child, canvas, theme);
        }
      }
    },

    collectMeasurements(node: ContainerNode, bounds: Bounds, theme: Theme): MeasurementRequests {
      const collector = new MeasurementCollector();
      const gap = resolveGap(node.gap, theme);
      const n = node.children.length;
      const totalGap = gap * (n - 1);

      if (isRow) {
        // ROW: calculate child widths, then collect from each child
        const availableWidth = bounds.w - totalGap;
        const flexChildren = buildRowFlexChildren(node.children);
        const { sizes: childWidths } = distributeFlexSpace(flexChildren, availableWidth);

        let x = bounds.x;
        for (let i = 0; i < n; i++) {
          const childBounds = new BoundsClass(x, bounds.y, childWidths[i], bounds.h);
          const childRequests = elementHandlerRegistry.collectMeasurements(node.children[i], childBounds, theme);
          if (childRequests) collector.merge(childRequests);
          x += childWidths[i] + gap;
        }
      } else {
        // COLUMN: each child gets full width
        for (const child of node.children) {
          const childRequests = elementHandlerRegistry.collectMeasurements(child, bounds, theme);
          if (childRequests) collector.merge(childRequests);
        }
      }

      return collector.getRequests();
    },
  };
}

// Row-specific layout logic (kept separate for clarity - axis differences are significant)
function computeRowLayout(
  node: RowNode,
  bounds: Bounds,
  ctx: LayoutContext,
  gap: number,
  totalGap: number,
  _padding: number
): PositionedNode {
  const availableWidth = bounds.w - totalGap;
  const n = node.children.length;

  // Calculate row height
  const intrinsicHeight = rowHandler.getHeight(node, bounds.w, ctx);
  const rowHeight = node.height === SIZE.FILL
    ? bounds.h
    : (bounds.h > 0 ? Math.min(intrinsicHeight, bounds.h) : intrinsicHeight);

  // Check for fill child
  const hasFillChild = node.children.some((child) =>
    (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) && child.width === SIZE.FILL
  );

  // Build FlexChild array for width distribution
  const flexChildren = buildRowFlexChildren(node.children, {
    getFixedSize: (child) =>
      child.type === NODE_TYPE.LINE ? ptToIn(ctx.theme.borders.width) : undefined,
    getIntrinsicSize: hasFillChild
      ? (child) => getIntrinsicWidth(child, rowHeight, ctx)
      : undefined,
  });

  const { sizes: childWidths } = distributeFlexSpace(flexChildren, availableWidth);

  log.layout.row('LAYOUT row gap=%f availableWidth=%f vAlign=%s rowHeight=%f (bounds.h=%f)',
    gap, availableWidth, node.vAlign, rowHeight, bounds.h);

  const children: PositionedNode[] = [];
  let x = bounds.x;

  for (let i = 0; i < n; i++) {
    const childWidth = childWidths[i];
    const childIntrinsicHeight = getChildHeight(node.children[i], childWidth, ctx);

    let y = bounds.y;
    if (node.vAlign === VALIGN.MIDDLE) {
      const effectiveChildHeight = Math.min(childIntrinsicHeight, rowHeight);
      y = bounds.y + (rowHeight - effectiveChildHeight) / 2;
    } else if (node.vAlign === VALIGN.BOTTOM) {
      const effectiveChildHeight = Math.min(childIntrinsicHeight, rowHeight);
      y = bounds.y + rowHeight - effectiveChildHeight;
    }

    log.layout.row('  child[%d] x=%f y=%f w=%f h=%f', i, x, y, childWidth, rowHeight);

    const childBounds = new BoundsClass(x, y, childWidth, rowHeight);
    const childCtx = { ...ctx, parentDirection: DIRECTION.ROW };
    children.push(layoutChild(node.children[i], childBounds, childCtx));
    x += childWidth + gap;
  }

  return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: rowHeight, children };
}

// Column-specific layout logic
function computeColumnLayout(
  node: ColumnNode,
  bounds: Bounds,
  ctx: LayoutContext,
  gap: number,
  totalGap: number,
  padding: number
): PositionedNode {
  const innerX = bounds.x + padding;
  const innerY = bounds.y + padding;
  const innerW = bounds.w - padding * 2;
  const innerH = bounds.h > 0 ? bounds.h - padding * 2 : 0;
  const availableHeight = innerH > 0 ? innerH - totalGap : Infinity;
  const n = node.children.length;

  const hasFillChild = node.children.some((child) =>
    child.type === NODE_TYPE.COLUMN && child.height === SIZE.FILL
  );

  // Build FlexChild array for height distribution
  const flexChildren: FlexChild[] = node.children.map((child, i) => {
    if (child.type === NODE_TYPE.COLUMN) {
      if (child.height === SIZE.FILL) {
        log.layout.column('  child[%d] fill (deferred)', i);
        return { fillsRemaining: true };
      }
      if (typeof child.height === 'number') {
        log.layout.column('  child[%d] explicit height=%f', i, child.height);
        return { fixedSize: child.height };
      }
    }
    if (child.type === NODE_TYPE.LINE) {
      const h = getChildHeight(child, innerW, ctx);
      log.layout.column('  child[%d] fixed line height=%f', i, h);
      return { fixedSize: h };
    }

    const h = getChildHeight(child, innerW, ctx);
    const minH = getChildMinHeight(child, innerW, ctx);
    log.layout.column('  child[%d] intrinsic height=%f minHeight=%f type=%s', i, h, minH, child.type);

    if (!hasFillChild && h === 0) return {};
    return { intrinsicSize: h, minSize: minH };
  });

  const { sizes: childHeights, fillIndex, wasCompressed } = distributeFlexSpace(flexChildren, availableHeight);

  if (wasCompressed) {
    const totalIntrinsic = flexChildren.reduce((sum, c) => sum + (c.intrinsicSize ?? c.fixedSize ?? 0), 0);
    const totalFitted = childHeights.reduce((a, b) => a + b, 0);
    log.layout.column('  COMPRESSED: %f -> %f (innerH=%f)', totalIntrinsic + totalGap, totalFitted + totalGap, innerH);
  }

  if (fillIndex !== -1) {
    log.layout.column('  child[%d] fill resolved to height=%f', fillIndex, childHeights[fillIndex]);
  }

  // Calculate content height for vAlign positioning
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

    if (node.hAlign && node.hAlign !== HALIGN.LEFT && child.type === NODE_TYPE.IMAGE) {
      const intrinsicWidth = getIntrinsicWidth(child, childHeight, ctx);
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
    const childBounds = new BoundsClass(childX, y, childWidth, childHeight);
    const childCtx = { ...ctx, parentDirection: DIRECTION.COLUMN };
    children.push(layoutChild(child, childBounds, childCtx));
    y += childHeight + gap;
  }

  return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h, children };
}

// ============================================
// STACK HANDLER (simpler, no axis parameterization needed)
// ============================================

export const stackHandler: ElementHandler<StackNode> = {
  nodeType: NODE_TYPE.STACK,

  getHeight(node: StackNode, width: number, ctx: LayoutContext): number {
    let maxHeight = 0;
    for (const child of node.children) {
      maxHeight = Math.max(maxHeight, getChildHeight(child, width, ctx));
    }
    log.layout._('HEIGHT stack children=%d -> %f', node.children.length, maxHeight);
    return maxHeight;
  },

  getMinHeight(node: StackNode, width: number, ctx: LayoutContext): number {
    let maxMinHeight = 0;
    for (const child of node.children) {
      maxMinHeight = Math.max(maxMinHeight, getChildMinHeight(child, width, ctx));
    }
    return maxMinHeight;
  },

  computeLayout(node: StackNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
    const intrinsicHeight = this.getHeight(node, bounds.w, ctx);
    const stackHeight = bounds.h > 0 ? bounds.h : intrinsicHeight;

    log.layout._('LAYOUT stack children=%d bounds={x=%f y=%f w=%f h=%f}',
      node.children.length, bounds.x, bounds.y, bounds.w, stackHeight);

    const children: PositionedNode[] = [];
    for (const child of node.children) {
      const childBounds = new BoundsClass(bounds.x, bounds.y, bounds.w, stackHeight);
      children.push(layoutChild(child, childBounds, ctx));
    }

    return { node, x: bounds.x, y: bounds.y, width: bounds.w, height: stackHeight, children };
  },

  render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
    log.render._('  container STACK with %d children', positioned.children?.length ?? 0);
    if (positioned.children) {
      for (const child of positioned.children) {
        elementHandlerRegistry.render(child, canvas, theme);
      }
    }
  },

  collectMeasurements(node: StackNode, bounds: Bounds, theme: Theme): MeasurementRequests {
    const collector = new MeasurementCollector();

    for (const child of node.children) {
      const childRequests = elementHandlerRegistry.collectMeasurements(child, bounds, theme);
      if (childRequests) collector.merge(childRequests);
    }

    return collector.getRequests();
  },
};

// ============================================
// CREATE HANDLERS VIA FACTORY
// ============================================

export const rowHandler = createContainerHandler(ROW_CONFIG);
export const columnHandler = createContainerHandler(COLUMN_CONFIG);

// ============================================
// REGISTRATION
// ============================================

elementHandlerRegistry.register(rowHandler);
elementHandlerRegistry.register(columnHandler);
elementHandlerRegistry.register(stackHandler);
