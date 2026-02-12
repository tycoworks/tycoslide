// Table Component - Native pptxgenjs table element

import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { NODE_TYPE, type TableCellData, type TableStyleProps } from '../core/nodes.js';
import type { TextContent } from '../core/types.js';

// ============================================
// TABLE COMPONENT
// ============================================

export const TABLE_COMPONENT = 'table' as const;

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

interface TableInternalProps {
  data: (TableCellData | TextContent)[][];
  tableProps?: TableProps;
}

componentRegistry.register({ name: TABLE_COMPONENT, expand: (props: TableInternalProps) => {
  // Normalize cells: convert plain strings/TextContent to TableCellData
  const rows: TableCellData[][] = props.data.map(row =>
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
    columnWidths: props.tableProps?.columnWidths,
    headerRows: props.tableProps?.headerRows,
    headerColumns: props.tableProps?.headerColumns,
    style: props.tableProps?.style,
  };
}});

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
): ComponentNode {
  return component(TABLE_COMPONENT, { data, tableProps: props });
}
