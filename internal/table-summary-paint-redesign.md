# Summary row: paint-prototype redesign (REBUILD — current impl is wrong)

The `summary` RowRole shipped (uncommitted) with a **positional** per-column
implementation that is WRONG. This doc is the corrected design. Rebuild against
it; the current `fillSummaryRow` + `summaryColumns`-as-positional logic in
`src/engine/fillers/table.ts` must be replaced (and its tests). Nothing is
committed yet, so no revert needed — just redo the summary parts.

## The bug in the current implementation

`fillSummaryRow` composites **positionally**: output summary column `i` clones the
summary specimen's cell **at index `i`**. So a column can only be decorated if the
designer decorated *that exact cell*. The mz-slides pricing total row has only 2
decorated cells (cols 3,4), so `summaryColumns` can never paint more than those 2
— declaring `[0,1,2,3]` just samples the specimen's blank cells 0–2. You cannot get
4 painted columns from a 2-painted-cell specimen. That's the flaw.

## Correct design: two reusable prototypes

Extract **two cell-style prototypes** from the specimen and REUSE them across
however many columns are declared — do NOT sample per-index:

- **PAINT prototype** — one decorated summary cell (the "this is the total paint"
  cell: the fill + font the designer used). Reused for every painted column.
- **UNPAINT prototype** — one plain, readable cell. Use the **`body`** specimen cell
  (readable; keeps the no-invisible-text guarantee).

Then, for the deck's last data row (the summary row), for each output column `i`:
- if `i` is a painted column → clone the **PAINT** prototype;
- else → clone the **UNPAINT** (body) prototype;
- rebuild that cell's text from the deck's last-row cell (as `fillRow` does).

Because paint reuses ONE prototype, you can paint **any number of columns**
(0..n) regardless of how many cells the designer decorated. A properly-authored
total (empty leading cells) still renders faithfully; a misused normal row stays
readable (unpainted columns are body-styled).

## User refinement (Aug 24 2026) — explicit sample sources, no contiguity assumption

Prefer NOT to autodetect the paint exemplar, and do NOT let a painted-columns
*list* imply the painted columns are contiguous / right-aligned. Instead the theme
declares **two single-column sample sources** on the block — "give us one column
each for summary vs not-summary":

- `summaryColumn: <idx>` — the specimen column to sample the **paint** style from
  (the decorated cell).
- `bodyColumn: <idx>` (or reuse the `body` row) — the column to sample the
  **unpaint** style from.

Then the two styles are known, reused for any number of output columns.

STILL-OPEN decision for the fresh session: how the theme says **which output
columns are painted** without assuming contiguity/right-alignment. Candidates:
(a) an explicit per-column list `summaryColumns: number[]` (non-contiguous allowed —
a list does NOT force contiguity, but be explicit that gaps are fine); (b) a
per-column boolean mask; (c) content-driven (a cell the author fills → paint).
Resolve this with the user before building — it's the crux of the redesign.

## Declarations (explicit, no magic per-column)

- **Which columns are painted:** keep an explicit list on the table block —
  `summaryColumns: number[]` (0-based, in range `[0, n)`), required iff `rows`
  contains a `summary`. (Same field as now; only the MEANING changes — it selects
  columns to paint, not cells to positionally sample.)
- **Which cell is the PAINT prototype:** DECISION NEEDED at build time —
  - **A (recommended):** autodetect the single exemplar = the first summary-specimen
    cell that carries a background fill (`<a:solidFill>` direct child of `<a:tcPr>`,
    not a border). This finds the *style to reuse*, not per-column intent — the
    per-column WHICH stays explicit via `summaryColumns`, so it is low-magic and
    consistent with the "explicit" ethos.
    Fail fast if the summary specimen has NO filled cell (no exemplar to reuse).
  - **B:** declare it explicitly, e.g. `paintFrom: <columnIndex>` on the block.
    More verbose; only worth it if a specimen has multiple distinct decorated
    styles (mz-slides does not).
  Pick A unless the user wants B.

## Validation (fail-fast, name the shape)

- `summaryColumns` present & non-empty **iff** `rows` includes `RowRole.Summary`
  (both-or-neither) — already in the Zod `.refine`; keep it.
- every `summaryColumns` index is an integer in `[0, n)` (n = deck header count).
- the summary specimen has at least one PAINT exemplar (option A: one filled cell);
  else throw.
- a `body` specimen row exists to source the UNPAINT prototype; else throw.

## Notes / caveats to keep in mind

- The PAINT prototype is one cell reused across columns, so per-column-specific
  properties of the source cell (e.g. an edge-only border) may not perfectly fit
  other columns; the decoration (fill/font) is what transfers and is the point.
- No hardcoded layout — no right-align, no reflow. Column selection is the explicit
  `summaryColumns`; each column samples PAINT or UNPAINT.

## Threading + tests (unchanged shape from the current attempt)

`summaryColumns` already threads block → CompilerBlock → toEngineLayout →
FillTarget → fillTable. Keep that. Rewrite `fillSummaryRow` to the two-prototype
model above. Tests (`test/generate.test.ts`, marker-based `tcPr` helper) must prove:
- painting MORE columns than the specimen has decorated cells still paints them all
  with the PAINT exemplar (the key regression this redesign fixes);
- 1 painted column, several painted columns, and all-but-one — each correct;
- unpainted columns use the BODY marker, painted use the PAINT marker;
- summary at last row for K≥2, not K==1; different row counts (K<R, K==R, K>R);
- fail-fast: summary-without-columns, columns-without-summary, out-of-range index,
  no PAINT exemplar, no body specimen, duplicate summary.

## Demo to prove it (what the user asked for, that the current impl fails)

Two slides, one with 4 painted columns and one with 1, at DIFFERENT row counts,
against the mz-slides pricing specimen (which has only 2 decorated cells) — the
4-painted slide must show 4 painted columns, proving prototype-reuse, not
positional sampling. Render and OPEN the pptx.
