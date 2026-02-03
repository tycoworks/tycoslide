// Table Component
// Renders a table using grid primitives for cells with line-drawn borders

import { BORDER_STYLE, SHAPE, ALIGN, DIRECTION, type AlignContext, type Align, type BorderStyle, type Component, type Drawer, type Bounds, type Theme } from '../core/types.js';
import { GridColumn, GridRow } from '../core/layout.js';
import { Text } from './text.js';
import type { Canvas } from '../core/canvas.js';

// Cells can be Components or strings (strings auto-wrapped in text())
export type TableCell = Component | string;
export type TableData = TableCell[][];

export interface TableProps {
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderWidth?: number;
  cellPadding?: number;
  headerRow?: boolean;  // Apply header styling to first row (default: true)
  columnWidths?: number[];  // Flex ratios for column widths (e.g., [1, 3, 3])
}

// ============================================
// PADDED CONTENT WRAPPER
// ============================================

class PaddedContent implements Component {
  constructor(private content: Component, private padding: number) {}

  private measure(width: number, min: boolean): number {
    const innerW = width - this.padding * 2;
    return this.padding * 2 + (min ? this.content.getMinHeight(innerW) : this.content.getHeight(innerW));
  }

  getHeight(width: number): number { return this.measure(width, false); }
  getMinHeight(width: number): number { return this.measure(width, true); }

  getWidth(height: number): number {
    const innerH = height - this.padding * 2;
    return this.padding * 2 + (this.content.getWidth?.(innerH) ?? 0);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const inner = bounds.inset(this.padding);
    return this.content.prepare(inner, alignContext);
  }
}

// ============================================
// TABLE CLASS
// ============================================

export class Table implements Component {
  private rows: GridRow[];
  private column: GridColumn;
  private ratios: number[];

  constructor(private theme: Theme, data: TableData, private props: TableProps = {}) {
    const padding = props.cellPadding ?? theme.spacing.cellPadding;
    const useHeaderRow = props.headerRow ?? true;
    const numCols = data[0]?.length ?? 0;

    this.ratios = (props.columnWidths?.length === numCols)
      ? props.columnWidths : Array(numCols).fill(1);

    this.rows = data.map((row, rowIndex) => {
      const headerColor = (rowIndex === 0 && useHeaderRow) ? theme.colors.secondary : undefined;
      const cells = row.map(cell => {
        const component = typeof cell === 'string'
          ? (headerColor ? new Text(theme, cell, { color: headerColor }) : new Text(theme, cell))
          : cell;
        return new PaddedContent(component, padding);
      });
      return new GridRow(cells, this.ratios, 0, ALIGN.START);
    });

    this.column = new GridColumn(this.rows, undefined, 0, ALIGN.START);
  }

  getHeight(width: number): number { return this.column.getHeight(width); }
  getMinHeight(width: number): number { return this.column.getMinHeight(width); }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    // Calculate vertical offset for cross-axis alignment when inside a row
    let yOffset = 0;
    const contentHeight = this.getHeight(bounds.w);
    if (alignContext?.direction === DIRECTION.ROW && contentHeight < bounds.h) {
      const offsetMap: Record<Align, number> = {
        [ALIGN.START]: 0,
        [ALIGN.CENTER]: (bounds.h - contentHeight) / 2,
        [ALIGN.END]: bounds.h - contentHeight,
      };
      yOffset = offsetMap[alignContext.align];
    }

    // Apply offset to bounds
    const adjustedBounds = bounds.offset(0, yOffset);

    // Get computed positions from grid for border drawing
    const rowSlots = this.column.getSlots(adjustedBounds);
    const colSlots = this.rows[0].getSlots(rowSlots[0]);

    const rowYPositions = rowSlots.map(b => b.y);
    const lastRow = rowSlots[rowSlots.length - 1];
    const bottomY = lastRow.y + lastRow.h;
    const colWidths = colSlots.map(b => b.w);

    // Column handles all child measurement and positioning
    const drawContent = this.column.prepare(adjustedBounds);

    return (canvas) => {
      drawContent(canvas);
      this.drawBorders(canvas, adjustedBounds, rowYPositions, bottomY, colWidths);
    };
  }

  private drawBorders(
    canvas: Canvas,
    bounds: Bounds,
    rowYPositions: number[],
    bottomY: number,
    columnWidths: number[],
  ): void {
    const color = this.props.borderColor ?? this.theme.colors.secondary;
    const lineWidth = this.props.borderWidth ?? this.theme.borders.width;
    const style = this.props.borderStyle ?? BORDER_STYLE.FULL;

    if (style === BORDER_STYLE.NONE) return;

    const lineOpts = { color, width: lineWidth };
    const tableHeight = bottomY - bounds.y;

    // Horizontal lines between rows
    for (let i = 1; i < rowYPositions.length; i++) {
      canvas.addShape(SHAPE.LINE, {
        x: bounds.x, y: rowYPositions[i], w: bounds.w, h: 0, line: lineOpts
      });
    }

    // Outer horizontal lines (unless internal-only)
    if (style !== BORDER_STYLE.INTERNAL) {
      canvas.addShape(SHAPE.LINE, { x: bounds.x, y: bounds.y, w: bounds.w, h: 0, line: lineOpts });
      canvas.addShape(SHAPE.LINE, { x: bounds.x, y: bottomY, w: bounds.w, h: 0, line: lineOpts });
    }

    // Vertical lines (skip for horizontal-only style)
    if (style === BORDER_STYLE.HORIZONTAL) return;

    // Vertical lines between columns (at cell boundaries)
    let x = bounds.x;
    for (let c = 0; c < columnWidths.length - 1; c++) {
      x += columnWidths[c];
      canvas.addShape(SHAPE.LINE, { x, y: bounds.y, w: 0, h: tableHeight, line: lineOpts });
    }

    // Outer vertical lines (unless internal-only)
    if (style !== BORDER_STYLE.INTERNAL) {
      canvas.addShape(SHAPE.LINE, { x: bounds.x, y: bounds.y, w: 0, h: tableHeight, line: lineOpts });
      canvas.addShape(SHAPE.LINE, { x: bounds.x + bounds.w, y: bounds.y, w: 0, h: tableHeight, line: lineOpts });
    }
  }
}
