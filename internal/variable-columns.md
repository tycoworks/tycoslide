# Variable table columns — design

Let a table slot render as many columns as the data has, instead of being
hard-capped at the column count the designer drew into the template's `<a:tbl>`.
Today the engine clones *rows* to fit the data but never touches *cells* or the
column grid, so column count is fixed by the template.

## 1. Current behaviour (what "fixed" means)

The flow is compiler → `TableFill` → engine:

- Compiler emits `TableFill { headers: StyledParagraph[]; rows: StyledParagraph[][] }`
  (`engine/types.ts`).
- A slot may declare `columns?: number` (`Slot.columns`). It is an **assertion,
  not a capability**: the Table filler (`engine/fillers/filler.ts`) throws when
  `v.headers.length !== slot.columns`, and does nothing else with it.
- `fillTable` (`engine/fillers/table.ts`) clones row specimens — row 0 header,
  row 1 data, optional row 2 zebra — once per data row, then fills each cell's
  first paragraph.

Column count is bounded by the specimen's cell count at `table.ts`:

```ts
for (let i = 0; i < cells.length && i < tcs.length; i++) {
```

Two footguns fall out of the `min(cells, tcs)` loop:

- **More data columns than the template → silently dropped.** No error.
- **Fewer data columns than the template → stale specimen cells survive** with
  their template placeholder text.

`slot.columns` only catches these when an author remembers to declare it, and
even then it *rejects* the deck rather than adapting it.

## 2. Why it doesn't work yet

`fillTable` operates one level too shallow. To vary columns, two pieces of
machinery are missing — and **neither `<a:tblGrid>` nor `<a:gridCol>` is
referenced anywhere in the source** (grep confirms). An `<a:tbl>` is shaped:

```xml
<a:tbl>
  <a:tblGrid>
    <a:gridCol w="3048000"/>
    <a:gridCol w="3048000"/>
  </a:tblGrid>
  <a:tr h="…"> <a:tc>…</a:tc> <a:tc>…</a:tc> </a:tr>   <!-- header specimen -->
  <a:tr h="…"> <a:tc>…</a:tc> <a:tc>…</a:tc> </a:tr>   <!-- data specimen -->
</a:tbl>
```

The invariant PowerPoint enforces: **every `<a:tr>` has exactly one `<a:tc>` per
`<a:gridCol>`.** Break it and PowerPoint reports a repair-on-open corrupt table.
So varying columns means, together and atomically:

1. **Cell cloning / trimming per row** — `cloneNode` an existing `<a:tc>`
   specimen to add a column, drop trailing `<a:tc>`s to remove one. This is the
   same pattern the code already uses for rows, one level deeper.
2. **`<a:tblGrid>` reconciliation** — add/remove `<a:gridCol>` entries so their
   count matches the new per-row cell count, and redistribute `w` so the table's
   total width is unchanged (otherwise columns drift or overflow the shape).

## 3. Design decisions

These matter more than the code; the mechanism is mechanical once they're fixed.

### 3.1 Which cell is the specimen for an *added* column?

When the template has 3 columns and the data has 5, columns 4–5 need a source
cell to clone (styling, fill, margins, text properties).

**Decision: clone the last cell in the row** (last `<a:tc>` of the header row for
new headers, last `<a:tc>` of the relevant data/zebra specimen for new data
cells). Rationale:

- Zero template authoring — upholds the product principle (*users never edit
  their .pptx*). A "designate a specimen column" scheme would add a marker to the
  file, which we don't do.
- The last column is almost always a normal data column (the first is often a
  row-label column with distinct styling), so cloning it generalises well.

Rejected: clone the *first* cell (frequently a label column, wrong styling);
require an explicit specimen index in the manifest (pushes config onto the
author for a rare case).

### 3.2 Column widths after add/remove

**Decision (MVP): preserve total width, even split.** Sum the existing
`<a:gridCol w>` values to get the table's total EMU width, then assign each
output column `total / n`. Simple, always valid, never overflows the shape.

Faithful alternative (later, if designers complain): keep the first N template
widths verbatim and split only the *leftover* width among added columns; when
removing, redistribute the removed columns' width proportionally. More work,
more faithful to intentional label-column sizing. Not MVP.

Whichever we pick, **total width is conserved** — that's the property that keeps
the table inside its shape bounds.

### 3.3 What `slot.columns` becomes

Today it's strict equality and would actively *block* this feature. Options:

- **A — drop it.** Column count follows the data, period. Simplest surface.
- **B — reinterpret as a max/hint.** Truncate or reject when data exceeds it.
- **C — keep as an opt-in strict assertion; variable is the default when unset.**

**Decision: C.** `columns` unset → variable (clone/trim to fit the data).
`columns` set → the current strict check stands, for authors who *want* a fixed
grid and a loud failure when content drifts. This is backwards-compatible: every
existing layout that sets `columns` behaves exactly as before; layouts that omit
it gain the new adaptive behaviour instead of silently dropping/keeping cells.

## 4. Implementation sketch

All engine-side, inside `fillTable` (`engine/fillers/table.ts`) plus small shared
helpers in `engine/dom.ts`. No compiler, manifest, or type changes beyond
possibly relaxing the filler guard.

1. **Add `Tag.TABLE_GRID = "a:tblGrid"` and `Tag.GRID_COL = "a:gridCol"`** to the
   `Tag` map in `dom.ts`.
2. **Determine target column count** `n = table.headers.length` (headers are the
   source of truth; each data row is padded/truncated to `n`).
3. **Reconcile the grid once** before building rows: read `<a:tblGrid>`, compute
   total width, rewrite it to `n` evenly-sized `<a:gridCol w>` entries (clone the
   last `<a:gridCol>` as the element template so any extra attributes survive).
4. **In `fillRow`, normalise the clone to `n` cells** before filling: if the
   specimen has fewer than `n` `<a:tc>`, clone the last `<a:tc>` up to `n`; if
   more, remove the trailing extras. Then the existing fill loop runs over exactly
   `n` cells with no `min()` cap.
5. **Relax the filler guard** so the strict throw only fires when `slot.columns`
   is set (decision 3.3-C); otherwise proceed.

Row cloning already proves the DOM idiom in this file (`cloneNode(true)`, remove
old children, append new), so cell/grid cloning follows the same shape and keeps
all pptx-DOM knowledge engine-side, where the row-cloning comment already says it
belongs.

## 5. Tests (node:test, `test/`)

- Data with **more** columns than the template → output `<a:tbl>` has `n`
  `<a:gridCol>` and every `<a:tr>` has `n` `<a:tc>`; added cells carry the last
  specimen cell's styling.
- Data with **fewer** columns → trailing template cells and gridCols are gone
  (no stale specimen text survives).
- **Total table width conserved** across add and remove (sum of `gridCol w`
  unchanged within rounding).
- **`slot.columns` set + mismatch** → still throws (regression guard for 3.3-C).
- Header / data / zebra rows all reach the same column count.

## 6. Out of scope

- `gridSpan` / merged cells (`hMerge`/`vMerge`) — a separate feature.
- Per-column width authoring from markdown — GFM has no column-width syntax and
  we don't add template tokens.
- The faithful width strategy in 3.2 — deferred until even-split proves
  insufficient.
