/**
 * Table fill — clones the template's specimen rows in `<a:tbl>` (row 0 header,
 * row 1 data, optional row 2 zebra) and fills each cell's first paragraph with
 * the corresponding StyledParagraph. Cells and `<a:gridCol>` entries are cloned
 * or trimmed to the header count, sharing the template's total width. Row, cell,
 * and grid cloning stay engine-side because they need pptx-automizer DOM access.
 */

import { Attr, collectElements, isPlainObject, rebuildParagraphs, Tag } from "../dom.js";
import type { StyledParagraph, TableFill } from "../types.js";

const EMPTY_CELL: StyledParagraph = { runs: [{ text: "" }] };

/**
 * Grow or shrink a row's `<a:tc>` list to exactly `n` cells. Added columns clone
 * the last existing cell (its styling/fill/margins carry over); removed columns
 * drop from the right. The row is left with no stale specimen cells.
 */
function normalizeCellCount(row: any, n: number): void {
  const tcs = collectElements(row, Tag.TABLE_CELL);
  if (tcs.length === n || tcs.length === 0) return;
  if (tcs.length > n) {
    for (let i = n; i < tcs.length; i++) row.removeChild(tcs[i]);
    return;
  }
  const specimen = tcs[tcs.length - 1];
  for (let i = tcs.length; i < n; i++) row.appendChild(specimen.cloneNode(true));
}

/**
 * Rewrite the table's `<a:tblGrid>` to exactly `n` `<a:gridCol>` entries, sharing
 * the template's total width evenly (the last column absorbs the rounding
 * remainder so the total is conserved exactly). No-op when the count already
 * matches. Leaves a grid-less table alone — malformed input we don't worsen.
 */
function reconcileGrid(tbl: any, n: number): void {
  const grid = tbl.getElementsByTagName(Tag.TABLE_GRID)[0];
  if (!grid) return;
  const cols = collectElements(grid, Tag.GRID_COL);
  if (cols.length === n || cols.length === 0) return;

  const total = cols.reduce((sum, c) => sum + (Number(c.getAttribute(Attr.WIDTH)) || 0), 0);
  const each = Math.round(total / n);
  const specimen = cols[cols.length - 1];
  for (const c of cols) grid.removeChild(c);
  for (let i = 0; i < n; i++) {
    const col = specimen.cloneNode(true);
    col.setAttribute(Attr.WIDTH, String(i === n - 1 ? total - each * (n - 1) : each));
    grid.appendChild(col);
  }
}

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

  // Headers are the source of truth for column count; every row is normalized to
  // it, and short/long data rows are padded/truncated to match.
  const n = table.headers.length;

  const fillRow = (tpl: any, cells: StyledParagraph[]) => {
    const clone = tpl.cloneNode(true);
    normalizeCellCount(clone, n);
    const tcs = collectElements(clone, Tag.TABLE_CELL);
    for (let i = 0; i < n; i++) {
      const txBody = tcs[i].getElementsByTagName(Tag.TX_BODY)[0] ?? tcs[i];
      rebuildParagraphs(txBody, [cells[i] ?? EMPTY_CELL], 0, undefined, shapeName);
    }
    return clone;
  };

  const built: any[] = [];
  built.push(fillRow(headerTpl, table.headers));
  for (let r = 0; r < table.rows.length; r++) {
    built.push(fillRow(dataTpls[r % dataTpls.length], table.rows[r]));
  }

  // Column invariant: grid `<a:gridCol>` count must equal every row's `<a:tc>`
  // count (both == n). `normalizeCellCount` (in fillRow) holds the per-row half;
  // `reconcileGrid` holds the grid half. Run the grid half once, table-global.
  reconcileGrid(tbl, n);
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
