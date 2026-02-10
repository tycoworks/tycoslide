// Declarative DSL
// Simple factory functions that return pure data nodes

import {
  NODE_TYPE,
  type TextNode,
  type ImageNode,
  type LineNode,
  type SlideNumberNode,
  type TableNode,
  type TableCellData,
  type TableStyleProps,
  type RowNode,
  type ColumnNode,
  type StackNode,
  type RectangleNode,
  type RectangleBorder,
  type ElementNode,
  type SlideContent,
  type ComponentNode,
} from './nodes.js';
import type {
  TextContent,
  TextStyleName,
  HorizontalAlignment,
  VerticalAlignment,
  GapSize,
  ArrowType,
  DashType,
  SizeValue,
} from './types.js';
import { TEXT_STYLE, VALIGN, HALIGN, SIZE } from './types.js';

// ============================================
// TEXT
// ============================================

export interface TextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  lineHeightMultiplier?: number;
}

export function text(content: TextContent, props?: TextProps): TextNode {
  return {
    type: NODE_TYPE.TEXT,
    content,
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    vAlign: props?.vAlign ?? VALIGN.TOP,    // Explicit default for consistent measurement
    lineHeightMultiplier: props?.lineHeightMultiplier,
  };
}

// ============================================
// IMAGE
// ============================================

export interface ImageProps {
  alt?: string;
}

export function image(src: string, props?: ImageProps): ImageNode {
  return {
    type: NODE_TYPE.IMAGE,
    src,
    alt: props?.alt,
  };
}

// ============================================
// LINE
// ============================================

export interface LineProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

export function line(props?: LineProps): LineNode {
  return {
    type: NODE_TYPE.LINE,
    color: props?.color,
    width: props?.width,
    dashType: props?.dashType,
    beginArrow: props?.beginArrow,
    endArrow: props?.endArrow,
  };
}

// ============================================
// SLIDE NUMBER
// ============================================

export function slideNumber(props?: { style?: TextStyleName; color?: string; hAlign?: HorizontalAlignment }): SlideNumberNode {
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign,
  };
}

// ============================================
// CONTAINERS
// ============================================

export interface RowProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL (when inside another Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL to fill container height
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment; // justify-content: left (flex-start), center, right (flex-end)
  padding?: number;             // inches - internal padding on all sides
}

export function row(props: RowProps, ...children: SlideContent[]): RowNode;
export function row(...children: SlideContent[]): RowNode;
export function row(...args: any[]): RowNode {
  let props: RowProps = {};
  let children: SlideContent[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.ROW,
    children: children as ElementNode[],  // Safe: expanded before layout
    width: props.width,
    height: props.height,
    gap: props.gap,
    vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default: pure alignment (not CSS stretch)
    hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    padding: props.padding,
  };
}

export interface ColumnProps {
  width?: number | SizeValue;   // inches (number) or SIZE.FILL (when inside Row)
  height?: number | SizeValue;  // inches (number) or SIZE.FILL (when inside Column)
  gap?: GapSize;
  vAlign?: VerticalAlignment;
  hAlign?: HorizontalAlignment;
  padding?: number;             // inches - internal padding on all sides
}

export function column(props: ColumnProps, ...children: SlideContent[]): ColumnNode;
export function column(...children: SlideContent[]): ColumnNode;
export function column(...args: any[]): ColumnNode {
  let props: ColumnProps = {};
  let children: SlideContent[];

  if (args[0] && typeof args[0] === 'object' && !('type' in args[0])) {
    props = args[0];
    children = args.slice(1);
  } else {
    children = args;
  }

  return {
    type: NODE_TYPE.COLUMN,
    children: children as ElementNode[],  // Safe: expanded before layout
    width: props.width,
    height: props.height,
    gap: props.gap,
    vAlign: props.vAlign ?? VALIGN.TOP,    // Explicit default for consistent measurement
    hAlign: props.hAlign ?? HALIGN.LEFT,   // Explicit default for consistent measurement
    padding: props.padding,
  };
}

// ============================================
// STACK (z-order composition)
// ============================================

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
export function stack(...children: SlideContent[]): StackNode {
  return {
    type: NODE_TYPE.STACK,
    children: children as ElementNode[],  // Safe: expanded before layout
  };
}

// ============================================
// GRID (layout helper - chunks children into rows)
// ============================================

export interface GridProps {
  columns: number;
  gap?: GapSize;
}

/**
 * Grid arranges children into rows of N columns.
 * This is syntactic sugar that expands to column(row(...), row(...), ...).
 *
 * @example
 * ```typescript
 * // 4-column grid of icons
 * grid(4, ...icons.map(path => image(path)))
 *
 * // With gap control
 * grid({ columns: 3, gap: GAP.TIGHT }, ...cards)
 * ```
 */
export function grid(props: GridProps, ...children: SlideContent[]): ColumnNode;
export function grid(columns: number, ...children: SlideContent[]): ColumnNode;
export function grid(...args: any[]): ColumnNode {
  let columns: number;
  let gap: GapSize | undefined;
  let children: SlideContent[];

  if (typeof args[0] === 'number') {
    columns = args[0];
    children = args.slice(1);
  } else {
    const props = args[0] as GridProps;
    columns = props.columns;
    gap = props.gap;
    children = args.slice(1);
  }

  // Wrap each child in a column cell so items share row width equally
  // and images use width-based sizing (width: 100%, height from aspect-ratio)
  // instead of height-based sizing (which requires definite row height).
  const cells = children.map(child => column({ width: SIZE.FILL }, child));

  // Chunk cells into rows
  const rows: RowNode[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const rowChildren = cells.slice(i, i + columns);
    rows.push(gap !== undefined ? row({ gap }, ...rowChildren) : row(...rowChildren));
  }

  return gap !== undefined ? column({ gap }, ...rows) : column(...rows);
}

// ============================================
// RECTANGLE (visual primitive - pure shape, no children)
// ============================================

export interface RectangleProps {
  fill?: { color: string; opacity?: number };
  border?: RectangleBorder;
  cornerRadius?: number;
}

/** Rectangle is a pure visual shape - use stack() to layer content on top */
export function rectangle(props?: RectangleProps): RectangleNode {
  return {
    type: NODE_TYPE.RECTANGLE,
    fill: props?.fill,
    border: props?.border,
    cornerRadius: props?.cornerRadius,
  };
}

// ============================================
// CARD
// ============================================

export interface CardProps {
  image?: string;
  icon?: string;
  title?: string;
  titleStyle?: TextStyleName;
  titleColor?: string;
  description?: string;
  descriptionStyle?: TextStyleName;
  descriptionColor?: string;
  background?: boolean;          // Whether to show background (default: true)
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  padding?: number;
  gap?: GapSize;
  /** Custom children - if provided, overrides image/title/description */
  children?: SlideContent[];
}

export function card(props: CardProps): ComponentNode<CardProps> {
  return {
    type: NODE_TYPE.COMPONENT,
    componentName: 'card',
    props,
  };
}

// ============================================
// TABLE (native - renders via pptxgenjs addTable)
// ============================================

export interface TableProps {
  /** Proportional column widths (normalized internally) */
  columnWidths?: number[];
  /** Number of header rows (default: 0) */
  headerRows?: number;
  /** Number of header columns (default: 0) */
  headerColumns?: number;
  /** Table styling options */
  style?: TableStyleProps;
}

/**
 * Create a native table element that renders directly via pptxgenjs.
 *
 * Uses slide.addTable() for accurate borders, cell merging, and native text wrapping.
 *
 * @example
 * ```typescript
 * // Simple table with header row
 * table([
 *   [{ content: 'Name' }, { content: 'Role' }],
 *   [{ content: 'Alice' }, { content: 'Engineer' }],
 * ], { headerRows: 1, style: { headerBackground: 'E0E0E0' } })
 *
 * // Convenience: string arrays auto-convert to cells
 * table([
 *   ['Name', 'Role'],
 *   ['Alice', 'Engineer'],
 * ], { headerRows: 1 })
 * ```
 */
export function table(
  data: (TableCellData | TextContent)[][],
  props?: TableProps
): TableNode {
  // Normalize cells: convert plain strings/TextContent to TableCellData
  const rows: TableCellData[][] = data.map(row =>
    row.map(cell => {
      if (typeof cell === 'string' || Array.isArray(cell)) {
        return { content: cell };
      }
      // Check if it's already TableCellData (has 'content' property)
      if ('content' in cell) {
        return cell as TableCellData;
      }
      // It's a TextRun, wrap it
      return { content: cell };
    })
  );

  return {
    type: NODE_TYPE.TABLE,
    rows,
    columnWidths: props?.columnWidths,
    headerRows: props?.headerRows,
    headerColumns: props?.headerColumns,
    style: props?.style,
  };
}

