# Cowork field report: first outside use of a packaged skill

> Status: **triage (28 Aug 2026).** An agent in Cowork's cloud container built a
> 10-slide deck from the packaged `mz-slides` skill — the first time tycoslide has
> been driven by someone other than its author, in an environment nobody designed
> for. It worked, and the output was judged to look like real collateral, but the
> run surfaced three blockers and a long tail of engine and theme defects.
>
> This doc records what was found, who owns each item, and what has already been
> fixed, so the list survives the conversation it came from.

The headline: **the model held up, the edges did not.** Manifest-driven composition
(read layouts, fill parameters and slots) was productive immediately and needed no
hand-holding. Everything that went wrong was environment, error reporting, or theme
content — not the paradigm.

## 1. Blockers

### 1.1 `npm install` failed outright — FIXED, unreleased

The container allowlists `registry.npmjs.org` and nothing else. `@playwright/browser-chromium`
fetches its browser from `cdn.playwright.dev`, got a 403, and — as a hard dependency —
took the whole install down: npm rolled back and left no `node_modules`, so decks with
no diagrams at all could not build.

Self-inflicted. The dependency was added in 0.11.1 to fix a mermaid crash on a normal
machine, trading a soft failure (diagrams break) for a hard one (nothing installs).

**Fixed** by dropping the browser package entirely — see [§4](#4-the-fix-find-a-browser-dont-ship-one).
The reporter's suggested `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is no longer needed.

> Their report attributes the download to `playwright-core`'s postinstall. That package
> has no install scripts at all; the download came from `@playwright/browser-chromium`.
> The symptom and conclusion were right, the attribution was not.

### 1.2 Mermaid could not render — FIXED, unreleased

Playwright resolves browsers by **exact build revision**, looking for a literal
`chromium_headless_shell-<rev>` directory. Its Playwright wanted **1234**; the container
ships **1194** at `/opt/pw-browsers`. A perfectly good Chromium was present and unusable.

The reporter got it working by symlinking 1194 into the path 1234 expects, and was right
to call that a hack no real run would do.

**Fixed** — see [§4](#4-the-fix-find-a-browser-dont-ship-one). Verified by launching build
**1228** where Playwright demanded **1234**, which is the same mismatch they hit.

### 1.3 Every table renders illegibly — OPEN, mz-slides

The worst defect in the set, and the only one that silently produces a broken slide
rather than an error.

In `Pricing table dark`, whichever row lands last receives the template's pricing-CTA
styling: near-black text on a near-black fill, plus a violet highlighted final cell. The
reporter confirmed it is **positional, not content-driven**, by adding a sixth row and
watching the styling move.

All three table paths are affected, which is the tell:

| Layout | Source slide | `bodyRows` |
|---|---|---|
| `Pricing table dark` | 53 | `[2, 5]` |
| `Pricing table with highlights dark` | 52 | `[2, 5]` |
| `Single column dark` (table accept) | 52 | `[2, 5]` |

Every path points at a **pricing** table in the template, and row 5 of that specimen is
the CTA row. The theme has no plain-table specimen at all, so there is no way to get a
legible ordinary table out of it.

**Likely fix:** narrow `bodyRows` to `[2, 4]` so the CTA row is never a candidate, or
point the accepts at a plain table slide if the template has one. Both variants build;
the styling difference was **not** visually confirmed, so treat this as a hypothesis
that needs a render-and-look before it is called done.

Owner: mz-slides `theme.json`. The engine is behaving as configured.

## 2. Engine defects (tycoslide)

Ordered by how many users hit them.

1. **Image-fit warnings are noise.** `shrunk to X% of native` fires for every bundled
   client logo and illustration, *including in the layouts built for them*. SKILL.md tells
   the author to supply a different image; there is nothing to supply. Calibrate against
   rendered size, not native pixels, or drop the warning where the asset came from the
   theme's own catalog.
2. **No text-overflow detection.** A slide whose body ran into the footer logo built
   silently. Only the mandated PNG review pass caught it. Overflow is detectable at build
   time and is exactly the class of error the QA loop exists to compensate for.
3. **Errors surface as raw uncaught stack traces.** The message content is good — one
   reporter singled out `Unknown key(s): col1_body. Valid keys: title, col1_icon...` as
   genuinely helpful — but it arrives wrapped in a Node stack dump. Catch at the CLI
   boundary and print clean.
4. **Slide numbering disagrees between error paths.** `deckSchema` reported "Slide 3" for
   the 4th slide; `slideParser` reported "Slide 5" for the 5th. One is 0-indexed.
5. **The compiler stops at the first error**, but SKILL.md instructs the author to "read
   every error — fix all of them." One per build makes that impossible. Either collect and
   report all, or stop promising it.
6. **A missing `---` between slides reports as `text found outside a ::slot:: marker`,**
   which sends the author hunting through slot markers instead of looking for a separator.
   Detect the likelier cause and name it.

## 3. Docs and packaging defects

- **SKILL.md says manifest entries carry `name`; they carry `key`.** Cost the reporter a step.
- **`syntax.md` links `README.md#cli`,** which is not in the packaged skill.
- **`skill.md` and `SKILL.md` collide.** `tycoslide package` writes `skill.md` beside the
  source `SKILL.md`. On a case-sensitive filesystem both exist and can drift.
- **Two undocumented requirements:** the build must run *from the theme root*, not just be
  installed there — `npx` needs the local `node_modules`, and `./theme.json` plus
  `assets/...` only resolve relative to the deck's directory.

## 4. The fix: find a browser, don't ship one

Both browser blockers share one cause: tycoslide tried to own the browser. It should not.

Marp and Slidev both standardise on mermaid and both refuse the runtime — `marp-cli`
depends on `puppeteer-core`, the variant that downloads nothing and uses a browser you
already have; Slidev has no browser dependency at all. Copying that:

- `@playwright/browser-chromium` and `playwright` are gone; `playwright-core` alone remains
  (zero transitive dependencies). Nothing is ever downloaded from a CDN.
- Launch tries three sources, most explicit first: `TYCOSLIDE_CHROMIUM_PATH` naming an
  executable outright (**any build — the revision is not checked**), then a system Google
  Chrome, then whatever `npx playwright install` left in Playwright's cache.
- When all three fail, the error names all three remedies.

Verified: mismatched-revision launch (1228 where 1234 was demanded), system-Chrome
fallback with an empty Playwright cache, and the default path on a normal machine. Three
tests cover the launcher including the no-browser-anywhere error.

Side effect: ~554MB leaves every install.

**The trade:** a machine with no browser and no network now gets a clear error instead of
a working diagram. Marp and Slidev both take that trade.

## 5. Theme defects (mz-slides)

Not tycoslide's to fix, recorded so they are not lost.

- **The image slot has no inset.** `Full bleed image with title dark` is the *only* layout
  with an image slot, so it is the only home for a mermaid diagram, and its frame spans the
  entire slide. Wide diagrams clip off both edges; tall ones render behind the title.
  Diagrams need a layout with margins.
- **Three illustrations are unusable in card slots.** `integrate.png`, `serve.png` and
  `transform.png` are 3840×2160 with *opaque dark* backgrounds and render as grey boxes
  with hard edges. The other 11 are transparent, and the manifest types all 14 identically —
  there is no way to tell without opening the files.
- **The icon catalog cannot serve most decks.** All 86 icons are Google Material's
  *communication* set: phones, voicemail, chat bubbles, SIM cards. `col*_icon` is
  `required: true` on six layouts, yet there is no check, arrow, chart, lightbulb, gear, or
  clock that is not a phone feature. The reporter shipped a slashed-out water droplet
  labelled "Moisture" as the closest available match.
- **Two descriptions contradict what renders.** `Two column agenda dark` claims "six
  numbered sections" — no numbers render, and it fills column-major, so four sections give
  3+1 rather than 2+2. `Three columns with icons dark` says the icon sits "above" the text;
  it renders inline to the left.

## 6. Suggested order

1. Ship the browser work — closes both remaining blockers at once.
2. Table styling (§1.3) — the only defect that ships a broken slide silently.
3. The error-reporting cluster (§2 items 3–6) — cheap, and every author hits them.
4. Warning calibration and overflow detection (§2 items 1–2).
5. Theme work (§5) — image inset first, since it gates diagrams.

## 7. What this run actually proved

Worth separating from the defect list. An agent with no prior exposure, in a hostile
environment, produced a deck that its own reviewer called "genuinely good-looking" and
"like real Materialize collateral, with no fiddling," across ten different layouts. The
composition model works. What failed was everything around it, and all of it is fixable.
