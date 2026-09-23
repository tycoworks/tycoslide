# Images by path, and the agent layer out of the core

> Status: **in progress (23 Sep 2026)** on branch `image-alt-and-fit`. Phases 0–2 are
> committed (this doc, alt text, fit from the title). This revision finishes what those
> phases were building toward, in two steps: **remove `$category.name` references from the
> deck language**, then **move everything agent-shaped out of the core** into a third
> layer, `src/agents/`. After it, the core knows one way to name a picture, a path
> relative to the deck, and nothing about catalogs, skills or agent hosts.

## BLUF

```md
::diagram::

![Request flow from the API gateway to the workers](assets/diagrams/flow.png "fit: contain")
```

- **Path**: relative to the deck, always. `$category.name` is gone from the compiler.
- **alt** (`Request flow…`) → the picture's alt text in the `.pptx` (`<p:cNvPr descr>`).
- **title** (`"fit: contain"`) → a YAML mapping of image options, validated strictly.
  Fit is **title → `contain`**. Nothing else picks a fit.
- **Three layers in one package**: `src/engine/`, `src/markdown/` (together, the core) and
  a new `src/agents/`. The agent layer depends on the core through its public entry; the
  core never imports the agent layer. Biome enforces both directions.
- **The picture catalog is an agent-layer file.** It leaves `theme.json` and becomes
  `assets.json`, authored directly (path, recommended `fit`, description per picture). The
  core never reads it. `tycoslide package` ships it with the skill and archives its
  pictures into `assets.dat`.
- **Getting a picture into a deck is the agent's job**, done with ordinary tools: unzip the
  archive once, copy the picture into the deck's folder at the same relative path, write
  `![alt](path "fit: …")`. No core command does this.

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

### The agent layer leaks into the core

Removing `$` showed how much agent-shaped code the core carries, and how easily more gets
added:
- A compiler error for a missing image suggested copying it from the theme's
  `assets.json`: the core assuming an agent wrote the deck. (`blocks/image.ts` imported
  `ASSETS_FILE` from `src/files.ts` to say so.)
- `theme.json`'s `assets` catalog, about 90% of the tycoworks `theme.json` by size, is
  validated by the core's theme schema on every build, and the build never uses it. Only
  `package` reads it.
- A `tycoslide unpack` command was proposed (and drafted) to extract `assets.dat`: agent-host
  archive handling going back into the core CLI.
- The core's public entry (`src/index.ts`) exports agent functions: `generateManifest`,
  `generateAssetCatalog`, `expandAssets`, `ASSETS_FILE`, `ASSETS_ARCHIVE`.
- `manifest.ts` reaches into a compiler internal (`markdown/textTemplate.js`) rather than
  the public entry.

None of this is wrong in isolation; together it means the boundary is held by memory. The
fix is a third layer with its own folder and a lint rule, so a wrong-way import fails
`npm run lint`. See Alternatives for why this is a folder and not a second package.

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
| a path to a missing file | error at **compile**, naming the region, the path as written and the resolved path, and nothing else: `image "pics/team.png" not found at /abs/deck/pics/team.png`. The core states the fact; it doesn't guess why (a typo is as likely as a missing copy). Advice about theme pictures lives in the deck-writing skill's QA table. The engine's later `file not found` stays as a backstop. |

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

## Three layers

### Layout and import rules

| Layer | Folder | Knows about | May import |
|---|---|---|---|
| Engine | `src/engine/` | PPTX shapes, runs, tables, image files at resolved paths | nothing else in `src/` |
| Compiler | `src/markdown/` | the deck language, the theme's layouts, code and mermaid | `src/engine/` |
| Agents | `src/agents/` | skills, the manifest, the picture catalog, the skill zip and `assets.dat` | the core's public entry, `src/index.ts`, only |

- `src/index.ts` is the **core's** public entry and imports no agent code.
- `src/cli.ts` is the one place both meet: it defines `build` and registers the agent
  layer's commands (`registerAgentCommands(program)`).
- Enforced with Biome `noRestrictedImports` overrides in `biome.json`: `src/engine/**` may
  not import `markdown`, `agents` or `index`; `src/markdown/**` and `src/index.ts` may not
  import `agents`; `src/agents/**` may not import `engine/**` or `markdown/**` directly. Check
  the pattern syntax against Biome 2.5.1 when writing it, and prove each rule fires with a
  deliberate bad import before removing it.
- Importing the core only through `src/index.ts` keeps a later split into a second package
  (Alternatives, option C) a mechanical move.

### What moves

- **Into `src/agents/`**: `manifest.ts`, `skill.ts` (without `expandAssets`, which is
  deleted), `files.ts` (every constant in it is a packaged-skill file name), a new
  `catalog.ts` (the `assets.json` types and strict schema), and a new `commands.ts` holding
  the `package` command.
- **`theme-package/`** stays where it is, now plainly the agent layer's template folder: it
  holds only the deck-writing `SKILL.md`. (Kept out of the repo root so skill installers do
  not mistake it for this repo's own skill.)
- **`syntax.md`** moves from `theme-package/` to `docs/syntax.md`. It is the core's deck
  language reference (the README links it); `package` copies it into each skill from there.
  `package.json` `files` gains `docs`.
- **`src/index.ts`** drops the agent exports and adds what the agent layer needs from the
  core: `templateKeys`, `TEMPLATE_DIR`, `ImageFit` (and the compiler types it already
  exports).
- **`jszip`** stays a dependency; after the move only `src/agents/` uses it.

### The picture catalog: `assets.json`

The catalog leaves `theme.json`. A theme ships `assets.json` beside it, **authored**, not
generated: the file the create-theme skill writes is the file an agent searches.

```json
{
  "brand": {
    "lockup": { "path": "assets/brand/tycoworks-lockup.png", "fit": "contain",
                "description": "tycoworks logo lockup, purple cat mark beside the tycoworks wordmark" }
  }
}
```

- Same two-level shape as before (`category` then `name`), with `type` replaced by `fit`.
  `fit` is the value an agent copies straight into an image title, so it is already a title
  value. The mapping from the old types is mechanical: `icon` → `scale-down`, `image` →
  `contain`, `background` → `cover`.
- **Required, may be `{}`**, like `assets` was. `package` fails if it is missing.
- **Validated by the agent layer only** (`src/agents/catalog.ts`): a strict schema whose
  `fit` is `z.enum(ImageFit)`, with `ImageFit` imported from the core's public entry. No
  literal fit values anywhere.
- The **core never reads it**. `theme.json`'s schema drops `assets`; `CompilerThemeConfig`,
  `AssetEntry` and `AssetCatalog` leave the compiler.
- `tycoslide package` validates it, ships it plain in the skill (the manifest keeps pointing
  at it), and archives the pictures it lists into `assets.dat`, as before (hosts cap how
  many files a skill may contain).

### Getting pictures out of the archive

In a packaged skill the pictures sit inside `assets.dat`, a plain zip. The core doesn't
expand it, at build time or on command. The deck-writing skill does it with `unzip`:

- **Setup**, once: `unzip -nq assets.dat`. `-n` never overwrites, so loose files win, which
  is exactly what `expandAssets` did.
- Or **per picture**, straight into the deck's folder at the same relative path:
  `unzip -nq <theme dir>/assets.dat assets/icons/hub.png -d <deck dir>`.

A theme repo has no archive; its pictures are already loose.

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

**Done in phases 1–2**
- Engine: `ImageFill.alt: string` (required; empty clears), `fillImage` writes or clears
  `descr` and removes `title` on `<p:cNvPr>`, with `dom.ts` constants. Mermaid passes `""`.
- Compiler: `blocks/image.ts` reads `alt` and `title`; `parseImageTitle` + strict schema;
  `BlockContext.region` for error prefixes; `toImageFill(path, fit, alt)`; interim
  precedence title → catalog `type` → `contain`.

**Phase 3: images are paths (compiler)**
- `markdown/deckCompiler.ts`: delete `FIT_FOR`, `ASSET_REF_RE`, `fromCatalog`, `fromDeck`,
  `toImageFill`, `resolveImagePath`, the resolver closure and the `AssetType` import.
- `blocks/image.ts` does the whole job itself, as `blocks/mermaid.ts` does:
  `path.resolve(ctx.config.deckDir, url)` (absolute paths pass through), check it exists
  (the factual error in Validation), and build the `ImageFill` with
  `options.fit ?? DEFAULT_FIT`. With no catalog, a resolver on `BlockContext` would only
  close over `deckDir`, which `ctx.config` already carries, so `ResolveAssetRef` and
  `BlockContext.resolveAssetRef` are deleted.
- `index.ts`: `buildDeck` stops calling `expandAssets`.
- The theme schema and `package` are untouched in this phase: `assets` (with `type`) stays in
  `theme.json` until phase 4 moves it out. The compiler no longer reads it.

**Phase 4: three layers**, in three commits.

*4a. Move the agent code, no behaviour change*
- Create `src/agents/` and move `manifest.ts`, `skill.ts` and `files.ts` into it. The
  agent layer imports the core only from `../index.js`.
- `commands.ts`: `registerAgentCommands(program, tool)`, holding the `package` command,
  where `tool` is the installed tycoslide package (`root`, `name`, `version`) that `cli.ts`
  already reads. `cli.ts`: `build` plus that call.
- `index.ts`: drop agent exports (`generateManifest`, `generateAssetCatalog`,
  `expandAssets`, `ASSETS_*`); export `templateKeys`, `TEMPLATE_DIR`, `ImageFit` (and
  `AssetType` until 4b).
- `biome.json`: the import rules.

*4b. The catalog moves to `assets.json`*
- `src/agents/catalog.ts`: `AssetEntry` `{ path, fit: ImageFit, description }`,
  `AssetCatalog`, the strict schema, and `loadAssetCatalog(themeDir)`.
- `src/markdown/types.ts` and `schema/themeConfigSchema.ts`: delete `AssetType`,
  `AssetEntry`, `AssetCatalog` and the `assets` field. `markdown/index.ts` stops exporting
  them.
- `manifest.ts`: delete `generateAssetCatalog` (nothing to generate); `generateManifest`
  keeps its `assets: ASSETS_FILE` pointer.
- `skill.ts`: `skillPaths` takes the loaded catalog to list the archived pictures;
  `assets.json` joins the plain files. Delete `expandAssets`.
- `commands.ts`: `package` loads `theme.json` through the core and `assets.json` through
  `catalog.ts`, then writes `manifest.json`, `SKILL.md`, `syntax.md` and the zip. It no
  longer writes `assets.json`.
- `index.ts`: stop exporting `AssetType`.

*4c. `syntax.md` moves to `docs/`*
- Move `theme-package/syntax.md` to `docs/syntax.md`; `package.json` `files` adds `docs`;
  `package` copies it from there (`DOCS_DIR` in `files.ts`).
- The links the move breaks (`README.md` 32, `CLAUDE.md` 3), and `CLAUDE.md`'s Releasing and
  Architecture sections, brought forward from phase 7: `CLAUDE.md` guides work on this repo,
  so it describes the three layers and the import rules as soon as they exist.

**Phase 5: the create-theme scripts become commands**, in two commits. Both scripts use
only Python's standard library (`zipfile`, `ElementTree`), so they port to TypeScript on
the dependencies the core already has (JSZip, `@xmldom/xmldom`). They go in the **core**,
not `src/agents/`: they read a template in `theme.json`'s own terms and serve anyone
writing a theme, human or agent. ROADMAP already places the inventory there, "so the skill
needs no Python and the frames it reports are computed by the same code that fills them".
- *5a.* `extract-media.py` → `tycoslide extract-media <pptx> <outdir>`: copy every image
  referenced from a slide master or layout, under its original media filename.
- *5b.* `inventory.py` → `tycoslide inspect <pptx>`: slide size, colour and font scheme,
  embedded fonts, every shape with its kind and frame, and which slides share geometry.
  Where the engine already computes something the inventory reports (frames), reuse it
  rather than port a second copy.
- Neither script has tests today. Each port lands with tests against a fixture `.pptx`,
  checked against the Python's output on the same file before the script is deleted.

**Phase 6: fail on unknown inline nodes.** `inline.ts`: `walkPhrasing`'s `default` branch
throws on a phrasing node it doesn't know, instead of returning `[]`. The parser survey
found it silently drops any node a plugin introduces. It's a separate commit so it can be
reverted alone.

**No change**: the engine beyond phase 1, `packAssets`, `skillPackageJson`.

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
| Setup, 12–18 | `npm install`, once | Add to the same block: `unzip -nq assets.dat`, with one sentence: "This puts the theme's pictures on disk so you can copy them into decks. Run both once; skip the unzip if there is no `assets.dat`." |
| Quick Reference, 30 | "Find a logo, illustration or icon \| Search `assets.json`" | "Find a logo, illustration or icon \| Search `assets.json`, then copy it next to the deck (see [Pictures](#pictures))" |
| Layout Discovery, 38 | "Parameters carry a `type`, slots carry `accepts`, and either may be `required`." | "Slots carry `accepts`, and parameters and slots may be `required`." Parameters carry only `key` and `required` (`ManifestParameter`); the current line is already wrong. |
| Layout Discovery, 40 | The `assets.json` paragraph ending "use the `$category.name` you find…" | Move it under a new `### Pictures` subsection at the end of Layout Discovery, rewritten as below. |
| Creating Slides example, 78–80 | `![]($logos.acme)          # ← an image slot: a catalog asset, or a file path relative to the deck` | `![Acme Corp logo](assets/logos/acme.png "fit: contain")   # ← an image slot: alt text, a path relative to the deck, options` |
| Avoid list, 147 | "wrong image for the slot" bullet | Keep it, and add after it: **Don't skip alt text:** describe what a meaningful picture shows and why it's there (not "image of"); leave it empty only for pure decoration such as backgrounds and icons beside a heading. **Don't crop what can't be cropped:** copy the `fit` from `assets.json`; for your own pictures, never `fit: cover` a diagram, chart, screenshot or logo. |
| Avoid list, 148 | "Don't invent layout or asset names -- only use layouts from `manifest.json` and assets from `assets.json`" | "Don't invent layout names or picture paths -- layouts come from `manifest.json`; theme pictures from `assets.json`, copied next to the deck" |
| QA table, 165 | "An image didn't swap… containing `![]($category.name)` from `assets.json` or `![](path)` relative to the deck" | "…containing `![alt](path "fit: …")`, with the path relative to the deck" |
| QA table, 167 | "`Skipped setting relation target` \| The asset image couldn't be placed; check the path and file" | Keep, and add two rows above it: "`image … not found at …` \| Check the path for typos. For a theme picture, copy it into the deck's folder at the path you wrote (search `assets.json`; did you unzip `assets.dat`?)" and "`is not a set of options` \| The image title holds options like `"fit: contain"`; move a description into the alt text" |

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

### Syntax reference: `docs/syntax.md` (moved from `theme-package/`)

Also shipped, and also a release blocker.

| Where | Change |
|---|---|
| 137–143, the **image** bullet | Replace the whole bullet with: an image slot takes `![alt](path "options")`. The path is relative to the deck. alt becomes the picture's alt text in PowerPoint (empty for decoration). The title optionally holds options as YAML: `fit: contain` (default: whole picture, never cropped), `fit: cover` (fills the frame, center-crops), `fit: scale-down` (whole picture, never enlarged). Several options go in braces; anything else in the title fails the build. Example: `::logo::` / `![Acme Corp logo](assets/logos/acme.png "fit: contain")`. Keep the closing mermaid sentence. No mention of catalogs or skills: this is the core's language reference. |
| 210, **image sizing** bullet under Layout declarations | Replace with: "**image fit** -- chosen per image in its title (`fit: contain` \| `cover` \| `scale-down`), `contain` when omitted. Mermaid renders contained." |
| 306, full example | `![]($images.officeFloorPlan)` → `![Office floor plan with meeting rooms marked](assets/images/office-floor-plan.png "fit: contain")` |

### `README.md` (tycoslide)

| Where | Change |
|---|---|
| 29 | "Images, from the theme's asset catalog or a file path" → "Images by file path, with alt text and an optional fit" |
| 32 | The syntax link: `theme-package/syntax.md` → `docs/syntax.md`. **Done in 4c.** |

### create-theme skill: `skills/create-theme/`

Installed separately (`npx skills add`), but the same known-wrong-line standard applies.
It builds the catalog, so it is where the fit judgement is recorded.

| File, where | Change |
|---|---|
| `SKILL.md` 59–67, scaffold | The Python snippet stops setting `t['assets']`; add `echo '{}' > assets.json` to the block. |
| `SKILL.md` 110, cataloging | "Then catalog the images … under `assets` in `theme.json`, each with a `path`, a `type` and a one-line `description`. The type is `icon` for marks that must never be enlarged, `image` for pictures that may scale but not crop, and `background` for full-bleed art that may crop." → "Then catalog the images … in `assets.json`, each with a `path`, a `fit` and a one-line `description`. The fit is what a deck author copies into the image: `scale-down` for icons and marks that must never be enlarged, `contain` for pictures that may scale but must not crop (logos, diagrams, screenshots), and `cover` only for full-bleed art that may crop. Look at the picture to decide." |
| `SKILL.md` 120, `smoke.md` | Add after "filling every parameter and slot with content of realistic length": "Write images as `![alt](path "fit: …")` using catalog paths, which resolve as they are because `smoke.md` sits in the theme directory, and give each one alt text." |
| `SKILL.md` 142, 3.1 Assets | "every description names what the picture shows, because deck authors grep the catalog for it" → add: "and every `fit` is the one an author should copy, since nothing else will choose it" |
| `SKILL.md` 156, 3.3 Package | "That writes `manifest.json`, `assets.json`, `SKILL.md` and `syntax.md`" → "That writes `manifest.json`, `SKILL.md` and `syntax.md`, checks `assets.json`" |
| `SKILL.md` 160, Hand-off | "unzipped with `npm install` run once inside it for a local agent" → "unzipped with `npm install` and `unzip -nq assets.dat` run once inside it for a local agent" |
| `references/theme-json.md` 67–81 | Remove the `assets` section from the `theme.json` reference, and move it to a new `references/assets-json.md`: the two-level shape, the `path` / `fit` / `description` fields (Required, may be `{}`), and the fit table (`scale-down` never enlarged, never cropped: icons, small marks; `contain` whole picture, may scale, never cropped: logos, diagrams, screenshots; `cover` fills the frame, center-crops: full-bleed backdrops only). Drop the "`Unknown asset reference "$x.y"`" and build-time `file not found` error lines. |
| `references/theme-json.md` 128, example | Drop the `assets` block from the example. |
| `references/theme-json.md` 167 | "and all three asset types" → move to `assets-json.md` as "and all three fits" |
| `references/theme-json.md` 173, `.gitignore` | Drop `assets.json` from the list of generated files: it is authored now. |

### `CLAUDE.md` (tycoslide)

| Where | Change |
|---|---|
| 3 | The syntax link: `theme-package/syntax.md` → `docs/syntax.md`. **Done in 4c.** |
| 17, 21, 24, Releasing | The tarball ships `dist/`, `bin/`, `docs/`, `theme-package/`. Step 1 names both `docs/syntax.md` and `theme-package/SKILL.md` as shipped files. **Done in 4c.** |
| 38–49, Architecture | Three layers, not two: add the agents bullet (`src/agents/`: manifest, catalog, skill zip, the `package` command; imports the core only through `src/index.ts`), drop "the theme's asset catalog" from what the compiler owns, and state the import rules and that Biome enforces them. **Done in 4c.** |

Checked and unchanged: `ROADMAP.md` (its slot-size item still stands),
`internal/positioning.md` and `internal/product-direction.md`.

### tycoworks-theme

The only theme. `SKILL.md`, `syntax.md` and `manifest.json` in its root are generated by
`tycoslide package` on `npm install` and are gitignored. `assets.json` stops being
generated and becomes a tracked source file. Already committed on its branch: `2f0fe47`,
clearing stale placeholder alt-text titles from the template.

| File | Change |
|---|---|
| `package.json` + lockfile | `"@tycoworks/tycoslide": "^0.15.1"` → `"^0.16.0"`. On 0.x a caret stops at the next minor, so without this bump the theme keeps resolving 0.15. |
| `assets.json` (new, tracked) | Written by a script from `theme.json`'s `assets`, each entry's `type` → `fit` mechanically: `icon` → `scale-down` (2,122 icons), `image` → `contain` (4 brand marks), `background` → `cover` (low-poly). Review the diff for count only. |
| `theme.json` | Remove `assets` (same script). No other change. |
| `.gitignore` | Remove `/assets.json` from the generated-skill block. |
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
- **No `assets` in `theme.json`.** The core schema doesn't know the key, so a theme that
  still has it fails to load like any other unknown key. It is not tolerated or ignored.
- **No `type` in `assets.json`.** Its schema accepts `fit` only.
- **No expansion by the core**, during builds or on command, "for old packaged skills".
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
- 0–2. **Done:** the design doc (`ab4d950`, revised `14f28e3`), alt text (`90ef827`), fit
  from the title (`411866e`). This revision of the doc is committed on its own before
  phase 3, as "Update the image design: three layers".
3. **Images are paths.** The compiler half of `$` removal, plus `buildDeck` stops
   expanding. Tests as listed.
4. **Three layers**, as three commits: 4a moves the agent code behind the Biome import rules;
   4b moves the catalog out of `theme.json` into `assets.json` and deletes `expandAssets`;
   4c moves `syntax.md` to `docs/`. After this the shipped docs are stale until phase 7,
   which is fine on a branch.
5. **The create-theme scripts become commands**, as two commits: 5a `tycoslide
   extract-media`, 5b `tycoslide inspect`, each with tests; the Python scripts are deleted.
6. **Fail on unknown inline nodes.** `inline.ts` + test.
7. **Shipped docs.** `theme-package/SKILL.md`, `docs/syntax.md`, `README.md`, `CLAUDE.md`,
   exactly as tabled.
8. **create-theme skill.** `skills/create-theme/SKILL.md`,
   `skills/create-theme/references/theme-json.md`, the new `references/assets-json.md`,
   exactly as tabled, plus: the inventory and media steps run `npx tycoslide inspect` and
   `npx tycoslide extract-media`, and the scaffold's Python snippet that edits `theme.json`
   becomes Node, so the skill needs no Python.
9. **Release v0.16.0** per the runbook. Breaking (`$` removed, catalog moved out of
   `theme.json`), which a 0.x minor allows. Merge to `main`, clean build and test, bump,
   `npm pack --dry-run` (now also expecting `docs/`), commit and annotated tag, then
   `npm publish` (by hand, OTP), GitHub release, clean-room check. The clean-room check
   unzips a packaged theme, runs `npm install && unzip -nq assets.dat`, and builds a deck
   that copies one picture.

**tycoworks-theme** (after phase 9: its bump needs 0.16.0 on npm)
- **Done:** `2f0fe47`, template placeholder titles cleared.
10. **Adopt 0.16.** Bump the devDependency, write `assets.json` and drop `assets` from
   `theme.json` (scripted), un-ignore `assets.json`, `npm install` (regenerates the skill
   files), edit `showcase.md` and `how-it-works.md`. Build both decks, render with
   LibreOffice, compare against the 0.15 renders (geometry must match), and check the
   lockup's alt text in PowerPoint. Then run `npx tycoslide package`, unzip the result into
   a scratch directory, `npm install && unzip -nq assets.dat`, and build a one-slide deck
   **outside** that directory that copies `assets/brand/tycoworks-lockup.png` in. That
   proves the copy convention end to end. One commit, then merge to `main`.

To check the theme before publishing, point it at the local engine temporarily
(`npm install ../tycoslide`) and restore the `^0.16.0` range before committing.

## Tests

`node:test`, alongside the existing suites. Phases 1–2 added the alt-text and
title-parsing tests.

**Phase 3**
- **`test/markdown.test.ts`**
  - The fit table: delete the two catalog rows and the `assets` fixture they use. Point the
    table at real files in a temp deck directory (the compiler now checks existence), via a
    small `deckDirWith(...paths)` helper. Add a row for an absolute path.
  - `![]($imgs.closingBg)` with its inline catalog → a deck-relative path to a real file.
- **`test/composition.compiler.e2e.test.ts`**
  - The `$logos.primary` cases: `![logo](swap.png)`; `loadThemeConfig()` already sets
    `deckDir` to the fixtures folder, which holds `swap.png`.
  - Delete "fails fast on a malformed catalog reference" (`$bad`) and "fails fast on an
    unknown body-image reference" (`$logos.missing`). Replace them with one test: a missing
    image path fails at compile with the region prefix, the path as written and the
    resolved path.
  - Replace "expands a packaged theme's asset archive during the build" with: a build
    against a theme dir holding only `assets.dat` writes no asset into the theme dir.
- **`test/proseParser.test.ts`, `test/tableParser.test.ts`**: their hand-built
  `BlockContext`s lose `resolveAssetRef`.

**Phase 4** (4a only updates test imports for the moved files; the rest is 4b)
- **`test/fixtures/composition-theme.json`**: drop `assets`. Packaging tests pass a catalog
  object to `zipDir`; catalog tests write their `assets.json` to a temp dir.
- **`test/themeConfigSchema.test.ts`**: `fullTheme()` drops `assets`.
- **New catalog tests** (agent layer): a valid `assets.json` loads; a bad `fit` value and an
  unknown key in an entry are rejected (a neutral key, not `type`); a missing file fails
  `package`.
- **`test/manifest.test.ts`**: delete the `generateAssetCatalog` tests; keep the manifest's
  pointer to `assets.json`.
- **`test/skill.test.ts`**: delete the `expandAssets` tests; `skillPaths` archives the
  catalog's pictures and ships `assets.json` plain.
- **Import rules**: prove each Biome rule fires once with a deliberate bad import, by hand;
  no test.

**Phase 5**
- Each command against a fixture `.pptx`: its output matches what the Python script printed
  or copied for the same file.

**Phase 6**
- A phrasing node type the walker doesn't handle throws, naming the type.

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
| A core `tycoslide unpack` (or `asset --to`) command | rejected | Agent-host archive handling in the core CLI. `assets.dat` is a plain zip, and `unzip -n` already does the job, whole or per picture. |

### Where the agent layer lives

Put to three independent reviews on 23 Sep with the same facts; all three chose A.

| Option | Verdict | Why |
|---|---|---|
| **A. Third layer in the same package: `src/agents/`, Biome-enforced imports (this doc)** | chosen | Fixes every leak found, all of which were wrong-way imports inside one package. No duplicated parsing, one version (so the shipped `SKILL.md` and `syntax.md` always match the core the skill pins), and the theme repo's `postinstall: tycoslide package` keeps working. Costs a few file moves and one config block. |
| B. Agent layer as Python skill scripts, core drops `package` | rejected | Generating the manifest would reimplement the core's reading of `theme.json` (template keys, slots, accepts) in a second language, and drift. Breaks the theme's `postinstall`. Skills from GitHub HEAD against a core from npm can drift in version. Against ROADMAP's direction of removing Python. |
| C. Same repo, second npm package (workspaces) | later | The strongest boundary short of D, and the likely end state. Doubles the release runbook (two publishes, each needing an OTP); on 0.x every core minor forces an agent release, and changes like this branch's become coordinated releases. Revisit with an outside user or a second theme. A's import rule keeps the move mechanical. |
| D. Separate repo and package | rejected | All of C's cost plus cross-repo pull requests and `npm link` to test against an unpublished core. The worst fit for early research where both sides change together. |

## Non-goals (v1)

- **More options.** Candidates, none reserved: `focus` (crop anchor for `cover`, e.g.
  `top`), `decorative: true` (PowerPoint's "Mark as decorative", an `adec:decorative`
  extension under `<p:cNvPr>`; verify the exact XML against a PowerPoint-saved file before
  building), `width` / size overrides (probably never: size is the template's design).
- **Alt text on template chrome.** We only touch pictures we fill.
- **A separate agent package** (option C). See Alternatives.

## Open questions

- **Mermaid alt text.** The source is text, so a description is possible: a `%% alt: …`
  comment line in the fence, or the fence's info string. Decide when a real deck needs it.
- **Hosts without `unzip`.** Every Linux sandbox tried has it; Windows has `tar -xf`, which
  reads zips but overwrites by default. Add a fallback line to the skill only if an agent
  host turns out to lack `unzip`.
- **Blog:** post 2's asset-catalog section describes `$brand.mark` and fit from asset types.
  After this change the mechanism is: the agent searches `assets.json`, copies the picture
  next to the deck, and writes its path, alt text and fit. The on-brand point survives
  (the agent reaches for the theme's own pictures), but the section needs rewriting before
  post 2 ships. Its line that an agent "can only reach what the theme declares" was already
  false (paths since v0.15.0).
