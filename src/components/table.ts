// Table Component
// Renders a table using grid primitives for cells with line-drawn borders

import { BORDER_STYLE, SHAPE, ALIGN, HALIGN, VALIGN, Bounds, type BorderStyle, type Component, type Drawer, type Theme, type ColorName, type HorizontalAlignment, type VerticalAlignment, type AlignContext } from '../core/types.js';
import { alignOffset } from '../core/layout.js';
import { GridColumn, GridRow } from '../core/layout.js';
import { Text } from './text.js';
import type { Canvas } from '../core/canvas.js';
import type { TextMeasurer } from '../utils/text-measurer.js';

// ============================================
// CELL TYPES
// ============================================

/** Props for a cell with optional background fill and text color */
export interface CellProps {
  content: Component | string;
  fill?: ColorName;        // Theme color for background (e.g., COLOR_NAME.ACCENT1)
  fillOpacity?: number;    // 0-100 (default: theme.colors.subtleOpacity)
  textColor?: ColorName;   // Override text color (useful for contrast on bright fills)
}

// Cells can be Components, strings, or CellProps objects
export type TableCell = Component | string | CellProps;
export type TableData = TableCell[][];

/** Type guard for CellProps - exclude Components which also have a 'content' property */
function isCellProps(cell: TableCell): cell is CellProps {
  return typeof cell === 'object' && cell !== null && 'content' in cell && typeof (cell as unknown as Component).getHeight !== 'function';
}

export interface TableProps {
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderWidth?: number;
  cellPadding?: number;
  headerRow?: boolean;     // Apply header styling to first row (default: true)
  headerColumn?: boolean;  // Apply header styling to first column (default: false)
  columnWidths?: number[];  // Flex ratios for column widths (e.g., [1, 3, 3])
  hAlign?: HorizontalAlignment;  // Horizontal cell content alignment (default: HALIGN.LEFT)
  vAlign?: VerticalAlignment;    // Vertical cell content alignment (default: VALIGN.TOP)
}

// ============================================
// CELL CONTENT WRAPPER
// ============================================

/**
 * CellContent — The single interface between Table and cell content.
 *
 * Responsibilities:
 * 1. String → Text conversion (Table never sees Text)
 * 2. Padding
 * 3. Passes full cell bounds to component; component handles its own alignment via alignContext
 */
class CellContent implements Component {
  private inner: Component;

  constructor(
    theme: Theme,
    measurer: TextMeasurer,
    content: Component | string,
    private padding: number,
    private hAlign: HorizontalAlignment,
    private vAlign: VerticalAlignment,
    textColor?: string,
  ) {
    // String content gets explicit text alignment from table props
    if (typeof content === 'string') {
      this.inner = new Text(theme, measurer, content, { color: textColor, hAlign });
    } else {
      this.inner = content;
    }
  }

  private measure(width: number, min: boolean): number {
    const innerW = width - this.padding * 2;
    return this.padding * 2 + (min ? this.inner.getMinHeight(innerW) : this.inner.getHeight(innerW));
  }

  getHeight(width: number): number { return this.measure(width, false); }
  getMinHeight(width: number): number { return this.measure(width, true); }

  getWidth(height: number): number {
    const innerH = height - this.padding * 2;
    return this.padding * 2 + this.inner.getWidth(innerH);
  }

  prepare(bounds: Bounds): Drawer {
    const cell = bounds.inset(this.padding);
    const alignContext: AlignContext = { hAlign: this.hAlign, vAlign: this.vAlign };
    // Give component full cell bounds; it handles alignment via alignContext
    return this.inner.prepare(cell, alignContext);
  }
}


// ============================================
// TABLE CLASS
// ============================================

/** Stored fill info for a cell */
interface CellFill {
  color: string;
  opacity: number;
}

export class Table implements Component {
  private rows: GridRow[];
  private column: GridColumn;
  private ratios: number[];
  private cellFills: (CellFill | undefined)[][];

  constructor(private theme: Theme, private measurer: TextMeasurer, data: TableData, private props: TableProps = {}) {
    const padding = props.cellPadding ?? theme.spacing.cellPadding;
    const hAlign = props.hAlign ?? HALIGN.LEFT;
    const vAlign = props.vAlign ?? VALIGN.TOP;
    const useHeaderRow = props.headerRow ?? true;
    const useHeaderColumn = props.headerColumn ?? false;
    const numCols = data[0]?.length ?? 0;

    this.ratios = (props.columnWidths?.length === numCols)
      ? props.columnWidths : Array(numCols).fill(1);

    // Initialize cell fills array
    this.cellFills = [];

    this.rows = data.map((row, rowIndex) => {
      const rowFills: (CellFill | undefined)[] = [];

      const cells = row.map((cell, colIndex) => {
        // Extract content, fill, and text color from cell
        let content: Component | string;
        let fill: CellFill | undefined;
        let textColor: string | undefined;

        if (isCellProps(cell)) {
          content = cell.content;
          if (cell.fill) {
            fill = {
              color: theme.colors[cell.fill],
              opacity: cell.fillOpacity ?? theme.colors.subtleOpacity,
            };
          }
          if (cell.textColor) {
            textColor = theme.colors[cell.textColor];
          }
        } else {
          content = cell;
        }

        // Apply header styling if no explicit textColor and cell is in header row/column
        const isHeaderCell = (rowIndex === 0 && useHeaderRow) || (colIndex === 0 && useHeaderColumn);
        if (!textColor && isHeaderCell) {
          textColor = theme.colors.secondary;
        }

        rowFills.push(fill);

        // CellContent handles string→Text conversion, padding, and alignment
        return new CellContent(theme, this.measurer, content, padding, hAlign, vAlign, textColor);
      });

      this.cellFills.push(rowFills);
      return new GridRow(cells, this.ratios, 0, ALIGN.START);
    });

    this.column = new GridColumn(this.rows, undefined, 0, ALIGN.START);
  }

  getHeight(width: number): number { return this.column.getHeight(width); }
  getMinHeight(width: number): number { return this.column.getMinHeight(width); }
  getWidth(height: number): number { return this.column.getWidth(height); }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    // Calculate vertical offset for cross-axis alignment when inside a row
    let yOffset = 0;
    const contentHeight = this.getHeight(bounds.w);
    if (alignContext?.vAlign && contentHeight < bounds.h) {
      yOffset = alignOffset(bounds.h, contentHeight, alignContext.vAlign);
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
      this.drawCellFills(canvas, rowSlots, colWidths);
      drawContent(canvas);
      this.drawBorders(canvas, adjustedBounds, rowYPositions, bottomY, colWidths);
    };
  }

  private drawCellFills(
    canvas: Canvas,
    rowSlots: Bounds[],
    columnWidths: number[],
  ): void {
    for (let r = 0; r < this.cellFills.length; r++) {
      let x = rowSlots[r].x;
      for (let c = 0; c < this.cellFills[r].length; c++) {
        const fill = this.cellFills[r][c];
        if (fill) {
          canvas.addShape(SHAPE.RECT, {
            x,
            y: rowSlots[r].y,
            w: columnWidths[c],
            h: rowSlots[r].h,
            fill: { color: fill.color, transparency: 100 - fill.opacity },
          });
        }
        x += columnWidths[c];
      }
    }
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
