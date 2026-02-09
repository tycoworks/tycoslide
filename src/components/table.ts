// Table Component
// Implements table as a component using primitives: stack, row, column, rectangle, line, text

import { defineComponent, type ExpansionContext } from '../core/component-registry.js';
import { stack, row, column, rectangle, line, text } from '../core/dsl.js';
import { NODE_TYPE, type ElementNode, type TextNode } from '../core/nodes.js';
import type { TextContent, TextStyleName, HorizontalAlignment, VerticalAlignment, BorderStyle } from '../core/types.js';
import { TEXT_STYLE, GAP, SIZE } from '../core/types.js';
import { toTextContent } from '../utils/node.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for table */
export const TABLE_COMPONENT = 'table' as const;

// ============================================
// TYPES
// ============================================

/** Table cell can be plain text, styled text runs, or a TextNode */
export type TableCellContent = TextContent | TextNode;

export interface TableComponentProps {
  /** 2D array of cell content */
  data: TableCellContent[][];
  /** First row is header (different styling) */
  headerRow?: boolean;
  /** First column is header (different styling) */
  headerColumn?: boolean;
  /** Border style for grid lines */
  borderStyle?: BorderStyle;
  /** Background color for header cells */
  headerBackground?: string;
  /** Background color for regular cells */
  cellBackground?: string;
  /** Explicit column widths (proportional) - if not provided, columns are equal */
  columnWidths?: number[];
  /** Horizontal alignment for cell text */
  hAlign?: HorizontalAlignment;
  /** Vertical alignment for cell text */
  vAlign?: VerticalAlignment;
  /** Text style for cells */
  textStyle?: TextStyleName;
  /** Text style for header cells */
  headerTextStyle?: TextStyleName;
}

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Expand table props into primitive node tree.
 *
 * Structure:
 * ```
 * stack(
 *   gridLines,   // Lines behind content (z-index 0)
 *   contentRows  // Text content in front (z-index 1)
 * )
 * ```
 */
function expandTable(props: TableComponentProps, context: ExpansionContext): ElementNode {
  const {
    data,
    headerRow = false,
    headerColumn = false,
    headerBackground,
    cellBackground,
    columnWidths,
    hAlign,
    vAlign,
    textStyle = TEXT_STYLE.BODY,
    headerTextStyle = TEXT_STYLE.BODY,
  } = props;

  if (data.length === 0) {
    return column(); // Empty table
  }

  const numRows = data.length;
  const numCols = data[0]?.length || 0;

  // Build column width proportions (default to equal)
  const widths = columnWidths ?? Array(numCols).fill(1);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const normalizedWidths = widths.map(w => w / totalWidth);

  // Create the content layer (rows of cells)
  const contentRows = data.map((rowData, rowIndex) => {
    const cells = rowData.map((cellContent, colIndex) => {
      const isHeader = (headerRow && rowIndex === 0) || (headerColumn && colIndex === 0);
      const bgColor = isHeader ? headerBackground : cellBackground;
      const style = isHeader ? headerTextStyle : textStyle;

      // Build cell content
      const cellText = typeof cellContent === 'object' && 'type' in cellContent && cellContent.type === NODE_TYPE.TEXT
        ? cellContent as TextNode
        : text(toTextContent(cellContent), { style, hAlign, vAlign });

      const padding = context.theme.spacing.cellPadding;

      // With background: stack(rectangle, column with padding)
      // Use flex children (no explicit width) so cells share space equally
      if (bgColor) {
        return column(
          stack(
            rectangle({ fill: { color: bgColor } }),
            column({ padding }, cellText)
          )
        );
      }

      // No background - just column with padding
      return column(
        column({ padding }, cellText)
      );
    });

    return row({ gap: GAP.NONE }, ...cells);
  });

  // Create the grid lines layer
  const gridLines = createGridLines(numRows, numCols, context);

  // Stack: grid lines behind, content in front
  return stack(
    gridLines,
    column({ gap: GAP.NONE }, ...contentRows)
  );
}

/**
 * Create grid lines for the table.
 * Uses context-aware lines: vertical lines in rows, horizontal lines in columns.
 */
function createGridLines(numRows: number, numCols: number, context: ExpansionContext): ElementNode {
  // Build vertical dividers (one between each column pair)
  // We need (numCols - 1) vertical lines positioned between cells
  // Use empty columns as flex children - they share space equally
  const verticalDividers: ElementNode[] = [];
  for (let i = 0; i < numCols; i++) {
    if (i < numCols - 1) {
      // Spacer column, then line, then next spacer
      verticalDividers.push(column()); // Left cell space (flex child)
    }
    if (i < numCols - 1) {
      verticalDividers.push(line()); // Vertical line (in row context)
    }
  }
  // Add final column space
  if (numCols > 0) {
    verticalDividers.push(column()); // Flex child
  }

  // Build horizontal dividers (one between each row pair)
  // Use empty rows as flex children - they match content rows and share space equally
  const horizontalDividers: ElementNode[] = [];
  for (let i = 0; i < numRows; i++) {
    if (i > 0) {
      horizontalDividers.push(line()); // Horizontal line (in column context)
    }
    horizontalDividers.push(row()); // Spacer matching content row (flex child)
  }

  // Stack vertical and horizontal lines
  // Row needs SIZE.FILL to stretch to stack's height (cross-axis fill)
  return stack(
    row({ gap: GAP.NONE, height: SIZE.FILL }, ...verticalDividers),
    column({ gap: GAP.NONE, height: SIZE.FILL }, ...horizontalDividers)
  );
}

// ============================================
// COMPONENT REGISTRATION & DSL
// ============================================

/**
 * Create a table component node.
 *
 * @example
 * ```typescript
 * tableComponent({
 *   data: [
 *     ['Name', 'Role', 'Status'],
 *     ['Alice', 'Engineer', 'Active'],
 *     ['Bob', 'Designer', 'On leave'],
 *   ],
 *   headerRow: true,
 *   headerBackground: '#E0E0E0',
 * })
 * ```
 */
export const tableComponent = defineComponent<TableComponentProps>(TABLE_COMPONENT, expandTable);
