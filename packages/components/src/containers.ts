// Container DSL functions: row, column, stack, grid

import {
  defineComponent, component, type ComponentNode,
  NODE_TYPE, type SlideNode,
  GAP, type HorizontalAlignment, type VerticalAlignment, type GapSize, type SizeValue,
  VALIGN, HALIGN, SIZE, DIRECTION,
  type ExpansionContext, resolveGap,
} from 'tycoslide';
import { Component } from './names.js';

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

export type RowProps = {
  width?: number | SizeValue;   // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue;  // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment; // justify-content: left (flex-start), center, right (flex-end)
  padding?: number;             // inches - internal padding on all sides
};

interface RowInternalProps extends RowProps {
  children: SlideNode[];
}

export const rowComponent = defineComponent({
  name: Component.Row,
  slots: ['children'] as const,
  directive: false,
  tokens: [],

  expand: (props: RowInternalProps, context: ExpansionContext) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: resolveGap(props.gap, context.theme),
    vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default: pure alignment (not CSS stretch)
    hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    padding: props.padding,
  }),
});

export function row(props: RowProps, ...children: SlideNode[]): ComponentNode;
export function row(...children: SlideNode[]): ComponentNode;
export function row(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs<RowProps>(args);
  return component(Component.Row, { ...props, children });
}

// ============================================
// COLUMN
// ============================================

export type ColumnProps = {
  width?: number | SizeValue;   // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue;  // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number;             // inches - internal padding on all sides
};

interface ColumnInternalProps extends ColumnProps {
  children: SlideNode[];
}

export const columnComponent = defineComponent({
  name: Component.Column,
  slots: ['children'] as const,
  directive: false,
  tokens: [],

  expand: (props: ColumnInternalProps, context: ExpansionContext) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: resolveGap(props.gap, context.theme),
    vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default for consistent measurement
    hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    padding: props.padding,
  }),
});

export function column(props: ColumnProps, ...children: SlideNode[]): ComponentNode;
export function column(...children: SlideNode[]): ComponentNode;
export function column(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs<ColumnProps>(args);
  return component(Component.Column, { ...props, children });
}

// ============================================
// STACK (z-order composition)
// ============================================

export type StackProps = {
  width?: number | SizeValue;   // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue;  // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
};

interface StackInternalProps extends StackProps {
  children: SlideNode[];
}

export const stackComponent = defineComponent({
  name: Component.Stack,
  slots: ['children'] as const,
  directive: false,
  tokens: [],

  expand: (props: StackInternalProps) => ({
    type: NODE_TYPE.STACK,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
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
  return component(Component.Stack, { ...props, children });
}

// ============================================
// GRID (component - chunks children into column of rows)
// ============================================

export type GridProps = {
  columns: number;
  gap?: GapSize;
};

interface GridInternalProps extends GridProps {
  children: SlideNode[];
}

export const gridComponent = defineComponent({
  name: Component.Grid,
  slots: ['children'] as const,
  directive: false,
  tokens: [],
  expand: (props: GridInternalProps) => {
  const { columns, gap = GAP.NORMAL, children } = props;

  // Wrap each child in a column cell so items share row width equally
  const cells = children.map(child => column({ width: SIZE.FILL, height: SIZE.FILL }, child));

  // Chunk cells into rows of equal height
  const rows: ComponentNode[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    rows.push(row({ gap, height: SIZE.FILL }, ...cells.slice(i, i + columns)));
  }

  return column({ gap, height: SIZE.FILL }, ...rows);
}});

/**
 * Grid arranges children into equal-sized rows of N columns.
 * Always fills available space with equal distribution.
 *
 * @example
 * ```typescript
 * grid(3, ...cards)
 * grid({ columns: 4, gap: GAP.TIGHT }, ...icons)
 * ```
 */
export function grid(props: GridProps, ...children: SlideNode[]): ComponentNode;
export function grid(columns: number, ...children: SlideNode[]): ComponentNode;
export function grid(...args: any[]): ComponentNode {
  let columns: number;
  let gap: GapSize | undefined;
  let children: SlideNode[];

  if (typeof args[0] === 'number') {
    columns = args[0];
    children = args.slice(1);
  } else {
    const props = args[0] as GridProps;
    columns = props.columns;
    gap = props.gap;
    children = args.slice(1);
  }

  return component(Component.Grid, { columns, gap, children });
}
