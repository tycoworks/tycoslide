// Table Component
// Renders a table using lines for borders and components for cell content
// Uses fontkit-based measurement for precise dimension control

import { BORDER_STYLE, SHAPE, type AlignContext, type BorderStyle, type Component, type Drawer, type Bounds, type Theme } from '../core/types.js';
import { Text } from './text.js';

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

export class Table implements Component {
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

  /**
   * Get the visual width of each column (including internal padding)
   */
  private getColumnWidths(tableWidth: number): number[] {
    const numCols = this.getNumCols();
    if (numCols === 0) return [];

    const ratios = this.props.columnWidths;
    if (!ratios || ratios.length !== numCols) {
      // Default: equal widths
      return Array(numCols).fill(tableWidth / numCols);
    }

    const total = ratios.reduce((sum, r) => sum + r, 0);
    return ratios.map(r => (r / total) * tableWidth);
  }

  getMinimumHeight(width: number): number {
    const padding = this.props.cellPadding ?? this.theme.spacing.cellPadding;
    const columnWidths = this.getColumnWidths(width);
    const useHeaderRow = this.props.headerRow ?? true;
    let totalHeight = 0;

    for (let rowIndex = 0; rowIndex < this.data.length; rowIndex++) {
      const row = this.data[rowIndex];
      const headerColor = (rowIndex === 0 && useHeaderRow) ? this.theme.colors.secondary : undefined;
      let maxCellHeight = 0;
      for (let col = 0; col < row.length; col++) {
        const contentWidth = columnWidths[col] - padding * 2;
        const component = this.normalizeCell(row[col], headerColor);
        const h = component.getMinimumHeight?.(contentWidth) ?? 0;
        maxCellHeight = Math.max(maxCellHeight, h);
      }
      totalHeight += maxCellHeight + padding * 2;
    }
    return totalHeight;
  }

  getMaximumHeight(width: number): number {
    return this.getMinimumHeight(width);  // Fixed height
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const padding = this.props.cellPadding ?? this.theme.spacing.cellPadding;
    const columnWidths = this.getColumnWidths(bounds.w);
    const useHeaderRow = this.props.headerRow ?? true;

    const cellDrawers: Drawer[] = [];
    const rowYPositions: number[] = [];
    let y = bounds.y;

    for (let rowIndex = 0; rowIndex < this.data.length; rowIndex++) {
      const row = this.data[rowIndex];
      const headerColor = (rowIndex === 0 && useHeaderRow) ? this.theme.colors.secondary : undefined;
      rowYPositions.push(y);

      // Find max cell height for this row
      let maxCellHeight = 0;
      for (let col = 0; col < row.length; col++) {
        const contentWidth = columnWidths[col] - padding * 2;
        const component = this.normalizeCell(row[col], headerColor);
        const h = component.getMinimumHeight?.(contentWidth) ?? 0;
        maxCellHeight = Math.max(maxCellHeight, h);
      }

      // Prepare each cell in the row (vertically centered)
      let x = bounds.x;
      for (let col = 0; col < row.length; col++) {
        const colWidth = columnWidths[col];
        const contentWidth = colWidth - padding * 2;
        const component = this.normalizeCell(row[col], headerColor);
        const contentHeight = component.getMinimumHeight?.(contentWidth) ?? 0;
        const verticalOffset = (maxCellHeight - contentHeight) / 2;
        const cellBounds = {
          x: x + padding,
          y: y + padding + verticalOffset,
          w: contentWidth,
          h: contentHeight,
        };
        cellDrawers.push(component.prepare(cellBounds, alignContext));
        x += colWidth;
      }

      y += maxCellHeight + padding * 2;
    }

    const bottomY = y;

    return (canvas) => {
      for (const drawer of cellDrawers) drawer(canvas);
      this.drawBorders(canvas, bounds, rowYPositions, bottomY, columnWidths);
    };
  }

  private drawBorders(
    canvas: { addShape: (type: string, opts: Record<string, unknown>) => void },
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
