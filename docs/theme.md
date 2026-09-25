# theme.json reference

`theme.json` sits at the root of a theme package next to `template/`. It maps author-facing names onto shapes in the template `.pptx`: each layout names one slide, each parameter or slot names one shape on it. The template is never edited. At build time the engine clones the named slide, rewrites the named shapes, and removes any optional shape the author left unfilled. Every object is strict: an unknown key fails the load with `theme.json: invalid theme config` and `Unknown key(s): x. Valid keys: ...`.

The one trap is `slideNumber`. It is the number in the file name `ppt/slides/slideN.xml`, not the slide's position in the deck. Reordering slides in PowerPoint changes positions but not file names. Always use the file number in `slideNumber` and `sourceSlide`.

## `template`

| Field | Meaning | Error when wrong |
|---|---|---|
| `template` | File name of the `.pptx`, resolved inside the theme's `template/` folder. Required. | `File not found: <path>` at build; `Theme declares "template/<name>", but no such file exists` at package. |

## `layouts[]`

One entry per slide the author may pick. Two layouts may not share a `slideNumber`; the load fails with `Layouts "A" and "B" share slideNumber N`. A slide with more than one arrangement becomes one layout with a multi-accept slot, never two layouts.

| Field | Meaning | Error when wrong |
|---|---|---|
| `name` | The value authors write as `layout:` in slide frontmatter. Required, unique. | `unknown layout "xyz"` at deck compile, listing the valid names. |
| `slideNumber` | File number of the slide to clone. Required. | Wrong slide is cloned; no error, wrong content. |
| `description` | Neutral prose about the arrangement, shown to deck authors. Optional. | None. |
| `variant` | `"light"` or `"dark"`: the surface the code panel sits on. Optional, required when `codeTheme` is a pair and the layout takes code. | `the theme's "codeTheme" is a { light, dark } pair, but this layout declares no "variant"`. |
| `parameters` | Single-value text shapes filled from frontmatter. Required, may be `[]`. |  |
| `slots` | Body regions filled from `::key::` markdown regions. Required, may be `[]`. |  |

### `parameters[]`

A parameter is a styled text shape whose text is rebuilt from a template string. The `{key}` placeholders are the frontmatter keys authors fill. There is no separate key field. A key may appear in only one parameter per layout: `key "title" (parameter "...") is declared twice`. Parameter shape names and slot keys share one namespace: `name "body" (slot) collides with another parameter or slot`.

| Field | Meaning | Error when wrong |
|---|---|---|
| `shapeName` | Exact name of the text shape on the layout's slide. Required. | The build prints `Can't find element on slide N in source:` and leaves the placeholder text in place. |
| `template` | The shape's full text with `{key}` placeholders; `\n` is a line break. Required. | `template has 2 lines but the shape has only 1 visual line(s)`; or `its styled sample text "..." does not fit the template` when styles inside a line do not match the placeholders. |
| `required` | Whether the author must supply the keys. Optional, default `false`; an unfilled optional parameter has its shape removed. | `parameter "X" is marked required but its template has no keys to fill`; at compile, `requires parameter "X" (keys: ...); none provided`. |

Keys match `[A-Za-z0-9_]+`. Write `{{` or `}}` for a literal brace. A shape with one line and one style is the safe case. A line that mixes styles must place a literal or style boundary between two placeholders, or the load fails with `variables "{a}" and "{b}" are adjacent with no separator`.

### `slots[]`

A slot is a body region. The author's markdown shape picks which accepted block fills it: prose or a code fence routes to `text`, a GFM table to `table`, an image reference or mermaid fence to `image`.

| Field | Meaning | Error when wrong |
|---|---|---|
| `key` | The `::key::` region name. Required, unique within the layout. | `unknown slot "::x::" in layout "..."` at compile. |
| `accepts` | The blocks this slot can become, at most one per `type`. Required. | `accepts two text blocks; each content type may appear once.` |
| `frame` | `{x, y, cx, cy}` in EMU: the region a transplanted shape is positioned into. Required when any block's `sourceSlide` differs from `slideNumber`, otherwise optional. | `Layout "X" slot "y": a transplant block (sourceSlide ≠ N) requires a "frame"`. |
| `required` | Whether the author must fill the region. Optional, default `false`; an unfilled optional slot has its shape removed. | `layout "X" requires slot "y"; none provided`. |

### Blocks inside `accepts`

Each block is discriminated by `type` and carries only its own option. A `bodyRows` on a text block or a `startAt` on a table block is an unknown key and fails the load.

| Field | Meaning | Error when wrong |
|---|---|---|
| `type` | `"text"`, `"table"` or `"image"`. Required. | Schema error naming the invalid value. |
| `sourceSlide` | File number of the slide carrying the specimen shape. Required. | Wrong shape cloned, or `Can't find element on slide N`. |
| `shapeName` | Exact name of the specimen shape on `sourceSlide`. Required. | `Can't find element on slide N in source:` and the placeholder remains. |
| `startAt` | Text only. Leave the first N specimen paragraphs untouched and rebuild from paragraph N. Optional, default 0. | `startAt 3 is past the last paragraph (shape has 2)`. |
| `bodyRows` | Table only. `[start, end]`, 0-based inclusive: the rows that repeat for data. Required. Row 0 is always the header. Rows above `start` and below `end` render once, as fixed rows. | `bodyRows [s, e] is out of range; require 1 <= start <= end <= R-1 (row 0 is the header)`; `has no <a:tbl> element (is it actually a table?)`. |

For an image block the shape must be a real picture: `is not a picture (missing <a:off>, <a:ext>, <p:blipFill>, or <p:cNvPr>)`.

Transplants: a block whose `sourceSlide` differs from the layout's `slideNumber` is copied from that other slide onto the cloned slide, positioned into the slot's `frame`. The shape the slot replaces on the base slide is removed. This is how one slot accepts both text and a table when the styled table lives on a different slide, as the worked example's `Content` layout does with a table from slide 15. The frame is the observed `<a:xfrm>` of the shape being replaced, so a text block in the same slot fills in place and the table lands exactly where the text was. The transplanted shape is positioned and sized to the frame, so its own size on the source slide does not matter.

## `fonts`

Optional array of `@font-face` entries used only when rendering mermaid diagrams. PPTX text keeps the template's own fonts. Declare weights 400 and 700 for each family to avoid synthetic bold.

| Field | Meaning | Error when wrong |
|---|---|---|
| `family` | CSS family name; must equal the mermaid variant's `fontFamily`. Required. | Warning `fontFamily "X" matches none of the declared theme fonts`, then a substitute font. |
| `path` | A package specifier such as `@fontsource/inter/files/inter-latin-400-normal.woff2`, or a `./` or `/` file path. Required. | `could not resolve "path" from <rootDir>`; `file not found at ...`; `unsupported format ".otf"`. Supported: woff2, woff, ttf. |
| `weight` | OpenType weight. Optional, default 400. | None. |

## `codeTheme`

Optional. A Shiki theme id such as `"github-light"`, or a pair `{ "light": "...", "dark": "..." }`. Required as soon as any deck uses a code fence: `deck contains a code fence but the theme declares no "codeTheme"`. A pair requires `variant` on every layout that takes code; each layout's `variant` picks the arm.

## `mermaid`

Optional record of named color variants. The record keys are free; every variant must carry all eleven fields. Colors are hex strings.

| Key | Meaning |
|---|---|
| `primary` | Node fill color. |
| `primaryContrast` | Text color on `primary` nodes. |
| `text` | Default text and title color, including labels outside nodes. |
| `line` | Edge and arrow color. |
| `surface` | Subgraph, secondary node and edge-label background. |
| `surfaceBorder` | Border color for nodes and subgraphs. |
| `fontFamily` | CSS family name; match a `fonts` entry. |
| `accents` | Array of colors assigned in order to `class` groups in a flowchart. |
| `accentOpacity` | Percent, 0 to 100, applied to accent and subgraph fills. |
| `accentTextColor` | Text color inside accent-classed nodes. |
| `groupCornerRadius` | Subgraph corner radius in pixels; 0 for square. |

A missing block fails with `theme has no "mermaid" block`.

## `mermaidVariant`

Optional string naming a key of `mermaid`. Required as soon as any deck has a mermaid fence: `declares no "mermaidVariant"`. A name that is not a key fails with `mermaid variant "x" not found in theme. Available variants: ...`. One variant per theme; pick the one matching most diagram layouts.

## Minimal complete example

```json
{
  "template": "composition.pptx",
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

The tycoworks theme is a complete 18-layout theme with a multi-accept slot, `variant`, a `codeTheme` pair, light and dark `mermaid` variants, and `fonts`: https://github.com/tycoworks/tycoworks-theme/blob/main/theme.json
