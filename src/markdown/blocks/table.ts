import type { Table, TableCell } from "mdast";
import type { StyledParagraph, TableFill } from "../../engine/index.js";
import { type InlineState, walkPhrasingChildren } from "../inline.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler } from "../types.js";

export const TABLE: BlockHandler = {
  match: (node) => node.type === MdastType.Table,
  acceptType: AcceptType.Table,
  compile: async (node, ctx): Promise<TableFill> => compileTable(node as Table, { region: ctx.region }),
};

/** A GFM `table` → TableFill: first row is headers, the rest are body rows; each
 * cell's phrasing children become `TextRun[]` via the shared inline walk. */
function compileTable(node: Table, state: InlineState): TableFill {
  const [head, ...body] = node.children;
  const cell = (tableCell: TableCell) => cellParagraph(tableCell, state);
  return {
    headers: head ? head.children.map(cell) : [],
    rows: body.map((row) => row.children.map(cell)),
  };
}

/** One table cell → a StyledParagraph. An empty cell keeps a single empty run so
 * downstream code always sees a run to style. */
function cellParagraph(cell: TableCell, state: InlineState): StyledParagraph {
  const runs = walkPhrasingChildren(cell.children, state);
  return { runs: runs.length > 0 ? runs : [{ text: "" }] };
}
