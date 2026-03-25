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
  parseMarkdown,
  type RenderContext,
  SHAPE,
  SIZE,
  SYNTAX,
  schema,
  type TableCellData,
  type TableCellInput,
  type TableHeaderStyle,
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
  // Optional header zones (presence = zone enabled)
  headerRow: token.optional<TableHeaderStyle>(),
  headerCol: token.optional<TableHeaderStyle>(),
  // Data cell zone
  cellTextStyle: token.required<TextStyleName>(),
  cellTextColor: token.required<string>(),
  cellBackground: token.required<string>(),
  cellBackgroundOpacity: token.required<number>(),
  // Shared defaults
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  borderStyle: token.required<BorderStyle>(),
  borderColor: token.required<string>(),
  borderWidth: token.required<number>(),
  cellPadding: token.required<number>(),
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
      return component(Component.Table, { data: rows });
    },
  },
  render: async (
    params: { data?: (TableCellInput | TextContent)[][] },
    content: string | undefined,
    context: RenderContext,
    tokens: TableTokens,
  ) => {
    // Determine data source: structured (DSL) or content string (directive)
    let data: (TableCellInput | TextContent)[][];

    if ("data" in params && params.data) {
      data = params.data;
    } else if (content) {
      data = parseGfmTable(content);
    } else {
      throw new Error("Table requires either data (DSL) or content (directive)");
    }

    // Header zone counts derived from token presence
    const headerRowCount = tokens.headerRow ? 1 : 0;
    const headerColCount = tokens.headerCol ? 1 : 0;

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

            // 3-zone cascade: headerRow > headerCol > cell
            // Priority: row header wins for intersection cell [0,0]
            const isHeaderRow = rowIndex < headerRowCount;
            const isHeaderCol = !isHeaderRow && colIndex < headerColCount;

            let textStyle: TextStyleName;
            let color: string;
            let hAlign: HorizontalAlignment;
            if (isHeaderRow && tokens.headerRow) {
              textStyle = partialTextStyle ?? tokens.headerRow.textStyle;
              color = partialColor ?? tokens.headerRow.textColor;
              hAlign = partialHAlign ?? tokens.headerRow.hAlign ?? tokens.hAlign;
            } else if (isHeaderCol && tokens.headerCol) {
              textStyle = partialTextStyle ?? tokens.headerCol.textStyle;
              color = partialColor ?? tokens.headerCol.textColor;
              hAlign = partialHAlign ?? tokens.headerCol.hAlign ?? tokens.hAlign;
            } else {
              textStyle = partialTextStyle ?? tokens.cellTextStyle;
              color = partialColor ?? tokens.cellTextColor;
              hAlign = partialHAlign ?? tokens.hAlign;
            }

            const resolvedTextStyle = context.theme.textStyles[textStyle];
            const vAlign = partialVAlign ?? tokens.vAlign;

            const resolved: TableCellData = {
              content,
              width: SIZE.FILL,
              height: SIZE.HUG,
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
      width: SIZE.FILL,
      height: SIZE.HUG,
      rows,
      borderStyle: tokens.borderStyle,
      borderColor: tokens.borderColor,
      borderWidth: tokens.borderWidth,
      ...(tokens.headerRow && { headerRow: tokens.headerRow }),
      ...(tokens.headerCol && { headerCol: tokens.headerCol }),
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
 * Header row/column styling is controlled by token presence:
 * provide `headerRow` and/or `headerCol` in the tokens to enable header zones.
 *
 * @example
 * ```typescript
 * // Simple table — header row styling determined by tokens
 * table([
 *   ['Name', 'Role'],
 *   ['Alice', 'Engineer'],
 * ], tokens.table)
 * ```
 */
export function table(data: (TableCellInput | TextContent)[][], tokens: TableTokens): ComponentNode {
  return component(Component.Table, { data }, undefined, tokens);
}
