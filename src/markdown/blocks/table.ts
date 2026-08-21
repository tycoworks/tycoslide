import type { Table, TableCell } from "mdast";
import type { StyledParagraph, TableFill } from "../../engine/index.js";
import { walkPhrasingChildren } from "../inline.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler } from "../types.js";

export const TABLE: BlockHandler = {
  match: (node) => node.type === MdastType.Table,
  acceptType: AcceptType.Table,
  compile: async (node): Promise<TableFill> => compileTable(node as Table),
};

/** A GFM `table` → TableFill: first row is headers, the rest are body rows; each
 * cell's phrasing children become `TextRun[]` via the shared inline walk. */
function compileTable(node: Table): TableFill {
  const [head, ...body] = node.children;
  return {
    headers: head ? head.children.map(cellParagraph) : [],
    rows: body.map((row) => row.children.map(cellParagraph)),
  };
}

/** One table cell → a StyledParagraph. An empty cell keeps a single empty run so
 * downstream code always sees a run to style. */
function cellParagraph(cell: TableCell): StyledParagraph {
  const runs = walkPhrasingChildren(cell.children, {});
  return { runs: runs.length > 0 ? runs : [{ text: "" }] };
}
