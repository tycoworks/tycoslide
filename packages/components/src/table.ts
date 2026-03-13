// Table Component - Native pptxgenjs table element

import type { Table as MdastTable, RootContent } from "mdast";
import {
  type BorderStyle,
  type ComponentNode,
  component,
  componentRegistry,
  defineComponent,
  type ExpansionContext,
  type HorizontalAlignment,
  NODE_TYPE,
  parseMarkdown,
  type SchemaShape,
  SYNTAX,
  schema,
  type TableCellData,
  type TableCellInput,
  type TextContent,
  type TextNode,
  type TextStyleName,
  token,
  type TokenShape,
  type VerticalAlignment,
} from "tycoslide";
import { Component } from "./names.js";
import type { TextTokens } from "./text.js";

// ============================================
// TABLE TOKENS
// ============================================

export const TABLE_TOKEN = {
  BORDER_STYLE: "borderStyle",
  BORDER_COLOR: "borderColor",
  BORDER_WIDTH: "borderWidth",
  HEADER_BACKGROUND: "headerBackground",
  HEADER_BACKGROUND_OPACITY: "headerBackgroundOpacity",
  HEADER_TEXT_STYLE: "headerTextStyle",
  CELL_BACKGROUND: "cellBackground",
  CELL_BACKGROUND_OPACITY: "cellBackgroundOpacity",
  CELL_TEXT_STYLE: "cellTextStyle",
  CELL_PADDING: "cellPadding",
  HALIGN: "hAlign",
  VALIGN: "vAlign",
  CELL_LINE_HEIGHT: "cellLineHeight",
  HEADER_TEXT_COLOR: "headerTextColor",
  CELL_TEXT_COLOR: "cellTextColor",
  LINK_COLOR: "linkColor",
  LINK_UNDERLINE: "linkUnderline",
  ACCENTS: "accents",
} as const;

export type TableTokens = {
  [TABLE_TOKEN.BORDER_STYLE]: BorderStyle;
  [TABLE_TOKEN.BORDER_COLOR]: string;
  [TABLE_TOKEN.BORDER_WIDTH]: number;
  [TABLE_TOKEN.HEADER_BACKGROUND]: string;
  [TABLE_TOKEN.HEADER_BACKGROUND_OPACITY]: number;
  [TABLE_TOKEN.HEADER_TEXT_STYLE]: TextStyleName;
  [TABLE_TOKEN.HEADER_TEXT_COLOR]: string;
  [TABLE_TOKEN.CELL_BACKGROUND]: string;
  [TABLE_TOKEN.CELL_BACKGROUND_OPACITY]: number;
  [TABLE_TOKEN.CELL_TEXT_STYLE]: TextStyleName;
  [TABLE_TOKEN.CELL_TEXT_COLOR]: string;
  [TABLE_TOKEN.CELL_PADDING]: number;
  [TABLE_TOKEN.HALIGN]: HorizontalAlignment;
  [TABLE_TOKEN.VALIGN]: VerticalAlignment;
  [TABLE_TOKEN.CELL_LINE_HEIGHT]: number;
  [TABLE_TOKEN.LINK_COLOR]: string;
  [TABLE_TOKEN.LINK_UNDERLINE]: boolean;
  [TABLE_TOKEN.ACCENTS]: Record<string, string>;
};

export const TABLE_TOKEN_SPEC: TokenShape = token.allRequired(TABLE_TOKEN)

// ============================================
// TABLE COMPONENT
// ============================================

export type TableProps = {
  /** Number of header rows (default: 0) */
  headerRows?: number;
  /** Number of header columns (default: 0) */
  headerColumns?: number;
};

interface TableInternalProps {
  data?: (TableCellInput | TextContent)[][];
  tableProps?: TableProps;
}

/**
 * Parse a GFM table string into rows of cell strings.
 * Preserves inline markdown (bold, accents, etc.) in cell text.
 */
function parseGfmTable(body: string): string[][] {
  const tree = parseMarkdown(body);
  const tableChild = tree.children.find((c) => c.type === SYNTAX.TABLE);
  if (!tableChild) {
    throw new Error(":::table body must contain a GFM table (| col1 | col2 | ...)");
  }
  const tableNode = tableChild as unknown as MdastTable;
  return tableNode.children.map((row) =>
    row.children.map((cell) => {
      const children = cell.children;
      if (children.length === 0) return "";
      const start = children[0].position?.start.offset;
      const end = children[children.length - 1].position?.end.offset;
      if (start == null || end == null) return "";
      return body.slice(start, end).trim();
    }),
  );
}

/** Params accepted from :::table directive attributes. */
const tableSchema = {
  headerColumns: schema.number().optional(),
} satisfies SchemaShape;

export const tableComponent = defineComponent({
  name: Component.Table,
  params: tableSchema,
  tokens: TABLE_TOKEN_SPEC,
  mdast: {
    nodeTypes: [SYNTAX.TABLE],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      const tableNode = node as unknown as MdastTable;
      const rows = tableNode.children.map((row) =>
        row.children.map((cell) => {
          const children = cell.children;
          if (children.length === 0) return "";
          const start = children[0].position?.start.offset;
          const end = children[children.length - 1].position?.end.offset;
          if (start == null || end == null) return "";
          return source.slice(start, end).trim();
        }),
      );
      return component(Component.Table, { data: rows, tableProps: { headerRows: 1 } });
    },
  },
  expand: async (
    props: TableInternalProps & { body?: string; headerColumns?: number },
    context: ExpansionContext,
    tokens: TableTokens,
  ) => {
    // Determine data source: structured (DSL) or body string (directive)
    let data: (TableCellInput | TextContent)[][];
    let headerRows: number | undefined;
    let headerColumns: number | undefined;

    if ("data" in props && props.data) {
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
      throw new Error("Table requires either data (DSL) or body (directive)");
    }

    // Derive text tokens from table tokens for child text components.
    const textTokens: TextTokens = {
      color: tokens.cellTextColor,
      style: tokens.cellTextStyle,
      linkColor: tokens.linkColor,
      linkUnderline: tokens.linkUnderline,
      hAlign: tokens.hAlign,
      vAlign: tokens.vAlign,
      accents: tokens.accents,
    };

    // Expand string content through the markdown component to support
    // rich text (**bold**, *italic*, :accent[highlights]) in table cells.
    const expandContent = async (content: TextContent): Promise<TextContent> => {
      if (typeof content === "string") {
        const expanded = await componentRegistry.expandTree(
          component(Component.Text, { body: content }, textTokens),
          context,
        );
        if (expanded.type !== NODE_TYPE.TEXT) {
          throw new Error(`Expected TextNode from text component, got ${expanded.type}`);
        }
        return (expanded as TextNode).content;
      }
      return content;
    };

    // Normalize cells: convert plain strings/TextContent to fully-resolved TableCellData
    const headerRowCount = headerRows ?? 0;
    const headerColumnCount = headerColumns ?? 0;
    const rows: TableCellData[][] = await Promise.all(
      data.map((row, rowIndex) =>
        Promise.all(
          row.map(async (cell, colIndex) => {
            // Extract partial cell data from input
            let partialColor: string | undefined;
            let partialTextStyle: TextStyleName | undefined;
            let partialHAlign: HorizontalAlignment | undefined;
            let partialVAlign: VerticalAlignment | undefined;
            let content: TextContent;
            let colspan: number | undefined;
            let rowspan: number | undefined;
            let fill: string | undefined;

            if (typeof cell === "string" || Array.isArray(cell)) {
              content = await expandContent(cell);
            } else if ("content" in cell) {
              const tcd = cell as TableCellInput;
              content = await expandContent(tcd.content);
              partialColor = tcd.color;
              partialTextStyle = tcd.textStyle;
              partialHAlign = tcd.hAlign;
              partialVAlign = tcd.vAlign;
              colspan = tcd.colspan;
              rowspan = tcd.rowspan;
              fill = tcd.fill;
            } else {
              content = cell;
            }

            // Resolve cascade: cell → table tokens → theme defaults
            const isHeader = rowIndex < headerRowCount || colIndex < headerColumnCount;
            const textStyle = partialTextStyle ?? (isHeader ? tokens.headerTextStyle : tokens.cellTextStyle);
            const resolvedTextStyle = context.theme.textStyles[textStyle];
            const color = partialColor ?? (isHeader ? tokens.headerTextColor : tokens.cellTextColor);
            const hAlign = partialHAlign ?? tokens.hAlign;
            const vAlign = partialVAlign ?? tokens.vAlign;

            const resolved: TableCellData = {
              content,
              color,
              textStyle,
              resolvedStyle: resolvedTextStyle,
              hAlign,
              vAlign,
              lineHeightMultiplier: tokens.cellLineHeight,
              linkColor: tokens.linkColor,
              linkUnderline: tokens.linkUnderline,
              ...(colspan != null && { colspan }),
              ...(rowspan != null && { rowspan }),
              ...(fill != null && { fill }),
            };
            return resolved;
          }),
        ),
      ),
    );

    return {
      type: NODE_TYPE.TABLE,
      rows,
      headerRows,
      headerColumns,
      borderStyle: tokens.borderStyle,
      borderColor: tokens.borderColor,
      borderWidth: tokens.borderWidth,
      headerBackground: tokens.headerBackground,
      headerBackgroundOpacity: tokens.headerBackgroundOpacity,
      cellBackground: tokens.cellBackground,
      cellBackgroundOpacity: tokens.cellBackgroundOpacity,
      cellPadding: tokens.cellPadding,
    };
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
export function table(data: (TableCellInput | TextContent)[][], props?: TableProps): ComponentNode {
  return component(Component.Table, { data, tableProps: props });
}
