// Container DSL functions: row, column, stack, grid

import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { ROW_COMPONENT, COLUMN_COMPONENT, STACK_COMPONENT, GRID_COMPONENT } from '../core/componentNames.js';
import { NODE_TYPE, type ElementNode, type SlideNode } from '../core/nodes.js';
import type {
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  SizeValue,
} from '../core/types.js';
import { VALIGN, HALIGN, SIZE, DIRECTION } from '../core/types.js';

// ============================================
// SHARED HELPERS
// ============================================

/**
 * Parse container function arguments that support two overload patterns:
 * 1. (props, ...children)
 * 2. (...children)
 *
 * Discriminates props object from nodes by checking for 'type' and 'componentName' fields.
 */
function parseContainerArgs<TProps>(args: any[]): { props: TProps; children: SlideNode[] } {
  if (args[0] && typeof args[0] === 'object' && !('type' in args[0]) && !('componentName' in args[0])) {
    return {
      props: args[0] as TProps,
      children: args.slice(1),
    };
  }
  return {
    props: {} as TProps,
    children: args,
  };
}

// ============================================
// ROW
// ============================================

export { ROW_COMPONENT };

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

componentRegistry.define({
  name: ROW_COMPONENT,
  expand: (props: RowInternalProps) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children: props.children as ElementNode[],  // Safe: expandTree recurses into these
    width: props.width,
    height: props.height,
    gap: props.gap,
    vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default: pure alignment (not CSS stretch)
    hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    padding: props.padding,
  }),
});

export function row(props: RowProps, ...children: SlideNode[]): ComponentNode;
export function row(...children: SlideNode[]): ComponentNode;
export function row(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs<RowProps>(args);
  return component(ROW_COMPONENT, { ...props, children });
}

// ============================================
// COLUMN
// ============================================

export { COLUMN_COMPONENT };

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

componentRegistry.define({
  name: COLUMN_COMPONENT,
  expand: (props: ColumnInternalProps) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children: props.children as ElementNode[],  // Safe: expandTree recurses into these
    width: props.width,
    height: props.height,
    gap: props.gap,
    vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default for consistent measurement
    hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    padding: props.padding,
  }),
});

export function column(props: ColumnProps, ...children: SlideNode[]): ComponentNode;
export function column(...children: SlideNode[]): ComponentNode;
export function column(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs<ColumnProps>(args);
  return component(COLUMN_COMPONENT, { ...props, children });
}

// ============================================
// STACK (z-order composition)
// ============================================

export { STACK_COMPONENT };

export interface StackProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL
  height?: number | SizeValue;  // inches (number) or SIZE.FILL
}

interface StackInternalProps extends StackProps {
  children: SlideNode[];
}

componentRegistry.define({
  name: STACK_COMPONENT,
  expand: (props: StackInternalProps) => ({
    type: NODE_TYPE.STACK,
    children: props.children as ElementNode[],  // Safe: expandTree recurses into these
    width: props.width,
    height: props.height,
  }),
});

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
  const { props, children } = parseContainerArgs<StackProps>(args);
  return component(STACK_COMPONENT, { ...props, children });
}

// ============================================
// GRID (component - chunks children into column of rows)
// ============================================

export { GRID_COMPONENT };

export interface GridProps {
  columns: number;
  gap?: GapSize;
  /** When true, each row gets height: SIZE.FILL to share parent space equally */
  fill?: boolean;
}

interface GridInternalProps extends GridProps {
  children: SlideNode[];
}

componentRegistry.define({ name: GRID_COMPONENT, expand: (props: GridInternalProps) => {
  const { columns, gap, fill = false, children } = props;

  // Wrap each child in a column cell so items share row width equally
  // and images use width-based sizing (width: 100%, height from aspect-ratio)
  // instead of height-based sizing (which requires definite row height).
  // When fill: true, cells also get height: SIZE.FILL so they fill the row's cross-axis.
  const cellProps = fill
    ? { width: SIZE.FILL, height: SIZE.FILL }
    : { width: SIZE.FILL };
  const cells = children.map(child => column(cellProps, child));

  // Chunk cells into rows
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

  // Return a column containing all rows (expansion system recurses into children)
  // When fill: true, the wrapper column needs SIZE.FILL so rows have a definite-height
  // parent to divide (flex: 1 1 0 needs space to distribute).
  return fill ? column({ height: SIZE.FILL }, ...rows) : column(...rows);
}});

/**
 * Grid arranges children into rows of N columns.
 * Returns a single ComponentNode that expands to a column of rows.
 *
 * @example
 * ```typescript
 * // 4-column grid of icons (intrinsic height)
 * grid(4, ...icons.map(path => image(path)))
 *
 * // Fill available space equally
 * grid({ columns: 5, fill: true }, ...images)
 * ```
 */
export function grid(props: GridProps, ...children: SlideNode[]): ComponentNode;
export function grid(columns: number, ...children: SlideNode[]): ComponentNode;
export function grid(...args: any[]): ComponentNode {
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

  return component(GRID_COMPONENT, { columns, gap, fill, children });
}
