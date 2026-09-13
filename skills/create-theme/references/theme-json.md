# theme.json reference

`theme.json` sits at the root of a theme package next to `template/`. It maps author-facing names onto shapes in the template `.pptx`: each layout names one slide, each parameter or slot names one shape on it. The template is never edited. At build time the engine clones the named slide, rewrites the named shapes, and removes any optional shape the author left unfilled. Every object is strict: an unknown key fails the load with `theme.json: invalid theme config` and `Unknown key(s): x. Valid keys: ...`.

The one trap is `slideNumber`. It is the number in the file name `ppt/slides/slideN.xml`, not the slide's position in the deck. Reordering slides in PowerPoint changes positions but not file names. The inventory script prints both; always copy the file number into `slideNumber` and `sourceSlide`.

## `template`

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `template` | File name of the `.pptx`, resolved inside the theme's `template/` folder. Required. | The file you inventoried, bare name only, no `template/` prefix. | `File not found: <path>` at build; `Theme declares "template/<name>", but no such file exists` at package. |

## `layouts[]`

One entry per slide the author may pick. Two layouts may not share a `slideNumber`; the load fails with `Layouts "A" and "B" share slideNumber N`. A slide with more than one arrangement becomes one layout with a multi-accept slot, never two layouts.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `name` | The value authors write as `layout:` in slide frontmatter. Required, unique. | Your own naming, guided by the inventory's layout name column. | `unknown layout "xyz"` at deck compile, listing the valid names. |
| `slideNumber` | File number of the slide to clone. Required. | Inventory column: file number. | Wrong slide is cloned; no error, wrong content. |
| `description` | Neutral prose about the arrangement, shown to deck authors. Optional. | Write it from the shape list: what sits where, how many of each. | None. |
| `variant` | `"light"` or `"dark"`: the surface the code panel sits on. Optional, required when `codeTheme` is a pair and the layout takes code. | Inventory column: background light or dark. Set it on every layout. | `the theme's "codeTheme" is a { light, dark } pair, but this layout declares no "variant"`. |
| `parameters` | Single-value text shapes filled from frontmatter. Required, may be `[]`. | See below. | |
| `slots` | Body regions filled from `::key::` markdown regions. Required, may be `[]`. | See below. | |

### `parameters[]`

A parameter is a styled text shape whose text is rebuilt from a template string. The `{key}` placeholders are the frontmatter keys authors fill. There is no separate key field. A key may appear in only one parameter per layout: `key "title" (parameter "...") is declared twice`. Parameter shape names and slot keys share one namespace: `name "body" (slot) collides with another parameter or slot`.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `shapeName` | Exact name of the text shape on the layout's slide. Required. | Inventory column: shape name, kind `text`. | The build prints `Can't find element on slide N in source:` and leaves the placeholder text in place. |
| `template` | The shape's full text with `{key}` placeholders; `\n` is a line break. Required. | Inventory column: placeholder text, with each sample value replaced by a key. | `template has 2 lines but the shape has only 1 visual line(s)`; or `its styled sample text "..." does not fit the template` when styles inside a line do not match the placeholders. |
| `required` | Whether the author must supply the keys. Optional, default `false`; an unfilled optional parameter has its shape removed. | Your judgement: a title is usually required. | `parameter "X" is marked required but its template has no keys to fill`; at compile, `requires parameter "X" (keys: ...); none provided`. |

Keys match `[A-Za-z0-9_]+`. Write `{{` or `}}` for a literal brace. A shape with one line and one style is the safe case. A line that mixes styles must place a literal or style boundary between two placeholders, or the load fails with `variables "{a}" and "{b}" are adjacent with no separator`.

### `slots[]`

A slot is a body region. The author's markdown shape picks which accepted block fills it: prose or a code fence routes to `text`, a GFM table to `table`, an image reference or mermaid fence to `image`.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `key` | The `::key::` region name. Required, unique within the layout. | Your naming; `body`, `col1_body`, `image`, `code` are conventional. | `unknown slot "::x::" in layout "..."` at compile. |
| `accepts` | The blocks this slot can become, at most one per `type`. Required. | See blocks below. | `accepts two text blocks; each content type may appear once.` |
| `frame` | `{x, y, cx, cy}` in EMU: the region a transplanted shape is positioned into. Required when any block's `sourceSlide` differs from `slideNumber`, otherwise optional. | `inventory.py --json`, the `frame` of the shape on the layout's own slide that the transplant replaces, in EMU. Copy the numbers; never compute or convert them. | `Layout "X" slot "y": a transplant block (sourceSlide ≠ N) requires a "frame"`. |
| `required` | Whether the author must fill the region. Optional, default `false`; an unfilled optional slot has its shape removed. | Your judgement: the layout's headline when it is a slot, such as the quote on a quote layout. | `layout "X" requires slot "y"; none provided`. |

### Blocks inside `accepts`

Each block is discriminated by `type` and carries only its own option. A `bodyRows` on a text block or a `startAt` on a table block is an unknown key and fails the load.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `type` | `"text"`, `"table"` or `"image"`. Required. | Inventory column: kind. `text` is text, `table` is table, `picture` is image. Groups cannot be filled. | Schema error naming the invalid value. |
| `sourceSlide` | File number of the slide carrying the specimen shape. Required. | Inventory column: file number of the shape's slide. | Wrong shape cloned, or `Can't find element on slide N`. |
| `shapeName` | Exact name of the specimen shape on `sourceSlide`. Required. | Inventory column: shape name. | `Can't find element on slide N in source:` and the placeholder remains. |
| `startAt` | Text only. Leave the first N specimen paragraphs untouched and rebuild from paragraph N. Optional, default 0. | Count the fixed heading paragraphs in the placeholder text. | `startAt 3 is past the last paragraph (shape has 2)`. |
| `bodyRows` | Table only. `[start, end]`, 0-based inclusive: the rows that repeat for data. Required. Row 0 is always the header. Rows above `start` and below `end` render once, as fixed rows. | Inventory column: rows. With R rows and no total row use `[1, R-1]`. | `bodyRows [s, e] is out of range; require 1 <= start <= end <= R-1 (row 0 is the header)`; `has no <a:tbl> element (is it actually a table?)`. |

For an image block the shape must be a real picture: `is not a picture (missing <a:off>, <a:ext>, or <p:blipFill>)`.

Transplants: a block whose `sourceSlide` differs from the layout's `slideNumber` is copied from that other slide onto the cloned slide, positioned into the slot's `frame`. The shape the slot replaces on the base slide is removed. This is how one slot accepts both text and a table when the styled table lives on a different slide, as the worked example's `Content` layout does with a table from slide 15. The frame is the observed `<a:xfrm>` of the shape being replaced, so a text block in the same slot fills in place and the table lands exactly where the text was. The transplanted shape is positioned and sized to the frame, so its own size on the source slide does not matter.

## `assets`

A two-level catalog, `category` then `name`, giving `$category.name` references for authors. Required, may be `{}`. Category and asset names are free, but each leaf entry is strict.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `path` | File path relative to the theme root. Required. | Files you placed under `assets/`. | `Layout "X" image "path": file not found` at build; `Theme declares "path", but no such file exists` at package. |
| `type` | How the picture is fitted. Required. | See the table below. | Schema error; a missing type fails the load. |
| `description` | Searchable prose for the author. Required. | Describe subject, colour and intended surface. | None. |

| `type` | Fit rule |
|---|---|
| `icon` | Never enlarged, never cropped. Sits at native size or smaller, centred in the frame. |
| `image` | Scaled to fit the frame, never cropped. Letterboxed when the aspect differs. |
| `background` | Scaled to cover the frame and cropped symmetrically. Use for full-bleed backdrops. |

Authors see `Unknown asset reference "$x.y"` when they name an asset that is not in the catalog.

## `fonts`

Optional array of `@font-face` entries used only when rendering mermaid diagrams. PPTX text keeps the template's own fonts. Declare weights 400 and 700 for each family to avoid synthetic bold.

| Field | Meaning | Source | Error when wrong |
|---|---|---|---|
| `family` | CSS family name; must equal the mermaid variant's `fontFamily`. Required. | Inventory header: font scheme. | Warning `fontFamily "X" matches none of the declared theme fonts`, then a substitute font. |
| `path` | A package specifier such as `@fontsource/inter/files/inter-latin-400-normal.woff2`, or a `./` or `/` file path. Required. | The fontsource package for the family, listed in `dependencies`. | `could not resolve "path" from <rootDir>`; `file not found at ...`; `unsupported format ".otf"`. Supported: woff2, woff, ttf. |
| `weight` | OpenType weight. Optional, default 400. | 400 for regular, 700 for bold. | None. |

## `codeTheme`

Optional. A Shiki theme id such as `"github-light"`, or a pair `{ "light": "...", "dark": "..." }`. Required as soon as any deck uses a code fence: `deck contains a code fence but the theme declares no "codeTheme"`. A pair requires `variant` on every layout that takes code; each layout's `variant` picks the arm.

## `mermaid`

Optional record of named colour variants. The record keys are free; every variant must carry all eleven fields. Colours are hex strings.

| Key | Meaning |
|---|---|
| `primary` | Node fill colour. |
| `primaryContrast` | Text colour on `primary` nodes. |
| `text` | Default text, title and node label colour. |
| `line` | Edge and arrow colour. |
| `surface` | Subgraph, secondary node and edge-label background. |
| `surfaceBorder` | Border colour for nodes and subgraphs. |
| `fontFamily` | CSS family name; match a `fonts` entry. |
| `accents` | Array of colours assigned in order to `class` groups in a flowchart. |
| `accentOpacity` | Percent, 0 to 100, applied to accent and subgraph fills. |
| `accentTextColor` | Text colour inside accent-classed nodes. |
| `groupCornerRadius` | Subgraph corner radius in pixels; 0 for square. |

Take the values from the inventory header's colour scheme, reading the hex values rather than trusting the slot names, since a scheme can be inverted with `dk1` white. `text` is the colour body text has on the diagram's surface, `primary` is that surface, `line` and `accents` come from the accent slots, and `surfaceBorder` is a darker step of `surface`. A missing block fails with `theme has no "mermaid" block`.

## `mermaidVariant`

Optional string naming a key of `mermaid`. Required as soon as any deck has a mermaid fence: `declares no "mermaidVariant"`. A name that is not a key fails with `mermaid variant "x" not found in theme. Available variants: ...`. One variant per theme; pick the one matching most diagram layouts.

## Minimal complete example

```json
{
  "template": "composition.pptx",
  "assets": {
    "logos": {
      "primary": { "path": "assets/logo.png", "type": "image", "description": "Primary brand logo." }
    }
  },
  "layouts": [
    {
      "name": "Composed",
      "slideNumber": 1,
      "description": "Title over one body region.",
      "parameters": [
        { "shapeName": "Title 1", "template": "{title}", "required": true }
      ],
      "slots": [
        {
          "key": "body",
          "frame": { "x": 457200, "y": 1371600, "cx": 8229600, "cy": 2743200 },
          "accepts": [
            { "type": "text", "sourceSlide": 1, "shapeName": "Text 1" },
            { "type": "table", "sourceSlide": 2, "shapeName": "Table 0", "bodyRows": [1, 1] },
            { "type": "image", "sourceSlide": 3, "shapeName": "Image 0" }
          ]
        }
      ]
    },
    {
      "name": "TextOnly",
      "slideNumber": 4,
      "parameters": [],
      "slots": [
        { "key": "body", "accepts": [{ "type": "text", "sourceSlide": 4, "shapeName": "Text 1" }] }
      ]
    }
  ]
}
```

`TextOnly` has no `frame` because its only block lives on its own slide. `Composed` needs one because two blocks are transplants.

## Full example

The tycoworks theme is a complete 18-layout theme with a multi-accept slot, `variant`, a `codeTheme` pair, light and dark `mermaid` variants, `fonts`, and all three asset types: https://github.com/tycoworks/tycoworks-theme/blob/main/theme.json

## Files around it

A theme is an npm package. Its `package.json` sets `"private": true`, runs `"postinstall": "tycoslide package"`, lists `@tycoworks/tycoslide` in `devDependencies`, and lists font packages such as `@fontsource/inter` in `dependencies`. Commit `theme.json`, `template/*.pptx`, `assets/`, and `package.json`.

Packaging generates files that should not be committed. Add to `.gitignore`: `SKILL.md`, `syntax.md`, `manifest.json`, `assets.json`, `assets.dat`, `*.zip`, `*.pptx`, and then `!template/*.pptx` so the template survives the pptx rule.
