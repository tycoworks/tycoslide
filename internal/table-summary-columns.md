# Summary rows with per-column styling (design, not yet built)

Follow-on to the labelled-table-rows work (`internal/table-row-roles.md`). The
`summary` role was intentionally **removed from the initial changeset** and is
reintroduced here properly. This doc is the agreed design; build it after the
divider-fix changeset lands.

## Problem

A table's last row is often a **total / summary** — styled differently from body
rows, and typically only *some* columns carry content (e.g. corp `slide53`: cells
1–3 blank, cells 4–5 a purple "Total | $1,000"). The naive approach — clone that
one decorated specimen row positionally and refill every cell — fails two ways:

1. **Silent misrender.** Put content in a column the designer left blank and it
   inherits the blank/dark cell style → the text goes invisible. No error, just
   broken output. (Reproduced: a normal last row `Legacy | 3 | $19 | …` poured into
   the Total row → "Legacy/3/$19" invisible.)
2. **Can't vary the coloured columns.** The coloured columns are frozen at the
   specimen's absolute positions; a table with a different column count loses the
   colour entirely or mis-places it.

Note the settled non-goal: **no hardcoded layout defaults** (no right-align, no
reflow). An earlier "right-align the values" idea was explicitly rejected.

## Design

A row is marked as a summary row. The engine samples **two cell styles per
column** from the specimen, so every column renders readably and deterministically:

- **summary columns** → the summary/coloured cell style (the designer's filled cell)
- **non-summary columns** → the **body** cell style (a normal, readable cell)

Content maps to columns positionally; each column's style is sampled from the
matching prototype. Nothing is invented, nothing reflows, nothing goes invisible.

### Which columns are "summary" columns?

Two candidate mechanisms (pick at build time):

- **Autodetect (leaning this):** a cell the designer **filled** (has content/fill)
  in the specimen's summary row = a summary column; a blank one = not. Zero config;
  exactly matches what the designer drew.
- **Explicit:** the theme lists `summaryColumns` on the block. Author controls it;
  can differ from the specimen. More config, more flexible.

### Where the non-summary style comes from

The summary row's non-summary columns sample the **body** cell style (readable),
NOT the specimen's own blank cells (which are dark/invisible). This is the key move
that removes the silent-failure mode — content in a non-summary column of a summary
row still renders in a normal readable cell.

### Behaviour

For `|  | Total | $500 | $1,000 |` in a 5-column table, with summary columns
autodetected as {4,5}:
- cols 1–3 → body style (readable) → shows "", "Total", "$500" plainly
- cols 4–5 → summary style (purple) → shows "$1,000", ""

Every cell readable; deterministic; no alignment magic.

## Open questions to confirm at build

1. **Autodetect vs explicit `summaryColumns`?** (lean: autodetect)
2. **Autodetect signal:** cell has a fill? has text? either? (a summary cell in the
   specimen may be distinguished by fill colour, by non-empty text, or both — decide
   from the real corp specimens: `slide52`/`slide53` row 6.)
3. **Non-summary columns → body style — confirm** the body specimen is the source.
4. **No summary columns detected / no body specimen present** → fail fast (no silent
   default), consistent with the required-`rows` policy.

## Relationship to the label model

This is the real behaviour of a `summary` row role. Reintroduce `Summary` into the
`RowRole` const and give `fillTable`'s summary branch the two-prototype,
per-column sampling above — replacing the positional clone the first cut used.
Everything else in `internal/table-row-roles.md` (header/first/body composition,
required `rows`, fail-fast validation) stays as-is.
