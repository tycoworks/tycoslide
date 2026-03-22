// Table Component - Native pptxgenjs table element

import type { Table as MdastTable, RootContent } from "mdast";
import {
  type BorderStyle,
  type ComponentNode,
  component,
  componentRegistry,
  defineComponent,
  type HorizontalAlignment,
  type InferTokens,
  NODE_TYPE,
  param,
  parseMarkdown,
  type RenderContext,
  SHAPE,
  SIZE,
  SYNTAX,
  schema,
  type TableCellData,
  type TableCellInput,
  type TextContent,
  type TextNode,
  type TextStyleName,
  token,
  type VerticalAlignment,
} from "tycoslide";
import { column, stack } from "./containers.js";
import { Component } from "./names.js";
import { type ShapeTokens, shape } from "./primitives.js";
import type { TextTokens } from "./text.js";

// ============================================
// TABLE TOKENS
// ============================================

const tableTokens = token.shape({
  borderStyle: token.required<BorderStyle>(),
  borderColor: token.required<string>(),
  borderWidth: token.required<number>(),
  headerBackground: token.required<string>(),
  headerBackgroundOpacity: token.required<number>(),
  headerTextStyle: token.required<TextStyleName>(),
  headerTextColor: token.required<string>(),
  cellBackground: token.required<string>(),
  cellBackgroundOpacity: token.required<number>(),
  cellTextStyle: token.required<TextStyleName>(),
  cellTextColor: token.required<string>(),
  cellPadding: token.required<number>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  linkColor: token.required<string>(),
  linkUnderline: token.required<boolean>(),
  accents: token.required<Record<string, string>>(),
  background: token.optional<ShapeTokens>(),
  backgroundPadding: token.optional<number>(),
});

export type TableTokens = InferTokens<typeof tableTokens>;

// ============================================
// TABLE COMPONENT
// ============================================

export type TableParams = {
  /** Number of header rows (default: 0) */
  headerRows?: number;
  /** Number of header columns (default: 0) */
  headerColumns?: number;
};

const tableParamShape = param.shape({
  headerColumns: param.optional(schema.number()),
});

interface TableInternalParams {
  data?: (TableCellInput | TextContent)[][];
  tableParams?: TableParams;
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

export const tableComponent = defineComponent({
  name: Component.Table,
  content: schema.string().optional(),
  params: tableParamShape,
  tokens: tableTokens,
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
      return component(Component.Table, { data: rows, tableParams: { headerRows: 1 } });
    },
  },
  render: async (
    params: TableInternalParams & { headerColumns?: number },
    content: string | undefined,
    context: RenderContext,
    tokens: TableTokens,
  ) => {
    // Determine data source: structured (DSL) or content string (directive)
    let data: (TableCellInput | TextContent)[][];
    let headerRows: number | undefined;
    let headerColumns: number | undefined;

    if ("data" in params && params.data) {
      // DSL path — structured data
      data = params.data;
      headerRows = params.tableParams?.headerRows;
      headerColumns = params.tableParams?.headerColumns;
    } else if (content) {
      // Directive path — parse GFM content string
      data = parseGfmTable(content);
      headerRows = 1; // GFM tables always have a header row
      headerColumns = params.headerColumns;
    } else {
      throw new Error("Table requires either data (DSL) or content (directive)");
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

    // Resolve string content through the markdown component to support
    // rich text (**bold**, *italic*, :accent[highlights]) in table cells.
    const resolveContent = async (content: TextContent): Promise<TextContent> => {
      if (typeof content === "string") {
        const rendered = await componentRegistry.renderTree(
          component(Component.Text, {}, content, textTokens),
          context,
        );
        if (rendered.type !== NODE_TYPE.TEXT) {
          throw new Error(`Expected TextNode from text component, got ${rendered.type}`);
        }
        return (rendered as TextNode).content;
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
              content = await resolveContent(cell);
            } else if ("content" in cell) {
              const tcd = cell as TableCellInput;
              content = await resolveContent(tcd.content);
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

    const tableNode = {
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

    if (!tokens.background) {
      return tableNode;
    }

    // Wrap table in a stack with a shape background (card effect)
    const backgroundRect = shape(tokens.background, { shape: SHAPE.RECTANGLE });
    const padding = tokens.backgroundPadding ?? 0;
    const contentLayer = padding > 0 ? column({ padding, spacing: 0 }, tableNode) : tableNode;
    return stack({}, backgroundRect, contentLayer);
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
 * ], { headerRows: 1 }, tokens.table)
 *
 * // Convenience: string arrays auto-convert to cells
 * table([
 *   ['Name', 'Role'],
 *   ['Alice', 'Engineer'],
 * ], { headerRows: 1 }, tokens.table)
 * ```
 */
export function table(
  data: (TableCellInput | TextContent)[][],
  params: TableParams | undefined,
  tokens: TableTokens,
): ComponentNode {
  return component(Component.Table, { data, tableParams: params }, undefined, tokens);
}
