// TABLE Element Handler
// Layout logic for native table nodes (renders via pptxgenjs addTable)

import { NODE_TYPE, type TableNode, type TableCellData, type TextNode, type PositionedNode } from '../core/nodes.js';
import { TEXT_STYLE } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { log } from '../utils/log.js';

// ============================================
// CONSTANTS
// ============================================

/** Default cell padding in inches when not specified in style */
export const DEFAULT_CELL_PADDING = 0.05;

// ============================================
// SYNTHETIC TEXT NODES FOR MEASUREMENT
// ============================================

/**
 * Maps TableNode instances to their synthetic TextNodes (one per cell).
 * Uses WeakMap so nodes can be garbage collected.
 *
 * Structure: TableNode -> TextNode[][] (same shape as rows)
 */
const tableSyntheticNodes = new WeakMap<TableNode, TextNode[][]>();

/**
 * Get or create synthetic TextNodes for a TableNode's cells.
 * Each cell gets a TextNode with its content and styling for measurement.
 *
 * This allows the measurement pipeline to measure table cells
 * by delegating to TextNodes, without the pipeline needing to know
 * the internal implementation details.
 */
export function getTableCellSyntheticNodes(node: TableNode): TextNode[][] {
  let synthetics = tableSyntheticNodes.get(node);
  if (!synthetics) {
    synthetics = node.rows.map((row, rowIndex) =>
      row.map((cell: TableCellData) => {
        // Determine text style for this cell
        const isHeaderRow = (node.headerRows ?? 0) > rowIndex;
        const style = cell.textStyle ??
          (isHeaderRow ? node.style?.headerTextStyle : node.style?.cellTextStyle) ??
          TEXT_STYLE.BODY;

        const textNode: TextNode = {
          type: NODE_TYPE.TEXT,
          content: cell.content,
          style,
          hAlign: cell.hAlign ?? node.style?.hAlign,
          vAlign: cell.vAlign ?? node.style?.vAlign,
        };
        return textNode;
      })
    );
    tableSyntheticNodes.set(node, synthetics);
  }
  return synthetics;
}

/**
 * Get a flat array of all synthetic TextNodes for a table.
 * Useful for iterating during measurement collection.
 */
export function getTableCellSyntheticNodesFlat(node: TableNode): TextNode[] {
  const grid = getTableCellSyntheticNodes(node);
  return grid.flat();
}

// ============================================
// TABLE HANDLER
// ============================================

export const tableHandler: ElementHandler<TableNode> = {
  nodeType: NODE_TYPE.TABLE,

  /**
   * Compute table height using browser measurements.
   * Each cell's height is measured via synthetic TextNodes.
   */
  getHeight(node: TableNode, width: number, ctx: LayoutContext): number {
    const numRows = node.rows.length;
    if (numRows === 0) return 0;

    const syntheticGrid = getTableCellSyntheticNodes(node);
    const numCols = node.rows[0]?.length ?? 0;
    const cellPadding = node.style?.cellPadding ?? DEFAULT_CELL_PADDING;

    // Calculate height per row (max cell height in each row)
    let totalHeight = 0;
    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
      // Find max cell height in this row
      let maxCellHeight = 0;
      for (let colIndex = 0; colIndex < numCols; colIndex++) {
        const syntheticTextNode = syntheticGrid[rowIndex]?.[colIndex];
        if (!syntheticTextNode) continue;

        // Get measurement from pipeline
        if (!ctx.measurements?.has(syntheticTextNode)) {
          throw new Error(
            `No measurement for table cell [${rowIndex},${colIndex}]. ` +
            `Ensure slide is processed through TextMeasurementPipeline.`
          );
        }

        const result = ctx.measurements.get(syntheticTextNode)!;
        // Cell height = text height + padding (top + bottom)
        const cellHeight = result.totalHeight + cellPadding * 2;
        maxCellHeight = Math.max(maxCellHeight, cellHeight);
      }
      totalHeight += maxCellHeight;
    }

    log.layout._('HEIGHT table rows=%d width=%f -> %f', numRows, width, totalHeight);
    return totalHeight;
  },

  /**
   * Table min height equals measured height.
   */
  getMinHeight(node: TableNode, width: number, ctx: LayoutContext): number {
    return this.getHeight(node, width, ctx);
  },

  /**
   * Compute layout for TABLE.
   * Table is positioned at bounds, actual sizing handled by pptxgenjs.
   */
  computeLayout(node: TableNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
    const height = this.getHeight(node, bounds.w, ctx);

    log.layout._('LAYOUT table bounds={x=%f y=%f w=%f h=%f} rows=%d cols=%d',
      bounds.x, bounds.y, bounds.w, bounds.h,
      node.rows.length, node.rows[0]?.length ?? 0);

    // Constrain height to bounds.h if overflow
    const constrainedHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

    return {
      node,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: constrainedHeight,
    };
  },

  /**
   * Tables fill available width - no intrinsic width.
   */
  getIntrinsicWidth(_node: TableNode, _height: number, _ctx: LayoutContext): number {
    return 0;
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(tableHandler);
