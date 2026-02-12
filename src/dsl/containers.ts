// Container DSL functions converted to components
// Uses defineComponent pattern for lazy expansion

import { defineComponent, type ComponentNode } from '../core/registry.js';
import { NODE_TYPE, type ElementNode, type SlideNode } from '../core/nodes.js';
import type {
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  SizeValue,
} from '../core/types.js';
import { VALIGN, HALIGN, SIZE } from '../core/types.js';

// ============================================
// ROW
// ============================================

export interface RowProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL (when inside another Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL to fill container height
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment; // justify-content: left (flex-start), center, right (flex-end)
  padding?: number;             // inches - internal padding on all sides
}

interface RowInternalProps extends RowProps {
  children: SlideNode[];
}

const rowComponent = defineComponent<RowInternalProps>('row', (props) => ({
  type: NODE_TYPE.ROW,
  children: props.children as ElementNode[],  // Safe: expandTree recurses into these
  width: props.width,
  height: props.height,
  gap: props.gap,
  vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default: pure alignment (not CSS stretch)
  hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
  padding: props.padding,
}));

export function row(props: RowProps, ...children: SlideNode[]): ComponentNode;
export function row(...children: SlideNode[]): ComponentNode;
export function row(...args: any[]): ComponentNode {
  let props: RowProps = {};
  let children: SlideNode[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0]) && !('componentName' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return rowComponent({ ...props, children });
}

// ============================================
// COLUMN
// ============================================

export interface ColumnProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL (when inside Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL (when inside Column)
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number;             // inches - internal padding on all sides
}

interface ColumnInternalProps extends ColumnProps {
  children: SlideNode[];
}

const columnComponent = defineComponent<ColumnInternalProps>('column', (props) => ({
  type: NODE_TYPE.COLUMN,
  children: props.children as ElementNode[],  // Safe: expandTree recurses into these
  width: props.width,
  height: props.height,
  gap: props.gap,
  vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default for consistent measurement
  hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
  padding: props.padding,
}));

export function column(props: ColumnProps, ...children: SlideNode[]): ComponentNode;
export function column(...children: SlideNode[]): ComponentNode;
export function column(...args: any[]): ComponentNode {
  let props: ColumnProps = {};
  let children: SlideNode[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0]) && !('componentName' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return columnComponent({ ...props, children });
}

// ============================================
// STACK (z-order composition)
// ============================================

export interface StackProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL
  height?: number | SizeValue;  // inches (number) or SIZE.FILL
}

interface StackInternalProps extends StackProps {
  children: SlideNode[];
}

const stackComponent = defineComponent<StackInternalProps>('stack', (props) => ({
  type: NODE_TYPE.STACK,
  children: props.children as ElementNode[],  // Safe: expandTree recurses into these
  width: props.width,
  height: props.height,
}));

/**
 * Stack is a z-order container: all children occupy the same bounds.
 * Children are rendered in array order: [0] first (back), [n-1] last (front).
 *
 * Use Stack to overlay elements, e.g. grid lines behind content:
 * ```
 * stack(
 *   gridLines,   // rendered first (behind)
 *   content      // rendered last (in front)
 * )
 * ```
 */
export function stack(props: StackProps, ...children: SlideNode[]): ComponentNode;
export function stack(...children: SlideNode[]): ComponentNode;
export function stack(...args: any[]): ComponentNode {
  let props: StackProps = {};
  let children: SlideNode[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0]) && !('componentName' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return stackComponent({ ...props, children });
}

// ============================================
// GRID (layout helper - chunks children into rows)
// ============================================

export interface GridProps {
  columns: number;
  gap?: GapSize;
  /** When true, each row gets height: SIZE.FILL to share parent space equally */
  fill?: boolean;
}

/**
 * Grid arranges children into rows of N columns.
 * Returns an array of row components — spread into a container column:
 *
 * @example
 * ```typescript
 * // 4-column grid of icons (intrinsic height)
 * column(...grid(4, ...icons.map(path => image(path))))
 *
 * // Fill available space equally
 * column({ height: SIZE.FILL },
 *   ...grid({ columns: 5, fill: true }, ...images),
 * )
 * ```
 */
export function grid(props: GridProps, ...children: SlideNode[]): ComponentNode[];
export function grid(columns: number, ...children: SlideNode[]): ComponentNode[];
export function grid(...args: any[]): ComponentNode[] {
  let columns: number;
  let gap: GapSize | undefined;
  let fill = false;
  let children: SlideNode[];

  if (typeof args[0] === 'number') {
    columns = args[0];
    children = args.slice(1);
  } else {
    const props = args[0] as GridProps;
    columns = props.columns;
    gap = props.gap;
    fill = props.fill ?? false;
    children = args.slice(1);
  }

  // Wrap each child in a column cell so items share row width equally
  // and images use width-based sizing (width: 100%, height from aspect-ratio)
  // instead of height-based sizing (which requires definite row height).
  // When fill: true, cells also get height: SIZE.FILL so they fill the row's cross-axis.
  const cellProps = fill
    ? { width: SIZE.FILL, height: SIZE.FILL }
    : { width: SIZE.FILL };
  const cells = children.map(child => column(cellProps, child));

  // Chunk cells into rows — caller's container controls vertical spacing
  const rows: ComponentNode[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const rowChildren = cells.slice(i, i + columns);
    if (fill) {
      // Fill mode: rows get definite height, cells stretch via their own SIZE.FILL
      rows.push(row({ gap, height: SIZE.FILL }, ...rowChildren));
    } else {
      const rowProps = gap !== undefined ? { gap } : {};
      rows.push(Object.keys(rowProps).length > 0 ? row(rowProps, ...rowChildren) : row(...rowChildren));
    }
  }

  return rows;
}
