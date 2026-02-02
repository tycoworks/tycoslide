// Table Component
// Renders a table using Box layout for cells with line-drawn borders

import { DIRECTION, ALIGN, BORDER_STYLE, SHAPE, type AlignContext, type BorderStyle, type Component, type Drawer, type Bounds, type Theme } from '../core/types.js';
import { box, type Box } from '../core/box.js';
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

  getHeight(width: number): number {
    return this.padding * 2 + this.content.getHeight(width - this.padding * 2);
  }

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
  private _box?: Box;

  constructor(private theme: Theme, private data: TableData, private props: TableProps = {}) {}

  private normalizeCell(cell: TableCell, headerColor?: string): Component {
    if (typeof cell === 'string') {
      return headerColor ? new Text(this.theme, cell, { color: headerColor }) : new Text(this.theme, cell);
    }
    return cell;
  }

  private getNumCols(): number {
    return this.data[0]?.length ?? 0;
  }

  private getFlexRatios(): number[] {
    const numCols = this.getNumCols();
    const ratios = this.props.columnWidths;
    if (ratios && ratios.length === numCols) return ratios;
    return Array(numCols).fill(1);
  }

  /**
   * Get the visual width of each column (for border drawing)
   */
  private getColumnWidths(tableWidth: number): number[] {
    const ratios = this.getFlexRatios();
    const total = ratios.reduce((sum, r) => sum + r, 0);
    return ratios.map(r => (r / total) * tableWidth);
  }

  private getBox(): Box {
    if (!this._box) {
      const padding = this.props.cellPadding ?? this.theme.spacing.cellPadding;
      const useHeaderRow = this.props.headerRow ?? true;
      const ratios = this.getFlexRatios();

      const rowBoxes: Box[] = [];
      for (let rowIndex = 0; rowIndex < this.data.length; rowIndex++) {
        const row = this.data[rowIndex];
        const headerColor = (rowIndex === 0 && useHeaderRow) ? this.theme.colors.secondary : undefined;

        const cellBoxes: Box[] = [];
        for (let col = 0; col < row.length; col++) {
          const component = this.normalizeCell(row[col], headerColor);
          cellBoxes.push(box({
            flex: ratios[col],
            content: new PaddedContent(component, padding),
          }));
        }

        rowBoxes.push(box({
          direction: DIRECTION.ROW,
          align: ALIGN.CENTER,
          children: cellBoxes,
        }));
      }

      this._box = box({
        direction: DIRECTION.COLUMN,
        children: rowBoxes,
      });
    }
    return this._box;
  }

  getHeight(width: number): number {
    return this.getBox().getHeight(width);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const tableBox = this.getBox();

    // Get row positions from Box layout (single tree, consistent positioning)
    const rowBounds = tableBox.getChildBounds(bounds);
    const rowYPositions = rowBounds.map(b => b.y);
    const lastRow = rowBounds[rowBounds.length - 1];
    const bottomY = lastRow.y + lastRow.h;

    // Compute column widths for border drawing
    const columnWidths = this.getColumnWidths(bounds.w);

    // Delegate content layout to Box
    const contentDrawer = tableBox.prepare(bounds, alignContext);

    return (canvas) => {
      contentDrawer(canvas);
      this.drawBorders(canvas, bounds, rowYPositions, bottomY, columnWidths);
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
