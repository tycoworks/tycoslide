# Icons are a typeface, not an asset catalog

> Status: **implemented (29 Aug 2026).** Replaces bundled icon files with an icon set the
> theme declares and tycoslide resolves by name at build time. Two figures below were
> wrong when this was written and are corrected in place: the set is **13 MB**, not 92 MB,
> and `outlined/` holds **7,806** names, not 3,903 — half of them the `-fill` variants,
> which are equally referenceable. Every `file.ts:line` below is as-of-writing; the code
> moved during implementation, and **"As built" is where it actually lives.**

## The problem

The reference theme ships 86 PNGs in `assets/icons/`. They are not a curated set: they are the
entire **Communication** category of Google Material Icons, exported at 96×96. All 50
icons in `material-design-icons@3.0.1`'s communication category are present, plus 36 more
that Google added to the same category after 2016.

So there is no check, no arrow, no chart, no lightbulb, no gear, no clock — those live in
Action, Navigation, Editor and Toggle. Six layouts declare `required: true` on an icon
slot, so an author must pick something. One shipped a slashed-out water droplet labelled
"Moisture" because it was the closest thing to water in a set about telephones.

The catalog is also 36% of `manifest.json` (9,621 of 26,780 bytes), so those 86 names are
a third of everything the authoring agent reads about the theme.

## The root cause

Icons were modelled as **assets** — files a designer hands over, enumerated in a catalog —
when they are a **typeface**: a named, open-ended vocabulary from a system, resolved on
demand. Every symptom follows from that. The designer shipped one directory, so the
catalog is one category. The manifest can only advertise what is in the catalog, so the
agent could only see 86 names. `required: true` forced a pick from them.

Curating a better set does not fix this. A hand-picked 300-icon catalog just moves the
cliff to the first slide that needs the 301st icon.

Fonts in this same codebase are already modelled the right way: `resolveFonts`
(`markdown/blocks/mermaid.ts:107-136`) takes a bare npm specifier from `theme.json` and
resolves it through the theme's own `node_modules`. Nobody copies `.woff2` files into the
repo. Icons should work the same way.

## The design

### What the theme declares

```json
"icons": {
  "path": "@material-symbols/svg-400/outlined/{name}.svg",
  "color": "#BDB0E0",
  "size": 96
}
```

Deliberately the same shape as a font's declaration — one `path` holding a bare npm
specifier, with `{name}` standing in for the icon, using the `{}` placeholder convention
template parameters already use. That buys three things without new machinery: a
`./`-prefixed path works for free, so a theme can still ship its own SVG files; any package
layout resolves without tycoslide knowing `outlined` from `filled`; and there is one
resolver rather than two.

One set, not a map. The theme's own principle is one set at a consistent weight and grid,
and a map would put a set-qualifier in every reference (`$icon.material/check`) to buy a
capability no theme should want. The upgrade path stays open: a record-shaped `icons` plus
a `defaultIconSet` is additive later, exactly as `mermaid` + `mermaidVariant` is shaped
today.

`color` takes `string | { light, dark }`, mirroring `codeTheme` (`blocks/code.ts:39-49`).
The reference theme ships the single string: only **2 of its 33 layouts** declare a `variant`, so a
`{ light, dark }` pair would throw on the other 31.

`size` defaults to 96, which reproduces today's pixels exactly.

### What the deck author writes

```markdown
::col1_icon::

![]($icon.trending_up)
```

`icon` is reserved, singular, and distinct from any catalog category. `ASSET_REF_RE`
(`markdown/deckCompiler.ts:40`) already parses `$category.name`; only `_` needs adding to
the name class for Material's snake_case.

### What tycoslide does

```
resolveIconRef(name):
  resolveThemePath(rootDir, icons.path.replace("{name}", name))     // shared with fonts
  read the SVG, inject fill="<color>" on the root element
  hash(resolvedPath, color, size, bytes)
  rasterise to <rootDir>/.tycoslide-cache/icons/<hash>.png          // as mermaid renders do
  toImageFill(path, AssetType.Icon)                                 // ImageFit.ScaleDown, unchanged
```

Every step reuses something already in the tree: the resolver shared with fonts, the
content-addressed cache from `renderOne` (`mermaid.ts:96,171-176`), the fill from the
existing image path.

### What is shared with fonts, and what is not

`resolveFonts` already resolves a bare npm specifier through the
theme's `node_modules`, falls back to `rootDir` for a `./`- or `/`-prefixed path, checks
the file exists, and fails fast naming the thing and the remedy. That is the whole of what
icon resolution needs, so **extract it** rather than write it twice:

```
resolveThemePath(rootDir, spec, describe) -> absolute path
```

`describe` supplies the label for the error (`Theme font "Inter"` / `Icon "water_drop"`),
which is the only part that differed. `resolveFonts` keeps its format lookup
(`FONT_FORMATS`, `mermaid.ts:70-75`) and its `family`/`weight` handling; the icon path adds
recolour, rasterise and cache. Neither keeps a private copy of the resolution logic.

`templateKeys` (`textTemplate.ts:23`) validates the declaration at theme load: the `icons`
path must contain exactly one placeholder and it must be `name`. A theme that writes
`{icon}` or forgets the placeholder is told so when the theme loads, not when a deck first
references an icon.

The genuine asymmetry is that **fonts enumerate and icons cannot**. A theme lists its two
fonts explicitly; it cannot list 7,806 icons, and which ones a deck needs is unknown until
the deck is written. So a font declares instances and resolves once per build; an icon
declares a set and resolves per reference. That difference is why `icons` is an object with
a placeholder rather than an array of entries, and it is the only structural reason the two
are not the same field.

The set package is a dependency of **the theme**, not of tycoslide. tycoslide stays
set-agnostic, and a theme that wants a different or smaller set changes one line.

### Rasterising: `@resvg/resvg-js`, not the browser we already have

Playwright can rasterise SVG — it is how mermaid renders
(`mermaid.ts:256-333` screenshots an SVG locator) — and reusing it would cost no new
dependency. Reject it anyway.

`playwright-core` is imported lazily *inside* the render path (`mermaid.ts:313`), so a
deck with no diagrams needs no browser at all. That is the trade 0.12.0 deliberately made:
no browser means a clear error instead of a working diagram. Six of the reference theme's layouts have
`required: true` icon slots, so routing icons through Chromium would make a browser
mandatory for nearly every deck, turning that trade into *no browser means no deck*. It
would undo the fix that closed the field report's first blocker.

`@resvg/resvg-js@2.6.2` is 44 KB plus one platform binary, delivered as
`optionalDependencies` **from the npm registry, with no install script and no CDN**. That
is the precise distinction from `@playwright/browser-chromium`, which fetched from
`cdn.playwright.dev`, got a 403 behind a registry-only allowlist, and took the entire
install down with it (see `cowork-field-report-2026-08.md` §1.1). Import it lazily inside
the icon path so a deck with no icons never loads it.

**Verified end to end:** a recoloured `rocket_launch.svg` rasterises to a 96×96 RGBA PNG
whose opaque pixels are exactly `(189,176,224)` — the same `#BDB0E0` decoded out of the
existing `business.png`, `terminal.png` and `email.png`. Same dimensions, same 0.30 render
ratio against a 0.30in well, so no new `shrunk to X%` warnings and no template or frame
changes. Roughly 40 ms and 3 KB per unique icon, cached thereafter.

### Discovery: how the agent knows what exists

The set has 7,806 names. Listing them in `manifest.json` is not an option — the manifest is
read wholesale, and the 86 names it carries today are already 36% of it. Three layers
instead, in the order an agent actually uses them:

1. **Prior knowledge.** Material Symbols names are public and heavily represented in
   training data. An agent writes `$icon.lightbulb` and it works. This is the layer doing
   most of the work, and it is exactly the layer a catalog of 86 names destroyed.
2. **`icons.txt`** — 7,806 names, 121 KB, generated into the skill zip via `skillPaths`
   (`skillZip.ts:40-43`). Greppable, never read wholesale.
3. **Fail-fast with near matches**, in the style of `deckCompiler.ts:335`:
   `Unknown icon "water" in @material-symbols/svg-400/outlined/{name}.svg. Did you mean:
   water_drop, water_full, water_bottle? Full list: icons.txt (7806 names).`

The manifest carries four lines: the set, the reference form, the count, and the index.
**No sampled examples.** Sampling evenly gave `10k`, `blur_linear-fill`, `dermatology` —
names picked without judgement, which an agent reads as the recommended ones. Naming the
set is what an author needs, because the set's own names are public.

**This is the least certain part of the design.** There is no evidence yet that an agent
names icons well from an unenumerated set; the only field data comes from the catalog
world. It is cheap to test before shipping: hand an agent the manifest block and
`icons.txt`, ask for twenty slides, and count how many icon choices a human would keep.

## Why the earlier pipeline died, and why that does not apply

Commit `a986c16` (9 Jun 2026) added `@material-symbols/svg-400@^0.44.12` and
`@material-design-icons/svg`, referencing icons as
`require.resolve("@material-symbols/svg-400/outlined/edit_document.svg")` in
`packages/theme-default/src/assets.ts`. It also passed a `tint` through to pptxgenjs as a
duotone.

Commit `8fcf889` replaced pptxgenjs with the current fill engine and deleted the entire
`packages/` tree — 33,010 deletions, `assets.ts` among them. **The SVG pipeline was not
evaluated and rejected; it was collateral.**

Two of its assumptions did die with pptxgenjs: pptxgenjs accepted an SVG path and
rasterised it itself, and duotone tinting was its feature with no equivalent in
`fillImage`. This design does both of those jobs explicitly, which is the difference.

## Alternatives considered

| Option | Why not |
|---|---|
| **Rasterise via the Playwright already in the tree** | Zero new dependencies, best SVG fidelity. But it makes a browser mandatory for almost every deck, undoing the 0.12.0 fix. The strongest single argument in the whole design, and it points away from Chromium. |
| **Pre-rasterise at `tycoslide package` time** | The build container needs nothing new. But it either recreates a fixed finite set — the actual bug — or ships all 3,903 PNGs (~12 MB) into every skill zip. Worth keeping as a `--prerender` flag for a container that must install nothing. |
| **Embed SVG via OOXML `svgBlip`** | No rasteriser in theory. In practice OOXML wants a raster fallback anyway and `fillImage` needs pixel dimensions from `image-size` (`fillers/image.ts:53`), so you rasterise regardless and pay new namespace work for nothing. |
| **Curate a better catalog** | Moves the cliff rather than removing it. |

## Migration

**tycoslide.** `resolveThemePath` extracted from `resolveFonts` and called by both; one branch in `resolveAssetRef` (`deckCompiler.ts:316-338`); an `icons`
block in `ThemeConfigSchema` (`schema/themeConfigSchema.ts:120-128`), the hand-written type
in `markdown/types.ts`, and the `Exact<>` drift guard that fails compilation if you touch
one without the other; the manifest block (`manifest.ts:37-40,73-84`); `icons.txt` in
`skillZip.ts`; and the `$icon.*` form in `syntax.md` and `SKILL.md`. The
`themeConfigSchema.test.ts` `fullTheme()` fixture must gain the block or its runtime
backstop goes stale.

**The theme.** Delete 86 catalog entries and 86 PNGs (344 KB); add one dependency and one
`icons` block. Rewrite **10 references** in `showcase.md` — the payoff rather than the
cost, since 8 of the 10 (`importExport`, `screenShare`, `swapCalls`, `rssFeed`, `moreTime`,
`vpnKey`) are communication-category filler standing in for concepts they do not mean.

**Zero layout changes, zero template changes, no `.pptx` edit.** All 10 icon slots are
`accepts: ["image"]` and `$icon.*` folds to an image fill exactly as `$icons.*` did. The
product principle holds.

## As built

### Where the shared code landed

The design said "extract `resolveThemePath`", which on its own would have meant a new file
holding one function while the other half of its family — `resolveFonts` — stayed in
`blocks/mermaid.ts`. Theme fonts are not a mermaid concept; mermaid is only their current
consumer, and needing a separate module to reach them was the file boundary saying so.

So it all lives in **`src/markdown/theme/`**, a directory rather than a file:
`paths.ts` (`resolveThemePath`, `cachedPngPath`), `fonts.ts` (`resolveFonts`,
`FONT_FORMATS`, `ResolvedFont`), `icons.ts` (the whole icon path). `blocks/mermaid.ts`
drops from 316 to ~270 lines and keeps only what is genuinely mermaid's: the handler,
`fontFaceCss`, the browser-launch chain, and the in-page render.

Getting there took three passes, and the wrong turns are the useful part.

**A shared function is not a module.** `themePath.ts` held `resolveThemePath` and nothing
else, because two files needed it. That is not a concept; it is a file that exists to be
imported, and the reason it existed at all was that `resolveFonts` sat in a file named
`mermaid.ts` where an icon could not reach it.

**Merging the two consumers into one file fixed the symptom and left a seam.** With
`icons.ts` folded into a single `themeFiles.ts`, review found that no consumer imported
across the join: `blocks/mermaid.ts` took the font and cache exports, four other callers
took the icon exports. Perfectly disjoint consumer sets is the signature of two modules
sharing a filename.

**But splitting at that seam provably regenerates `themePath.ts`.** `resolveThemePath` is
called by both halves, so two files means it must be public in a third — the original
mistake, restored. The only way out of that is a directory: the shared half becomes a peer
of the things that share it, and the top level does not grow. `blocks/` and `schema/`
already work this way. The top level went from nine files to five.

Two more modules moved on the same reasoning: `mdast.ts` and `inline.ts` into `blocks/`,
whose handlers are their only consumers. And `ICON_CATEGORY` moved to `types.ts` beside
`RESERVED_KEY`, where a reserved name in the deck grammar belongs — that one removed the
oddest edge in the graph, the validation layer importing from the module that loads the
rasteriser.

Not done, and deliberately: `resolveImagePath` was left alone (no `node_modules`, no
existence check, a deliberate empty-`rootDir` opt-out — it only looks alike), no
render-and-cache wrapper was extracted (two call sites with different pre-work), and
`blocks/mermaid.ts` still mixes its handler with its browser plumbing. That last one is a
real split worth making, and it is not this change.

### Deviations from the design

Five things came out differently from the design above.

**The reference regex needed a wider change than "add `_`".** `\w` already covers `_`, so
that part was a no-op. What actually blocked references was the *leading* character and
`-`: the set contains `10k` and `3d_rotation`, and every icon has a `-fill` twin. The name
group is now `[\w-]+` while the category stays `[a-zA-Z]\w*` — an icon set names its own
icons and tycoslide does not get to reject them.

**`resolveAssetRef` returns a promise.** `@resvg/resvg-js` loads lazily inside the icon
path, so a deck with no icons never touches its native binary. Three call sites; the image
block's `compile` was already async.

**Listing the set resolves the package's own `package.json`.** A bare specifier cannot name
a directory, and there is no icon name available to resolve a concrete file with, so
`iconDir` resolves `@material-symbols/svg-400/package.json` and rejoins the subpath. The
names themselves are matched back out of the directory against the `icons.path` basename
(`{name}.svg` → `^(.+)\.svg$`), so tycoslide learns the naming rule from the theme rather
than knowing anything about a particular icon package.

**Two of the ten showcase icons do not exist under their old names.** Material Symbols
dropped `business` and `insights`; they are `apartment` and `monitoring` now. Worth knowing
before assuming a name carried over from the old catalog still resolves.

**The manifest carries no sampled examples** — see Discovery above.

### What review caught

An architecture review found one silent-failure bug the tests could not have caught: the
recolour used `/^<svg\b/`, anchored at byte 0. Material's files start there, so the happy
path worked — but the README invites a theme to ship its own SVGs, and a hand-exported one
routinely opens with an XML declaration, a licence comment, or a BOM. In every such case
`replace` matched nothing and the icon rasterised in resvg's default fill: **black, on a
dark slide, with no error.** The match is now unanchored and a file with no `<svg>` root
throws. The colour is asserted in pixels (`189,176,224`), not merely inferred from two
cache keys differing.

Also fixed: `assets` may no longer declare a category named `icon`, which `$icon.*` would
silently shadow; `icons.path` must carry its placeholder exactly once and in the file name,
because substitution replaces one occurrence and listing reads the final segment; `color`
is rejected if it carries a quote or angle bracket, since it is written into an SVG
attribute; near-match suggestions need three characters before matching in reverse, or a
two-character typo returns the alphabetically first five of thousands; and `iconDir` says
what actually went wrong when an installed package hides its own `package.json` behind an
`exports` map.

**Known gap:** `iconDir`'s bare-specifier branch has no positive unit test — a fixture
package would need a `node_modules` directory inside `test/fixtures`. It is covered in
reality by the reference theme's build.

Verified end to end against the reference theme: `showcase.pptx` builds, the eight unique icons
rasterise to 96×96 PNGs whose opaque pixels are exactly `(189,176,224)`, no icon slot
raises a `shrunk to X%` warning, and the rendered slides show the icons at the right size
and colour. The set install is 13 MB.

**Still untested:** whether an agent names icons well from an unenumerated set. Nothing in
this change produced evidence either way, and the test described in Discovery has not been
run.

## The objection to answer before shipping

This puts a **13 MB, 23,421-file package** into the same restricted container that a
554 MB browser download was removed from one release ago. The failure class is genuinely
different — registry-hosted, and the registry is allowlisted — but that is what was
believed about `@playwright/browser-chromium` too, right up until it wasn't. If the next
outside run fails on install for any reason, this change wears it.

Three answers, in order of preference. The set is a **theme** dependency, so tycoslide
itself carries only the ~3.5 MB resvg binary and any theme may choose a smaller set.
`@material-design-icons/svg` is a drop-in at 4.2 MB and ~2,100 names, costing about 1,800
names and needing its grid checked against the current look. And `--prerender` exists for a
container that must install nothing new.

Ship with `@material-symbols` because the design is set-agnostic and swapping is a one-line
theme change — unless a second install failure would be costly to trust right now, in which
case take the smaller set and lose the names.

A smaller objection worth owning: resvg has no pure-JS fallback in the main package, so an
unusual platform with no prebuild gets a module-load failure. Catch it at the lazy import
and name the platform and the `--prerender` escape hatch. `@resvg/resvg-wasm` exists but
its fidelity and API compatibility are unverified.
