// Container DSL functions: row, column, stack, grid

import {
  type ComponentNode,
  component,
  DIRECTION,
  defineComponent,
  HALIGN,
  type HorizontalAlignment,
  NODE_TYPE,
  type RenderContext,
  SIZE,
  type SizeValue,
  type SlideNode,
  type SpacingMode,
  VALIGN,
  type VerticalAlignment,
} from "tycoslide";
import { Component } from "./names.js";

// ============================================
// SHARED HELPERS
// ============================================

/**
 * Parse container function arguments that support two overload patterns:
 * 1. (params, ...children)
 * 2. (...children)
 *
 * Discriminates params object from nodes by checking for 'type' and 'componentName' fields.
 */
function parseContainerArgs<TParams>(args: any[]): { params: TParams; children: SlideNode[] } {
  if (args[0] && typeof args[0] === "object" && !("type" in args[0]) && !("componentName" in args[0])) {
    return {
      params: args[0] as TParams,
      children: args.slice(1),
    };
  }
  return {
    params: {} as TParams,
    children: args,
  };
}

// ============================================
// ROW
// ============================================

export type RowParams = {
  width?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
  spacing: number;
  spacingMode?: SpacingMode;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment; // justify-content: left (flex-start), center, right (flex-end)
  padding?: number; // inches - internal padding on all sides
};

export const rowComponent = defineComponent({
  name: Component.Row,
  children: true,
  directive: false,
  tokens: {},

  render: (params: RowParams, children: SlideNode[], _context: RenderContext) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children,
    width: params.width ?? SIZE.FILL,
    height: params.height ?? SIZE.HUG,
    spacing: params.spacing,
    spacingMode: params.spacingMode,
    vAlign: params.vAlign ?? VALIGN.TOP, // Explicit default: pure alignment (not CSS stretch)
    hAlign: params.hAlign ?? HALIGN.LEFT, // Explicit default for consistent measurement
    padding: params.padding,
  }),
});

export function row(params: RowParams, ...children: SlideNode[]): ComponentNode {
  return component(Component.Row, params, children);
}

// ============================================
// COLUMN
// ============================================

export type ColumnParams = {
  width?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
  spacing: number;
  spacingMode?: SpacingMode;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number; // inches - internal padding on all sides
};

export const columnComponent = defineComponent({
  name: Component.Column,
  children: true,
  directive: false,
  tokens: {},

  render: (params: ColumnParams, children: SlideNode[], _context: RenderContext) => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children,
    width: params.width ?? SIZE.FILL,
    height: params.height ?? SIZE.HUG,
    spacing: params.spacing,
    spacingMode: params.spacingMode,
    vAlign: params.vAlign ?? VALIGN.TOP, // Explicit default for consistent measurement
    hAlign: params.hAlign ?? HALIGN.LEFT, // Explicit default for consistent measurement
    padding: params.padding,
  }),
});

export function column(params: ColumnParams, ...children: SlideNode[]): ComponentNode {
  return component(Component.Column, params, children);
}

// ============================================
// STACK (z-order composition)
// ============================================

export type StackParams = {
  width?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: FILL
  height?: number | SizeValue; // inches, SIZE.FILL (share/stretch), or SIZE.HUG (content-sized). Default: HUG
};

export const stackComponent = defineComponent({
  name: Component.Stack,
  children: true,
  directive: false,
  tokens: {},

  render: (params: StackParams, children: SlideNode[]) => ({
    type: NODE_TYPE.STACK,
    children,
    width: params.width ?? SIZE.FILL,
    height: params.height ?? SIZE.HUG,
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
export function stack(params: StackParams, ...children: SlideNode[]): ComponentNode;
export function stack(...children: SlideNode[]): ComponentNode;
export function stack(...args: any[]): ComponentNode {
  const { params, children } = parseContainerArgs<StackParams>(args);
  return component(Component.Stack, params, children);
}

// ============================================
// GRID (equal-column grid with cross-sibling height coordination)
// ============================================

export type GridParams = {
  columns: number;
  spacing: number;
  height?: number | SizeValue; // inches, SIZE.FILL (equal rows), or SIZE.HUG (content-sized rows). Default: FILL
};

export const gridComponent = defineComponent({
  name: Component.Grid,
  children: true,
  directive: false,
  tokens: {},
  render: (params: GridParams, children: SlideNode[]) => {
    const { columns, spacing, height = SIZE.FILL } = params;

    return {
      type: NODE_TYPE.GRID,
      children,
      columns,
      spacing,
      width: SIZE.FILL as SizeValue,
      height,
    };
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
 * grid({ columns: 3, spacing: 0.25 }, ...cards)                  // fill-height rows
 * grid({ columns: 2, spacing: 0.25, height: SIZE.HUG }, ...items) // content-sized rows
 * grid({ columns: 2, spacing: 0.125, height: SIZE.HUG }, ...)     // tight content grid
 * ```
 */
export function grid(params: GridParams, ...children: SlideNode[]): ComponentNode {
  return component(Component.Grid, params, children);
}
