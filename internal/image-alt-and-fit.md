# Image alt text and per-image fit

> Status: **proposed (23 Sep 2026).** Not built. Two additive changes to how a body image
> is written: the markdown **alt** text becomes the picture's PowerPoint alt text, and the
> markdown **title** carries image options, starting with `fit`. No new dependencies, no
> new syntax: both fields are standard CommonMark and already reach the compiler parsed.

## BLUF

```md
::diagram::

![Request flow from the API gateway to the workers](diagrams/flow.png "fit: contain")
```

- **alt** (`Request flow…`) → the picture's alt text in the `.pptx` (`<p:cNvPr descr>`).
  Today alt is parsed and thrown away.
- **title** (`"fit: contain"`) → a YAML mapping of image options, validated strictly. Today
  the only way to choose a fit is the catalog asset's `type`; a deck-relative path is always
  `contain`, and nothing can override either per use.
- Fit precedence: **title → catalog `type` → `contain`**. A deck that writes no title builds
  exactly as it does today.

## Why

### Fit belongs to the image, chosen per use

Fit today is a property of a catalog entry (`icon` → `scale-down`, `image` → `contain`,
`background` → `cover`, via `FIT_FOR` in `deckCompiler.ts`). That has three gaps:

1. **A deck-relative path can never be cropped.** `fromDeck` hard-types every path as
   `image`, so a photo written by path into a full-bleed slot letterboxes. Paths have been
   first-class since v0.15.0, so this is a live gap.
2. **One picture, one fit.** Using the same photo as a background on one slide and inline on
   another needs two catalog entries.
3. **Some pictures must never crop, whatever the slot.** An architecture diagram or a
   screenshot cropped to fill a frame is damaged, not styled. That constraint is a property
   of the picture, and today only the catalog can express it.

Both reference tools put fit in the source, per use. **Marp** takes keywords in the alt
text: `![bg contain](x.jpg)`, with backgrounds defaulting to `cover`. **Slidev** takes
`backgroundSize` in an image layout's frontmatter (default `cover`, hardcoded in
`handleBackground`), or `{…}` attributes on a body image when Comark syntax is switched on.
Neither has a catalog or image types.

This also moves in the direction the agent layer wants: an agent that looks at a picture
once (at theme-packaging time, with vision) can record "never crop" against it and write
the fit into every deck that uses it. The markdown stays explicit, deterministic, and
reviewable in a diff.

### Alt text has a real job, and we discard it

Alt text is the accessibility description of an image. PowerPoint carries it per picture
(`descr` on `<p:cNvPr>`), reads it to screen readers, and flags pictures without it in
Check Accessibility. The compiler currently ignores `alt` (`blocks/image.ts`: "`alt` is
ignored").

Worse, the output carries **stale** metadata. The tycoworks template's picture placeholders
came out of Google Slides with `title="logoipsum-385.png"`, `title="nat.png"` and similar
source filenames on their `<p:cNvPr>`, and no `descr`. Filling the picture swaps the image but keeps that attribute, so every built deck
describes its pictures by the placeholder's old filename.

Keeping alt free for its real job is also why options go in the title, not the alt (see
Alternatives).

## Syntax

```md
![alt text](path-or-$ref "options")
```

- **alt**: free text. Plain string (mdast's `image.alt`; inline formatting is already
  flattened by the parser). Empty is allowed.
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

### Fit precedence

1. `fit` in the title, if given.
2. Otherwise the catalog asset's `type` via `FIT_FOR` (for `$category.name` refs).
3. Otherwise `contain` (deck-relative paths). This is today's behaviour for paths, and it
   never crops.

The default is a documented rule, not a silent fallback: omitting `fit` is a valid,
complete authoring choice. "No silent defaults" in CLAUDE.md is about missing required
config, which this is not.

### Validation (fail fast, name slide + layout + slot)

| Input | Result |
|---|---|
| `"fit: contain"` | ok |
| `"{fit: cover}"` | ok |
| `"Our architecture"` (a caption put in the title) | error: the title is a YAML string, not a mapping. Message: *"image title holds options like `fit: contain`; put the description in the alt text: `![Our architecture](…)`"* |
| `"fit:contain"` (no space) | parses as the string `"fit:contain"`, so the same not-a-mapping error, plus a hint to put a space after the colon |
| `"fit: Contain"` / `"fit: crop"` | error: unknown fit, list the three valid values |
| `"{fit: cover, width: 2in}"` | error: unknown key `width`. Valid keys: `fit` |
| `"{fit: [a}"` | error: YAML syntax, with the `yaml` package's message |
| `""` (empty title) | treated as no options |

Parse the mapping through a Zod `strict` schema (`strictObject`, the same as
`themeConfigSchema.ts`), so unknown keys throw by construction and adding a key later is
one line.

What *cannot* happen, which is why this needs no attribute parser: the title is already
delimited and extracted by remark-parse. There is no brace scanning and no regex, and prose
elsewhere in the slide is parsed exactly as it is today.

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
identically. `setAttribute` does the XML escaping.

This touches only the filled picture shape on the output slide. The template file is
never modified, so the product principle ("users should never have to change their
`.pptx`") holds.

### Mermaid

A mermaid fence has no alt text, so its picture gets no `descr` (and loses the
placeholder's stale `title`, as every filled picture does). Giving diagrams alt text is a
follow-up, not v1; see Open questions.

### Catalog descriptions are not alt text

The catalog's `description` is **not** used as a fallback alt. Descriptions are written
for search ("white wordmark for dark slides"), not for a reader of the slide, and a silent
fallback would make the output depend on catalog wording the deck never shows. Alt comes
from the deck or not at all.

## Code changes

**Engine** (`src/engine/`). It stays ignorant of markdown, and fit stays the same.
- `types.ts`: `ImageFill` gains `alt?: string` (documented: the picture's accessibility
  description; absent or empty clears it).
- `fillers/image.ts`: `fillImage` writes or clears `descr` and removes `title` on the
  picture's `<p:cNvPr>` (inside `<p:nvPicPr>`). Add `Tag` / `Attr` constants in `dom.ts` for
  `cNvPr`, `descr`, `title` rather than string literals. Missing `<p:cNvPr>` throws, like the
  existing missing-`<a:off>` check.
- `isImageFill` accepts the optional string `alt`.

**Compiler** (`src/markdown/`)
- `blocks/image.ts`: read `node.alt` and `node.title` and pass them to `resolveAssetRef`.
  Drop the "`alt` is ignored" comment.
- `deckCompiler.ts`: `resolveAssetRef(ref, options)` → `ImageFill`, where
  - `options` = `parseImageTitle(title, where)` → `{ fit?: ImageFit }` (new, small, next to
    the schema code; takes the slide/layout/slot label for errors)
  - `fit = options.fit ?? FIT_FOR[type]`, where `type` is still the catalog type, or
    `image` for a path
  - `alt` is passed through untouched
- `toImageFill(path, type)` becomes `toImageFill(path, fit, alt)`. The type→fit lookup
  moves into the precedence line above.
- `inline.ts`: `walkPhrasing`'s `default` branch throws on a phrasing node it doesn't know
  instead of returning `[]`. Not required by this change, but the parser survey found it
  silently drops any node a plugin introduces. It gets its own commit.
- `blocks/mermaid.ts`: unchanged (fit `contain`, no alt).

**No change**: `manifest.ts` and `skillZip.ts` (neither describes markdown syntax, and
`assets.json` keeps its shape), the asset archive, `cli.ts`, and the create-theme scripts
`inventory.py` / `extract-media.py` (they read the template, never deck markdown).

## Documentation and deck changes

Every tracked `.md` in both repos was scanned on 23 Sep for images, pictures, assets, fit,
crop, alt, icons, backgrounds and logos. This is the complete list. Edits are surgical: only
the lines named here change. Line numbers are as of `main` on 23 Sep.

### tycoslide

`theme-package/` ships in the npm tarball and is copied into every packaged theme, so a
stale line there is a release blocker (Releasing runbook, step 1).

| File | Where | Change |
|---|---|---|
| `theme-package/syntax.md` | 137–143, the **image** bullet under slot content | Show the full form `![alt]($category.name "fit: contain")`. Say what alt does (becomes the picture's alt text in PowerPoint; leave empty for decorative art). Replace "How the picture is scaled and cropped comes from the asset's `type`… A file path… is always fitted as `image`; put a picture in the catalog when it needs another fit" with the precedence rule (title → catalog `type` → `contain`), the three fit values, and the rule that the title holds only options: a caption there fails the build. Keep the mermaid sentence. |
| `theme-package/syntax.md` | 210, the **image sizing** bullet under Layout declarations | "determines how it is scaled and cropped" becomes "sets its default fit, which an image's title can override". The type definitions and "Mermaid renders as `image` (contained)" stay. |
| `theme-package/syntax.md` | 306, full example deck | `![]($images.officeFloorPlan)` → `![Office floor plan]($images.officeFloorPlan)`. |
| `theme-package/SKILL.md` | 40, the `assets.json` paragraph | Add one clause: each entry's `type` is its default fit. |
| `theme-package/SKILL.md` | 80, the Quote example | `![]($logos.acme)` → `![Acme Corp logo]($logos.acme)`, and the trailing comment mentions alt text. |
| `theme-package/SKILL.md` | 147, Avoid list | After the "wrong image for the slot" bullet, add two bullets. **Don't skip alt text:** describe what a meaningful picture shows (not "image of"), and leave it empty only for decoration. **Don't crop what can't be cropped:** never `fit: cover` a diagram, chart, screenshot or logo; only write a `fit` when the default is wrong, and the `leaves X% empty` / `cropping X%` warnings are the signal. |
| `theme-package/SKILL.md` | 165, QA table | The "image didn't swap" fix shows `![alt]($category.name)`. Add a row for the new error: `image title holds options` → move the description into the alt text. |
| `README.md` | 29 | "Images, from the theme's asset catalog or a file path" → "Images, from the theme's asset catalog or a file path, with alt text and an optional fit". |
| `skills/create-theme/SKILL.md` | 110, cataloging | "The type is `icon` for marks that must never be enlarged…" becomes: the type is the picture's **default** fit, which a deck can override per image. The rules for choosing it stay. They are exactly the "never crop a diagram" judgement, recorded once. |
| `skills/create-theme/SKILL.md` | 120, `smoke.md` in Decide | Add: give every image alt text, so the render loop exercises alt text on the real template. |
| `skills/create-theme/references/theme-json.md` | 72, `assets` field table | `type`: "How the picture is fitted" → "The picture's default fit; a deck can override it per image". |
| `skills/create-theme/references/theme-json.md` | 75–79, fit-rule table | Header "Fit rule" → "Default fit". Add one line under the table pointing to the title syntax in `syntax.md`. |

Checked and unchanged: `CLAUDE.md` (the Architecture section still holds: the engine only
knows "image files at resolved paths", and alt is data, not markdown), `ROADMAP.md`,
`internal/positioning.md` and `internal/product-direction.md`.

### tycoworks-theme

The only theme. `SKILL.md`, `syntax.md`, `manifest.json` and `assets.json` in its root are
generated by `tycoslide package` on `npm install` and are gitignored, so they update by
reinstalling, not by editing.

| File | Change |
|---|---|
| `package.json` + `package-lock.json` | `"@tycoworks/tycoslide": "^0.15.1"` → `"^0.16.0"`. On 0.x a caret stops at the next minor, so without this bump the theme keeps resolving 0.15 and never gets the feature. |
| `showcase.md` | 261 `![]($brand.lockup)` → `![tycoworks]($brand.lockup)`. Leave the icons (75, 86) and the low-poly backgrounds (130, 172) with empty alt: they're decoration beside text, which is what the new SKILL guidance says. Every catalog `type` is already the right fit for its use, so no title is needed. The showcase shows the defaults. |
| `how-it-works.md` | 51 and 79, the same bullet in the code sample and in the rendered slide: "Images from the theme's catalog" → "Images, from the catalog or a file path, with alt text". Both lines must stay identical, because the slide shows its own source. |
| `README.md` | No change. It describes the asset folders and the icon set, not fit. |
| `theme.json` | No change. 2,122 `icon`, 4 `image`, 1 `background`, all correct as defaults. |

## Existing decks

The only decks are in these two repos: `showcase.md` and `how-it-works.md` in
tycoworks-theme, and the fixtures in `tycoslide/test`. None uses an image title, so none
changes behaviour. Rebuilt, they differ only in metadata: the placeholder's stale `title`
disappears from every filled picture, and `descr` appears where alt text is written.

## Phases

Branch `image-alt-and-fit` in **both** repos. Each phase is one commit that passes
`npm run typecheck && npm test && npm run lint` on its own. Nothing is committed without
the go-ahead.

**tycoslide**
1. **Engine: write alt text, clear stale metadata.** `dom.ts` constants, `ImageFill.alt`,
   `fillImage` writes or clears `descr` and removes `title`, `isImageFill`. Engine tests.
   Nothing supplies `alt` yet, so the only visible effect is that the stale `title`
   disappears.
2. **Compiler: alt and fit from the markdown.** `parseImageTitle` + strict Zod schema, and
   thread `alt` and options through `blocks/image.ts` → `resolveAssetRef` → `toImageFill`.
   Title-parsing, precedence and e2e tests.
3. **Fail on unknown inline nodes.** The `inline.ts` default branch, plus a test. Separate,
   so it can be reverted alone if it turns up a legitimate node type.
4. **Shipped docs.** `theme-package/syntax.md`, `theme-package/SKILL.md`, `README.md`,
   exactly the rows above.
5. **create-theme skill.** `skills/create-theme/SKILL.md` and
   `references/theme-json.md`, exactly the rows above.
6. **Release v0.16.0** per the runbook: merge to `main`, clean build and test, bump,
   `npm pack --dry-run`, commit and annotated tag, then `npm publish` (by hand, OTP), GitHub
   release, clean-room check.

**tycoworks-theme** (after phase 6: its bump needs 0.16.0 on npm)
7. **Adopt 0.16.** Bump the devDependency, `npm install` (regenerates the skill files),
   then edit `showcase.md` and `how-it-works.md`. Build both decks, render with LibreOffice,
   and check the lockup's alt text in PowerPoint. One commit, then merge to `main`.

To check the theme before publishing, point it at the local engine temporarily
(`npm install ../tycoslide`) and restore the `^0.16.0` range before committing.

## Tests

`node:test`, alongside the existing suites.

- **Title parsing** (unit, table-driven): every row of the Validation table above, plus
  each CommonMark title delimiter and an angle-bracket URL.
- **Fit precedence** (compiler): a path with no title gives `contain`. A path with
  `"fit: cover"` gives `cover` (the path-into-full-bleed case). A catalog `background` with
  `"fit: contain"` gives `contain`. A catalog `icon` with no title gives `scale-down`.
- **Alt in the output** (engine, `generate.test.ts`, whose geometry suite already uses
  `ImageFit`): alt is written to `descr`, empty alt removes a pre-existing `descr`, a
  placeholder `title` is always removed, special characters (`&`, `<`, quotes) round-trip,
  and the transplant path behaves the same.
- **e2e** (`composition.compiler.e2e.test.ts`): its `![logo](…)` cases (lines 96, 152,
  181) already carry alt `logo`, so assert it lands as `descr`. Add one title case and one
  error case.
- **Unknown inline node** (phase 3): a node type the walker doesn't handle throws, naming
  the type.
- **By hand, once (phase 7):** open the rebuilt showcase in PowerPoint, and check Alt Text
  and Check Accessibility on the lockup. Render with LibreOffice to confirm geometry is
  unchanged.

## Alternatives considered

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
| **remark-directive**, leaf only (`::image{src=… fit=…}`) | runner-up | Prose-safe once the text and container constructs are filtered out. But there's no option to do that, so it needs glue that matches micromark tokenizer function names, which is brittle across upgrades. It adds a non-markdown way to write an image that agents must be taught. It shows as raw text in previews. Revisit if attributes are needed beyond images (slots, tables), where one `::name{attrs}` mechanism would earn its cost. |
| **remark-attribute-list** (Kramdown `{: fit="contain"}`) | rejected | Prose-safe, but +1 dependency for niche syntax that shows as junk in previews. |
| Hand-written micromark extension for `{…}` after images | rejected | A proper tokenizer and no dependency, but a couple of hundred lines to own for a syntax no previewer renders. |
| Switch to markdown-it for Marp/Slidev plugin compatibility | rejected | Their plugins extend an **HTML** renderer. tycoslide emits PPTX, so every plugin would still need its own PPTX mapping. It would mean rewriting `mdast.ts`, `inline.ts` and the block handlers onto a flat token stream, and the gain would be zero. remark was chosen in Feb 2026 for an MDX path (`fb4a855`). That reason is gone, but the typed tree and the gfm/ins plugins still hold. |

Slide splitting, per-slide frontmatter and `::slot::` markers stay in the hand-written line
scanner (`slideParser.ts`). No markdown library models "a deck of slides": a per-slide
`---\nlayout: X\n---` parses as a thematic break plus a setext heading. Slidev's parser
splits slides with a line scanner too.

## Non-goals (v1)

- **Retiring the catalog's `type`.** It remains the default-fit source. Whether fit, and the
  catalog itself, move wholly into the agent layer is a separate decision. This doc only
  makes it possible, because per-use fit no longer depends on the catalog.
- **More options.** Candidates, none reserved: `focus` (crop anchor for `cover`, e.g.
  `top`), `decorative: true` (PowerPoint's "Mark as decorative", an `adec:decorative`
  extension under `<p:cNvPr>`; verify the exact XML against a PowerPoint-saved file before
  building), `width` / size overrides (probably never: size is the template's design).
- **Alt text on template chrome.** We only touch pictures we fill.

## Open questions

- **Mermaid alt text.** The source is text, so a description is possible: a `%% alt: …`
  comment line in the fence, or the fence's info string. Decide when a real deck needs it.
- **Should `cover` on a catalog `icon` warn?** An icon cropped to fill a frame is almost
  always a mistake, but the crop-percentage advisory already fires when it matters. Leave
  it until it bites.
- **Blog:** post 2's asset-catalog section says fit comes from the asset's type. It stays
  true as the default. If this ships before post 2, add one clause about the title
  override. Its line that an agent "can only reach what the theme declares" has been false
  since deck-relative paths (v0.15.0), independently of this doc.
