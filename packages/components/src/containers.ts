// Container DSL functions: row, column, stack, grid

import {
  type ComponentNode,
  component,
  DIRECTION,
  defineComponent,
  type RenderContext,
  GAP,
  type GapSize,
  HALIGN,
  type HorizontalAlignment,
  NODE_TYPE,
  resolveGap,
  SIZE,
  type SizeValue,
  type SlideNode,
  VALIGN,
  type VerticalAlignment,
} from "tycoslide";
import { Component } from "./names.js";

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
  if (args[0] && typeof args[0] === "object" && !("type" in args[0]) && !("componentName" in args[0])) {
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
  width?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment; // justify-content: left (flex-start), center, right (flex-end)
  padding?: number; // inches - internal padding on all sides
};

interface RowInternalProps extends RowProps {
  children: SlideNode[];
}

export const rowComponent = defineComponent({
  name: Component.Row,
  slots: ["children"] as const,
  directive: false,
  tokens: {},

  render: (props: RowInternalProps, context: RenderContext) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: resolveGap(props.gap, context.theme),
    vAlign: props.vAlign ?? VALIGN.TOP, // Explicit default: pure alignment (not CSS stretch)
    hAlign: props.hAlign ?? HALIGN.LEFT, // Explicit default for consistent measurement
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
  width?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number; // inches - internal padding on all sides
};

interface ColumnInternalProps extends ColumnProps {
  children: SlideNode[];
}

export const columnComponent = defineComponent({
  name: Component.Column,
  slots: ["children"] as const,
  directive: false,
  tokens: {},

  render: (props: ColumnInternalProps, context: RenderContext) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: resolveGap(props.gap, context.theme),
    vAlign: props.vAlign ?? VALIGN.TOP, // Explicit default for consistent measurement
    hAlign: props.hAlign ?? HALIGN.LEFT, // Explicit default for consistent measurement
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
  width?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
};

interface StackInternalProps extends StackProps {
  children: SlideNode[];
}

export const stackComponent = defineComponent({
  name: Component.Stack,
  slots: ["children"] as const,
  directive: false,
  tokens: {},

  render: (props: StackInternalProps) => ({
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
  height?: number | SizeValue; // inches, SIZE.FILL (equal rows), or SIZE.HUG (content-sized rows). Default: FILL
};

interface GridInternalProps extends GridProps {
  children: SlideNode[];
}

export const gridComponent = defineComponent({
  name: Component.Grid,
  slots: ["children"] as const,
  directive: false,
  tokens: {},
  render: (props: GridInternalProps) => {
    const { columns, gap = GAP.NORMAL, height = SIZE.FILL, children } = props;

    // Wrap each child in a column cell so items share row width equally
    const cells = children.map((child) => column({ width: SIZE.FILL, height }, child));

    // Chunk cells into rows
    const rows: ComponentNode[] = [];
    for (let i = 0; i < cells.length; i += columns) {
      rows.push(row({ gap, height }, ...cells.slice(i, i + columns)));
    }

    // Wrapper column mirrors caller's height so outer containers can position it
    return column({ gap, height }, ...rows);
  },
});

/**
 * Grid arranges children into rows of N columns with equal column widths.
 *
 * By default, rows fill available height equally (SIZE.FILL).
 * Pass `height: SIZE.HUG` for content-sized rows.
 *
 * @example
 * ```typescript
 * grid(3, ...cards)                                           // fill-height rows
 * grid({ columns: 2, height: SIZE.HUG }, ...items)            // content-sized rows
 * grid({ columns: 2, height: SIZE.HUG, gap: GAP.TIGHT }, ...) // tight content grid
 * ```
 */
export function grid(props: GridProps, ...children: SlideNode[]): ComponentNode;
export function grid(columns: number, ...children: SlideNode[]): ComponentNode;
export function grid(...args: any[]): ComponentNode {
  let columns: number;
  let gap: GapSize | undefined;
  let height: number | SizeValue | undefined;
  let children: SlideNode[];

  if (typeof args[0] === "number") {
    columns = args[0];
    children = args.slice(1);
  } else {
    const props = args[0] as GridProps;
    columns = props.columns;
    gap = props.gap;
    height = props.height;
    children = args.slice(1);
  }

  return component(Component.Grid, { columns, gap, height, children });
}
