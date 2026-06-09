# Preview Pivot: HTML→Wireframe, LibreOffice→Preview

Status: design doc (not approved). 1-day fidelity spike is the gating decision.

## Problem

Today's render pipeline does two things with HTML:

1. **Job A — layout / positioning**: text measurement, flex layout via Playwright. Mechanical.
2. **Job B — aesthetic preview**: colors, shadows, borders, fonts. Tries to make the HTML preview look like the final .pptx.

Job B has two compounding costs:

- **CSS ∩ OOXML feature ceiling.** Every new visual feature must be expressible in both CSS *and* OOXML. The intersection is small: 4 shapes (rect/ellipse/triangle/diamond), 3 dash types (solid/dashed/dotted), 3 image fits. PowerPoint can express ~187 shapes, 10 dash types, gradients, callouts, glow, inner shadows, per-corner radius — none of which we can use today because CSS can't render them convincingly.
- **False fidelity claim.** The HTML preview is rendered by Chrome's CSS engine, which is a *fifth* renderer in a world where PowerPoint, Keynote, Google Slides, and LibreOffice all render .pptx differently. CSS drift from PowerPoint is the worst of the bunch because CSS isn't trying to be PowerPoint at all.

## Proposal

Two changes, both deferred behind a 1-day spike (see "Kill criterion"):

1. **Strip Job B from HTML.** HTML becomes a layout-only wireframe — correct widths, paddings, font metrics, table cell sizes, line cross-axis dimensions. No colors, shadows, decoration SVG, run-level styling. Optional `TYCOSLIDE_DEBUG_LAYOUT=1` env var injects a 1px dashed outline on every node for DevTools debugging.
2. **Add LibreOffice as the preview renderer.** The .pptx that pptxgenjs writes is piped through `soffice --headless --convert-to pdf` and then `pdftoppm -r 150 -png` for per-slide PNGs.

### Pipeline topology

```
Markdown
  → ComponentTree
  → PositionedNode tree              ← measured via wireframe HTML + Playwright
  → pptxgenjs (WRITES .pptx)
  → deck.pptx                        ← customer-editable artifact, UNCHANGED
       ↓
       soffice (READS .pptx)
       ↓
       deck.pdf                      ← export artifact
       ↓
       pdftoppm
       ↓
       slide-N.png                   ← preview artifacts
```

pptxgenjs and LibreOffice are **orthogonal, not redundant**: pptxgenjs writes, LibreOffice reads. Replacing pptxgenjs with UNO is not viable — see "Alternatives considered."

## Wireframe HTML diet

Per-function plan for `packages/core/src/core/layout/layoutHtml.tsx`. The codebase's existing `box-sizing: border-box` baseline at line 1049 makes the diet safe — borders stay layout-wise, just go transparent.

| Function | Action | Trapdoor |
|---|---|---|
| `styleContainer` / `styleStack` / `styleGrid` | No change — already 100% layout | None |
| `styleText` (373-407) | Drop `color`, `border`, `applyShadowCSS`. Keep all font metrics | Bold/italic must stay (affects glyph width) |
| `styleImage` (428-484) | Drop `object-fit`, `filter:drop-shadow`. Keep aspect-ratio caps + wrapper sizing | Aspect-ratio caps in wrapper styles ARE the layout |
| `styleLine` (500-533) | Replace SVG with empty `<div>` of the same size. Drop `applyShadowCSS` | Cross-axis stroke dimension must stay |
| `styleShape` (552-581) | Collapse switch — all shapes become flex-sized divs (their bounding boxes are rectangles) | Triangle/diamond/ellipse have rectangular bounds; safe |
| `styleSlideNumber` (613-635) | Drop `color`. Keep font metrics | Same as `styleText` |
| `styleTable` (637-737) | Drop outline + cell backgrounds. Keep cell border widths but set color to `transparent` | Cell border widths affect grid track sizing — must preserve width |
| `renderRunSpanHTML` (849-902) | Drop run color, text-decoration, highlight, hyperlink color. Keep `font-weight`, `font-style`, font-face selection | Bold/italic widen glyphs |

### Dead helpers (delete entirely)

`styleSvgPolygon`, `shadowOffsets`, `applyShadowCSS`, `applyCSSBorder`, `dashTypeMultipliers`.

### Optional debug-mode CSS

Add to `generateBaseCSS` at line 1046:

```ts
${process.env.TYCOSLIDE_DEBUG_LAYOUT ? `
  * { outline: 1px dashed rgba(255,0,0,0.2); outline-offset: -1px; }
  *[data-node-type="text"] { background: rgba(0,128,255,0.05); }
` : ''}
```

Outlines (not borders) because outlines don't affect box-sizing or get clipped by `overflow: hidden`.

### Aggregate impact

~340 lines deleted from `layoutHtml.tsx` (1211 → ~870). ~280 lines kept (44% of the original `style*` + `renderTextRuns*` footprint).

## The 5 PRs

Each is atomic, verified by a snapshot harness that asserts no measurement deltas on the `PositionedNode` x/y/w/h tree.

### PR 0 — Verification harness

- New: `packages/core/test/fixtures/diet-snapshots/`
- Helper: `snapshotPositionedTree(slidePath): SerializedTree` runs the pipeline through `processDeferredSlides` to the `PositionedNode` tree, serializes `{type, x, y, w, h}` per node, rounds to 2dp.
- Fixtures: `examples/showcase/showcase.md` + per-component focused decks (table, code, mermaid, image-cover, image-contain, line, shape, nested-flex).
- CI test: run on `main`, run on PR branch, assert identical.

Build this **before** any diet PR. Pure addition, zero risk.

### PR 1 — Drop shadows everywhere

- Delete `applyShadowCSS` calls in `styleText`, `styleImage`, `styleLine`, `styleShape`, `styleSvgPolygon`.
- Delete `applyShadowCSS` and `shadowOffsets` helpers.
- **Ships pre-pivot**: shadows are outside the box (CSS), have no measurement impact. Pure drift reduction.

### PR 2 — Drop colors + run decoration

- Delete `color` from `styleText`, `styleSlideNumber`.
- Delete per-run `color`, `backgroundColor`, `text-decoration` from `renderRunSpanHTML`.
- Keep `font-weight`, `font-style`, font-face selection.
- **Ships pre-pivot**: drift reduction. Minor preview impact (gray text) but PPTX side already owns colors.

### PR 3 — Wireframe shapes + lines

- Collapse `styleShape` to a single flex-sized div branch.
- Replace `styleLine` SVG with empty innerHTML, preserve cross-axis stroke dimension.
- Delete `styleSvgPolygon`, `dashTypeMultipliers`, `applyCSSBorder`.
- **Hold until soffice preview lands**: HTML preview would lose ability to show shape fills.

### PR 4 — Image decoration

- Simplify `imgStyle` to remove `object-fit` and `filter:drop-shadow`.
- Drop `styles.overflow`.
- **Split**: ship shadow drop pre-pivot (same as PR 1). Hold `object-fit` drop until soffice preview lands (preview would show stretched images regardless of `fit`).

### PR 5 — Wireframe tables

- Drop `outline` from outer border.
- Substitute `transparent` color for grid cell borders (keep widths).
- Drop cell background cascade.
- **Hold until soffice preview lands**: tables heavily debugged via current preview.

### Pre-pivot value capture

PRs 1, 2, and the shadow half of PR 4 ship today as pure drift-reduction. They're improvements regardless of whether the LibreOffice pivot proceeds.

## LibreOffice integration

### Command

```bash
soffice --headless --convert-to pdf deck.pptx --outdir tmp/
pdftoppm -r 150 -png tmp/deck.pdf tmp/slide
# produces tmp/slide-1.png, tmp/slide-2.png, ...
```

### Why two binaries

`soffice --convert-to png` exports **only the first slide** of a multi-slide deck. See [tdf#48015](https://bugs.documentfoundation.org/show_bug.cgi?id=48015) (open since 2012, NEW, 12 duplicates including the more frequently cited tdf#67614). Historical workarounds are now dead:

- HTML export workaround deprecated in LibreOffice 24.2.
- "Export As Images" extension broken as of March 2026 (Comment 45 on tdf#48015).
- No fix in flight; reimplementation discussions are speculative.

`pdftoppm` (from poppler-utils) is the standard rasterizer. Single static binary alternative: `mutool draw` (mupdf). Both are in homebrew, apt, choco.

### Distribution

soffice is opt-in, not required. The CLI should:

1. Detect `soffice` and `pdftoppm` on PATH at startup.
2. If both present, enable `--soffice-preview` flag and `tycoslide export --to pdf|png` commands.
3. If missing, fall back to wireframe HTML preview with a clear one-line note: `Install LibreOffice + poppler for PNG preview: brew install --cask libreoffice && brew install poppler`.

Never bundle. Both are large native binaries with platform-specific installers.

## Kill criterion (1-day spike)

Before any of PRs 3, 4-rest, 5 (and before wiring `tycoslide export`), verify soffice fidelity on real output:

1. Run `soffice --headless --convert-to pdf showcase.pptx`.
2. Run `pdftoppm -r 150 -png showcase.pdf showcase-page`.
3. Open the same `.pptx` in PowerPoint (and Keynote if available) and screenshot the same slides.
4. Eyeball diff. Pay attention to:
   - Card shadows (heavy use in current showcase)
   - Image cover-cropping (recent commit `ffad99f` added native `sizing.type`)
   - Inter font rendering across platforms
   - Table borders on factsheet format
   - Hyperlink color / underline behavior
5. Bonus: add one OOXML-only shape (e.g. `chevron` or `callout1`) via pptxgenjs to validate the feature-unlock path actually works through soffice.

**Pass criterion**: "would a designer flag obvious artifacts?" If no, proceed. If yes, ship PRs 0/1/2/shadow-half-of-4 (they're independent wins) and abandon the soffice path.

## Sequencing

| Week | Work |
|---|---|
| 0 | PR 0 (harness) + PR 1 (shadows) + PR 2 (colors). Drift reduction, pivot-independent |
| 1 | Fidelity spike. **Kill criterion gate.** |
| 2 | `tycoslide export --to pdf` / `--to png` opt-in CLI commands. Clear errors if binaries missing |
| 3 | `--soffice-preview` flag on `build`. Both surfaces coexist. Dogfood |
| 4-5 | PRs 3, 4-rest, 5. Wireframe HTML diet completes |
| 6 | Add `TYCOSLIDE_DEBUG_LAYOUT` debug-mode CSS |
| 7 | First feature unlock: add one OOXML-only shape (e.g. callout speech bubble for `quote.ts`) |
| 8+ | Flip default: `build` writes .pptx + wireframe HTML always; soffice PNG if available |

## Alternatives considered

| Alternative | Verdict |
|---|---|
| **Keep HTML preview as-is, dedupe at shared "ResolvedNode" IR layer** | Worth doing for `lineHeight`/`normalRatio` regardless. Does not unlock OOXML features. Complementary, not substitute |
| **Replace pptxgenjs with LibreOffice UNO API** | No. UNO has no TS types, requires Java/Python bridge, slower (~500ms cold per write), and PowerPoint round-trip quirks. pptxgenjs already supports the full OOXML feature set we want |
| **Microsoft PowerPoint COM automation** | OS-locked (Win/Mac). Useful only as a CI fidelity baseline (snapshot truth → image-diff vs soffice output). Not for runtime |
| **Aspose.Slides** | Excellent fidelity, native renderer, no Office install. But enterprise license cost. Possible Phase-N premium backend; not Phase 1 |
| **ConvertAPI / CloudConvert** | Network dep, doesn't fit CLI tool model. Pass |
| **OnlyOffice / Collabora Online** | OnlyOffice less mature on .pptx; Collabora is a LibreOffice fork (same engine). No advantage over soffice |
| **JS-based .pptx renderers (pptxjs etc.)** | Poor quality on non-trivial decks. Pass |

## Open questions

- Does the existing `examples/showcase` cover enough variety for the fidelity spike, or do we need additional fixtures (heavy shadows, complex tables, edge-case images)?
- Persistent soffice profile / daemon mode to amortize cold-start cost — worth investigating in Phase 3 if cold-start latency becomes a friction point.
- Should `tycoslide export --to pdf` accept a watch mode (rebuild on .md change)? Defer to user demand.
- Aspose backend as a future "premium" rendering path — interesting but premature.

## File references

- `packages/core/src/core/layout/layoutHtml.tsx` — the entire diet
- `packages/core/src/core/layout/layoutHtml.tsx:1049` — global `box-sizing: border-box` (the trapdoor mitigation)
- `packages/core/src/core/rendering/pptxConfigBuilder.ts` — PPTX-side translation, already owns all the decoration the diet removes
- `packages/core/src/core/rendering/presentation.ts:221-377` — `processDeferredSlides`, hook point for `snapshotPositionedTree` helper
- `packages/cli/src/build.ts:51-85` — where `--preview` is wired today, and where `tycoslide export` would land
- [tdf#48015](https://bugs.documentfoundation.org/show_bug.cgi?id=48015) — canonical "export all slides as bitmap" bug, unfixed since 2012
