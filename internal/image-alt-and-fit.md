# Images by path: alt text, per-image fit, no `$` references

> Status: **in progress (23 Sep 2026)** on branch `image-alt-and-fit`. Phases 0–2 are
> committed (this doc, alt text, fit from the title). This revision adds what those phases
> were building toward: **removing `$category.name` references from the deck language.**
> After it, the core knows one way to name a picture, a path relative to the deck.
> Finding and copying theme pictures is the agent skill's job.

## BLUF

```md
::diagram::

![Request flow from the API gateway to the workers](assets/diagrams/flow.png "fit: contain")
```

- **Path**: relative to the deck, always. `$category.name` is gone from the compiler.
- **alt** (`Request flow…`) → the picture's alt text in the `.pptx` (`<p:cNvPr descr>`).
- **title** (`"fit: contain"`) → a YAML mapping of image options, validated strictly.
  Fit is **title → `contain`**. Nothing else picks a fit.
- **The theme's pictures are an agent concern.** `theme.json`'s `assets` catalog survives
  only as packaging input: `tycoslide package` turns it into `assets.json`, an index that
  records each picture's path, recommended `fit` and description. A deck-writing agent
  searches it, **copies the picture into the deck's folder at the same relative path**,
  and writes `![alt](path "fit: …")`. A new `tycoslide unpack` puts a packaged theme's
  pictures on disk so there is something to copy.

## Why

### `$` references were an agent shortcut living in the core

`$icons.hub` let a deck name a theme picture without knowing where it lives. That is
convenience for whoever writes the deck, which today means an agent, and it made the core
own a catalog, a second naming scheme, a type system for fit (`icon` / `image` /
`background`), and an archive expansion step inside every build. With the shortcut in the
agent layer, the core's image contract is what markdown already says: a path.

What this buys:
- **One way to name a picture.** No `$` grammar, no "unknown asset" errors, no
  `AssetType`, no `FIT_FOR`.
- **Self-contained decks.** A deck and its folder build anywhere, like any markdown
  document with images. Today a `$` deck only builds against the one theme install that
  resolves its names.
- **Fit is always visible in the source.** It's never implied by a catalog entry the deck
  doesn't show.

What it costs, accepted:
- **A rebrand no longer swaps pictures by name.** Rebuilding a deck against a new theme
  swaps text, layouts and chrome, but the deck's copied logo stays the old one until an
  agent re-copies it. The pictures a rebrand touches (your own brand marks) mostly live in
  the template's master, which the rebuild does swap.
- **Duplicate copies** of a logo across deck folders. Harmless.

### Fit belongs to the image, chosen per use

Fit used to be a property of a catalog entry (`icon` → `scale-down`, `image` → `contain`,
`background` → `cover`, via `FIT_FOR` in `deckCompiler.ts`). That left three gaps:

1. **A deck-relative path could never be cropped.** `fromDeck` hard-typed every path as
   `image`, so a photo written by path into a full-bleed slot letterboxed.
2. **One picture, one fit.** Using the same photo as a background on one slide and inline on
   another needed two catalog entries.
3. **Some pictures must never crop, whatever the slot.** An architecture diagram or a
   screenshot cropped to fill a frame is damaged, not styled.

Both reference tools put fit in the source, per use. **Marp** takes keywords in the alt
text: `![bg contain](x.jpg)`, with backgrounds defaulting to `cover`. **Slidev** takes
`backgroundSize` in an image layout's frontmatter (default `cover`, hardcoded in
`handleBackground`), or `{…}` attributes on a body image when Comark syntax is switched on.
Neither has a catalog or image types.

The "never crop a diagram" judgement is still made once, per picture: when a theme is
built, the create-theme skill records a recommended `fit` against each catalog entry, and
the deck-writing agent copies it into the title. The judgement lives in the agent layer,
and the deck carries its result explicitly.

### Alt text has a real job, and we discarded it

Alt text is the accessibility description of an image. PowerPoint carries it per picture
(`descr` on `<p:cNvPr>`), reads it to screen readers, and flags pictures without it in
Check Accessibility. The compiler used to ignore `alt`.

Worse, the output carried **stale** metadata. The tycoworks template's picture placeholders
came out of Google Slides with `title="logoipsum-385.png"`, `title="nat.png"` and similar
source filenames on their `<p:cNvPr>`, and no `descr`. Filling a picture swapped the image
but kept that attribute, so every built deck described its pictures by the placeholder's
old filename.

Keeping alt free for its real job is also why options go in the title, not the alt (see
Alternatives).

## Syntax

```md
![alt text](path "options")
```

- **path**: relative to the deck's directory (absolute paths pass through). Nothing else
  is recognised: `$icons.hub` is just a path that doesn't exist, and fails as one.
- **alt**: free text. Plain string (mdast's `image.alt`; inline formatting is already
  flattened by the parser). Empty is allowed and means decorative.
- **title**: optional. When present it must parse as a **YAML mapping**, using the `yaml`
  package the slide parser already uses for frontmatter. So:
  - one key, no braces: `"fit: contain"`
  - several keys need flow braces: `"{fit: cover, focus: top}"`. `"fit: contain, focus: top"`
    is a YAML error, so the build fails with the parser's message and a hint to add braces.
- All CommonMark title delimiters work, since remark-parse handles them: `"…"`, `'…'`, `(…)`,
  and `<path with spaces>` for the URL.

### Options (v1)

| Key | Values | Meaning |
|---|---|---|
| `fit` | `contain` · `cover` · `scale-down` | Same as the engine's `ImageFit`, which mirrors CSS `object-fit`. `contain` shows the whole picture (may enlarge, letterboxes). `cover` fills the frame and center-crops. `scale-down` is contain but never enlarges past native size. |

The value names are the engine's own. There is no mapping layer and no second vocabulary,
and CSS `object-fit` is a name agents already know. Values are case-sensitive.

Only `fit` ships. Candidate later keys are listed under Non-goals and are **not** reserved:
an unknown key is an error until it is designed.

### Fit default

No `fit` in the title means `contain`: the whole picture, never cropped. That is the safe
default for anything, since the worst case is letterboxing, not a damaged diagram. It is a
documented rule, not a silent fallback. "No silent defaults" in CLAUDE.md is about missing
required config, which this is not.

### Validation (fail fast, name slide + layout + slot)

| Input | Result |
|---|---|
| `"fit: contain"` | ok |
| `"{fit: cover}"` | ok |
| `"Our architecture"` (a caption put in the title) | error: not a set of options; put the description in the alt text: `![Our architecture](…)` |
| `"fit:contain"` (no space) | parses as the string `"fit:contain"`, so the same not-a-set-of-options error, with a hint to put a space after the colon |
| `"fit: Contain"` / `"fit: crop"` | error: unknown fit, listing the three valid values |
| `"{fit: cover, width: 2in}"` | error: unknown key `width` |
| `"{fit: [a}"` | error: YAML syntax, with the `yaml` package's message |
| `""` (empty title) | treated as no options |
| a path to a missing file | error at **compile**, naming the region and the resolved path, with the hint: "copy the picture into the deck's folder; theme pictures are listed in the theme's `assets.json`". This replaces the engine's later `file not found`, which stays as a backstop. |

Implemented in phase 2 as `parseImageTitle` in `blocks/image.ts`, over a strict Zod schema,
so unknown keys throw by construction and adding a key later is one line. The title is
already delimited and extracted by remark-parse: there's no brace scanning, and prose
elsewhere in the slide is parsed exactly as before.

## Alt text in the output

On every filled picture, the image filler rewrites `<p:cNvPr>`:

- **alt non-empty**: set `descr` to the alt text.
- **alt empty**: remove `descr`. The picture has been replaced, so any description the
  placeholder carried describes a different image.
- **always remove `title`.** In the OOXML alt-text pair, `title` is the legacy short
  label. On filled pictures it is exactly the stale-filename problem above. We never write
  it, because a `descr` alone is what current PowerPoint shows and reads.

This runs in the same element-level callback as the geometry (`fillImage`), so a
**transplanted** picture shape (the `addElement` path in `fillers/filler.ts`) is handled
identically. `setAttribute` does the XML escaping. Only the filled picture on the output
slide is touched, never the template.

**Mermaid:** a fence has no alt text, so its picture gets no `descr` (and loses the
placeholder's stale `title`, as every filled picture does). See Open questions.

**Catalog descriptions are not alt text.** `assets.json` descriptions are written for search
("white wordmark for dark slides"), not for a reader of the slide. The agent writes alt
text for the slide it is on.

## The theme's pictures, after `$`

### What stays, and who reads it

`theme.json` keeps its `assets` catalog, with the same shape except that `type` becomes
`fit`:

```json
"assets": {
  "brand": {
    "lockup": { "path": "assets/brand/tycoworks-lockup.png", "fit": "contain",
                "description": "tycoworks logo lockup, purple cat mark beside the tycoworks wordmark" }
  }
}
```

The **compiler never reads it.** Only `tycoslide package` does, to:
1. write `assets.json` (same shape: `path`, `fit`, `description` per entry), the index a
   deck-writing agent searches, and
2. decide which files go into the skill's `assets.dat` archive (unchanged: hosts cap how
   many files a skill may contain).

`type` → `fit` rather than keeping `type`: the agent copies the value straight into a
title, so it should already be a title value. The mapping is mechanical: `icon` →
`scale-down`, `image` → `contain`, `background` → `cover`.

### Getting a picture on disk: `tycoslide unpack`

In a packaged skill the pictures sit inside `assets.dat`. Today `buildDeck` expands the
archive into the theme directory on every build, because `$` references resolve there.
After this change, a build never reads the theme's pictures, but an agent needs them on
disk *before* writing the deck, to copy them. So:

- `buildDeck` stops calling `expandAssets`.
- New CLI command **`tycoslide unpack`**, run from the theme root (or `-c <theme.json>`):
  calls the existing `expandAssets` on the theme directory. It's idempotent, loose files
  win, and it does nothing in a theme repo, which has no archive. It writes into the theme
  directory, which the build already did, so no new permission is assumed.
- The per-theme skill's **Setup** runs it once, right after `npm install`.

`packAssets`, `expandAssets` and `skillPaths` are otherwise unchanged.

### The copy convention

To use a theme picture in a deck, the agent:
1. searches `assets.json` for it (by what it depicts),
2. copies `<theme dir>/<path>` to `<deck dir>/<path>`, keeping the same relative path
   (`mkdir -p` the parent),
3. writes `![alt](<path> "fit: <fit>")`, using the entry's `path` and `fit`.

Keeping the relative path means the markdown is identical wherever the deck lives. In the
theme repo (the showcase sits in the theme root) and for a deck written inside the theme
directory, the file is already there, so skip the copy. A picture the user supplies is
simply saved into the deck's folder and referenced the same way, with a fit chosen by
looking at it.

## Code changes

Phases 1–2 (committed) built alt text and title parsing. They are recorded here briefly;
the phase 3 list is the new work.

**Done in phases 1–2**
- Engine: `ImageFill.alt: string` (required; empty clears), `fillImage` writes or clears
  `descr` and removes `title` on `<p:cNvPr>`, with `dom.ts` constants. Mermaid passes `""`.
- Compiler: `blocks/image.ts` reads `alt` and `title`; `parseImageTitle` + strict schema;
  `BlockContext.region` for error prefixes; shared `ResolveAssetRef` type;
  `toImageFill(path, fit, alt)`; interim precedence title → catalog `type` → `contain`.

**Phase 3: remove `$` references**
- `markdown/deckCompiler.ts`: delete `FIT_FOR`, `ASSET_REF_RE`, `fromCatalog`, `fromDeck` and
  the `AssetType` import. The resolver becomes: resolve the path against `config.deckDir`,
  check it exists (the compile-time error in Validation), return
  `toImageFill(abs, options.fit ?? ImageFit.Contain, alt)`. Rename `ResolveAssetRef` /
  `resolveAssetRef` to `ResolveImage` / `resolveImage` (in `types.ts`, `BlockContext`,
  `blocks/image.ts`), since there's no asset ref any more. Update the `resolveImagePath`
  doc comment ("a catalog image path against the deck's root directory" → "an image path
  against the deck's directory"), and drop the `$category.name` comments in
  `blocks/image.ts`, `types.ts` and `deckCompiler.ts` (around line 312).
- `markdown/types.ts`: delete `AssetType`. `AssetEntry` becomes
  `{ path: string; fit: ImageFit; description: string }`, and its doc comment says the
  compiler never reads it and it's packaging input for `assets.json`.
  `CompilerThemeConfig.assets` stays (loaded with the theme, read only by `package`).
- `markdown/schema/themeConfigSchema.ts`: `assetTypeSchema` → a fit enum declared from the
  three literals (the schema layer doesn't import the engine; the `_drift` guard binds it
  to `AssetEntry.fit`, as it does for `FrameSchema`). `AssetEntrySchema` field `type` →
  `fit`. Update the header comment's `AssetCatalog` mention only if it names `type`.
- `markdown/index.ts`: stop exporting `AssetType`.
- `manifest.ts`: `ManifestAssetEntry.type` → `fit: ImageFit`. `generateAssetCatalog` copies
  `fit`. Doc comments: the catalog is what an agent searches and copies from.
- `index.ts`: remove the `expandAssets` call and its comment from `buildDeck`. Keep exporting
  `expandAssets`.
- `cli.ts`: add `unpack` (`-c, --config <path>`, default `theme.json`): resolve the theme
  directory from the config path, call `expandAssets`, and print what it did, e.g.
  `UNPACKED 2127 files` or `nothing to unpack`. That needs `expandAssets` to return a
  count; it returns `void` today, so change it to return the number of files written.
- `skillZip.ts`: the `expandAssets` doc comment ("so the files the catalog names are on disk
  before anything fills with them") → "so the pictures `assets.json` lists are on disk for
  an agent to copy into a deck". No logic change beyond the returned count.

**Phase 4: fail on unknown inline nodes.** `inline.ts`: `walkPhrasing`'s `default` branch
throws on a phrasing node it doesn't know, instead of returning `[]`. The parser survey
found it silently drops any node a plugin introduces. It's a separate commit so it can be
reverted alone.

**No change**: the engine beyond phase 1, `packAssets`, `skillPaths`, `zipDir`,
`skillPackageJson`, and the create-theme scripts `inventory.py` / `extract-media.py` (they
read the template, never deck markdown).

## Skill and documentation changes

Every tracked `.md` in both repos was scanned on 23 Sep for `$` references, images,
pictures, assets, fit, crop, alt, icons, backgrounds and logos. This is the complete list.
Edits are surgical: only the passages named here change. Line numbers are as of `main` on
23 Sep.

### Per-theme skill: `theme-package/SKILL.md`

It ships in the npm tarball and is copied into every packaged theme, so a stale line is a
release blocker (Releasing runbook, step 1). This is the file a deck-writing agent follows,
so it carries the whole copy convention.

| Where | Now | Becomes |
|---|---|---|
| Setup, 12–18 | `npm install`, once | Add a second command in the same block: `npx tycoslide unpack`, with one sentence: "This puts the theme's pictures on disk so you can copy them into decks. Run both once." |
| Quick Reference, 30 | "Find a logo, illustration or icon \| Search `assets.json`" | "Find a logo, illustration or icon \| Search `assets.json`, then copy it next to the deck (see [Pictures](#pictures))" |
| Layout Discovery, 40 | The `assets.json` paragraph ending "use the `$category.name` you find…" | Move it under a new `### Pictures` subsection at the end of Layout Discovery, rewritten as below. |
| Creating Slides example, 78–80 | `![]($logos.acme)          # ← an image slot: a catalog asset, or a file path relative to the deck` | `![Acme Corp logo](assets/logos/acme.png "fit: contain")   # ← an image slot: alt text, a path relative to the deck, options` |
| Avoid list, 147 | "wrong image for the slot" bullet | Keep it, and add after it: **Don't skip alt text:** describe what a meaningful picture shows and why it's there (not "image of"); leave it empty only for pure decoration such as backgrounds and icons beside a heading. **Don't crop what can't be cropped:** copy the `fit` from `assets.json`; for your own pictures, never `fit: cover` a diagram, chart, screenshot or logo. |
| Avoid list, 148 | "Don't invent layout or asset names -- only use layouts from `manifest.json` and assets from `assets.json`" | "Don't invent layout names or picture paths -- layouts come from `manifest.json`; theme pictures from `assets.json`, copied next to the deck" |
| QA table, 165 | "An image didn't swap… containing `![]($category.name)` from `assets.json` or `![](path)` relative to the deck" | "…containing `![alt](path "fit: …")`, with the path relative to the deck" |
| QA table, 167 | "`Skipped setting relation target` \| The asset image couldn't be placed; check the path and file" | Keep, and add two rows above it: "`image file not found` \| Copy the picture into the deck's folder at the path you wrote (theme pictures: `assets.json`; did you run `npx tycoslide unpack`?)" and "`is not a set of options` \| The image title holds options like `"fit: contain"`; move a description into the alt text" |

New `### Pictures` subsection (replaces line 40):

> The theme's logos, illustrations and icons are listed in `assets.json`, keyed by category
> and name, each with a `path`, a `fit` and a `description`. **Search it, do not read it
> whole** -- an icon set alone can run to thousands of entries. **Search for what the icon
> depicts, not what you mean by it**: a catalog is indexed by picture, so "freshness" finds
> nothing while `grep -i "clock" assets.json` and `grep -i "bolt"` find the icon you wanted.
>
> To use one, copy it into your deck's folder at the same relative path, then write its
> `path` and `fit` into the image:
>
> ```bash
> mkdir -p <deck dir>/assets/icons && cp <theme dir>/assets/icons/hub.png <deck dir>/assets/icons/
> ```
> ```markdown
> ![Central hub connecting three services](assets/icons/hub.png "fit: scale-down")
> ```
>
> If your deck sits in the theme directory, the file is already there; skip the copy. A
> picture the user gives you goes in the deck's folder too; choose its `fit` by looking at
> it (`contain` unless it is full-bleed art that may crop). The alt text is yours to write
> for this slide: describe what the picture shows here, not the catalog description.

### Syntax reference: `theme-package/syntax.md`

Also shipped, and also a release blocker.

| Where | Change |
|---|---|
| 137–143, the **image** bullet | Replace the whole bullet with: an image slot takes `![alt](path "options")`. The path is relative to the deck. alt becomes the picture's alt text in PowerPoint (empty for decoration). The title optionally holds options as YAML: `fit: contain` (default: whole picture, never cropped), `fit: cover` (fills the frame, center-crops), `fit: scale-down` (whole picture, never enlarged). Several options go in braces; anything else in the title fails the build. Theme pictures: see the skill's Pictures section (copy from `assets.json`). Example: `::logo::` / `![Acme Corp logo](assets/logos/acme.png "fit: contain")`. Keep the closing mermaid sentence. |
| 210, **image sizing** bullet under Layout declarations | Replace with: "**image fit** -- chosen per image in its title (`fit: contain` \| `cover` \| `scale-down`), `contain` when omitted. Mermaid renders contained." |
| 306, full example | `![]($images.officeFloorPlan)` → `![Office floor plan with meeting rooms marked](assets/images/office-floor-plan.png "fit: contain")` |

### `README.md` (tycoslide)

| Where | Change |
|---|---|
| 29 | "Images, from the theme's asset catalog or a file path" → "Images by file path, with alt text and an optional fit" |

### create-theme skill: `skills/create-theme/`

Installed separately (`npx skills add`), but the same known-wrong-line standard applies.
It builds the catalog, so it is where the fit judgement is now recorded.

| File, where | Change |
|---|---|
| `SKILL.md` 110, cataloging | "each with a `path`, a `type` and a one-line `description`. The type is `icon` for marks that must never be enlarged, `image` for pictures that may scale but not crop, and `background` for full-bleed art that may crop." → "each with a `path`, a `fit` and a one-line `description`. The fit is what a deck author copies into the image: `scale-down` for icons and marks that must never be enlarged, `contain` for pictures that may scale but must not crop (logos, diagrams, screenshots), and `cover` only for full-bleed art that may crop. Look at the picture to decide." |
| `SKILL.md` 120, `smoke.md` | Add after "filling every parameter and slot with content of realistic length": "Write images as `![alt](path "fit: …")` using catalog paths, which resolve as they are because `smoke.md` sits in the theme directory, and give each one alt text." |
| `SKILL.md` 142, 3.1 Assets | "every description names what the picture shows, because deck authors grep the catalog for it" → add: "and every `fit` is the one an author should copy, since nothing else will choose it" |
| `SKILL.md` 156, 3.3 Package | No change. `package` still writes `assets.json`. |
| `SKILL.md` 160, Hand-off | "unzipped with `npm install` run once inside it for a local agent" → "unzipped with `npm install` and `npx tycoslide unpack` run once inside it for a local agent" |
| `references/theme-json.md` 67, `assets` intro | "A two-level catalog, `category` then `name`, giving `$category.name` references for authors." → "A two-level catalog, `category` then `name`, that `tycoslide package` turns into `assets.json`: the index deck-writing agents search, copy pictures from, and take each picture's fit from. The compiler never reads it; decks name pictures by path." (Keep "Required, may be `{}`…".) |
| `references/theme-json.md` 71, `path` row | Error column: drop "`Layout "X" image "path": file not found` at build;", keeping the package-time error. |
| `references/theme-json.md` 72, `type` row | → `fit` \| The fit a deck author copies into the image's title. Required. \| See the table below. \| Schema error naming the invalid value. |
| `references/theme-json.md` 75–79, fit table | Header `type` \| Fit rule → `fit` \| Use for. Rows: `scale-down` never enlarged, never cropped (icons, small marks); `contain` whole picture, may scale, never cropped (logos, diagrams, screenshots); `cover` fills the frame, center-crops (full-bleed backdrops only). |
| `references/theme-json.md` 81 | Delete "Authors see `Unknown asset reference "$x.y"`…". The error no longer exists. |
| `references/theme-json.md` 128, example | `"type": "image"` → `"fit": "contain"` |
| `references/theme-json.md` 167 | "and all three asset types" → "and all three fits" |

### `CLAUDE.md` (tycoslide)

| Where | Change |
|---|---|
| 40, compiler bullet | Drop "the theme's asset catalog," from what the compiler owns. It now owns nothing about the catalog; `manifest.ts` and `skillZip.ts` read it at packaging. |

Checked and unchanged: `ROADMAP.md` (its slot-size item still stands),
`internal/positioning.md` and `internal/product-direction.md`.

### tycoworks-theme

The only theme. `SKILL.md`, `syntax.md`, `manifest.json` and `assets.json` in its root are
generated by `tycoslide package` on `npm install` and are gitignored, so they update by
reinstalling, not by editing. Already committed on its branch: `2f0fe47`, clearing stale
placeholder alt-text titles from the template.

| File | Change |
|---|---|
| `package.json` + lockfile | `"@tycoworks/tycoslide": "^0.15.1"` → `"^0.16.0"`. On 0.x a caret stops at the next minor, so without this bump the theme keeps resolving 0.15. |
| `theme.json` | Every asset entry's `type` → `fit`, mechanically: `icon` → `scale-down` (2,122 icons), `image` → `contain` (4 brand marks), `background` → `cover` (low-poly). Do it with a script, not by hand, then review the diff for count only. No other change. |
| `showcase.md` 75 | `![]($icons.hub)` → `![](assets/icons/hub.png "fit: scale-down")` (decoration beside a heading: empty alt) |
| `showcase.md` 86 | `![]($icons.insights)` → `![](assets/icons/insights.png "fit: scale-down")` |
| `showcase.md` 130 | `![]($backgrounds.lowPoly)` → `![](assets/backgrounds/low-poly.png "fit: cover")` (backdrop: empty alt) |
| `showcase.md` 172 | same as 130 |
| `showcase.md` 261 | `![]($brand.lockup)` → `![tycoworks](assets/brand/tycoworks-lockup.png "fit: contain")` |
| `how-it-works.md` 51 and 79 | The same bullet, in the code sample and the rendered slide: "Images from the theme's catalog" → "Images by path, with alt text and a fit". Both lines must stay identical, because the slide shows its own source. |
| `README.md` | No change. It describes the asset folders and the icon set; "`assets.json` is searchable by concept" still holds. |

The showcase sits in the theme root, so its `assets/…` paths resolve without copying. That
is the copy convention's "already there" case.

## No backward compatibility

Nobody outside these two repos uses tycoslide yet, so this is a clean break. Don't build
any of the following:
- **No `$` handling at all.** No deprecation warning, no special "`$` references were
  removed" error, no migration hint that names the old syntax. A `$…` URL is an ordinary
  path and fails as a missing file.
- **No `type` alongside `fit`.** The schema accepts `fit` only; `type` is an unknown key
  and fails the load like any other.
- **No fallback fit from the catalog.** The compiler never reads `assets`.
- **No expansion during builds** kept "for old packaged skills". `buildDeck` stops calling
  `expandAssets`, full stop.
- **No transition release.** 0.16.0 ships the new behaviour only, and the tycoworks theme
  moves to it in one commit.
- **No compatibility tests** for the old forms. Delete the tests that exercised them (listed
  under Tests); don't rewrite them to assert on the old syntax's rejection.

## Existing decks

The only decks are in these two repos: `showcase.md` and `how-it-works.md` in
tycoworks-theme, and the fixtures in `tycoslide/test`. `showcase.md` is the only one that
uses `$` outside the tests, and it's migrated above. Rebuilt, it keeps the same geometry
(every fit is the one its catalog type gave). The metadata differs: stale `title`s are
gone, and the lockup gains `descr`.

## Phases

Branch `image-alt-and-fit` in **both** repos. Each phase is one commit that passes
`npm run typecheck && npm test && npm run lint` on its own. Nothing is committed without
the go-ahead.

**tycoslide**
- 0–2. **Done:** the design doc (`ab4d950`), alt text (`90ef827`), fit from the title
  (`411866e`). The deletion of `internal/assets-from-package.md` is still unstaged. Commit
  it with this revision of the doc, as "Update the image design: remove `$` references".
3. **Remove `$` references.** Everything under "Phase 3" in Code changes, plus its tests
   and the test fixture. After this commit the shipped docs are stale until phase 5, which
   is fine on a branch.
4. **Fail on unknown inline nodes.** `inline.ts` + test.
5. **Shipped docs.** `theme-package/SKILL.md`, `theme-package/syntax.md`, `README.md`,
   `CLAUDE.md`, exactly as tabled.
6. **create-theme skill.** `skills/create-theme/SKILL.md`,
   `skills/create-theme/references/theme-json.md`, exactly as tabled.
7. **Release v0.16.0** per the runbook. Breaking (`$` removed, `type` → `fit`), which a 0.x
   minor allows. Merge to `main`, clean build and test, bump, `npm pack --dry-run`, commit
   and annotated tag, then `npm publish` (by hand, OTP), GitHub release, clean-room check.
   The clean-room check now also runs `npx tycoslide unpack` in an unzipped packaged theme
   and builds a deck that copies one picture.

**tycoworks-theme** (after phase 7: its bump needs 0.16.0 on npm)
- **Done:** `2f0fe47`, template placeholder titles cleared.
8. **Adopt 0.16.** Bump the devDependency, migrate `theme.json` (`type` → `fit`, scripted),
   `npm install` (regenerates the skill files), edit `showcase.md` and `how-it-works.md`.
   Build both decks, render with LibreOffice, compare against the 0.15 renders (geometry
   must match), and check the lockup's alt text in PowerPoint. Then run `npx tycoslide
   package`, unzip the result into a scratch directory, `npm install && npx tycoslide
   unpack`, and build a one-slide deck **outside** that directory that copies
   `assets/brand/tycoworks-lockup.png` in. That proves the copy convention end to end. One
   commit, then merge to `main`.

To check the theme before publishing, point it at the local engine temporarily
(`npm install ../tycoslide`) and restore the `^0.16.0` range before committing.

## Tests

`node:test`, alongside the existing suites. Phases 1–2 added the alt-text and
title-parsing tests. Phase 3 changes:

- **`test/markdown.test.ts`**
  - The fit table (~915–936): delete the two catalog rows ("a catalog ref with no title
    takes its type's fit", "a catalog ref's title overrides…") and the `assets` fixture
    they use. The table's paths (`/theme/pics/team.png`…) are
    fictional, and the new existence check rejects them: point the helper's `rootDir`
    (which it also uses as `deckDir`) at a temp directory holding those files, created
    once in a `before` hook.
  - ~793: `![]($imgs.closingBg)` with its inline catalog → a deck-relative path (a real
    fixture file, since the compiler now checks existence).
  - The `cfg` / `compileMarkdownDeck` helpers (~16–40) keep their `assets` parameter
    (`CompilerThemeConfig` still has it), but no test passes a non-empty one.
- **`test/composition.compiler.e2e.test.ts`**
  - The `$logos.primary` cases (96, 153, 229, 288): switch to deck-relative paths, using
    the pattern the file's own path test already uses (~170): a `mkdtempSync` deck
    directory with `swap.png` copied in as `pics/logo.png`, passed as `deckDir`.
  - Delete "fails fast on a malformed body-image reference" (`$bad`, ~240–255) and "fails
    fast on an unknown body-image reference" (`$logos.missing`, ~257–275). Replace them
    with one test: a missing image path fails at compile with the region prefix and the
    copy hint.
- **`test/fixtures/composition-theme.json`**: the asset entry's `"type": "image"` →
  `"fit": "contain"`.
- **`test/manifest.test.ts`**: `generateAssetCatalog` emits `fit`, not `type`.
- **`test/themeConfigSchema.test.ts`**: its `fullTheme()` fixture's assets use `fit`; a
  `type` key is now rejected as unknown, and a bad `fit` value is a schema error.
- **`test/skillZip.test.ts`**: `expandAssets` returns the number of files it wrote (0 when
  there's no archive, and on a second run).
- **Build no longer expands:** a `buildDeck` test against a theme dir holding only
  `assets.dat` builds a path-only deck without writing any asset into the theme dir.
- **CLI `unpack`**: by hand in phase 7's clean-room check (the CLI has no test harness
  today; don't add one for this).
- **Unknown inline node** (phase 4): a node type the walker doesn't handle throws, naming
  the type.

## Alternatives considered

### Image options syntax

Evaluated hands-on on 23 Sep against real slide syntax (the showcase deck's shapes,
`++underline++`, tables, mermaid fences, `::slot::` markers) and everyday prose containing
`{name}`, `[Beta]`, `[Customer name]`, `:important` and `3:2`.

| Option | Verdict | Why |
|---|---|---|
| **Options in the title (this doc)** | chosen | Standard CommonMark every tool and model already writes. Already parsed by remark-parse. The `yaml` dependency is already present. Prose untouched. Shows as a harmless tooltip in GitHub or VS Code previews. |
| Keywords in alt, Marp style (`![contain](x.png)`) | rejected | Spends the accessibility field on configuration, which is exactly what this doc gives alt back. |
| `{fit=contain}` via **remark-mdc** (Nuxt MDC) | rejected | Can't be scoped to attributes. Its span and inline-component syntax silently rewrites prose: `[Customer name]` loses its brackets, `Note :important` loses the word, `{{x}}` becomes a binding. No `++`. |
| `{…}` via **Comark** (Slidev's parser; markdown-it family) | rejected | Deletes `{name}` from prose even with only its attributes plugin loaded. `{fit=}` yields `fit: "}"`. A space before `{` attaches the attribute to the paragraph. It would also mean swapping parser families. |
| `{…}` via **remark-attributes** | rejected | Deletes `{tier}` and `{name}` from prose. |
| **remark-directive**, full | rejected | Parses `3:2` and `10:30` as text directives. This repeats the May 2026 bug (`611794a`: "5:47 a.m." became directive `47`) that led to directives being removed in `98bf1f2`. |
| **remark-directive**, leaf only (`::image{src=… fit=…}`) | runner-up | Prose-safe once the text and container constructs are filtered out. But there's no option to do that, so it needs glue that matches micromark tokenizer function names, which is brittle across upgrades. It adds a non-markdown way to write an image that agents must be taught. It shows as raw text in previews. Revisit if attributes are needed beyond images (slots, tables). |
| **remark-attribute-list** (Kramdown `{: fit="contain"}`) | rejected | Prose-safe, but +1 dependency for niche syntax that shows as junk in previews. |
| Hand-written micromark extension for `{…}` after images | rejected | A proper tokenizer and no dependency, but a couple of hundred lines to own for a syntax no previewer renders. |
| Switch to markdown-it for Marp/Slidev plugin compatibility | rejected | Their plugins extend an **HTML** renderer. tycoslide emits PPTX, so every plugin would still need its own PPTX mapping. It would mean rewriting `mdast.ts`, `inline.ts` and the block handlers onto a flat token stream, and the gain would be zero. remark was chosen in Feb 2026 for an MDX path (`fb4a855`). That reason is gone, but the typed tree and the gfm/ins plugins still hold. |

Slide splitting, per-slide frontmatter and `::slot::` markers stay in the hand-written line
scanner (`slideParser.ts`). No markdown library models "a deck of slides": a per-slide
`---\nlayout: X\n---` parses as a thematic break plus a setext heading. Slidev's parser
splits slides with a line scanner too.

### Naming theme pictures without `$`

| Option | Verdict | Why |
|---|---|---|
| **Copy into the deck's folder, same relative path (this doc)** | chosen | The deck is self-contained and portable. The core knows only deck-relative paths. The markdown is the same in the theme repo and in a user's folder. |
| Absolute path into the installed skill | rejected | The deck builds on one machine only. |
| A theme-relative path form (e.g. `theme:assets/…`) | rejected | `$` under another name: a second path scheme in the core. |
| Keep `$` in the core, add title fit on top | rejected | The shortcut and a fit system stay in the core, which is what this change removes. |
| A `tycoslide asset <path> --to <dir>` command that copies one picture straight out of the archive | rejected for now | It saves the one-time `unpack` step, but it's a new command that knows the catalog's layout, where `cp` already does the job. Revisit if agents fumble the copy. |

## Non-goals (v1)

- **More options.** Candidates, none reserved: `focus` (crop anchor for `cover`, e.g.
  `top`), `decorative: true` (PowerPoint's "Mark as decorative", an `adec:decorative`
  extension under `<p:cNvPr>`; verify the exact XML against a PowerPoint-saved file before
  building), `width` / size overrides (probably never: size is the template's design).
- **Alt text on template chrome.** We only touch pictures we fill.
- **Moving the catalog out of `theme.json`.** It could live in its own file, but it's
  authored with the theme and read by `package`, so it stays.

## Open questions

- **Mermaid alt text.** The source is text, so a description is possible: a `%% alt: …`
  comment line in the fence, or the fence's info string. Decide when a real deck needs it.
- **Blog:** post 2's asset-catalog section describes `$brand.mark` and fit from asset types.
  After this change the mechanism is: the agent searches `assets.json`, copies the picture
  next to the deck, and writes its path, alt text and fit. The on-brand point survives
  (the agent reaches for the theme's own pictures), but the section needs rewriting before
  post 2 ships. Its line that an agent "can only reach what the theme declares" was already
  false (paths since v0.15.0).
