# MDAST migration — full-region markdown parsing + block-handler registry

**Status:** design (proposed). Supersedes the regex-based slot recognition added in "Option A"
(§8 of `composition-vs-content-paradigm.md`). Compiler-only; the engine is untouched.

## 1. Why

`parseSlotContent` recognizes what a body/`::name::` region *is* with a hand-rolled regex chain,
and `acceptTypeOf` re-derives the type afterward by probing two strategy registries. Two hardcoded
chains that enumerate the same content kinds in different orders — not MECE (a new kind edits both),
not DRY (the type is computed twice), and the table recognizer (`parseGfmTable`) is a bespoke regex
parser even though we already ship a real GFM parser.

The old tycoslide ("typistlight") solved this the right way: it parsed each region to a **real MDAST
tree** and dispatched **block nodes through a handler registry** keyed by mdast node type. We want
that machinery back — properly, not approximated.

The happy surprise: **half of it never left.** Inline formatting is already full MDAST today.

## 2. What we have today (ground truth)

### Already MDAST (keep verbatim)
`src/markdown/parsers.ts` → `parseInlineRuns(text)` runs
`unified().use(remarkParse).use(remarkGfm).use(remarkIns)` over a *single line*, then `walkPhrasing`
maps inline nodes to `TextRun` flags:

| mdast inline node | syntax | TextRun |
|---|---|---|
| `strong` | `**b**` | `bold` |
| `emphasis` | `*i*` | `italic` |
| `delete` (remark-gfm) | `~~s~~` | `strikethrough` |
| `insert` (remark-ins) | `++u++` | `underline` |
| `link` | `[t](url)` | `link` |
| `inlineCode` | `` `c` `` | (text, no flag) |
| `break` | hard break | space |

`remark-ins` **is** the custom-underline machinery. `walkPhrasing` / `walkBlock` / `walkUnknown`
already exist and are exactly the inline leaf a block walk needs. **This code stays.**

### Still hand-rolled regex (the target of this migration)
- `parseSlotContent(text)` — chain: `CODE_FENCE_RE` → `IMAGE_BLOCK_RE` → `parseGfmTable` → `toTextFill`.
- `parseGfmTable(text)` — bespoke regex table parser (`TABLE_SEPARATOR_RE`, `parseTableRow`), even
  though `remark-gfm` emits real `table`/`tableRow`/`tableCell` nodes.
- `toTextFill(text)` — splits prose into lines, each line → `parseStyledParagraph` → `detectBullet`
  (`BULLET_LINE` regex, "`- `/`* `, every 2 spaces = +1 level").
- `acceptTypeOf(block)` — probes `RESOLVERS`/`FILLERS` `.matches` in fixed order to classify.

### Region splitting (above the slot — out of scope, keep as-is)
`src/markdown/slideParser.ts` splits the deck into slides (frontmatter state machine) and a slide's
body into the default region + `::name::` regions (`SLOT_LINE_RE = /^::(\w+)::[ \t]*$/`). This is
deck structure, **not** slot content. The old code used `remark-directive` `:::name` blocks for this;
we deliberately moved to `::name::` hand-splitting and are **not** reverting it. MDAST parses only
*within* a region. (`remark-directive` stays out of the dependency set.)

### Deps — already present
`dependencies` already carry `remark-parse ^11`, `remark-gfm ^4`, `remark-ins ^1`, `unified ^11`,
plus `@types/mdast`. **No new runtime dependency is needed.** (The old sdk also had
`mdast-util-gfm-strikethrough` / `micromark-extension-gfm-strikethrough` explicitly; `remark-gfm`
now bundles strikethrough, so `delete` nodes come for free.)

## 3. What the old code did (borrow this)

`packages/sdk/src/markdown/parser.ts` (at `8fcf889^`) — one shared processor:
```ts
const markdownProcessor = unified().use(remarkParse).use(remarkDirective).use(remarkGfm);
export function parseMarkdown(content: string): Root { return markdownProcessor.parse(content) as Root; }
```

`slotCompiler.ts` — dispatch was a **single registry lookup**, no per-type branching:
```ts
// bare block node → the component whose syntax handler claims this node type
const handler = components.find(c => c.syntax?.nodeTypes.includes(node.type));
if (!handler) throw new Error(`unsupported markdown block type "${node.type}"`);
return handler.syntax.compile(node, source);
```
with the handler shape:
```ts
interface SyntaxHandler { nodeTypes: SyntaxType[]; compile(node, source): ComponentNode | null; }
```
and one important normalization we must reproduce — **remark wraps `![alt](src)` in a paragraph**,
so it unwrapped a paragraph whose sole child is an image before dispatch:
```ts
if (node.type === "paragraph" && para.children.length === 1 && para.children[0].type === "image")
  node = para.children[0];
```

## 4. Target design

### 4a. Parse the whole region once
Add a region parser beside the inline one (same processor stack, no directive plugin):
```ts
// parsers.ts
const blockProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkIns);
export function parseRegion(text: string): Root { return blockProcessor.parse(text) as Root; }
```
`parseInlineRuns` stays as-is for template parameters and any single-line callers; block callers now
get the full tree.

### 4b. Block-handler registry (mirrors the old `SyntaxHandler`)
```ts
type BlockCtx = { resolveAssetRef: (ref: string) => ImageFill };

type BlockHandler = {
  nodeTypes: readonly string[];              // mdast block types this claims
  acceptType: AcceptType;                    // the folded type, as DATA (no probe)
  compile(node: RootContent, ctx: BlockCtx): MarkdownBlock;
};
```
Content-kind handlers, each defined once (recognition + type + build together):

| handler | claims mdast node | acceptType | builds |
|---|---|---|---|
| `MERMAID` | `code` with `lang === "mermaid"` | `Image` | `MermaidFence` |
| `CODE` | `code` (any other lang) | `Text` | `CodeFence` |
| `IMAGE` | `image` (paragraph-unwrapped); `url` = `$cat.name` | `Image` | `ImageFill` via `resolveAssetRef` |
| `TABLE` | `table` (remark-gfm) | `Table` | `TableFill` |
| `TEXT` | `paragraph`, `list`, `heading` (aggregate) | `Text` | `TextFill` |

`code` is claimed by two handlers separated by the `lang` field — so the registry entry carries an
optional refinement predicate, or `MERMAID` precedes `CODE` and `CODE.matches` returns false for
mermaid. (Prefer an explicit `match(node)` refinement over ordering games — see 4d.)

### 4c. One region → one block (the key difference from the old per-node model)
The old compiler emitted `SlideNode[]` (one per block). Our slot holds **one** fill. So a region
classifies to a single `MarkdownBlock`:

- A region whose only meaningful child is a `code` / `image` / `table` node → that kind's block.
- Otherwise → the `TEXT` aggregate: walk **all** children (`paragraph`, `list`, `heading`) into one
  `TextFill` (`StyledParagraph[]`), reusing `walkPhrasing` for each paragraph's runs.

So `parseSlotContent` becomes:
```ts
function parseSlotContent(text, ctx): { block: MarkdownBlock; acceptType: AcceptType } {
  const root = parseRegion(text);
  const nodes = root.children.map(unwrapLoneImage);
  // standalone single-block kinds:
  if (nodes.length === 1) {
    for (const h of SINGLE_BLOCK_HANDLERS)          // MERMAID, CODE, IMAGE, TABLE
      if (h.match(nodes[0])) return { block: h.compile(nodes[0], ctx), acceptType: h.acceptType };
  }
  // everything else aggregates to one TextFill
  return { block: TEXT.compileAll(nodes, ctx), acceptType: AcceptType.Text };
}
```
`acceptTypeOf` is **deleted** — the type is returned with the block. `assertSlotRegion` takes the
returned `acceptType`. `parseGfmTable`, `CODE_FENCE_RE`, `IMAGE_BLOCK_RE`, and the line-splitting in
`toTextFill` are **deleted**; the `IMAGE_BLOCK_RE`/`ASSET_REF_RE` split becomes: `image.url` is the
raw ref, `resolveAssetRef` (kept from Option A, unchanged) validates+resolves it.

### 4d. Bullets: an upgrade (behavior change — call out for sign-off)
Today bullets are regex line-detection: `- `/`* ` prefix, level = `floor(leadingSpaces / 2)`. With
MDAST, `list` → `listItem` gives **real structural nesting** (nested lists = deeper levels, ordered
vs unordered distinguishable) for free, and the fragile "2 spaces = a level" heuristic goes away.
This is strictly better but it **is** a semantics change:
- Indentation that doesn't form a valid markdown nested list no longer bumps the level.
- Ordered lists (`1.`) become expressible (today they're prose).

Decision needed: accept the mdast list semantics (recommended), and re-point the existing bullet
tests at structural nesting.

## 5. What survives from Option A
- `resolveAssetRef` closure (the `$category.name` anchored resolve + fail-fast) — **kept verbatim**;
  now fed by `image.url` instead of a regex capture.
- The `assets` catalog, `toImageFill`, `resolveImagePath`, the accepts/frame model, `assertSlotRegion`
  — unchanged.
- The Option-A compiler e2e + fail-fast tests — kept; the malformed-ref test input changes from
  `![](logo.png)` (which mdast still parses as an image with `url="logo.png"`) so `resolveAssetRef`
  still rejects it → same error. Re-verify the assertions, don't assume.

Superseded: `IMAGE_BLOCK_RE`, `CODE_FENCE_RE`, `parseGfmTable`, `acceptTypeOf`, the `toTextFill`
line-splitter.

## 6. Type mapping (targets are unchanged engine types)
`TextRun` (`engine/types.ts:19`: text, bold, italic, strikethrough, underline, link, color),
`StyledParagraph` (:33: runs, bullet:{level}), `TextFill` (:60: paragraphs), `TableFill` (:63:
headers, rows). The MDAST walk must produce exactly these — `walkPhrasing`/`makeRun` already do for
runs; the new block walk fills `bullet.level` from list depth and aggregates paragraphs.

## 7. Migration steps (test-first, compiler-only)
1. Branch continues on `sampled-composition` (or a child). Engine untouched throughout.
2. `parsers.ts`: add `parseRegion` (block processor); keep `parseInlineRuns`/`walkPhrasing`.
3. Add the block-handler registry + `parseSlotContent` returning `{ block, acceptType }`; delete
   `acceptTypeOf` and the regex recognizers. Reuse `resolveAssetRef` from Option A.
4. Replace `parseGfmTable` usage with the `TABLE` handler (mdast `table` → `TableFill`, cells via
   `walkPhrasing`); delete the regex table parser and its unit tests' internals (rewrite to assert
   the same `TableFill` output from the new path — outputs should match: same headers/rows/cell runs).
5. Bullets via `list`/`listItem`; re-point bullet tests (§4d).
6. `assertSlotRegion(slot, acceptType, …)` takes the type directly.
7. Green gate: `npm run typecheck && npm test && npm run lint`. The existing inline-formatting tests
   must pass unchanged (that code didn't move). Table/bullet/image/code region tests updated to the
   mdast path with equivalent assertions.

## 8. Risks / decisions to confirm
- **Bullet semantics change** (§4d) — recommended accept; needs your OK.
- **Table output equivalence** — remark-gfm handles pipe/no-pipe, alignment, empty cells; confirm the
  new `TableFill` matches today's for the existing table fixtures (loose tables, colons, many columns,
  single-column → today returns `null`; mdast will parse a single-column pipe table as a table — a
  minor behavior change to note/test).
- **`code` disambiguation** — mermaid vs code by `lang`; prefer an explicit `match(node)` on the
  handler over registry ordering.
- **Multi-block regions** — a region mixing e.g. a table *and* a paragraph: today the regex chain
  would misfire; mdast makes the choice explicit. Decision: a standalone kind requires the region to
  be *only* that node; any mix falls to `TEXT` aggregate (paragraphs/lists/headings) and a stray
  non-text block in a mix is an error. Confirm the error-vs-absorb policy.
- **Scope stays compiler-only** — no engine change; `FILLERS.matches` in `generate.ts:230` and
  `RESOLVERS` in `resolveFences` are legitimate downstream dispatch on typed values and are untouched.
