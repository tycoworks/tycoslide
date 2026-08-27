/**
 * Table fill — composes a variable number of output rows from a fixed table
 * specimen in `<a:tbl>` by cloning specimen rows around one contiguous `bodyRows`
 * range, then fills each cell's first paragraph with the corresponding
 * StyledParagraph. Row 0 styles the header; the rows before the range are top
 * fixed rows (rendered once — the under-header row lives here, never looped, so
 * its divider survives); the `[start, end]` range is the repeatable body, cycled
 * to fill the deck's data; the rows after it are bottom fixed rows (rendered once
 * — a decorated total row lives here). `<a:tcPr>` (fill, borders, margins) is
 * preserved per row — only the cell text is rebuilt. Cells and `<a:gridCol>`
 * entries are cloned or trimmed to the header count, sharing the template's total
 * width. Row, cell, and grid cloning stay engine-side because they need
 * pptx-automizer DOM access.
 */

import { Attr, collectElements, isPlainObject, rebuildParagraphs, Tag } from "../dom.js";
import type { BodyRows, StyledParagraph, TableFill } from "../types.js";

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
 * Validate a `bodyRows = [start, end]` range against a specimen's actual row
 * count `R`, then compose the `K` specimen-row picks that back the deck's `K` data
 * rows (row 0 always styles the header, so it is not a pick). Everything outside
 * the range is a fixed row rendered once: rows `[1, start-1]` (top — the
 * under-header row, never looped, so its divider survives) back the first data
 * rows; the `[start, end]` range cycles to fill the middle; rows `[end+1, R-1]`
 * (bottom — a decorated total row) back the last data rows. Throws (naming the
 * shape) when the range is out of bounds or the deck supplies too few rows to fill
 * the fixed rows.
 */
export function resolveRowPlan(
  bodyRows: BodyRows,
  R: number,
  K: number,
  shapeName: string,
): { headerIdx: number; picks: number[] } {
  const [start, end] = bodyRows;

  // Row 0 is the header, so the body must start at 1 or later; the range must be
  // non-empty and stay within the specimen's rows.
  if (!(start >= 1 && start <= end && end <= R - 1)) {
    throw new Error(
      `Table shape "${shapeName}": bodyRows [${start}, ${end}] is out of range; require 1 <= start <= end <= ${R - 1} (row 0 is the header).`,
    );
  }

  const topFixed = start - 1; // rows [1, start-1]
  const bottomFixed = R - 1 - end; // rows [end+1, R-1]
  const bodyCount = K - topFixed - bottomFixed;
  const span = end - start + 1;

  // The deck must supply enough data rows to back every fixed row (top + bottom);
  // below that there is nothing to cycle the body over and the total row goes unfilled.
  if (bodyCount < 0) {
    throw new Error(
      `Table shape "${shapeName}": deck supplies ${K} data row(s) but the specimen's fixed rows need at least ${topFixed + bottomFixed}.`,
    );
  }

  const picks: number[] = [];
  for (let r = 1; r <= start - 1; r++) picks.push(r); // top fixed
  for (let i = 0; i < bodyCount; i++) picks.push(start + (i % span)); // body, cycled
  for (let r = end + 1; r <= R - 1; r++) picks.push(r); // bottom fixed

  return { headerIdx: 0, picks };
}

/**
 * Fill a table shape by composing its specimen rows per the body-range plan (see
 * `resolveRowPlan`). Each output cell's first paragraph is rebuilt from the
 * corresponding StyledParagraph, so tables inherit rich-run/bullet support for
 * free; the specimen row's `<a:tcPr>` is carried over untouched.
 */
export function fillTable(shape: any, table: TableFill, shapeName: string, bodyRows: BodyRows): void {
  const tbl = shape.getElementsByTagName(Tag.TABLE)[0];
  if (!tbl) {
    throw new Error(`Table shape "${shapeName}": has no <a:tbl> element (is it actually a table?).`);
  }

  const specimenRows = collectElements(tbl, Tag.TABLE_ROW);
  const R = specimenRows.length;
  if (R < 2) {
    throw new Error(`fillTable: template table has ${R} row(s), need at least 2 (header + data specimen)`);
  }

  const { headerIdx, picks } = resolveRowPlan(bodyRows, R, table.rows.length, shapeName);

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
  built.push(fillRow(specimenRows[headerIdx], table.headers));
  for (let r = 0; r < picks.length; r++) {
    built.push(fillRow(specimenRows[picks[r]], table.rows[r]));
  }

  // Column invariant: grid `<a:gridCol>` count must equal every row's `<a:tc>`
  // count (both == n). `normalizeCellCount` (in fillRow) holds the per-row half;
  // `reconcileGrid` holds the grid half. Run the grid half once, table-global.
  reconcileGrid(tbl, n);
  for (const row of specimenRows) tbl.removeChild(row);
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
