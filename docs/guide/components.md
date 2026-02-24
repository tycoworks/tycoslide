# Components

Components are content elements that you compose in markdown to build slides. All built-in components come from `tycoslide-components` and are re-exported by themes (including `tycoslide-theme-default`), so they are available by default.

This page covers **using** components in markdown directives. To build your own, see [Creating Components](../extending/creating-components.md). For the default theme's token values, see [`theme.ts`](../../packages/theme-default/src/theme.ts).

---

## Directive Syntax

Components are invoked with the triple-colon directive syntax:

```markdown
:::componentName{param="value" another="value"}
Body content goes here.
:::
```

**Nesting:** When a component contains other components, add an extra colon to the outer fence for each nesting level:

```markdown
::::row{gap="normal"}
:::card{title="Left"}
Left content.
:::
:::card{title="Right"}
Right content.
:::
::::
```

Three-deep nesting uses five colons on the outermost container, four on the middle, three on the innermost, and so on.

**Parameters** are passed in curly braces after the component name, using `key="value"` syntax. Boolean and numeric values are still quoted: `columns="3"`.

**Body content** is everything between the opening and closing fences. Some components use the body as their primary content (e.g., `text`, `quote`), while others ignore it or treat it as a file path (e.g., `image`).

---

## Component Summary

### Content Components (theme tokens apply)

| Component | Description |
|-----------|-------------|
| [text](#text) | Paragraph text, headings, bullets |
| [card](#card) | Content card with optional image, title, and description |
| [quote](#quote) | Blockquote with optional attribution and image |
| [table](#table) | Native PowerPoint table with header support |
| [line](#line) | Horizontal or vertical rule |
| [shape](#shape) | Filled/outlined area shape |
| [slideNumber](#slidenumber) | Slide number element (used in master) |

### Container Components (no theme tokens)

| Component | Description |
|-----------|-------------|
| [row](#row) | Horizontal flex container |
| [column](#column) | Vertical flex container |
| [stack](#stack) | Z-order overlay container |
| [grid](#grid) | Equal-column grid |

### I/O Components (no theme tokens)

| Component | Description |
|-----------|-------------|
| [image](#image) | Embedded image |
| [mermaid](#mermaid) | Auto-themed Mermaid diagram (renders via mermaid-cli) |

### Shared Value Types

**Gap values:** `none`, `tight`, `normal`, `loose`

**Size values:** `fill`, `hug`

**Horizontal alignment (`hAlign`):** `left`, `center`, `right`

**Vertical alignment (`vAlign`):** `top`, `middle`, `bottom`

---

## text

Renders paragraph text, bullets, and headings. Supports three content modes.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `style` | TextStyleName | Override text style (`h1`--`h4`, `body`, `small`, `eyebrow`, `footer`) |
| `hAlign` | `left` \| `center` \| `right` | Horizontal alignment |
| `vAlign` | `top` \| `middle` \| `bottom` | Vertical alignment |
| `content` | `plain` \| `rich` \| `prose` | Parsing mode (default: `rich`) |
| `variant` | string | Theme variant name |

### Content Modes

- **`plain`** -- No parsing, single text run. Use for eyebrows, labels, attributions.
- **`rich`** -- Inline formatting only: `**bold**`, `*italic*`, `:accent[highlighted]`. This is the default.
- **`prose`** -- Full markdown: bullets, numbered lists, multiple paragraphs.

### Inline Accent Colors

In `rich` and `prose` modes, use the `:name[text]` syntax to apply accent colors inline:

```markdown
:::text
Normal text with :blue[blue highlight] and :green[green highlight].
:::
```

Available accent names: `blue`, `green`, `red`, `yellow`, `purple`.

### Examples

```markdown
:::text{style="h4" variant="accent"}
Highlighted heading
:::
```

```markdown
:::text{content="prose"}
- First bullet
- Second bullet
- Third bullet
:::
```

```markdown
:::text{style="eyebrow" variant="muted"}
SECTION LABEL
:::
```

---

## card

Content card with an optional image, title, and description. Renders as a rounded rectangle with configurable background.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | string | Card title (inline markdown supported) |
| `description` | string | Description text (or use body content) |
| `image` | string | Path to image file |
| `variant` | string | Theme variant (`default`, `flat`) |
| `height` | `fill` \| `hug` | Height sizing (default: `fill`) |

### Examples

```markdown
:::card{title="Feature Name"}
Description of the feature.
:::
```

```markdown
:::card{title="With Image" image="./assets/diagram.png" variant="flat"}
Supporting detail text.
:::
```

```markdown
::::grid{columns=3}
:::card{title="Research" height="fill"}
Gather requirements and user insights.
:::
:::card{title="Design" height="fill"}
Create wireframes and prototypes.
:::
:::card{title="Deliver" height="fill"}
Ship to production with confidence.
:::
::::
```

---

## quote

Blockquote with optional attribution line and optional image/logo. Same background structure as card.

Quote text is required -- provide it either via the `quote` attribute or as body content.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `quote` | string | Quote text (or use body content) |
| `attribution` | string | Attribution line |
| `image` | string | Path to logo/image shown above quote |
| `variant` | string | Theme variant |
| `height` | `fill` \| `hug` | Height sizing (default: `fill`) |

### Examples

```markdown
:::quote{attribution="— Sarah Chen, Design Lead"}
Consistent formatting saved us hours of manual review.
:::
```

```markdown
:::quote{attribution="— Sarah Chen, Design Lead" image="./assets/logo.png"}
Design systems reduce decision fatigue across teams.
:::
```

---

## table

Native PowerPoint table. Renders via `slide.addTable()` for accurate borders, cell merging, and text wrapping. GFM tables in the directive body always produce one header row.

Cell content supports inline markdown (`**bold**`, `*italic*`, `:accent[color]`).

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `headerColumns` | number | Number of header columns (default: 0) |
| `variant` | string | Theme variant |

### Example

```markdown
:::table{headerColumns=1}
| Feature      | Basic | Pro   |
|--------------|-------|-------|
| Storage      | 10GB  | 100GB |
| Users        | 1     | 10    |
| Support      | Email | 24/7  |
:::
```

---

## line

A horizontal or vertical rule. Expands to a native PowerPoint line shape.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `beginArrow` | ArrowType | Arrow at start (`none`, `arrow`, `diamond`, `oval`, `stealth`, `triangle`) |
| `endArrow` | ArrowType | Arrow at end (same values as `beginArrow`) |
| `variant` | string | Theme variant |

### Example

```markdown
:::line
:::
```

---

## shape

A filled area shape. Used as backgrounds, decorations, or structural elements.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `shape` | ShapeName | Shape type (**required**) -- e.g. `rect`, `roundRect`, `ellipse` |
| `variant` | string | Theme variant (`default`, `primary`, `subtle`, `outlined`, `accent`) |

### Example

```markdown
:::stack
:::shape{shape="roundRect" variant="subtle"}
:::
:::text{style="h3" variant="inverse"}
Text over background
:::
:::
```

---

## slideNumber

Displays the current slide number. Used in the default master slide footer. This component is typically placed by the theme's master layout rather than by authors directly.

No directive parameters.

---

## row

Horizontal flex container. Children are arranged side by side.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `gap` | `none` \| `tight` \| `normal` \| `loose` | Gap between children |
| `vAlign` | `top` \| `middle` \| `bottom` | Vertical alignment of children |
| `hAlign` | `left` \| `center` \| `right` | Horizontal alignment |
| `padding` | number | Internal padding (inches) |
| `width` | `fill` \| `hug` | Width sizing (default: `fill`) |
| `height` | `fill` \| `hug` | Height sizing (default: `hug`) |

### Example

```markdown
::::row{gap="normal" vAlign="top"}
:::card{title="Left"}
Left content.
:::
:::card{title="Right"}
Right content.
:::
::::
```

---

## column

Vertical flex container. Children are stacked top to bottom. Same parameters as [row](#row).

### Parameters

Same as `row`: `gap`, `vAlign`, `hAlign`, `padding`, `width`, `height`.

### Example

```markdown
::::column{gap="tight"}
:::text{style="eyebrow"}
CONTEXT
:::
:::quote{attribution="— Sarah Chen, Design Lead"}
Automating the review cycle freed up two days per sprint.
:::
::::
```

---

## stack

Z-order overlay container. All children occupy the same bounds; the first child renders behind, the last child renders in front. This is how you layer text over a background shape.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `width` | `fill` \| `hug` | Width sizing (default: `fill`) |
| `height` | `fill` \| `hug` | Height sizing (default: `hug`) |

### Example

```markdown
:::stack{height="fill"}
:::shape{shape="rect" variant="primary"}
:::
:::text{style="h1" variant="inverse"}
White text over blue background
:::
:::
```

---

## grid

Equal-column grid. Wraps children into rows of N columns, each cell sharing space equally.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `columns` | number | Number of columns (**required**) |
| `gap` | GapSize | Gap between cells (default: `normal`) |

### Example

```markdown
::::grid{columns=3}
:::card{title="One" height="fill"}
First.
:::
:::card{title="Two" height="fill"}
Second.
:::
:::card{title="Three" height="fill"}
Third.
:::
::::
```

---

## image

Embeds an image. No theme tokens -- sizing follows the layout container.

The image path is provided as the **directive body content** (not a parameter).

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `alt` | string (optional) | Alt text for the image |

### Example

```markdown
:::image{alt="Architecture diagram"}
./assets/diagram.png
:::
```

---

## mermaid

Renders a Mermaid diagram to PNG via `mermaid-cli` and embeds it as an image. Theme colors are automatically injected.

**Do not** add `style`, `classDef`, `linkStyle`, or `%%{init}` directives -- they will throw an error. The theme handles all styling.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `scale` | number | Render scale factor (default: `2`) |

### Class Names

Apply theme colors to nodes using Mermaid's `class` keyword:

| Class | Color |
|-------|-------|
| `primary` | primary color (full opacity) |
| `blue` | blue (subtle) |
| `green` | green (subtle) |
| `red` | red (subtle) |
| `yellow` | yellow (subtle) |
| `purple` | purple (subtle) |

Supported diagram types: `flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram`, and all other Mermaid types. Theme variables are injected for all types; class definitions are only injected for `flowchart`/`graph`.

### Example

```markdown
:::mermaid
flowchart LR
    A[Client] --> B[API]
    B --> C[(Database)]
    class B primary
:::
```

---

## Common Patterns

### Two-column comparison

```markdown
::::row{gap="normal"}
:::card{title="Before" height="fill"}
Manual process, error-prone.
:::
:::card{title="After" height="fill"}
Automated, reproducible.
:::
::::
```

### Feature grid

```markdown
::::grid{columns=3}
:::card{title="Research" height="fill"}
Gather requirements and user insights.
:::
:::card{title="Design" height="fill"}
Create wireframes and prototypes.
:::
:::card{title="Deliver" height="fill"}
Ship to production with confidence.
:::
::::
```

### Quote with label

```markdown
::::column{gap="tight"}
:::text{style="eyebrow" variant="muted"}
TEAM FEEDBACK
:::
:::quote{attribution="— Sarah Chen, Design Lead"}
Automating the review cycle freed up two days per sprint.
:::
::::
```

### Text over background

```markdown
:::stack{height="fill"}
:::shape{shape="rect" variant="primary"}
:::
:::text{style="h2" variant="inverse" hAlign="center" vAlign="middle"}
Section Title
:::
:::
```

---

## Next Steps

- [Creating Components](../extending/creating-components.md) -- Build custom components with the component registry
