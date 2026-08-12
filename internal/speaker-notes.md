# Speaker notes — design

Add speaker notes to the deck. Author surface is ported verbatim from old
tycoslide (pre-engine-swap); the render mechanism is new because the current
engine (pptx-automizer) has no notes writer where the old one (pptxgenjs) did.

## 1. Author surface (ported from old tycoslide)

Notes live in a slide's **frontmatter** as `notes:` — a plain string. Multi-line
via a YAML block scalar.

```markdown
---
layout: Body
title: Highlights
notes: |
  Open with the revenue number, then pause.
  Don't read the bullets verbatim — expand on launch #2.
---

- Revenue up 12% quarter-over-quarter
- Three major product launches completed
```

Rules (all from the old design that stuck — commit `e7b8d9d`):
- `notes` is slide-level metadata, **not a slot and not a param**. It's stripped
  from frontmatter before slot/param resolution, exactly like `layout`/`name`.
- Plain text only. No bullets, bold, or inline marks — PPTX notes are prose, and
  the old design was deliberately plain (it started as a reveal.js `Note:` body
  marker, then moved to frontmatter). Newlines → separate paragraphs.
- Empty / absent `notes` → the slide gets no notes (see §4 on stray template notes).

CLI: `--no-notes` drops all notes from the output (ported from commit `1c2b8b6`).

## 2. Data model

Notes are slide-level, sibling to `content`, on all three step shapes:

- `engine/types.ts` → `DeckStep = { layout; content?; notes?: string }`
- `markdown/types.ts` → `CompilerDeckStep` and `ResolvedCompilerDeckStep` gain
  `notes?: string`

Not a `SlotType`, not a `*Fill`. Notes never touch the `FILLERS` registry, the
slot loop, or a shape name — they map to a whole separate OOXML part, not a shape
on the slide.

## 3. Compiler

In `markdown/deckCompiler.ts::compileStep`, pull `notes` out of the raw
frontmatter the same way `layout` is pulled, coerce to string, attach to the
step. One field, no validation beyond "stringify if present." Mirrors old
tycoslide's `documentCompiler.ts` (`const notes = params.notes; delete
params.notes; … slide.notes = notes`).

## 4. Rendering — the real work

Three facts drive the design:

1. **No public notes *writer*.** The notes-slide primitives (`copySlideNoteFiles`
   / `updateSlideNoteFile` / `getSlideNoteSourceNumber` / `appendNotesToContentType`)
   are all `@internal`, and they only serve the clone path (copy the *source*
   slide's notes and re-point them) — there is no "set arbitrary authored text"
   primitive. `modifyElement`/`addElement`/`generate()` operate on shapes in
   `slides/slideN.xml`, which the notes part isn't.
2. **BUT a general in-band seam does exist** (corrected — an earlier claim that
   only shapes are reachable was wrong): `slide.modify(async (document, parent) =>
   …)` hands you the whole slide XML document, and `IArchive` exposes
   `write`/`writeXml`/`readXml`/`remove`/`fileExists` — enough to add the
   notesSlide part, its rels, and a `[Content_Types]` override *during* `write()`.
   Because it runs per-slide inside the addSlide callback, it also gives you the
   **exact cloned slide**, which would sidestep the slide-numbering mapping
   entirely (see below).
   **SPIKE RESULT (2026-08-10): confirmed viable — now the preferred design.**
   `applyModifications()` (has-shapes.js) invokes each callback as
   `modification(xml, this)`, `xml` = the slide doc read from `this.targetArchive`.
   Empirically: `parent.targetArchive` is the **OUTPUT** archive (a marker part
   written through it landed in the final `.pptx`), and `parent.targetNumber` is
   the **real output slide number** (e.g. 75), handed to us directly — so the
   `sldIdLst`→rels→slideK mapping (and the whole slide-number bug class) vanishes.
   Auto-copy runs *before* modifications, so `notesSlide${targetNumber}.xml`
   already exists wired-up when the template slide had notes → common case is just
   "overwrite its text"; strip is "remove part + rel + content-type"; synth
   (source had no notes) is the only harder branch. Minor caveats, none fatal:
   (b) the synth branch's `[Content_Types].xml` edit is package-global, but
   addSlide callbacks run sequentially in `write()` → no race; (c) couples us to
   `IArchive` (read/write/writeXml/remove/fileExists) vs. plain "it's a zip".
   **Migration: move notes into the addSlide callback via `slide.modify`, keyed on
   `parent.targetNumber`; delete the post-write reopen + `sldIdLst` mapping.**
   - (`getJSZip()` is also public but unsafe: `finalizePresentation()` has no
     idempotency guard, so `getJSZip()` alongside `write()` double-appends every
     slide → corrupt deck. That hazard is why the *reopen-from-disk* variant is
     used, not `getJSZip()`. It does NOT apply to `slide.modify`, which runs
     inside the normal write pipeline.)
3. **It auto-copies the source slide's notes.** On clone (`slide.js:49–53`) it
   copies whatever notes the *template* slide had. So doing nothing already
   leaks template notes onto our slides — we have to overwrite/strip regardless.

**Slide-numbering gotcha (cost 2 debug rounds).** automizer numbers cloned slides
*continuing after* the template's slide count — a 2-slide deck from a 74-slide
template yields `slide75.xml`/`slide76.xml`, and the template's original slides
persist as orphans. The post-write pass therefore must map deck-step order →
physical part via `presentation.xml` `<p:sldIdLst>` → `presentation.xml.rels`,
never assume `slideN.xml == step N`. (The `slide.modify` route above avoids this
because it operates on the specific cloned slide.) A separate, pre-existing issue:
those orphaned slides + their notesSlides ship in every deck — dead weight and a
leak of the designer's private notes — worth its own cleanup.

### Why not fork/patch pptx-automizer instead?

A fair alternative: add a public notes writer to automizer itself, via a hard
fork (`@tycoworks/pptx-automizer`), a `patch-package` diff, or an upstream PR.
Weighed and set aside for now:

- automizer's notes machinery only **copies/re-points an existing** notes slide
  (`copySlideNoteFiles` works *from* a source number; `getSlideNoteSourceNumber`
  is `undefined` when a slide has none). It has **no create-from-scratch path** —
  and a clean template's slide typically has a `notesMaster` but no notes part.
  So the fiddliest branch (synthesize the notes slide + wire it to the master) is
  **new code either way**; forking only reuses automizer's rId/content-type
  helpers, not the hard part.
- tycoslide is a **published** package (mz-slides depends on it). A hard fork adds
  republish + rewire churn; a patch couples every build to automizer's private
  internals, which can shift under a bump.
- The post-write pass keeps notes a **self-contained leaf** — touches nothing in
  the render pipeline.

Long-term, the right home for "write speaker notes" is *inside* pptx-automizer.
If the synthesis logic here proves clean, **offer it upstream as a PR**; if it
lands, delete the local pass and just bump the dep. Fork now = more entanglement
than a notes feature warrants.

**Shipped mechanism: an in-band `slide.modify` pass (post-write reopen deleted).**
Inside the existing `pres.addSlide(sourceAlias, layout.slideNumber, cb)` callback
in `generate.ts` — right after `fillSlide` runs — we register, for **every** step:
`slide.modify(async (_document, parent) => applyNotesToSlide(archive(parent.targetArchive),
parent.targetNumber, step.notes, excludeNotes))`. automizer runs the callback
during `write()` (`applyModifications`, the last step of `Slide.append`) and hands
us `parent.targetArchive` (the OUTPUT archive) and `parent.targetNumber` (the real
output slide number). Because automizer's clone auto-copies the source slide's
notes as `notesSlide${targetNumber}.xml` and wires its rels + content-type *before*
the callback, notes map **1:1 to `targetNumber`** — the whole `sldIdLst`→rels→slideK
mapping (and its slide-number bug class) is gone. Registered for every slide, not
just those with notes, so a slide without authored notes still has any auto-copied
template notes stripped. Notes XML is built with `@xmldom/xmldom` (the fillers'
tool), not string templates, so `<a:t>` escaping is free.

**Cooperating with automizer's XML buffer (the second gotcha, cost 1 debug round).**
automizer's archive caches every part it edits via `readXml`/`writeXml` as a parsed
document (`Archive.buffer`) and re-serializes the cache over the zip at `output()`
— *after* our callback. For a cloned slide's notes that buffered set is:
`slide${N}.xml.rels` and `notesSlide${N}.xml.rels` (both touched by
`updateSlideNoteFile`) and `[Content_Types].xml` (touched by
`appendNotesToContentType`). A plain `write`/`remove` to any of those is silently
reverted at the final flush — a strip left the part removed but the slide→notes rel
and the notes-rels file resurrected (a dangling rel = corrupt deck). The notes PART
(`notesSlide${N}.xml`) is copied raw (`FileHelper.zipCopy`) and never buffered, so
raw part writes/removes do stick. Fix: a thin **buffer-aware adapter**
(`toNotesArchive` in `generate.ts`) wraps `parent.targetArchive` — it reads the
buffered (automizer-current) content, and steers writes/removes back through the
same buffer, so `applyNotesToSlide` stays pure over a minimal string+xmldom
`NotesArchive` interface while its edits survive `writeBuffer`. The buffer holds
docs parsed by the one installed `@xmldom/xmldom`, so the same parser/serializer
operate on them safely (the "mixing instances" worry is moot with a single install).

### What `applyNotesToSlide(archive, N, notes, excludeNotes)` touches

Keyed on `notesPath = ppt/notesSlides/notesSlide${N}.xml`,
`slideRelsPath = ppt/slides/_rels/slide${N}.xml.rels` (N = `targetNumber`).

- **Write** (`notes` non-empty AND `!excludeNotes`):
  - `notesPath` exists (auto-copied): **overwrite its body only**; its rels
    (notes→slide, notes→master) and content-type are already correct — leave them.
  - `notesPath` absent (source had no notes): synthesize `notesPath`; create
    `ppt/notesSlides/_rels/notesSlide${N}.xml.rels` → `../slides/slide${N}.xml` and
    the notes master; add a `notesSlide` rel to `slideRelsPath` at the **next free
    `rId`** (a cloned slide already carries layout/image rels — never hardcode);
    add the `[Content_Types].xml` override. Notes master: probe existing
    `ppt/notesMasters/notesMaster${k}.xml` via `fileExists`; if none, throw (synth
    of a notes master is out of scope).
- **Strip** (`notes` empty/undefined OR `excludeNotes`): if `notesPath` exists,
  remove it, its rels file, the slide→notesSlide rel, and the content-type override.
  Leaving any one behind (a dangling rel especially) = corrupt file.

`notesSlide` numbering equals the output slide number, so no enumeration is needed.

### Dependencies / edge cases to confirm at build time

- **Notes master.** A notes slide must reference a `notesMaster`. Nearly every
  PowerPoint-authored `.pptx` ships exactly one; reuse it via its rel (multiple
  notes slides sharing one master is normal — each `notesSlideK.xml.rels` points
  at the same `notesMaster1.xml`). If a template has none, synthesize a minimal
  `notesMasters/notesMaster1.xml` **plus all four wiring points**: its
  content-type override, `presentation.xml`'s `notesMasterIdLst`, **and the
  matching relationship in `ppt/_rels/presentation.xml.rels`** that the
  `notesMasterIdLst` `r:id` resolves to. This is the one genuinely fiddly branch;
  most templates skip it.
- **Direct dependencies, not transitive.** Add `jszip` (and `@xmldom/xmldom` if
  not already direct) to tycoslide's own `package.json` at a compatible range.
  Both resolve at top level today via pptx-automizer, but relying on a transitive
  dep is the silent contract the repo standards forbid — an automizer bump could
  drop or rev them with no signal. Zero install cost; already in the tree.
- **Empty output slide notes:** covered above under "Stripping is symmetric."

## 5. `--no-notes` wiring

A `generate`/`buildDeck` option `excludeNotes` (default `false`). `--no-notes`
sets it `true`, threaded through to every slide's `applyNotesToSlide` call, which
writes no authored notes **and** strips any auto-copied template notes —
guaranteeing a notes-free deck. Because the `slide.modify` callback is registered
for every step regardless, the strip runs whether or not notes were excluded.

## 6. Test plan (node:test) — as built

No `.pptx` binary fixtures. `applyNotesToSlide` is pure over a minimal
`NotesArchive` interface (`read`/`write`/`remove`/`fileExists`), so the whole
feature is tested without a template on disk (`test/notes.test.ts`), driven by a
**fake `NotesArchive` backed by a `Map<string,string>`**:

- `buildNotesSlideXml`: single line → one `<a:p>`; three lines → three `<a:p>`; a
  trailing newline adds no empty paragraph; the body placeholder is
  `type="body" idx="1"`; special chars `& < > "` are escaped and round-trip.
- `nextFreeRId`: `rId1..rId3` → `rId4`; empty rels → `rId1`.
- `applyNotesToSlide` (overwrite): seed `notesSlide${N}.xml` + its rels + a
  content-type + a slide rel → call with notes → the part's `<a:t>` texts are
  replaced and the rels/content-type are byte-for-byte unchanged.
- `applyNotesToSlide` (synthesize): seed a slide rels + a `notesMaster1.xml` but
  NO notesSlide → call with notes → the part is created, notes rels point at the
  slide + master, the slide rels gains a `notesSlide` rel at the next free `rId`,
  the content-type override is added. A master-less archive asserts it throws.
- `applyNotesToSlide` (strip): seed a slide + auto-copied notesSlide + its rels +
  content-type → call with `excludeNotes:true` (and, separately, with `undefined`
  notes) → part, notes rels, slide→notesSlide rel, and content-type override all
  removed; no dangling reference. A no-notes slide with nothing to strip is a
  no-op. No written part carries a double `<?xml?>` declaration.
- Compiler: `notes:` frontmatter → `step.notes`; absent → `undefined`; a YAML
  block scalar → multi-line string; `notes` never appears in `content`/params.

The buffer-aware adapter (`toNotesArchive`) is exercised by a real end-to-end
deck build (unit tests use the Map fake, which has no buffer to fight).

## 7. Implementation anchors

- **Insertion point:** inside the `pres.addSlide(...)` callback in
  `src/engine/generate.ts`, next to `fillSlide` — register
  `slide.modify(cb)` per step; the callback runs during `write()`.
- **Buffer adapter:** `toNotesArchive(parent.targetArchive)` in `generate.ts`.
- **Data model:** `DeckStep` in `src/engine/types.ts` gains `notes?: string`.

## 8. Resolved

1. **Mechanism:** in-band `slide.modify` pass keyed on `parent.targetNumber`,
   operating on `parent.targetArchive` via a buffer-aware adapter. The earlier
   post-write reopen-from-disk pass (and its `sldIdLst`→rels→slideK mapping) was
   deleted — `targetNumber` gives the 1:1 mapping for free. In-band via
   `getJSZip()` remains rejected (double-finalize hazard); `slide.modify` runs
   inside the normal write pipeline and is safe.
2. **xmldom:** notes XML built via `@xmldom/xmldom`. `jszip` is no longer used by
   the notes code (the post-write reopen is gone).
3. **No notesMaster in template → throw (synth deferred).** If a slide needs a
   *new* notes part and the template ships none, `applyNotesToSlide` throws a
   specific, actionable error (naming the slide, pointing at PowerPoint's
   View → Notes Master, or `--no-notes`). Synthesizing a notes master is out of
   scope — most PowerPoint-authored templates carry one, and stripping never
   needs a master, so a master-less template still builds cleanly with notes
   disabled or with no authored notes.

## 9. Open decisions

1. **Multi-paragraph rule:** split notes on `\n` into `<a:p>` paragraphs
   (recommended, matches plainness) vs. one paragraph with line breaks.
