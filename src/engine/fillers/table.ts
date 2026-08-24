/**
 * Table fill — composes a variable number of output rows from a fixed table
 * specimen in `<a:tbl>` by following explicit per-row role labels, then fills each
 * cell's first paragraph with the corresponding StyledParagraph. The specimen's
 * `rows: RowRole[]` (one role per specimen row) drive which specimen row backs each
 * output row: the `header` row styles the header, an optional `first` row styles the
 * row directly under it (used once, never looped), and `body` rows cycle to fill the
 * middle. `<a:tcPr>` (fill, borders, margins) is preserved per row — only the cell
 * text is rebuilt. Cells and
 * `<a:gridCol>` entries
 * are cloned or trimmed to the header count, sharing the template's total width. Row,
 * cell, and grid cloning stay engine-side because they need pptx-automizer DOM access.
 */

import { Attr, collectElements, isPlainObject, rebuildParagraphs, Tag } from "../dom.js";
import { RowRole, type StyledParagraph, type TableFill } from "../types.js";

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

/** Indices of `role` within `roles`, in order. */
function indicesOf(roles: RowRole[], role: RowRole): number[] {
  const out: number[] = [];
  for (let i = 0; i < roles.length; i++) if (roles[i] === role) out.push(i);
  return out;
}

/**
 * Validate a specimen's row roles against its actual row count `R`, then compose the
 * `K` specimen-row picks that back the deck's `K` data rows. Throws (naming the
 * shape) when the labels are malformed: count mismatch, not exactly one header, no
 * body, or a repeated first. `first` is used once at the top and never looped
 * (looping the under-header row erases the divider above interior rows); `body`
 * roles cycle to fill the rest.
 */
export function resolveRowPlan(
  roles: RowRole[],
  R: number,
  K: number,
  shapeName: string,
): { headerIdx: number; picks: number[] } {
  if (roles.length !== R) {
    throw new Error(
      `Table shape "${shapeName}": rows has ${roles.length} label(s) but the specimen <a:tbl> has ${R} row(s); they must match.`,
    );
  }

  const headerIdxs = indicesOf(roles, RowRole.Header);
  const firstIdxs = indicesOf(roles, RowRole.First);
  const bodyIdxs = indicesOf(roles, RowRole.Body);

  // Exactly one header: a GFM table always carries a header row, so the deck
  // always supplies `headers` that need a specimen to style them — zero headers
  // leaves them nowhere to land; two would split one deck header across two
  // specimen styles.
  if (headerIdxs.length !== 1) {
    throw new Error(
      `Table shape "${shapeName}": rows must label exactly one "${RowRole.Header}" (found ${headerIdxs.length}).`,
    );
  }
  if (bodyIdxs.length === 0) {
    throw new Error(`Table shape "${shapeName}": rows must label at least one "${RowRole.Body}" (found none).`);
  }
  if (firstIdxs.length > 1) {
    throw new Error(
      `Table shape "${shapeName}": rows may label at most one "${RowRole.First}" (found ${firstIdxs.length}).`,
    );
  }

  const firstIdx = firstIdxs.length === 1 ? firstIdxs[0] : -1;

  const useFirst = firstIdx >= 0 && K >= 1;
  const middle = K - (useFirst ? 1 : 0); // always >= 0

  const picks: number[] = [];
  if (useFirst) picks.push(firstIdx);
  for (let i = 0; i < middle; i++) picks.push(bodyIdxs[i % bodyIdxs.length]);

  return { headerIdx: headerIdxs[0], picks };
}

/**
 * Fill a table shape by composing its specimen rows per the role plan (see
 * `resolveRowPlan`). Each output cell's first paragraph is rebuilt from the
 * corresponding StyledParagraph, so tables inherit rich-run/bullet support for
 * free; the specimen row's `<a:tcPr>` is carried over untouched.
 */
export function fillTable(shape: any, table: TableFill, shapeName: string, rows: RowRole[]): void {
  const tbl = shape.getElementsByTagName(Tag.TABLE)[0];
  if (!tbl) {
    throw new Error(`Table shape "${shapeName}": has no <a:tbl> element (is it actually a table?).`);
  }

  const specimenRows = collectElements(tbl, Tag.TABLE_ROW);
  const R = specimenRows.length;
  if (R < 2) {
    throw new Error(`fillTable: template table has ${R} row(s), need at least 2 (header + data specimen)`);
  }
  if (rows.length === 0) {
    throw new Error(`Table shape "${shapeName}": no row roles supplied; a table specimen must label each <a:tbl> row.`);
  }

  const { headerIdx, picks } = resolveRowPlan(rows, R, table.rows.length, shapeName);

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
