# Decoupling composition from content-type — paradigm proposal & architecture analysis

> Status: **exploration / design analysis (Aug 2026).** Captures a proposed paradigm
> shift for tycoslide and an architect's grounded assessment of it. No code written.
> Companion to `internal/theme-packager-handoff.md` (the two interact — see §Theme-packager impact).

## 1. The proposal (user)

tycoslide today is a **fill-designer's-PPTX-as-is** engine: each physical slide in the
template becomes **one layout**, and each fillable shape on it is bound to **one fixed
content type** (template-text / free-text / table / image). An author fills named slots
on that fixed slide.

**The pain driving this:** to get a mermaid diagram where the template only has a
single-**image** slide, you must **manually duplicate the slide** in PowerPoint to make a
variant. Every content-type variant of the same visual arrangement = another hand-authored
slide.

The proposed alternative — **sample the `.pptx` to learn a design system** rather than
literally filling templates:

1. **Cluster slides into layouts by structure.** Slides 22, 56, 78 are all "two vertical
   columns" → cache as ONE layout that knows its region geometry (left region at x,y with
   width/height; right region likewise).
2. **Cache element styles as reusable specimens.** "This is what a table looks like on a
   dark background", "this is what a full-bleed image looks like", "this is a bulleted list
   here" — sampled from wherever they appear in the deck.
3. **Let authors compose freely WITHIN sampled layouts.** In that two-column layout, an
   author can put an image OR table OR text OR mermaid in either region — not just the one
   content type the original slide happened to show. The region carries geometry so content
   is sized correctly.
4. **Hard constraint:** only use slide **compositions** (region arrangements) that were
   actually found in the template. NOT free-form slide building. Layouts are sampled from
   the template; only the per-region content-type becomes flexible.

**Core idea:** decouple **COMPOSITION** (region arrangement, sampled + clustered from
template slides) from **CONTENT-TYPE-PER-REGION** (flexible: image/table/text/mermaid, drawn
from a library of sampled element styles). Today those two are welded together per slide.

---

## 2. Architect analysis

### Verdict (up front)

The paradigm shift is **directionally sound but oversized for the pain that's driving it.**
The specific thing the user hates — "mermaid where the template only has an image slide, so
I must duplicate the slide" — does **not** require this rearchitecture and is arguably
already supported by the engine today (see Rung 0). The full "sample a design system, cluster
layouts, transplant element specimens across geometry" model is a legitimate **v2 direction**,
and pptx-automizer's `addElement` (confirmed present, unused) makes the constrained version
feasible **without re-growing the generative layout engine shed in June 2026** — *provided*
one discipline holds: only ever reposition **real sampled shapes** into **real sampled region
frames**, never compute geometry or rescale type. The one place that discipline breaks is
tables (fixed column widths), which is exactly the rung to defer. So: **ship the cheap win
now, spike the transplant path, treat full clustering as v2, keep tables out of the first cut.**

### The current model, precisely (evidence)

- **A layout is one physical slide.** `generate()` clones exactly one source slide per step:
  `pres.addSlide(sourceAlias, layout.slideNumber, …)` (`src/engine/generate.ts:158`).
  `Layout.slideNumber` is a single index (`src/engine/types.ts:102-108`).
- **A slot welds one shape to one content type.** `Slot = { key, shapeName, type: SlotType }`
  (`src/engine/types.ts:92-99`). Dispatch is `FILLERS[slot.type]` (`generate.ts:141`).
- **Fillers only rewrite shapes that already physically exist on the cloned slide.** Every
  filler calls `slide.modifyElement(slot.shapeName, …)` (`src/engine/fillers/filler.ts:34,41,50,57`).
  Nothing inserts, imports, or removes a shape.
- **Specimen styling is harvested from the target shape's own paragraphs, not a library.**
  `rebuildParagraphs` reads `collectElements(shape, Tag.PARAGRAPH)` and clones the shape's own
  `pPr`/`rPr` buckets (`src/engine/dom.ts:325-345`). "What a table looks like" is literally
  whatever `<a:tbl>` sits in that shape — there is **no cross-slide style catalog** anywhere.
- **Image sizing already reads the target region's frame.** `fillImage` pulls `<a:off>/<a:ext>`
  off the target shape and fits into it (`src/engine/fillers/image.ts:57-84`). Geometry is
  already region-driven, not baked into the fill.
- **The compiler already unifies content within families.** `code` → `Text`, `mermaid` →
  `Image` before the engine sees anything (`src/index.ts:106-113`). A text region already
  accepts prose/bullets/code; a mermaid already becomes an `ImageFill` filled by `fillImage`.
- **The unified content channel already exists.** `DeckStep.content: Record<string, TextFill |
  TableFill | ImageFill | TemplateFill>` (`types.ts:110-115`) is a discriminated union — the
  value already declares which filler runs.

### Crux resolved

**Q1 — Does the proposal require shape synthesis/insertion? Mostly yes, but the cheap framing
works.** For the general case (a table in a region that only ever held a picture), yes — the
target region has only a `<p:pic>`; a table needs an `<a:tbl>` shape that isn't there, and the
current engine can't produce it. BUT pptx-automizer 0.8.2 exposes
`slide.addElement(presName, slideNumber, selector, callback)`
(`node_modules/pptx-automizer/dist/interfaces/islide.d.ts:21`) — it imports a shape by
name/creationId from any loaded slide into the current slide and runs a modify callback (with
`removeElement` + `ModifyShapeHelper.setPosition` alongside). So the feasible mechanism is:
**transplant a whole real specimen shape from the slide where it exists into the current slide,
`setPosition` it into the target region's frame, then fill it with today's fillers.** It's
"insertion," but never fabricates geometry or a shape from nothing — it reuses real sampled
material. The engine does not use `addElement` today; net-new but within the existing dependency.

**Q2 — Does an element style transplant across geometry stay clean? Depends entirely on content
type.**
- **Mermaid → picture region: free, best case.** Mermaid is *already* an `ImageFill` filled by
  `fillImage` into a picture shape (`index.ts:110-113`). No transplant needed — same shape, same
  filler, geometry read from the target frame (`image.ts:57-84`). This is the whole ballgame for
  the stated pain.
- **Image → picture region: clean.** Sizing is geometry-driven off the target frame for free.
- **Text/bullets/code → text region: clean to reflow, but type doesn't rescale.**
  `rebuildParagraphs` rebuilds paragraphs and text wraps to the box, but font sizes are absolute
  points in the specimen `rPr` — no autofit exists. A 24pt specimen from a 900px column dropped
  into a 400px region wraps harder / overflows. Acceptable, not automatic.
- **Table → anywhere: worst case, genuinely hard.** `fillTable` requires an `<a:tbl>` present
  (`table.ts:65-68`); column widths come from the specimen grid. `reconcileGrid` conserves *the
  specimen table's* total width, **not** the region's (`table.ts:42-50`). Transplant a 900px table
  into a 400px region → overflow; needs brand-new grid-rescale-to-region logic, which *computes*
  geometry (first step back toward the shed engine).

What `dom.ts` gives free: full paragraph/run/bullet reconstruction from a specimen, rich runs,
hyperlinks, bullet-level modeling. What's missing: any notion of a specimen sourced from a
*different* shape/slide (harvest is shape-local, `dom.ts:332`), and any width/point rescaling.

**Q3 — "Only compositions found in the template," defined crisply.**
- A **composition** = the set of region **frames** (`x,y,w,h`) on a physical slide,
  content-type-agnostic. Two slides share a composition iff their region frames match (within
  tolerance) in count and position.
- A region's **permissible content types** = the union, across the whole template, of content
  types for which *a transplantable specimen exists anywhere* — a table specimen from a
  full-table slide can be transplanted into any region large enough. NOT restricted to types
  seen in a "compatible" region.
- Honors the constraint exactly: **arrangement ∈ {sampled compositions}** (never a new region
  arrangement), while **content-type-per-region ∈ {types with a specimen in the template}**.
  That's the precise line between "constrained" and "free-form slide building."

### The incremental ladder (cheapest → full)

**Rung 0 — mermaid (and image) interchangeable in a picture region. Near-zero cost, kills ~80%
of the stated pain. Do this now.** Mermaid and image both resolve to `ImageFill` → `fillImage`
into the *same* picture shape; the engine already does this. Two notes:
1. The manifest **already** lets two layouts share one `slideNumber` — "an image variant and a
   mermaid variant can back the same physical slide" (`src/manifest.ts:31-37`; theme-packager
   §3.4). **The mechanism to get mermaid onto an image slide without duplicating the PPTX slide
   exists today.** If the user believes they must duplicate the slide, the gap is **authoring
   UX / docs, not the engine.**
2. The clean fix: let a single region declare `accepts: [Image, Mermaid]` and route either an
   asset ref or a mermaid fence to it — collapsing the two same-slide variants into one region.
   Compiler/manifest change only, no engine change, no `addElement`. Small effort, negligible risk.

**Rung 1 — text↔image within a single region. Requires transplant; medium.** A picture shape has
no `txBody`; a text shape has no `blipFill`. Crossing the text/image family boundary in one region
needs `addElement` to inject the right shape kind. First rung that actually needs the new machinery.

**Rung 2 — full transplant for the "easy" types (image/mermaid/text/code) across sampled regions.
Real but bounded.** Introduce a `Region` (frame + `accepts[]`) and an element-specimen library
keyed by `(type, context)`; use `addElement` + `setPosition`; reuse existing fillers unchanged.
Exclude tables. Biggest single chunk, but additive — the in-place path stays for single-type regions.

**Rung 3 — tables + structural slide clustering. Defer to v2.** Table transplant needs
grid-width rescaling to the region (new computed geometry); clustering needs the fuzzy "same
2-column layout" judgment the theme-packager deliberately avoided. Highest risk, lowest marginal
payoff.

### Data-model sketch

Keep the standards: const enums, no product name in engine, one unified content channel.

```
Region = {
  key: string
  shapeName: string          // the specimen shape on the source slide that defines the frame
  accepts: SlotType[]        // permissible content types (const enum values)
  // geometry read from shapeName's <a:off>/<a:ext> at fill time; no stored box model
}

Layout = { name, slideNumber, regions: Region[] }   // replaces slots: Slot[]

ElementSpecimen = {          // the sampled-style library
  type: SlotType
  sourceSlide: number
  shapeName: string
  context?: 'onLight' | 'onDark'   // for schemeClr resolution correctness
}
```

Crucially, **`DeckStep.content` does not change** (`types.ts:110-115`) — already a discriminated
union whose value selects the filler. The engine gains one resolution step in `fillSlide`
(`generate.ts:127-149`):

> given `(region, value)`: if `region.shapeName` is already a shape of `value`'s type →
> `modifyElement` in place (today's exact path). Else → `addElement` the specimen for `value`'s
> type from the library, `setPosition` it to `region`'s frame, then run the same filler.

A region with a single-element `accepts` and a matching shape is byte-for-byte today's behavior,
so migration is additive and backward-compatible. `Slot`/`SlotType` survive; `accepts` is just
`SlotType[]`.

### Are we re-growing what we cut? (pivot honesty)

The June 2026 pivot shed a **generative, HTML-measured** layout engine (GridNode/ContainerNode/
layers/proportional layouts). The proposal stays on the right side of that pivot **only under one
rule**: geometry always comes from a **real sampled region frame** and styling always from a
**real sampled specimen** — nothing measured, auto-flowed, or computed from a box model.
`fillImage` already embodies this (reads the target frame, `image.ts:57-84`). Text transplant
stays on-side (wrap to a real box). The moment you add **table grid-width rescaling, font-size
autofit, or computed region splits**, you're rebuilding the deleted engine. That's exactly why
Rung 3 (tables) is the one to defer: `reconcileGrid` conserving specimen width (`table.ts:42`) is
the first computed-geometry temptation. Hold the line at "reposition real things," and this is a
*constrained composition* feature, not a return to generative layout.

### Theme-packager impact

This inverts two explicit current decisions in `internal/theme-packager-handoff.md §8`: "do **not**
build smart layout-clustering" and "we **cannot** add shapes to the `.pptx`." `addElement` lifts
the second; the paradigm needs the first.
- **Pass 1 barely changes** — it already emits per-shape `shapeName`/kind/specimen/**position**.
  Exactly the raw material for both clustering and the specimen library.
- **Pass 2 gains two jobs:** (a) geometric clustering of slides into content-type-agnostic
  compositions, and (b) emitting an element-specimen library keyed by `(type, context)`. The
  `onLight/onDark` tag matters because of the multi-master `schemeClr` hazard (§3.7): a dark-bg
  specimen transplanted onto a light slide can resolve `dk1`/`lt1` through the wrong master and
  render the wrong color.

### Risks / what breaks

- **91 tests are all "modify in place."** They stay green iff the transplant path is additive and
  single-type regions keep today's path. Low regression risk if `modifyElement` flows untouched.
- **Table grid width** overflows on transplant (`table.ts:42-50`) — needs new rescale logic; keep
  tables out of the first cut.
- **Absolute font sizes** don't rescale into smaller regions — quality issue, not a crash.
- **`addElement` + media/relationship plumbing is unproven here.** Transplanting a picture specimen
  then swapping its blip via `setRelationTarget` is a different flow than today's clone-and-fill;
  the media-registration loop assumes `ImageFill` paths (`generate.ts:87-98`). **Needs a spike
  before committing.**
- **schemeClr across masters** (§3.7) — real color-correctness risk on transplant; mitigate with
  the `context` tag.
- **Clustering determinism** — "same 2-column layout" is fuzzy; already flagged out of scope. v2.

### Recommendation (what to build, in order)

1. **Now — Rung 0.** Make a picture-backed region accept `[Image, Mermaid]` as one region
   (compiler/manifest change; `fillImage` already handles both). **First, confirm whether the
   user's "duplicate the slide" pain is actually just not knowing two layouts can share a
   `slideNumber`** (`manifest.ts:31-37`) — if so, this is a docs + one-region-union fix, and the
   "paradigm is wrong" premise dissolves for the driving use case. Likewise surface that a text
   region already accepts prose/bullets/**code**.
2. **Next — a throwaway spike (half-day), not a rearchitecture.** Prove
   `slide.addElement(source, N, "SomeTextBox", setPosition(frame))` then `fillText` renders
   correctly, and separately that transplanting a `<p:pic>` + `setRelationTarget` swaps media
   cleanly. Retires the single biggest unknown before any data-model work.
3. **If the spike passes — Rung 2 behind the new `Region`/specimen-library model.** Additive,
   image/mermaid/text/code only, in-place path preserved for single-type regions. Ship the unified
   `DeckStep.content` untouched.
4. **Defer — tables and structural clustering (Rung 3)** to a v2 explicitly gated on "no computed
   geometry" being unavoidable, at which point re-litigate against the pivot.

Do not start with the data-model rewrite. The user's stated pain is a Rung-0 problem; the grand
model is a real but separate bet whose feasibility hinges on the Rung-2 spike.

### Key files (for whoever picks this up)

- `src/engine/generate.ts:127-169` — fill dispatch + the `addSlide` clone point
- `src/engine/fillers/filler.ts:30-62` — the registry to extend
- `src/engine/fillers/image.ts:52-84` — already region-frame-driven; the template for how
  transplant should read geometry
- `src/engine/fillers/table.ts:36-50` — the grid-width blocker
- `src/engine/dom.ts:325-404` — shape-local specimen harvest to generalize
- `src/index.ts:90-126` — `toEngineSlot`/`toEngineLayout`, where `Region`/`accepts` would land
- `src/manifest.ts:29-43` — the shared-`slideNumber` mechanism
- `node_modules/pptx-automizer/dist/interfaces/islide.d.ts:21` — `addElement`, the enabler

---

## Stage 0 gate — PASSED (Aug 2026, branch `sampled-composition`)

The transplant mechanic is proven. A throwaway spike cloned base slide 2 of
`mz-slides/corp-template.pptx` and used pptx-automizer `slide.addElement(source, N, shapeName,
[modify.setPosition(...)])` to transplant **both** a table (slide 52 `Google Shape;998;p107`)
and a picture (slide 16 `Google Shape;614;p71`) onto it, then rendered the output to PNG.
Result: both rendered correctly at native size/style with **no geometry computation** — the
table's grid and the picture's media/relationship both survived cross-slide transplant. This
retires the two scariest unknowns (table-without-rescale, picture media-swap). The
"observed-specimen, no-extrapolation" model holds: repositioning a real specimen to a real
observed frame needs no rescale/autofit. NOT yet proven (next increment, lower risk): running
the existing fillers to *refill* a transplanted shape's content, and `removeElement` on the
base shape being superseded.

## 3. Approved plan & next steps (plan of record)

> This section is the authoritative, self-contained plan. Do not rely on assistant memory or the
> external `~/.claude/plans/` copy — keep working notes here in `internal/`.

### Vocabulary (decided — do NOT reintroduce "region" or "specimen")
Git history shows the fillable concept was always **`Slot`** (250 uses pre-swap; still the engine
type today). "Region" was never a type — only an English word inside a helper (`assertSlotRegion`).
So we keep `Slot`. A slot `accepts` a set of **`Block`s** — a `Block` is *a kind of content a slot
accepts* (image / table / text / mermaid), named the way the author thinks (markdown blocks), each
knowing which real shape realizes it. ("Sampling" is only the discovery *process*; the thing
itself is a kind of content, so it is named for that, not for its provenance.)
```
Slot  = { key, accepts: Block[] }          // author fills "::left::" — that's a slot
Block = { type, sourceSlide, shapeName }   // an accepted content kind + the shape that realizes it
```
The only change vs today's `Slot { key, shapeName, type }`: a slot is no longer welded to one
shape+type — it `accepts` a set of `Block`s. A per-slot canonical "box" is NOT needed in this slice
(each `Block`'s shape carries its own real coords); it only matters for the pixel-nudge equivalence
problem, which is deferred. NB name collision: the compiler already has `MarkdownBlock` (a parsed
markdown block) — different layer, keep the names distinct.

### Scope of the FIRST slice (deliberately small, approved)
**Get the new theme SHAPE right and make the engine fill it. Nothing else.**

**In scope:**
- New data model: a `Layout` has `slots` (+ a base slide); a `Slot` has `accepts: Block[]`
  (each `Block = { type, sourceSlide, shapeName }`).
- Engine fill: clone the base slide → per slot, fill in place if the base already has that type
  there (today's exact `modifyElement` path), else `addElement` the matching `Block`'s shape,
  `setPosition` it, then run the existing filler. `removeElement` any base shape being superseded.
- Prove with a **hand-authored** `theme.json` (NO extraction/clustering yet) for one mz-slides
  layout + a deck that puts a table in a text-slot and mermaid in an image-slot.

### Approach: TDD (write the red test first)
Lots of fiddly edge cases; drive them test-first (`node:test`). Fail-fast on every ambiguity,
per the project principle (throw naming layout + slot). First cases, in order:
1. **No matching block** — deck asks for a table in a slot whose `accepts` has no table block →
   throw naming layout + slot + requested type + available types. *(write this one first)*
2. Slot filled with a type the **base slide already has** there → fill in place, no transplant.
3. Slot filled with a type available only via **transplant** → `addElement` the Block's shape + fill.
4. Unknown layout name / unknown slot key → throw.
5. Slot left empty → decide + test the behaviour (leave base's shape, or clear it).
6. Existing single-`accepts` slots must behave byte-for-byte as today (the 91 tests stay green).

**Out of scope (deferred, not deleted):**
- Extraction / clustering automation — later.
- The theme-packager skill (helping a user *create* a theme) — **parked**, see below.
- `whenToUse` / per-slide purpose / any "help an agent *choose* a layout" guidance — a layout is a
  shape, not a purpose. Revisit later as structural guidance.

### State (branch `sampled-composition`)
- **Stage 0 gate: PASSED** (see §"Stage 0 gate" above) — transplant mechanic proven.
- **Theme-packager parked:** its files (`skills/theme-packager/`,
  `internal/theme-packager-handoff.md`, `internal/theme-packaging-skill.md`) are set aside in
  `git stash@{0}` ("theme-packager parked (superseded by sampled-composition)"). Superseded for now
  because this direction changes the theme shape first; the extract/render scripts get reused when
  extraction is added later. (Original packager bundle also preserved in `stash@{1}`/`{2}`.)
- Nothing committed; only this doc is untracked in the working tree.

### Next steps (in order — NOT started)
1. **Data model** — `src/engine/types.ts:92-108`: evolve `Slot` to `{ key, accepts: Block[] }`
   (each `Block = { type, sourceSlide, shapeName }`); `Layout` gains a base slide. Today's
   single-shape `Slot` becomes the one-element-`accepts` case (backward compatible).
   `DeckStep.content` (`types.ts:110-115`) unchanged (already a discriminated union whose value
   selects the filler). Project at `src/index.ts:117-126` (`toEngineLayout`), reflect in
   `src/manifest.ts:29-43`.
2. **Engine fill** — `src/engine/generate.ts:127-149` (`fillSlide`) + `:158` (`addSlide`): add the
   transplant-or-modify dispatch per region. A single-type region with a matching base shape must
   stay byte-for-byte today's path so the existing 91 tests remain green. Prove the two increments
   the spike did NOT cover: refilling a transplanted shape via the existing fillers, and
   `removeElement` on a superseded base shape.
3. **Authoring surface** — reuse the existing `::region::` body mechanism; the content's markdown
   shape already declares its type (image syntax→image, GFM table→table, fence→code, mermaid→image,
   else text), so the engine picks the `Block` whose type matches. No new syntax.
4. **Prove** — hand-write a `theme.json` for one real mz-slides layout, author the proof deck,
   `tycoslide build`, open the `.pptx`, confirm table-in-text-column + mermaid-in-image render.
   Keep `npm run typecheck && npm test && npm run lint` green throughout.

### First slice — IMPLEMENTED (branch `sampled-composition`, uncommitted working tree)

> **Model superseded by §4 (Slice-1b).** The account below is the first cut. Two things
> changed in review: (a) the slot now **owns its `frame`** (data, not read from the zip) —
> so `jszip`, `readBaseFrames`/`frameFromDoc`, and the "exactly one base block per slot" rule
> are all **deleted**; (b) an error-capture bug was fixed. Read §4 for the current shape;
> `Slot = { key, frame, accepts }`, `Block = { type, sourceSlide, shapeName, startAt? }`.

All four next-steps above are done and proven end-to-end. Summary + the design forks
resolved (this section is now the source of truth over the sketch in §2):

**Data model (`src/engine/types.ts`).** Added `Block = { type: SlotType; sourceSlide:
number; shapeName: string }`. `Slot` is now `{ key, accepts: Block[], startAt? }` — no
longer welded to one shape+type. `Layout.slideNumber` was **renamed to `baseSlide`**
(the slide cloned for chrome; a block whose `sourceSlide === baseSlide` fills in place).
Today's single-shape slot is the one-element-`accepts` case (`toEngineSlot` in
`src/index.ts` emits one base block per compiler slot) — 255 pre-existing tests stayed
green, confirming byte-for-byte backward compatibility. `DeckStep.content` unchanged.

**Filler refactor (`src/engine/fillers/filler.ts`).** `Filler.fill(slide, slot, …)`
became `Filler.callbacks(value, target): ShapeCallback[]` returning the element-level
`(element, relation)` callbacks. This is the **transplant-then-fill crux resolution**:
pptx-automizer's `append()` runs an added shape's callbacks against the *imported element
itself* (`shapes/generic.ts` + `shapes/image.ts` → `applyCallbacks(cbs, this.targetElement,
relation)`), so the *same* callbacks that `modifyElement` uses to fill an in-place shape
also refill a transplanted one — no name re-lookup, no dependence on whatever name
automizer assigns the appended shape. (We never re-`modifyElement` a transplant by name.)

**Engine dispatch (`src/engine/generate.ts`, exported `fillSlide`).** Per slot: determine
the requested type from the `*Fill` value via the `isXFill` discriminators (`fillTypeOf`),
pick the `Block` in `accepts` whose type matches (**none → throw**, naming layout + slot +
requested + available), then either `modifyElement` in place (base block) or `addElement`
the block's shape + fill via the reused callbacks, then `removeElement` the superseded base
shape. `fillSlide` reads as pseudocode over three named helpers — `resolveBlock` (WHICH
shape), `FILLERS[block.type].callbacks` (WHAT to write), `applyBlock` (WHERE/HOW to place
it) — with `assertNoUnknownSlots` guarding step content up front and `targetOf` building the
fill target. `fillSlide` is exported and unit-tested with a recording stub slide (8 new tests,
edge cases 1–5 + no-base-block + multi-type selection).

**Design forks resolved (deviations/refinements vs the earlier sketch):**
1. **Transplant positioning source.** The spec left "setPosition it" without saying *to
   what*. Decision: a transplant is positioned to the **frame of the slot's base block**
   (the shape on the base slide the transplant supersedes) — a real observed frame, no
   computed geometry. Every slot therefore **must** have exactly one base block
   (`sourceSlide === baseSlide`); missing → throw. This honours §3's "each Block carries
   its own real coords / no per-slot canonical box": the box is *read*, not stored.
2. **Reading that frame.** Base-block `<a:off>/<a:ext>` are read once up front from the
   template zip (`readBaseFrames`, using **jszip** — added to `package.json` deps; already a
   transitive dep of pptx-automizer). Chosen over capturing geometry via a `modifyElement`
   callback because automizer **merges** a `modify` and a `remove` on the same shape name
   (dedup by selector hash, mode-blind — `has-shapes.js:254`), which would silently drop the
   remove. A missing slide/shape frame is skipped (transplant keeps its own coords) rather
   than throwing — the frame is an optimisation, not a correctness gate.
3. **Empty slot (edge case 5).** A slot the deck leaves empty is **left untouched** — the
   cloned base slide keeps whatever shape it had. Simplest, matches pre-composition behaviour.
4. **Unknown slot key (edge case 4).** A deck supplying content for a key the layout doesn't
   declare now **throws** (was a silent no-op). Unknown *layout* name still throws in
   `resolveLayout` as before.

**Proof (engine-level, not compiler).** The multi-block `accepts` model is only expressible
at the engine layer today (the markdown compiler's `theme.json` format still emits
single-base-block slots — a wider authoring surface is deferred). So the proof hand-builds an
engine `Config`/`Deck` and calls `generate()` directly (`scratchpad/proof.mjs`): base slide
10 "Single column dark", a `body` slot accepting **text@10** (base) **and table@52**
(`Google Shape;998;p107`). Step 1 fills `body` with a `TableFill` → the pricing table is
transplanted into the body region, refilled with deck data, positioned to the body frame,
and the base text shape removed. Step 2 fills the *same* slot with a `TextFill` → in-place
prose+bullets. Rendered via `soffice → pdf → pdftoppm`: slide 1 shows the filled table where
the base slide shows text (no text bleed-through — `removeElement` worked); slide 2 shows the
in-place text path. Both correct. This closes the two increments Stage 0 left open: refilling
a transplanted shape and `removeElement` on a superseded base shape.

**Deferred / needs human eyes:** the authoring surface (letting a hand-written/​sampled
`theme.json` declare multi-block `accepts` through the compiler) is not built — transplants
are engine-only for now. Table grid-width rescale, font autofit, and clustering remain out of
scope per the ladder. The transplant positions the specimen at its native width at the base
frame's x/y (no width fit) — acceptable per "no computed geometry", revisit with the
pixel-nudge/box-canonicalisation work.

### Reusable spike (evidence for Stage 0)
The throwaway transplant spike was `scratchpad/transplant-spike.mjs` (session scratch, not in
repo). To reproduce: load `corp-template.pptx`, `addSlide("source", 2, …)`, then
`slide.addElement("source", 52, "Google Shape;998;p107", [modify.setPosition({x,y})])` for the
table and `slide.addElement("source", 16, "Google Shape;614;p71", …)` for the picture; write and
rasterize. Run node scripts from **inside the repo** (module resolution) — not `/tmp`.

## 4. Slice-1b — review cleanup (done)

An architect reviewed slice 1. Two outcomes: a real bug, and a decision to drop the
backward-compat scaffolding in favour of the clean shape. All done on branch
`sampled-composition` (uncommitted). Final model:

```
type Frame  = { x; y; cx; cy };                                   // EMU
type Block  = { type: SlotType; sourceSlide: number; shapeName: string; startAt? };
type Slot   = { key: string; frame: Frame; accepts: Block[] };
type Layout = { name; baseSlide; slots: Slot[] };
```

**A. Error-capture bug (fixed).** `captureFillErrors` wrapped only `slide.modifyElement`.
The transplant path fills via `slide.addElement`, whose callbacks pptx-automizer also runs
(and swallows throws from) during `write()` — so a fail-fast throw from a filler on a
*transplanted* shape was silently swallowed, yielding a broken slide reported as success.
Fix: a shared `wrapCallbacks` now wraps **both** `modifyElement` and `addElement`
(generate.ts). Regression test: `test/composition.e2e.test.ts` transplants a picture as a
`table` block so `fillTable` throws inside the `addElement` callback, and asserts
`generate()` **rejects** and leaves no output file. (Before the fix this test would pass-as-success.)

**B. Backward-compat scaffolding removed (slot owns its frame).**
- `Slot` is now `{ key, frame, accepts }`. The slot **owns** its frame as data.
- **Deleted:** the whole read-geometry-from-the-zip mechanism (`readBaseFrames`,
  `frameFromDoc`, `frameKey`, the `Frame`/`FillSlideContext` indirection), the `jszip`
  runtime dependency (removed from `package.json` deps; re-added under **devDependencies**
  only, used by the e2e test to unzip and assert output), the "exactly one base block per
  slot" rule and its throw, the bare-string fallback in `fillSlide` (a bare string now falls
  through to the "unrecognized value → throw" path), and the dead `FillContext` type and
  `Filler.label` field (+ its four assignments).
- **Moved:** `startAt` off `Slot` onto the text `Block` (it's a text-specimen concern,
  meaningless on a multi-type slot).
- **Added:** `assertSlotsWellFormed(layout)` — rejects a slot whose `accepts` lists two
  blocks of the same type (the value→block lookup would silently take the first). Called
  once per layout at build start.
- Fill logic per slot (`fillSlide`, now `(slide, layout, step, sourceAlias)`): pick the block
  whose `type` matches the value; base-slide block (`sourceSlide === baseSlide`) →
  `modifyElement`; else `addElement(sourceAlias, block.sourceSlide, block.shapeName,
  [setPosition(slot.frame), ...callbacks])`, then `removeElement` the base-slide block it
  supersedes (if the slot has one — a slot need not).
- **Compiler projection unchanged in spirit:** `toEngineSlot` still emits single-base-block
  slots (the markdown `theme.json` has no geometry), giving them a zero `NO_FRAME` that is
  never read because they never transplant. Multi-block + real frames are for
  sampled/hand-authored themes.

**C. Re-proven end-to-end.**
- **Committed tests** (`test/composition.e2e.test.ts`, against a tiny committed synthetic
  fixture `test/fixtures/template/composition.pptx` generated with pptxgenjs — not a real
  theme): (1) table transplanted into a text slot → output slide contains `<a:tbl>`, the
  refilled deck data, the in-place title, and **not** the removed base text; (2) picture
  transplanted + **media-relationship swapped** → output picture's rels target the swapped
  `swap.png`; (3) the error-capture regression above.
- **Hand-authored render proof** (`scratchpad/proof.mjs`, real `mz-slides/corp-template.pptx`):
  base slide 10, a `body` slot with a hand-authored EMU `frame` and `accepts: [text@10 (base),
  table@52]`. Filled with a `TableFill` → the pricing table transplants into the body frame,
  refilled, base text removed; second step fills the same slot in place as text. Rendered
  soffice→pdf→pdftoppm: both correct.
- Final: `npm run typecheck` clean, `npm test` **269 pass / 0 fail**, `npm run lint` clean.

## 5. Total roadmap from here

1. **Slice 1b (this pass):** error-capture fix + BC removal (slot owns frame), dead-code deletion, re-prove. ← now
2. **Broaden the hand-authored proof + committed tests:** 2–3 real mz-slides layouts, multiple slots, all block types (text/table/image-transplant+media/mermaid-into-image). Shake out edge cases.
3. **Manifest advertises `accepts`:** the manifest/authoring surface tells an agent which content types each slot allows (this is needed even though per-slide `whenToUse`/purpose stays deferred).
4. **The sampler (revive the parked theme-packager, reshaped):** automate deriving `theme.json` from a `.pptx` — extract shapes+geometry → cluster slides into layouts by region signature → per layout derive slots (recurring positions) + each slot's `accepts` (content types observed there) + the slot `frame` → emit `theme.json`. This is the automation that makes the whole thing usable; hand-authoring is only the bootstrap.
5. **Equivalence / pixel-nudge handling:** cluster near-identical region positions within tolerance; canonicalize the slot frame.
6. **Agent-guidance layer (was descoped):** structural layout descriptions ("two-column", "full-bleed") to help agents choose — revisit whether/how.
7. **Theme-packager UX + productionization:** the interactive "turn your pptx into a theme" flow reshaped for the sampled model; plus deferred engine gaps (limits, notes, etc.).
