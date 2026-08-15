# Handover — MDAST migration (start here in a fresh session)

You are picking up mid-task on tycoslide. This doc is the entry point. **Read, in order:**
1. This file.
2. `internal/mdast-migration.md` — the DESIGN CONTRACT for the work to do. Build to it exactly.
3. `internal/composition-vs-content-paradigm.md` §8 — the "Option A" image work this folds in.

## Where things stand

- **Branch:** `sampled-composition`. Two commits already landed on it:
  - `f1eecc5` engine: slots accept multiple content blocks (slice 1).
  - `6799c66` compiler exposes accepts/frame (slice 2).
- **Uncommitted in the working tree** (all for review, nothing staged):
  - "Option A" body-slot images via `$category.name` — changes to `src/markdown/deckCompiler.ts`,
    `test/composition.compiler.e2e.test.ts`, `test/fixtures/composition-theme.json`. Green
    (276 tests pass). This is a stepping stone that the MDAST work will PARTLY SUPERSEDE (its
    regex `IMAGE_BLOCK_RE`/`CODE_FENCE_RE` get replaced by mdast nodes; its `resolveAssetRef`
    SURVIVES verbatim).
  - `internal/composition-vs-content-paradigm.md` §8 (Option A spec).
  - `internal/mdast-migration.md` (the design contract — item 2 above).
  - `internal/mdast-migration-handover.md` (this file).
- **Do NOT commit** until the user explicitly says "commit". "go"/"lets go"/"sure" authorize WORK,
  never the commit. (Standing user rule.)

## The task

Migrate slot-content recognition from hand-rolled regex to full MDAST + a block-handler registry.
**Compiler-only — never touch `src/engine/`.** No new dependency. The full spec is
`internal/mdast-migration.md`; §4–§7 are the build, §8 the open decisions (now resolved — see below).

### Ground truth that saves you re-deriving it
- **Inline formatting is ALREADY full MDAST today.** `src/markdown/parsers.ts` →
  `parseInlineRuns`/`walkPhrasing` use `remark-parse`+`remark-gfm`+`remark-ins`. `remark-ins` is the
  custom-underline extension (`++u++`). KEEP all of that verbatim; reuse `walkPhrasing` as the inline
  leaf of the new block walk.
- **Only the BLOCK level is regex** and is what you replace: `parseSlotContent`'s chain,
  `parseGfmTable`, the bullet detection in `toTextFill`, and `acceptTypeOf`'s probe loop. DELETE these
  (`CODE_FENCE_RE`, `IMAGE_BLOCK_RE`, `parseGfmTable`, `acceptTypeOf`, the `toTextFill` line-splitter).
  KEEP `ASSET_REF_RE` + `resolveAssetRef`.
- **Deps already present:** `remark-parse ^11`, `remark-gfm ^4`, `remark-ins ^1`, `unified ^11`,
  `@types/mdast`. `remark-directive` is intentionally NOT used — `::name::` region splitting stays a
  hand-parse in `slideParser.ts` (`SLOT_LINE_RE`), it's deck structure above the slot. Don't revert it.
- **Engine target types (produce, don't edit)** `src/engine/types.ts`: TextRun{text,bold,italic,
  strikethrough,underline,link,color} (:19); StyledParagraph{runs,bullet?:{level}} (:33);
  TextFill{paragraphs} (:60); TableFill{headers,rows} (:63).
- **Block→type map:** `code` lang=mermaid → MermaidFence(Image); `code` other → CodeFence(Text);
  `image` (paragraph-unwrapped, url=`$cat.name` → `resolveAssetRef`) → ImageFill(Image); `table`
  (remark-gfm) → TableFill(Table); `paragraph`/`list`/`heading` aggregate → TextFill(Text).
- **Trickiest bit — preserve "one source line = one StyledParagraph."** mdast collapses consecutive
  non-blank lines into ONE `paragraph` (soft breaks are `\n` inside `text` nodes, not `break` nodes).
  The TEXT aggregate must SPLIT each paragraph's runs on newlines into separate StyledParagraphs, to
  match today's `toTextFill`. Bullets come from `list`/`listItem` nesting depth (top list = level 0,
  nested = +1), replacing today's `floor(indent/2)`.

### Decisions — RESOLVED (user said "lets go" to these recommendations)
1. Bullets become structural (mdast lists → levels). Accepted. Re-point bullet tests.
2. Single-column pipe table: today returns null (prose), mdast parses as a table. Accept the change;
   update that test.
3. A region mixing a standalone kind (table/image/code) with other blocks → ERROR (fail fast, name
   layout/slide/slot + offending node type). Do not silently absorb.
4. Do it on `sampled-composition`, folding in (superseding parts of) the uncommitted Option A.

## The old tycoslide — mine it for inspiration

The pre-engine-swap tycoslide ("typistlight" in dictation) had this MDAST machinery done RIGHT, and
its full history is preserved in THIS repo. The engine-swap commit is `8fcf889` ("Replace pptxgenjs
engine with the tycoslide template engine"); the old code lives at the tree BEFORE it: `8fcf889^`.
Read it with `git show 8fcf889^:<path>` and search with `git grep -n <term> 8fcf889^ -- packages/`.

Highest-value files to borrow from (all under `packages/sdk/src/markdown/` at `8fcf889^`):
- `parser.ts` — the shared `unified()` processor (there it also `.use(remarkDirective)`; we DON'T —
  see the `::name::` note above). Tiny; confirms the stack.
- `slotCompiler.ts` — THE pattern to reproduce: `compileChildren` / `compileBareNode` dispatch bare
  mdast block nodes through a **SyntaxHandler registry**
  (`components.find(c => c.syntax?.nodeTypes.includes(node.type))`, unknown → throw), and the
  **paragraph-wrapped-image unwrap** (`paragraph` whose sole child is an `image` → treat as image).
  Our block-handler registry is this idea, adapted to "one region → one block."
- `authoring/component.ts` — the `SyntaxHandler { nodeTypes: SyntaxType[]; compile(node, source) }`
  interface (`git show 8fcf889^:packages/sdk/src/authoring/component.ts`).
- The old sdk `package.json` (`git show 8fcf889^:packages/sdk/package.json`) listed the markdown deps
  explicitly incl. `mdast-util-gfm-strikethrough` — note we no longer need that (remark-gfm bundles
  strikethrough → `delete` nodes for free).

Caveat: the old code emitted `SlideNode[]`/`ComponentNode` per block (a richer node model); we emit a
single `MarkdownBlock` per region (TextFill/TableFill/ImageFill/fences). Borrow the DISPATCH SHAPE and
the mdast-node handling, not the node types.

## How to execute (user's process constraints)
- **Delegate the build to a subagent** (executor-high / opus), TEST-FIRST, handing it
  `internal/mdast-migration.md` as the contract. Context limits are why we're handing off — don't try
  to hold it all in the main thread. (A ready-to-send subagent prompt was drafted; if it's not in your
  context, regenerate it from `internal/mdast-migration.md` §4–§7 + the ground-truth bullets above.)
- **Verify green yourself** against ground truth (subagents habitually collapse their final message to
  "Done" — check `git diff`, then run `npm run typecheck && npm test && npm run lint`; suite is
  276 pass / 0 fail before you start).
- **Then architect-review** (read-only, opus) against the contract before presenting.
- **Present for review; do NOT commit** until the user explicitly approves.

## Quick verify commands
```
git -C /Users/chris.anderson/Development/tycoslide log --oneline -3
git -C /Users/chris.anderson/Development/tycoslide status --short
npm run typecheck && npm test && npm run lint     # from repo root
```

## One-line summary for the new session's first message
"Continuing the tycoslide MDAST migration on branch `sampled-composition`. Contract:
`internal/mdast-migration.md`. Inline is already MDAST; I'm pushing it up to block-level via a
handler registry, compiler-only, folding in the uncommitted Option A. Nothing committed yet."
