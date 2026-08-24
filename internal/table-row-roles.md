# Table row roles (labelled rows)

As-built record. `fillTable` composes a variable number of output rows from a
fixed table specimen **by following explicit per-row role labels**, not by
guessing. Roles shipped: `header` / `first` / `body`. (A `summary` role is
deferred — see `internal/table-summary-columns.md`.)

## Motivation

`fillTable` clones rows from the template's `<a:tbl>` specimen. The specimen is a
fixed-size, fully-styled table; a deck supplies an arbitrary number of data rows.
The old code sampled only rows 1 & 2 and alternated them (`dataTpls[r % 2]`),
which:

- ignored rows 3+ entirely, and
- repeated the **under-header first row** into interior positions. In the corp
  template that first data row hides its top border (so it doesn't double the
  header rule); stamping it mid-table erased the divider above it → the reported
  "rows 2/3 and 5/6 look merged" bug.

## Data model

Each table accept block already pins one specimen (`sourceSlide` + `shapeName`).
Every specimen row carries an explicit role label — the table analogue of the
existing `startAt` field on text blocks (intra-specimen metadata on the pinned
block).

```jsonc
// a table block in theme.json (and CompilerBlock / engine Block)
{ "type": "table", "sourceSlide": 53, "shapeName": "Google Shape;1006;p108",
  "rows": ["header", "first", "body", "body", "body", "body", "body"] }
```

`rows` is **required** on table blocks and `rows.length` MUST equal the specimen's
`<a:tbl>` row count. There is no default synthesis — a missing/mismatched `rows`
fails fast (themes are AI-authored; explicit beats magic).

### RowRole — const object

`src/engine/types.ts`, next to `SlotType`:

```ts
export const RowRole = {
  Header: "header",
  First: "first",
  Body: "body",
} as const;
export type RowRole = (typeof RowRole)[keyof typeof RowRole];
```

- **`Header`** — exactly one. Filled with the deck's `headers`. (In practice row 0.)
- **`First`** — 0 or 1. The row directly under the header (often hides its top
  border). Used **once**, at the top. Never looped — this is what fixes the bug.
- **`Body`** — one or more. The repeating unit; **cycled** in declared order to fill
  the rest. Two `Body` rows ⇒ zebra falls out for free.

## Fill algorithm (`resolveRowPlan`)

Given `rows: RowRole[]` (length `R`) and the deck's `K` data rows:

```
headerIdx = index of the (single) Header
firstIdx  = index of First (or -1)
bodyIdxs  = indices of Body, in order (length >= 1)

useFirst = firstIdx >= 0 && K >= 1
middle   = K - (useFirst ? 1 : 0)

picks = []
if useFirst: picks.push(firstIdx)
for i in 0..middle-1: picks.push(bodyIdxs[i % bodyIdxs.length])
// picks.length === K
```

Output table = `[ header specimen filled with deck.headers, ...picks each filled
with the matching deck data row ]`.

Worked examples for `rows = [header, first, body, body, body, body, body]`
(bodyIdxs = [2,3,4,5,6]):
- `K=5` → first(1), body 2,3,4,5 → the decorated row 6 is not reached.
- `K=10` → first(1) once at top, body 2,3,4,5,6,2,3,4,5 looped. First never interior.
- `K=1` → first(1). (A lone data row sits under the header, so `first` is right.)

Zebra example `rows = [header, body, body]` (bodyIdxs=[1,2]) → 1,2,1,2,….

## Validation (fail-fast, at fill time)

`R` is only known at fill time (from the `<a:tbl>`), so `resolveRowPlan(rows, R, K,
shapeName)` validates there and throws a specific error naming the shape when:
- `rows.length !== R`
- not exactly one `Header`
- zero `Body`
- more than one `First`

The Zod theme schema (`themeConfigSchema.ts`) additionally enforces, via `.refine`,
that a `table` block has a non-empty `rows` and that `text`/`image` blocks omit it.
The existing `rows.length < 2` specimen guard stays.

## Threading (compiler ↔ engine) — mirrors `startAt`

`rows` follows the path `startAt` takes: engine `Block` → `CompilerBlock`
(`src/markdown/types.ts`) → `toEngineLayout` (`src/index.ts`) → `FillTarget`
(`src/engine/fillers/filler.ts`) → `targetOf` (`src/engine/generate.ts`) →
`fillTable(shape, table, shapeName, rows)` (required param). The manifest does NOT
advertise `rows` (theme-authoring metadata, not author-facing).

## mz-slides theme labelling (`~/Development/mz-slides/theme.json`)

Both pricing layouts (`Pricing table dark` slide 53, `Pricing table with highlights
dark` slide 52) are 7-row specimens, labelled
`["header", "first", "body", "body", "body", "body", "body"]`. Row 6 (the decorated
"Total" row) is currently `body` — it only appears when a table has 6 data rows;
proper handling is the deferred `summary` work.

## Tests (`test/generate.test.ts`, node:test)

Marker-based helper: each specimen row carries a unique `<a:tcPr>` marker color
(`fillTable` preserves `tcPr`, rebuilds only text); read each output row's marker
to prove which specimen backed it. Coverage: `K==R` 1:1, `K>R` loops only `body`
(first once at top), `K<R`, the divider-gap regression (first never interior),
zebra, `K==1`, and the validation throws (length mismatch, zero/two headers, zero
body, duplicate first).

## Deferred

`summary` row role + per-column summary styling — design in
`internal/table-summary-columns.md`. Removed from this changeset deliberately; to
be built properly after it lands.
