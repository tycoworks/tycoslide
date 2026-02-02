// Box Component
// Flexbox-style layout container — pure arithmetic, no external dependencies.
// Box is a pure layout engine — it has no theme dependency.
// Children carry their own theme references.

import {
  DIRECTION,
  JUSTIFY,
  ALIGN,
  LAYER,
  type Component,
  type Drawer,
  Bounds,
  type Direction,
  type Justify,
  type Align,
  type AlignContext,
  type Layer,
} from '../core/types.js';
import { log } from '../utils/log.js';

// Overflow tolerance — matches the old Yoga tolerance (0.035").
// Some layouts have content that slightly exceeds container bounds due to
// font metric rounding. This will be eliminated by the grid+snap architecture.
const EPSILON = 0.035;

// ============================================
// BOX PROPS
// ============================================

export interface BoxProps {
  direction?: Direction;    // default: DIRECTION.COLUMN
  flex?: number;            // flex-grow ratio (default: 0 = sized to content)
  flexShrink?: number;      // override slide default shrink (1). Higher = absorbs more shrink.
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

// ============================================
// BOX CLASS
// ============================================

export class Box implements Component {
  private props: BoxProps;

  constructor(props: BoxProps = {}) {
    if (props.height !== undefined) {
      this.props = { ...props, maxHeight: props.height };
    } else {
      this.props = props;
    }
  }

  /** Flex-grow value, if set. Used by row/column to detect pre-flexed children. */
  get flex(): number | undefined { return this.props.flex; }

  private isRow(): boolean {
    return this.props.direction === DIRECTION.ROW;
  }

  // ============================================
  // MEASUREMENT
  // ============================================

  getHeight(width: number): number {
    if (this.props.height !== undefined) return this.props.height;

    let h: number;
    if (this.props.content) {
      h = this.props.content.getHeight(width);
    } else if (this.props.children?.length) {
      h = this.isRow()
        ? this.rowNaturalHeight(width)
        : this.columnNaturalHeight(width);
    } else {
      h = 0;
    }

    if (this.props.maxHeight !== undefined) h = Math.min(h, this.props.maxHeight);
    return h;
  }

  getMinHeight(width: number): number {
    if (this.props.content) {
      return this.props.content.getMinHeight?.(width) ?? this.props.content.getHeight(width);
    }
    if (!this.props.children) return 0;

    const gap = this.props.gap ?? 0;
    if (this.isRow()) {
      return Math.max(0, ...this.props.children.map(c => c.getMinHeight(width)));
    }
    const totalGap = gap * Math.max(0, this.props.children.length - 1);
    return this.props.children.reduce((sum, c) => sum + c.getMinHeight(width), 0) + totalGap;
  }

  getWidth(height: number): number {
    if (this.props.width !== undefined) return this.props.width;
    if (this.props.content) return this.props.content.getWidth?.(height) ?? 0;
    if (!this.props.children?.length) return 0;

    const gap = this.props.gap ?? 0;
    const totalGap = gap * Math.max(0, this.props.children.length - 1);
    if (this.isRow()) {
      return this.props.children.reduce((sum, c) => sum + c.getWidth(height), 0) + totalGap;
    }
    return Math.max(0, ...this.props.children.map(c => c.getWidth(height)));
  }

  // ============================================
  // LAYOUT
  // ============================================

  /**
   * Run layout and return the computed bounds of each direct child.
   */
  getChildBounds(bounds: Bounds): Bounds[] {
    if (!this.props.children) return [];
    return this.layoutChildren(bounds);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const drawers: Array<{ drawer: Drawer; layer: Layer }> = [];
    this.collectDrawers(bounds, alignContext, this.props.layer ?? LAYER.SLIDE, bounds, drawers, '');
    return (canvas) => {
      for (const { drawer, layer } of drawers) {
        canvas.currentLayer = layer;
        drawer(canvas);
      }
    };
  }

  // ============================================
  // PRIVATE: Natural size measurement
  // ============================================

  private columnNaturalHeight(width: number): number {
    const children = this.props.children!;
    const gap = this.props.gap ?? 0;
    const totalGap = gap * Math.max(0, children.length - 1);
    return children.reduce((sum, c) => sum + c.getHeight(width), 0) + totalGap;
  }

  private rowNaturalHeight(width: number): number {
    const children = this.props.children!;
    const gap = this.props.gap ?? 0;
    const totalGap = gap * Math.max(0, children.length - 1);
    const childWidths = this.distributeWidths(width - totalGap, children);
    return Math.max(0, ...children.map((c, i) => c.getHeight(childWidths[i])));
  }

  /** Compute child widths for a row (used by rowNaturalHeight for measurement). */
  private distributeWidths(availableWidth: number, children: Box[]): number[] {
    const flexValues = children.map(c =>
      c.props.height !== undefined ? 0 : (c.props.flex ?? 0),
    );
    const contentWidths = children.map((c, i) =>
      flexValues[i] > 0 ? 0 : c.getWidth(0),
    );
    const fixedTotal = contentWidths.reduce((sum, w) => sum + w, 0);
    const remaining = Math.max(0, availableWidth - fixedTotal);
    const totalFlex = flexValues.reduce((sum, f) => sum + (f > 0 ? f : 0), 0);

    return children.map((_, i) => {
      if (flexValues[i] > 0 && totalFlex > 0) {
        return remaining * (flexValues[i] / totalFlex);
      }
      return contentWidths[i];
    });
  }

  // ============================================
  // PRIVATE: Child layout computation
  // ============================================

  private layoutChildren(bounds: Bounds): Bounds[] {
    const children = this.props.children!;
    const isRow = this.isRow();
    const gap = this.props.gap ?? 0;

    // Apply own constraints — the parent may give us more space than we need
    let mainSize = isRow ? bounds.w : bounds.h;
    let crossSize = isRow ? bounds.h : bounds.w;
    if (!isRow && this.props.maxHeight !== undefined) {
      mainSize = Math.min(mainSize, this.props.maxHeight);
    }
    if (isRow && this.props.width !== undefined) {
      mainSize = Math.min(mainSize, this.props.width);
    }

    // Compute child sizes along main axis
    const sizes = this.computeMainSizes(children, mainSize, crossSize, gap, isRow, bounds.w);

    // Compute offsets along main axis (respecting justify)
    const offsets = this.computeOffsets(sizes, mainSize, gap, children.length);

    return children.map((_, i) => {
      if (isRow) {
        return new Bounds(bounds.x + offsets[i], bounds.y, sizes[i], crossSize);
      }
      return new Bounds(bounds.x, bounds.y + offsets[i], crossSize, sizes[i]);
    });
  }

  /**
   * Compute main-axis sizes for each child within a container.
   * Handles flex distribution, maxHeight caps, shrinkage, and overflow.
   */
  private computeMainSizes(
    children: Box[], mainSize: number, crossSize: number,
    gap: number, isRow: boolean, containerWidth: number,
  ): number[] {
    const totalGap = gap * Math.max(0, children.length - 1);

    // Children with explicit height are pinned — ignore their flex value
    const flexValues = children.map(c =>
      c.props.height !== undefined ? 0 : (c.props.flex ?? 0),
    );

    // Step 1: Measure natural sizes
    const naturals = children.map((c, i) => {
      if (flexValues[i] > 0) return 0; // flex children start from basis 0
      return isRow ? c.getWidth(crossSize) : c.getHeight(containerWidth);
    });

    // Step 2: Distribute flex space
    const fixedTotal = naturals.reduce((sum, n) => sum + n, 0);
    const available = Math.max(0, mainSize - fixedTotal - totalGap);
    let totalFlex = flexValues.reduce((sum, f) => sum + (f > 0 ? f : 0), 0);

    const sizes = children.map((_, i) => {
      if (flexValues[i] > 0 && totalFlex > 0) {
        return available * (flexValues[i] / totalFlex);
      }
      return naturals[i];
    });

    // Step 3: Apply maxHeight caps on flex children (iterate until stable)
    const activeFlexes = [...flexValues];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < children.length; i++) {
        if (activeFlexes[i] <= 0) continue;
        const cap = isRow ? children[i].props.width : children[i].props.maxHeight;
        if (cap !== undefined && sizes[i] > cap + EPSILON) {
          const excess = sizes[i] - cap;
          sizes[i] = cap;
          activeFlexes[i] = 0;
          const remainingFlex = activeFlexes.reduce((s, f) => s + (f > 0 ? f : 0), 0);
          if (remainingFlex > 0) {
            for (let j = 0; j < children.length; j++) {
              if (activeFlexes[j] > 0) {
                sizes[j] += excess * (activeFlexes[j] / remainingFlex);
              }
            }
          }
          changed = true;
          break; // restart
        }
      }
    }

    // Step 4: Shrink if content exceeds container
    const totalContent = sizes.reduce((sum, s) => sum + s, 0);
    if (totalContent + totalGap > mainSize + EPSILON) {
      this.shrinkToFit(children, sizes, totalContent + totalGap - mainSize);
    }

    return sizes;
  }

  /**
   * Shrink children to fit within container.
   * Uses CSS-like weighted shrinkage: shrinkFactor × basisSize.
   * Children with explicit height cannot shrink.
   */
  private shrinkToFit(children: Box[], sizes: number[], excess: number): void {
    const shrinkWeights = children.map((c, i) => {
      if (c.props.height !== undefined) return 0; // pinned
      const factor = c.props.flexShrink ?? 1;
      return factor * sizes[i];
    });
    const totalWeight = shrinkWeights.reduce((sum, w) => sum + w, 0);

    if (totalWeight > 0) {
      for (let i = 0; i < children.length; i++) {
        sizes[i] -= excess * (shrinkWeights[i] / totalWeight);
      }
    }
    // If totalWeight is 0, no children can shrink → overflow will be caught in checkOverflow
  }

  /**
   * Compute positional offsets along main axis, respecting justify mode.
   */
  private computeOffsets(sizes: number[], mainSize: number, gap: number, n: number): number[] {
    const totalContent = sizes.reduce((sum, s) => sum + s, 0);
    const totalGap = gap * Math.max(0, n - 1);
    const freeSpace = Math.max(0, mainSize - totalContent - totalGap);
    const offsets: number[] = [];
    let pos = 0;

    switch (this.props.justify) {
      case JUSTIFY.CENTER:
        pos = freeSpace / 2;
        for (let i = 0; i < n; i++) {
          offsets.push(pos);
          pos += sizes[i] + (i < n - 1 ? gap : 0);
        }
        break;

      case JUSTIFY.SPACE_BETWEEN:
        if (n <= 1) {
          offsets.push(0);
        } else {
          const between = freeSpace / (n - 1);
          for (let i = 0; i < n; i++) {
            offsets.push(pos);
            pos += sizes[i] + gap + (i < n - 1 ? between : 0);
          }
        }
        break;

      case JUSTIFY.SPACE_EVENLY: {
        const slot = freeSpace / (n + 1);
        pos = slot;
        for (let i = 0; i < n; i++) {
          offsets.push(pos);
          pos += sizes[i] + (i < n - 1 ? gap + slot : 0);
        }
        break;
      }

      default:
        // Start (default) — children pack from the start
        for (let i = 0; i < n; i++) {
          offsets.push(pos);
          pos += sizes[i] + (i < n - 1 ? gap : 0);
        }
    }

    return offsets;
  }

  // ============================================
  // PRIVATE: Drawing traversal
  // ============================================

  private collectDrawers(
    bounds: Bounds,
    alignContext: AlignContext | undefined,
    parentLayer: Layer,
    containerBounds: Bounds,
    drawers: Array<{ drawer: Drawer; layer: Layer }>,
    path: string,
  ): void {
    const layer = this.props.layer ?? parentLayer;

    if (this.props.content) {
      const contentName = this.props.content.constructor.name;
      const fullPath = path ? `${path} > ${contentName}` : contentName;
      log('box leaf %s: x=%f y=%f w=%f h=%f', fullPath, bounds.x, bounds.y, bounds.w, bounds.h);
      this.checkOverflow(bounds, containerBounds, fullPath);
      const drawer = this.props.content.prepare(bounds, alignContext);
      drawers.push({ drawer, layer });
    } else if (this.props.children?.length) {
      const childBounds = this.layoutChildren(bounds);
      const dir = this.isRow() ? 'Row' : 'Col';
      const childPath = path
        ? `${path} > ${dir}(${this.props.children.length})`
        : `${dir}(${this.props.children.length})`;

      log('box %s children=%d: x=%f y=%f w=%f h=%f',
        childPath, this.props.children.length, bounds.x, bounds.y, bounds.w, bounds.h);

      const childAlignContext: AlignContext = {
        direction: this.props.direction ?? DIRECTION.COLUMN,
        align: this.props.align ?? ALIGN.CENTER,
      };

      for (let i = 0; i < this.props.children.length; i++) {
        this.props.children[i].collectDrawers(
          childBounds[i], childAlignContext, layer, containerBounds, drawers, childPath,
        );
      }
    }
  }

  private checkOverflow(bounds: Bounds, container: Bounds, path: string): void {
    const vOverflow = (bounds.y + bounds.h) - (container.y + container.h);
    if (vOverflow > EPSILON) {
      throw this.overflowError('Vertical', path, bounds, container, vOverflow);
    }
    const hOverflow = (bounds.x + bounds.w) - (container.x + container.w);
    if (hOverflow > EPSILON) {
      throw this.overflowError('Horizontal', path, bounds, container, hOverflow);
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
 * expand() — Mark a component as a flex grower.
 * Flex children grow to fill available space proportionally.
 * (All children already shrink by default via CSS-like defaults.)
 */
export function expand(component: Component): Box {
  return box({ flex: 1, content: component });
}
