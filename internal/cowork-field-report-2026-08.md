# Cowork field report: first outside use of a packaged skill

> Status: **triage (28 Aug 2026).** An agent in Cowork's cloud container built a
> 10-slide deck from the packaged `mz-slides` skill — the first time tycoslide has
> been driven by someone other than its author, in an environment nobody designed
> for. It worked, and the output was judged to look like real collateral, but the
> run surfaced three blockers and a long tail of engine and theme defects.
>
> This doc records what was found, who owns each item, and what has already been
> fixed, so the list survives the conversation it came from. Every claim below has
> been checked against the code or reproduced locally; five did not survive that
> and are marked **NOT REPRODUCED**.

The headline: **the model held up, the edges did not.** Manifest-driven composition
(read layouts, fill parameters and slots) was productive immediately and needed no
hand-holding. Everything that went wrong was environment, error reporting, or theme
content — not the paradigm.

## 1. Blockers

### 1.1 `npm install` failed outright — FIXED, released in 0.11.4

The container allowlists `registry.npmjs.org` and nothing else. `@playwright/browser-chromium`
fetches its browser from `cdn.playwright.dev`, got a 403, and — as a hard dependency —
took the whole install down: npm rolled back and left no `node_modules`, so decks with
no diagrams at all could not build.

Self-inflicted. The dependency was added in 0.11.1 to fix a mermaid crash on a normal
machine, trading a soft failure (diagrams break) for a hard one (nothing installs).

**Fixed** by dropping the browser package entirely — see [§4](#4-the-fix-find-a-browser-dont-ship-one).
The reporter's suggested `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is no longer needed.

> **NOT REPRODUCED (attribution).** The report blames `playwright-core`'s postinstall.
> That package has no install scripts at all; the download came from
> `@playwright/browser-chromium`. The symptom and conclusion were right, the cause was
> not. Its suggested fix — set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` "in your postinstall"
> — also could not have worked: tycoslide has no postinstall.

### 1.2 Mermaid could not render — FIXED, released in 0.11.4

Playwright resolves browsers by **exact build revision**, looking for a literal
`chromium_headless_shell-<rev>` directory. Its Playwright wanted **1234**; the container
ships **1194** at `/opt/pw-browsers`. A perfectly good Chromium was present and unusable.

The reporter got it working by symlinking 1194 into the path 1234 expects, and was right
to call that a hack no real run would do.

**Fixed** — see [§4](#4-the-fix-find-a-browser-dont-ship-one). Verified by launching build
**1228** where Playwright demanded **1234**, the same mismatch they hit.

> The report's proposed remedy — "accept a system browser via `PLAYWRIGHT_BROWSERS_PATH`"
> — would not have fixed it. That variable only changes *where* Playwright looks; it still
> demands the exact revision, which is why they had to symlink.

### 1.3 Every table renders illegibly — FIXED, unverified visually

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

Every path points at a **pricing** table in the template. Both specimens carried seven
rows: a violet header, five uniform body rows, and a decorated `Total / $1,000` row at
the end. That last row is the cause, and the engine was doing as told — rows past the
`bodyRows` range are *fixed rows* backing the **last** data rows, and the code comment
says as much: "a decorated total row lives here". So `bodyRows: [2, 5]` over a
seven-row specimen left row 6 backing whatever landed last, whatever it held.

Narrowing the range does not help: `[2, 4]` leaves *two* trailing fixed rows, and
`[2, 6]` folds the total row into the cycled body so its styling reappears every fifth
row. The specimen itself had to lose the row.

**Fixed** by deleting the Total row from slides 52 and 53 of the template, editing the
XML directly since the file is a zip. Six rows now, so `bodyRows: [2, 5]` leaves zero
trailing fixed rows and no data row can inherit total styling. A one-row table also
works for the first time, the fixed row having previously demanded two. Only the two
slide parts changed: 638 zip entries before and after, all 24 embedded font parts
intact, every other entry byte-identical.

This is the one place the change went against the product principle that a user should
never have to edit their `.pptx` — the engine has no way to say "ignore the trailing
row", and it is the theme's own template. **Nobody has yet looked at a rendered table**;
the mechanism is proven, the pixels are not.

## 2. Engine defects (tycoslide) — all closed

Ordered by how many users hit them.

1. **Image-fit warnings are noise — FIXED (guidance only).** `shrunk to X% of native`
   fires on **7 of the 11** distinct images in mz-slides' showcase, including an
   illustration that renders **4.91 inches wide** on a 10-inch slide. The trigger compares
   the render against the *source's* pixel size, so it fires hardest on the highest-quality
   assets while a 96×96 icon at 0.30in passes.

   No threshold fixes this: legibility depends on both source detail and rendered size, and
   ratio ignores one while inches ignore the other. The real harm was SKILL.md reading the
   warning as an instruction to swap the image, which for a catalogued asset in its own slot
   leaves nothing to swap to. SKILL.md now says to look at the rendered slide and act only
   if detail is genuinely lost. The engine threshold is unchanged.
2. **No text-overflow detection — WON'T FIX.** A slide whose body ran into the footer logo
   built silently; the mandated PNG review pass caught it. Detecting it at build time means
   measuring text the way PowerPoint will, which tycoslide does not do and would have to
   approximate. The visual check already covers it, so the QA loop stays the mitigation.
3. **Errors surfaced as raw uncaught stack traces — FIXED.** The message content was
   already good — one reporter singled out `Unknown key(s): col1_body. Valid keys: title,
   col1_icon...` as genuinely helpful — but it arrived wrapped in a Node stack dump. The CLI
   now catches at the boundary, prints the message alone, and exits 1.
4. **Slide numbering disagreed between error paths — FIXED.** Reproduced first: a bad key
   on the **4th** slide reported `Slide 3` (0-indexed, `deckSchema`) while stray text on the
   **3rd** reported `Slide 3` too (1-indexed, `slideParser`). The compiler now derives one
   1-based `slideNo` and every message uses it; the context field was renamed from
   `slideIdx` so it cannot be read as an index again.
5. **The compiler stops at the first error — FIXED (guidance).** SKILL.md instructed the
   author to "read every error — fix all of them"; a deck with a bad key on two slides
   reports only the first. Accumulating errors through the compile is a larger change than
   the promise is worth, so SKILL.md now states the build stops at the first one and to
   expect several rounds.
6. **A missing `---` between slides reports as `text found outside a ::slot:: marker` —
   WON'T FIX.** A slide that loses its opening fence is still a *valid* file: `layout: Title`
   is legal markdown and legal YAML, so nothing is malformed and no parser can flag it. A
   check was built and removed — recognising it meant special-casing the reserved `layout`
   key, which is pattern-matching one confusable arrangement rather than finding an error.
   The build still fails, with a message that points one step away from the cause.

## 3. Docs and packaging defects — FIXED

The reported items, checked:

- **SKILL.md described manifest fields wrongly.** Confirmed and broader than reported:
  `::name::` appeared in SKILL.md twice and syntax.md five times, including a section
  heading. A layout is identified by `name`; every parameter and slot by `key`. Fixed
  throughout.
- **`syntax.md` linked `README.md#cli`,** which is not in the packaged skill. Removed.
- **NOT REPRODUCED: `skill.md` / `SKILL.md` collision.** The zip contains only `skill.md`,
  and a packaged theme has only `skill.md`. The collision requires running `tycoslide
  package` inside tycoslide's own repo, which is not a user flow. *But the report was
  circling a real bug it did not name:* `syntax.md` linked `SKILL.md`, and the packaged
  file is lowercase — a dead link for its actual reader on a case-sensitive filesystem.
  Fixed.
- **NOT REPRODUCED: "the build must run from the theme root."** A deck was built from an
  unrelated directory, with the deck file outside the theme, successfully. `theme.json`
  resolves relative to the deck and assets resolve against `theme.json`'s own directory,
  so `build` is cwd-independent. What the reporter hit is `npx` needing the local
  `node_modules` — npm behaviour, true of every locally-installed CLI. Only `package` is
  cwd-bound, which is normal for a project-scoped command.

An audit of all three docs against the source then found six errors the report missed,
several worse than anything it listed. All fixed:

- **`syntax.md` claimed an image parameter accepts "an absolute path."** It does not — a
  path with no asset-catalog entry is a hard error. Following that sentence guaranteed a
  failed build.
- **`syntax.md` called `title` and `subtitle` "slots."** They are frontmatter parameters;
  an agent looking for a `::title::` region gets `unknown slot`.
- **The QA table quoted `Unknown layout: 'xyz'`.** The error a deck author actually sees is
  `unknown layout "xyz"` from the compiler; the quoted string is unreachable via the CLI.
- **SKILL.md quoted the warning as `shrank to X%`;** the emitted text is `shrunk to`. An
  agent grepping build output would find nothing.
- **SKILL.md said parameters carry `accepts`.** Parameters carry `type`; only slots have
  `accepts`.
- **`syntax.md` said "blank" template notes are stripped.** All inherited notes are.

Still undocumented, and worth adding: the `$category.name` asset reference for filling an
image slot from the body (`![alt]($logos.primary)`). Its error message names a syntax no
doc explains.

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

Recorded so they are not lost. All measured. The first turned out to be an engine
defect wearing a theme's clothes; the rest are genuinely the theme's.

- **The image slot has no inset — FIXED, and it was not a theme defect.** `Full bleed image
  with title dark` was the only layout with an image *slot*: its frame is **10.00 × 5.13
  inches on a 10 × 5.63 inch slide**, starting at x≈0, y=0, so a diagram began at the title
  and ran to both edges. Nineteen other layouts had a perfectly good image area — including
  a **4.91 × 4.63in** inset on each two-column layout — but declared it as a *parameter*,
  and a mermaid fence is a block, so it can only fill a slot. The declaration decided the
  capability.

  The fix was in the engine, not the theme: a parameter is a template fill now and every
  other shape is a slot, so nothing declares a channel and no shape can be made
  diagram-proof by accident. All 19 image shapes are slots, each carrying its observed
  frame. See `internal/parameters-are-template-fills.md`. Diagrams now have an inset home
  for the first time; nobody has yet looked at one rendered.
- **Three illustrations are unusable in card slots — WON'T FIX.** `integrate.png`,
  `serve.png` and `transform.png` are **0.0% transparent** at 3840×2160; the other eleven
  run 8.8% to 87.7% transparent. They carry a baked `#120e22` backdrop against a `#1A1528`
  slide, so in a small card they letterbox and the rectangle shows as a band with visible
  edges. Retyping them `background` hides it by filling the frame, but that crops a 16:9
  illustration into a square card and applies everywhere the asset is used, so artwork is
  lost to hide a rectangle. Three assets, one slot type, caught by the render pass; not
  worth the trade.
- **The icon set does not cover deck needs — WON'T FIX.** Confirmed: 86 icons, all from
  Google Material's *communication* set, and **zero** matching check, arrow, chart,
  lightbulb, gear, or clock. `col*_icon` is `required: true` on six layouts, so an author
  must pick something; the reporter shipped a slashed-out water droplet labelled "Moisture"
  as the nearest match. This is the set the designer supplied and it is not being changed.
  Recorded so the constraint is known rather than rediscovered.
- **Two descriptions contradict what renders — FIXED.** Both confirmed against the
  template's shape geometry. `Two column agenda dark` promised *numbered* sections and
  nothing numbers them; it also fills column-major (sections one to three at x=0.50, four
  to six at x=5.09), so four sections give 3+1. `Three columns with icons dark` said the
  icon sits above the text, but each icon is at y=1.31 with its body at y=1.36 and 0.42in
  to its right: same line, icon to the left.

## 6. What is left

Nothing. Both browser blockers shipped in 0.11.4; the table specimen, the image-inset
capability, the error-reporting cluster and the docs shipped in 0.12.0; `showcase.pptx`
was opened and checked; and the two suspect layout descriptions were verified against the
template and corrected.

Won't-fix, with reasons above: warning calibration, text-overflow detection, the
missing-separator message, the icon set, and the three opaque illustrations.

## 7. What this run actually proved

Worth separating from the defect list. An agent with no prior exposure, in a hostile
environment, produced a deck that its own reviewer called "genuinely good-looking" and
"like real Materialize collateral, with no fiddling," across ten different layouts. The
composition model works. What failed was everything around it, and all of it is fixable.
