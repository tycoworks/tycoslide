// Box Component
// Flexbox-style layout container powered by Yoga
// Box is a pure layout engine — it has no theme dependency.
// Children carry their own theme references.

import { Yoga, createNode, freeNode, toYoga, fromYoga, YOGA_EPSILON, type YogaNode } from '../utils/yoga-utils.js';
import {
  DIRECTION,
  JUSTIFY,
  ALIGN,
  LAYER,
  type Component,
  type Drawer,
  type Bounds,
  type Direction,
  type Justify,
  type Align,
  type AlignContext,
  type Layer,
} from '../core/types.js';

// ============================================
// YOGA LOOKUP TABLES
// ============================================

const YOGA_ALIGN: Record<string, number> = {
  [ALIGN.START]: Yoga.ALIGN_FLEX_START,
  [ALIGN.CENTER]: Yoga.ALIGN_CENTER,
  [ALIGN.END]: Yoga.ALIGN_FLEX_END,
  [ALIGN.STRETCH]: Yoga.ALIGN_STRETCH,
};

const YOGA_JUSTIFY: Record<string, number> = {
  [JUSTIFY.CENTER]: Yoga.JUSTIFY_CENTER,
  [JUSTIFY.SPACE_BETWEEN]: Yoga.JUSTIFY_SPACE_BETWEEN,
  [JUSTIFY.SPACE_EVENLY]: Yoga.JUSTIFY_SPACE_EVENLY,
};

// ============================================
// BOX PROPS
// ============================================

export interface BoxProps {
  direction?: Direction;    // default: DIRECTION.COLUMN
  flex?: number;            // flex-grow ratio (default: 0 = sized to content)
  width?: number;           // explicit width in inches
  height?: number;          // explicit height in inches
  gap?: number;             // gap in inches (default: 0)
  justify?: Justify;        // main axis distribution (center, space-between)
  align?: Align;            // cross axis alignment (start, center, end, stretch)
  maxHeight?: number;       // explicit cap on expansion (inches) — used by auto-expand capped mode
  children?: Box[];         // Container mode
  content?: Component;      // Leaf mode (text, image, etc.)
  layer?: Layer;            // Render layer (slide or master) - inherited by children
}

interface TraversalContext {
  drawers: Array<{ drawer: Drawer; bounds: Bounds; layer: Layer }>;
  containerBounds: Bounds;
  path: string;
}

// ============================================
// BOX CLASS
// ============================================

export class Box implements Component {
  private props: BoxProps;
  private _cachedNode: YogaNode | null = null;
  private _cachedWidth: number = -1;

  constructor(props: BoxProps = {}) {
    this.props = props;
  }

  /** Flex-grow value, if set. Used by row/column to detect pre-flexed children. */
  get flex(): number | undefined { return this.props.flex; }

  /**
   * Get or build a Yoga tree for this Box, cached by width.
   * Reusing the same tree between getMinimumHeight and prepare ensures
   * Yoga's point-rounding is consistent across measurement and layout.
   */
  private getOrBuildTree(width: number): YogaNode {
    if (this._cachedNode && this._cachedWidth === width) {
      return this._cachedNode;
    }
    if (this._cachedNode) {
      freeNode(this._cachedNode);
    }
    this._cachedNode = this.buildYogaTree(width);
    this._cachedWidth = width;
    return this._cachedNode;
  }

  private buildYogaTree(width: number): YogaNode {
    const node = createNode();
    this.configureFlexLayout(node);
    this.configureDimensions(node);
    this.configureChildren(node, width);
    return node;
  }

  private configureFlexLayout(node: YogaNode): void {
    const direction = this.props.direction === DIRECTION.ROW
      ? Yoga.FLEX_DIRECTION_ROW : Yoga.FLEX_DIRECTION_COLUMN;
    node.setFlexDirection(direction);
    node.setAlignItems(YOGA_ALIGN[this.props.align ?? ALIGN.STRETCH]);

    const gap = this.props.gap ?? 0;
    if (gap > 0) node.setGap(Yoga.GUTTER_ALL, toYoga(gap));

    const justify = this.props.justify;
    if (justify) node.setJustifyContent(YOGA_JUSTIFY[justify]);
  }

  private configureDimensions(node: YogaNode): void {
    if (this.props.width !== undefined) node.setWidth(toYoga(this.props.width));
    if (this.props.height !== undefined) node.setHeight(toYoga(this.props.height));
    if (this.props.maxHeight !== undefined) node.setMaxHeight(toYoga(this.props.maxHeight));

    if (this.props.flex !== undefined && this.props.flex > 0) {
      node.setFlexGrow(this.props.flex);
      node.setFlexBasis(0);
    }
  }

  private configureChildren(node: YogaNode, width: number): void {
    if (this.props.content) {
      this.setMeasureFunc(node, width);
    } else if (this.props.children) {
      for (const child of this.props.children) {
        node.insertChild(child.buildYogaTree(width), node.getChildCount());
      }
    }
  }

  private setMeasureFunc(node: YogaNode, width: number): void {
    const content = this.props.content!;
    node.setMeasureFunc((yogaWidth, widthMode) => {
      const measuredWidth = widthMode === Yoga.MEASURE_MODE_UNDEFINED
        ? width : fromYoga(yogaWidth);
      const minH = content.getMinimumHeight?.(measuredWidth) ?? 0;
      const minW = content.getMinimumWidth?.(minH) ?? 0;
      return { width: toYoga(minW), height: toYoga(minH) };
    });
  }

  /**
   * Extract computed bounds from Yoga layout
   */
  private extractBounds(node: YogaNode, offsetX: number, offsetY: number): Bounds {
    return {
      x: offsetX + fromYoga(node.getComputedLeft()),
      y: offsetY + fromYoga(node.getComputedTop()),
      w: fromYoga(node.getComputedWidth()),
      h: fromYoga(node.getComputedHeight()),
    };
  }

  getMinimumHeight(width: number): number {
    const node = this.getOrBuildTree(width);
    node.setWidth(toYoga(width));
    node.calculateLayout(toYoga(width), undefined, Yoga.DIRECTION_LTR);

    return fromYoga(node.getComputedHeight());
  }

  getMaximumHeight(width: number): number {
    if (this.props.height !== undefined) return this.props.height;
    if (this.props.maxHeight !== undefined) return this.props.maxHeight;
    if (this.props.content) return this.contentMaxHeight(width);
    if (this.props.children) return this.childrenMaxHeight(width);
    if (this.props.flex && this.props.flex > 0) return Infinity;
    return this.getMinimumHeight(width);
  }

  private contentMaxHeight(width: number): number {
    return this.props.content!.getMaximumHeight?.(width)
      ?? this.getMinimumHeight(width);
  }

  private childrenMaxHeight(width: number): number {
    const maxHeights = this.props.children!.map(c => c.getMaximumHeight(width));
    if (maxHeights.some(h => !Number.isFinite(h))) return Infinity;

    if (this.props.direction === DIRECTION.ROW) return Math.max(...maxHeights);

    const gap = this.props.gap ?? 0;
    const totalGaps = Math.max(0, this.props.children!.length - 1) * gap;
    return maxHeights.reduce((sum, h) => sum + h, 0) + totalGaps;
  }

  getMinimumWidth(height: number): number {
    // Use a large width so measureFunc gets UNDEFINED widthMode
    const node = this.buildYogaTree(Infinity);
    node.setHeight(toYoga(height));
    node.calculateLayout(undefined, toYoga(height), Yoga.DIRECTION_LTR);

    const width = fromYoga(node.getComputedWidth());
    freeNode(node);
    return width;
  }

  /**
   * Run layout and return the computed bounds of each direct child.
   * Uses the cached Yoga tree so results are consistent with prepare().
   */
  getChildBounds(bounds: Bounds): Bounds[] {
    if (!this.props.children) return [];
    const node = this.getOrBuildTree(bounds.w);
    node.setWidth(toYoga(bounds.w));
    node.setHeight(toYoga(bounds.h));
    node.calculateLayout(toYoga(bounds.w), toYoga(bounds.h), Yoga.DIRECTION_LTR);

    return this.props.children.map((_, i) =>
      this.extractBounds(node.getChild(i), bounds.x, bounds.y)
    );
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const rootNode = this.getOrBuildTree(bounds.w);
    rootNode.setWidth(toYoga(bounds.w));
    rootNode.setHeight(toYoga(bounds.h));
    rootNode.calculateLayout(toYoga(bounds.w), toYoga(bounds.h), Yoga.DIRECTION_LTR);

    const ctx: TraversalContext = {
      drawers: [],
      containerBounds: bounds,
      path: '',
    };
    this.collectDrawers(rootNode, bounds.x, bounds.y, alignContext, this.props.layer ?? LAYER.SLIDE, ctx);

    return (canvas) => {
      for (const { drawer, layer } of ctx.drawers) {
        canvas.currentLayer = layer;
        drawer(canvas);
      }
    };
  }

  private collectDrawers(
    node: YogaNode, offsetX: number, offsetY: number,
    parentAlignContext: AlignContext | undefined,
    parentLayer: Layer, ctx: TraversalContext,
  ): void {
    const bounds = this.extractBounds(node, offsetX, offsetY);
    const layer = this.props.layer ?? parentLayer;

    if (this.props.content) {
      this.checkOverflow(bounds, ctx);
      const drawer = this.props.content.prepare(bounds, parentAlignContext);
      ctx.drawers.push({ drawer, bounds, layer });
    } else if (this.props.children) {
      this.collectChildDrawers(node, bounds, layer, ctx);
    }
  }

  private collectChildDrawers(
    node: YogaNode, bounds: Bounds, layer: Layer, ctx: TraversalContext,
  ): void {
    const alignContext: AlignContext = {
      direction: this.props.direction ?? DIRECTION.COLUMN,
      align: this.props.align ?? ALIGN.STRETCH,
    };
    const dir = this.props.direction === DIRECTION.ROW ? 'Row' : 'Col';
    const childPath = ctx.path
      ? `${ctx.path} > ${dir}(${this.props.children!.length})`
      : `${dir}(${this.props.children!.length})`;

    for (let i = 0; i < this.props.children!.length; i++) {
      const child = this.props.children![i];
      const childNode = node.getChild(i);
      child.collectDrawers(
        childNode, bounds.x, bounds.y,
        alignContext, layer,
        { ...ctx, path: childPath },
      );
    }
  }

  private checkOverflow(bounds: Bounds, ctx: TraversalContext): void {
    const epsilon = YOGA_EPSILON;
    const contentName = this.props.content!.constructor.name;
    const fullPath = ctx.path ? `${ctx.path} > ${contentName}` : contentName;

    const vOverflow = (bounds.y + bounds.h) - (ctx.containerBounds.y + ctx.containerBounds.h);
    if (vOverflow > epsilon) {
      throw this.overflowError('Vertical', fullPath, bounds, ctx.containerBounds, vOverflow);
    }

    const hOverflow = (bounds.x + bounds.w) - (ctx.containerBounds.x + ctx.containerBounds.w);
    if (hOverflow > epsilon) {
      throw this.overflowError('Horizontal', fullPath, bounds, ctx.containerBounds, hOverflow);
    }
  }

  private overflowError(
    axis: string, path: string, bounds: Bounds, container: Bounds, overflow: number,
  ): Error {
    const fmt = (b: Bounds) =>
      `{x:${b.x.toFixed(3)}, y:${b.y.toFixed(3)}, w:${b.w.toFixed(3)}, h:${b.h.toFixed(3)}}`;
    const edge = axis === 'Vertical'
      ? { content: bounds.y + bounds.h, container: container.y + container.h }
      : { content: bounds.x + bounds.w, container: container.x + container.w };
    return new Error(
      `${axis} overflow at [${path}]: extends to ${edge.content.toFixed(3)}" ` +
      `but container ends at ${edge.container.toFixed(3)}" (overflow: ${overflow.toFixed(3)}")` +
      `\n  content bounds: ${fmt(bounds)}\n  container bounds: ${fmt(container)}`
    );
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function box(props: BoxProps = {}): Box {
  return new Box(props);
}

/**
 * expand() — Mark a component as expandable.
 * Nothing expands unless wrapped in expand(). This is the only expansion mechanism.
 */
export function expand(component: Component): Box {
  return box({ flex: 1, content: component });
}
