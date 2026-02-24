// Table Component - Native pptxgenjs table element

import {
  componentRegistry, component, type ComponentNode, type ExpansionContext, type SchemaShape,
  CONTENT, SYNTAX, NODE_TYPE, TABLE_TOKEN,
  type TextNode, type TableCellData, type TableTokens, type TextContent,
  schema, markdown,
} from 'tycoslide';
import { Component } from './names.js';
import type { Table as MdastTable, RootContent } from 'mdast';
import type { Root } from 'mdast';

// ============================================
// TABLE COMPONENT
// ============================================

export interface TableProps {
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

/**
 * Parse a GFM table string into rows of cell strings.
 * Preserves inline markdown (bold, accents, etc.) in cell text.
 */
function parseGfmTable(body: string): string[][] {
  const tree = markdown.parse(body);
  const tableChild = tree.children.find(c => c.type === SYNTAX.TABLE);
  if (!tableChild) {
    throw new Error(':::table body must contain a GFM table (| col1 | col2 | ...)');
  }
  const tableNode = tableChild as unknown as MdastTable;
  return tableNode.children.map(row =>
    row.children.map(cell => {
      const children = cell.children;
      if (children.length === 0) return '';
      const start = children[0].position?.start.offset;
      const end = children[children.length - 1].position?.end.offset;
      if (start == null || end == null) return '';
      return body.slice(start, end).trim();
    })
  );
}

/** Params accepted from :::table directive attributes. */
const tableDirectiveSchema = {
  variant: schema.string().optional(),
  headerColumns: schema.number().optional(),
} satisfies SchemaShape;

componentRegistry.define({
  name: Component.Table,
  params: tableDirectiveSchema,
  tokens: [TABLE_TOKEN.BORDER_STYLE, TABLE_TOKEN.BORDER_COLOR, TABLE_TOKEN.BORDER_WIDTH, TABLE_TOKEN.HEADER_BACKGROUND, TABLE_TOKEN.HEADER_BACKGROUND_OPACITY, TABLE_TOKEN.HEADER_TEXT_STYLE, TABLE_TOKEN.CELL_BACKGROUND, TABLE_TOKEN.CELL_BACKGROUND_OPACITY, TABLE_TOKEN.CELL_TEXT_STYLE, TABLE_TOKEN.CELL_PADDING, TABLE_TOKEN.HALIGN, TABLE_TOKEN.VALIGN],
  mdast: {
    nodeTypes: [SYNTAX.TABLE],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      const tableNode = node as unknown as MdastTable;
      const rows = tableNode.children.map(row =>
        row.children.map(cell => {
          const children = cell.children;
          if (children.length === 0) return '';
          const start = children[0].position?.start.offset;
          const end = children[children.length - 1].position?.end.offset;
          if (start == null || end == null) return '';
          return source.slice(start, end).trim();
        })
      );
      return component(Component.Table, { data: rows, tableProps: { headerRows: 1 } });
    },
  },
  expand: (async (props: TableInternalProps & { body?: string; headerColumns?: number }, context: ExpansionContext, tokens: TableTokens) => {
    // Determine data source: structured (DSL) or body string (directive)
    let data: (TableCellData | TextContent)[][];
    let headerRows: number | undefined;
    let headerColumns: number | undefined;

    if ('data' in props && props.data) {
      // DSL path — structured data
      data = props.data;
      headerRows = props.tableProps?.headerRows;
      headerColumns = props.tableProps?.headerColumns;
    } else if (props.body) {
      // Directive path — parse GFM body string
      data = parseGfmTable(props.body);
      headerRows = 1; // GFM tables always have a header row
      headerColumns = props.headerColumns;
    } else {
      throw new Error('Table requires either data (DSL) or body (directive)');
    }

    // Expand string content through the markdown component to support
    // rich text (**bold**, *italic*, :accent[highlights]) in table cells.
    const expandContent = async (content: TextContent): Promise<TextContent> => {
      if (typeof content === 'string') {
        const expanded = await componentRegistry.expand(
          component(Component.Text, { body: content, content: CONTENT.PROSE }),
          context,
        ) as TextNode;
        return expanded.content;
      }
      return content;
    };

    // Normalize cells: convert plain strings/TextContent to TableCellData
    const rows: TableCellData[][] = await Promise.all(data.map(row =>
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
      headerRows,
      headerColumns,
      style: tokens,
    };
  }) as any,
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
