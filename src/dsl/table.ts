// Table Component - Native pptxgenjs table element

import { componentRegistry, component, type ComponentNode, type ExpansionContext } from '../core/registry.js';
import { Component } from '../core/types.js';
import { NODE_TYPE, type TextNode, type TableCellData, type TableStyleProps } from '../core/nodes.js';
import type { Theme, TextContent } from '../core/types.js';
import { SYNTAX, extractInlineText, type ContainerDirective } from '../core/mdast.js';
import type { Table as MdastTable } from 'mdast';

// ============================================
// TABLE COMPONENT
// ============================================

export type TableTokens = TableStyleProps;

export interface TableProps {
  /** Proportional column widths (normalized internally) */
  columnWidths?: number[];
  /** Number of header rows (default: 0) */
  headerRows?: number;
  /** Number of header columns (default: 0) */
  headerColumns?: number;
}

interface TableInternalProps {
  data: (TableCellData | TextContent)[][];
  tableProps?: TableProps;
  variant?: string;
}

function tableDefaults(theme: Theme): TableTokens {
  const tokens: TableTokens = {
    borderStyle: 'full',
    borderColor: theme.colors.secondary,
    borderWidth: theme.borders.width,
    cellPadding: theme.spacing.cellPadding,
    cellTextStyle: 'body',
    headerTextStyle: 'body',
  };
  return tokens;
}

/** Compile a :::table{variant="clean"} directive wrapping a GFM table body. */
function compileTableDirective(directive: ContainerDirective, _source: string, _body: string): ComponentNode {
  const children = directive.children;
  const tableChild = children.find(c => c.type === SYNTAX.TABLE);
  if (!tableChild) {
    throw new Error(':::table directive must contain a GFM table (| col1 | col2 | ...)');
  }
  const unexpected = children.filter(c => c.type !== SYNTAX.TABLE);
  if (unexpected.length > 0) {
    const types = unexpected.map(c => c.type).join(', ');
    throw new Error(
      `:::table directive must contain only a GFM table. ` +
      `Found unexpected content: ${types}. Move non-table content outside the directive.`,
    );
  }
  const tableNode = tableChild as unknown as MdastTable;
  const rows = tableNode.children.map(row =>
    row.children.map(cell => extractInlineText(cell.children))
  );
  const variant = directive.attributes?.variant || undefined;
  return table(rows, { headerRows: 1, variant });
}

componentRegistry.define({
  name: Component.Table,
  defaults: tableDefaults,
  expand: async (props: TableInternalProps, context: ExpansionContext, tokens: TableTokens) => {
    // Expand string content through the markdown component to support
    // rich text (**bold**, *italic*, :accent[highlights]) in table cells.
    const expandContent = async (content: TextContent): Promise<TextContent> => {
      if (typeof content === 'string') {
        const expanded = await componentRegistry.expand(
          component(Component.Markdown, { content }),
          context,
        ) as TextNode;
        return expanded.content;
      }
      return content;
    };

    // Normalize cells: convert plain strings/TextContent to TableCellData
    const rows: TableCellData[][] = await Promise.all(props.data.map(row =>
      Promise.all(row.map(async cell => {
        if (typeof cell === 'string' || Array.isArray(cell)) {
          return { content: await expandContent(cell) };
        }
        // Check if it's already TableCellData (has 'content' property)
        if ('content' in cell) {
          const tcd = cell as TableCellData;
          return { ...tcd, content: await expandContent(tcd.content) };
        }
        // It's a TextRun, wrap it
        return { content: cell };
      }))
    ));

    return {
      type: NODE_TYPE.TABLE,
      rows,
      columnWidths: props.tableProps?.columnWidths,
      headerRows: props.tableProps?.headerRows,
      headerColumns: props.tableProps?.headerColumns,
      style: tokens,
    };
  },
  directive: {
    compile: compileTableDirective,
  },
});

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
 * ], { headerRows: 1 })
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
  props?: TableProps & { variant?: string }
): ComponentNode {
  return component(Component.Table, { data, tableProps: props, variant: props?.variant });
}
