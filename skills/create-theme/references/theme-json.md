# Filling in theme.json

What each field means, and the error you get when it is wrong, is in `node_modules/@tycoworks/tycoslide/docs/theme.md`, installed with the theme. This file says where each value comes from when you draft `theme.json` from `template.json`.

`template.json` records each slide's file number and its position in the deck; always copy the file number into `slideNumber` and `sourceSlide`.

## `template`

| Field | Source |
|---|---|
| `template` | The file you inventoried, bare name only, no `template/` prefix. |

## `layouts[]`

| Field | Source |
|---|---|
| `name` | Your own naming, guided by the inventory's layout name column. |
| `slideNumber` | Inventory column: file number. |
| `description` | Write it from the shape list: what sits where, how many of each. |
| `variant` | Inventory column: background light or dark. Set it on every layout. |
| `parameters` | See below. |
| `slots` | See below. |

### `parameters[]`

| Field | Source |
|---|---|
| `shapeName` | Inventory column: shape name, kind `text`. |
| `template` | Inventory column: placeholder text, with each sample value replaced by a key. |
| `required` | Your judgement: a title is usually required. |

### `slots[]`

| Field | Source |
|---|---|
| `key` | Your naming; `body`, `col1_body`, `image`, `code` are conventional. |
| `accepts` | See blocks below. |
| `frame` | `template.json`, the `frame` of the shape on the layout's own slide that the transplant replaces, in EMU. Copy the numbers; never compute or convert them. |
| `required` | Your judgement: the layout's headline when it is a slot, such as the quote on a quote layout. |

### Blocks inside `accepts`

| Field | Source |
|---|---|
| `type` | Inventory column: kind. `text` is text, `table` is table, `picture` is image. Groups cannot be filled. |
| `sourceSlide` | Inventory column: file number of the shape's slide. |
| `shapeName` | Inventory column: shape name. |
| `startAt` | Count the fixed heading paragraphs in the placeholder text. |
| `bodyRows` | Inventory column: rows. With R rows and no total row use `[1, R-1]`. |

## `fonts`

| Field | Source |
|---|---|
| `family` | Inventory header: font scheme. |
| `path` | The fontsource package for the family, listed in `dependencies`. |
| `weight` | 400 for regular, 700 for bold. |

## `mermaid`

Take the values from the color scheme in `template.json`, reading the hex values rather than trusting the slot names, since a scheme can be inverted with `dk1` white. `text` is the color body text has on the diagram's surface, `primary` is that surface, `line` and `accents` come from the accent slots, and `surfaceBorder` is a darker step of `surface`.

## `assets`

A two-level catalog, `category` then `name`, giving `$category.name` references for authors. Required, may be `{}`. Category and asset names are free, but each leaf entry is strict.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `path` | File path relative to the theme root. Required. | Files you placed under `assets/`. | `Layout "X" image "path": file not found` at build; `Theme declares "path", but no such file exists` at package. |
| `type` | How the picture is fitted. Required. | See the table below. | Schema error; a missing type fails the load. |
| `description` | Searchable prose for the author. Required. | Describe subject, color and intended surface. | None. |

| `type` | Fit rule |
|---|---|
| `icon` | Never enlarged, never cropped. Sits at native size or smaller, centred in the frame. |
| `image` | Scaled to fit the frame, never cropped. Letterboxed when the aspect differs. |
| `background` | Scaled to cover the frame and cropped symmetrically. Use for full-bleed backdrops. |

Authors see `Unknown asset reference "$x.y"` when they name an asset that is not in the catalog.

## Files around it

A theme is an npm package. Its `package.json` sets `"private": true`, runs `"postinstall": "tycoslide package"`, lists `@tycoworks/tycoslide` in `devDependencies`, and lists font packages such as `@fontsource/inter` in `dependencies`. Commit `theme.json`, `template/*.pptx`, `assets/`, and `package.json`.

Packaging generates files that should not be committed. Add to `.gitignore`: `SKILL.md`, `syntax.md`, `manifest.json`, `assets.json`, `assets.dat`, `*.zip`, `*.pptx`, and then `!template/*.pptx` so the template survives the pptx rule.
