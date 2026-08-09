/**
 * Table fill — clones specimen rows in the template's `<a:tbl>` (row 0 header,
 * row 1 data, optional row 2 zebra) and fills each cell's first paragraph with
 * the corresponding StyledParagraph. Row cloning must stay engine-side because
 * it needs pptx-automizer DOM access.
 */

import { collectElements, isPlainObject, rebuildParagraphs, Tag } from "../dom.js";
import type { StyledParagraph, TableFill } from "../types.js";

/**
 * Fill a table shape by cloning specimen rows.
 *
 * Row layout in the template's `<a:tbl>`:
 *   - Row 0: header specimen
 *   - Row 1: data specimen
 *   - Row 2 (optional): alternating-data specimen (zebra striping)
 *
 * Each cell's first paragraph is rebuilt from the corresponding
 * StyledParagraph, so tables inherit rich-run/bullet support for free.
 */
export function fillTable(shape: any, table: TableFill, shapeName = ""): void {
  const tbl = shape.getElementsByTagName(Tag.TABLE)[0];
  if (!tbl) {
    throw new Error(`Table shape "${shapeName}": has no <a:tbl> element (is it actually a table?).`);
  }

  const rows = collectElements(tbl, Tag.TABLE_ROW);
  if (rows.length < 2) {
    throw new Error(`fillTable: template table has ${rows.length} row(s), need at least 2 (header + data specimen)`);
  }

  const headerTpl = rows[0];
  // Only rows 0-2 are specimens (header, data, optional zebra); any further
  // template rows are intentionally dropped — the specimen rows are re-cloned
  // per data row below.
  const dataTpls = rows.length > 2 ? [rows[1], rows[2]] : [rows[1]];

  const fillRow = (tpl: any, cells: StyledParagraph[]) => {
    const clone = tpl.cloneNode(true);
    const tcs = collectElements(clone, Tag.TABLE_CELL);
    // Fill min(cells, template cells): extra data columns beyond the template's
    // cell count are intentionally ignored (column count is opt-in via
    // slot.columns, enforced in the Table filler).
    for (let i = 0; i < cells.length && i < tcs.length; i++) {
      const txBody = tcs[i].getElementsByTagName(Tag.TX_BODY)[0] ?? tcs[i];
      rebuildParagraphs(txBody, [cells[i]], 0, undefined, shapeName);
    }
    return clone;
  };

  const built: any[] = [];
  built.push(fillRow(headerTpl, table.headers));
  for (let r = 0; r < table.rows.length; r++) {
    built.push(fillRow(dataTpls[r % dataTpls.length], table.rows[r]));
  }

  for (const row of rows) tbl.removeChild(row);
  for (const row of built) tbl.appendChild(row);
}

/** Discriminator for TableFill values. */
export function isTableFill(v: unknown): v is TableFill {
  return (
    isPlainObject(v) &&
    "headers" in v &&
    "rows" in v &&
    Array.isArray((v as { headers: unknown }).headers) &&
    Array.isArray((v as { rows: unknown }).rows)
  );
}
