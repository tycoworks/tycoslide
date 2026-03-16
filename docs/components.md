# Components

Components are the building blocks of tycoslide presentations. All built-in components come from `tycoslide-components` and are re-exported by themes. For the default theme's token values, see [`theme.ts`](../packages/theme-default/src/theme.ts).

## How Components Work

Components are used in markdown in two ways.

### Markdown syntax

Some components have their own markdown syntax. For example, images:

```markdown
![Architecture diagram](./assets/diagram.png)
```

Use markdown syntax when default parameters are sufficient.

### Directive syntax

All components share a common `:::` syntax that gives access to parameters:

```markdown
:::card{title="Feature Name"}
Description of the feature.
:::
```

Use directive syntax when you need to set parameters or when the component has no markdown shorthand.

A directive has three parts:

- **Name** — `:::card` identifies which component to use. The `:::` markers delimit the component in markdown.
- **Parameters** — `title` configures the component. Parameters are passed in curly braces using `key="value"` syntax. Boolean and numeric values are still quoted: `columns="3"`.
- **Body content** — the text between the fences. Some components use the body as primary content (e.g., `quote`, `testimonial`), some treat it as a file path (e.g., `image`), and some ignore it.

---

## Component Summary

### Content Components

| Component | Description | Syntax |
|-----------|-------------|--------|
| [card](#card) | Content card with optional image, title, and description | `:::card` |
| [quote](#quote) | Blockquote with optional attribution line | `:::quote` |
| [testimonial](#testimonial) | Quote card with optional image and attribution | `:::testimonial` |
| [table](#table) | Native PowerPoint table with header support | `\| table \|` or `:::table` |
| [image](#image) | Embedded image | `![alt](path)` or `:::image` |
| [mermaid](#mermaid) | Auto-themed Mermaid diagram rendered as PNG | `:::mermaid` |
| [code](#code) | Syntax-highlighted code block rendered as PNG | Fenced code block or `:::code` |
| [line](#line) | Horizontal or vertical rule | `:::line` |
| [shape](#shape) | Filled/outlined area shape | `:::shape` |
| [text](#text) | Single paragraph of formatted text with heading style support | Markdown and TypeScript |
| [plainText](#plaintext) | Unformatted text for titles, captions, and attributions | TypeScript only |
| [list](#list) | Bullet and numbered lists | Markdown and TypeScript |
| [slideNumber](#slidenumber) | Slide number element | TypeScript only |

### Layout Components

| Component | Description |
|-----------|-------------|
| [row](#row) | Horizontal flex container — children side by side |
| [column](#column) | Vertical flex container — children stacked top to bottom |
| [stack](#stack) | Z-order overlay — layer text over a background shape |
| [grid](#grid) | Equal-column grid — uniform width for all children |

Layout components are TypeScript DSL only. They are not available as markdown directives.

---

## Content Components

## text

A single paragraph of formatted content: bold, italic, strikethrough, underline, hyperlinks, and accent colors. Headings in markdown (`# Heading`) also become text with the appropriate heading style (H1–H4). Use `text()` in layouts for content that includes formatting — for example, a card description where the author might write `**bold**` or `:blue[highlighted]`. No `:::text` directive — use `text()` in TypeScript.

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `color` | string | Default text color |
| `style` | TextStyleName | Default text style |
| `linkColor` | string | Hyperlink text color (6-character hex) |
| `linkUnderline` | boolean | Whether hyperlinks are underlined |
| `hAlign` | HorizontalAlignment | Default horizontal alignment |
| `vAlign` | VerticalAlignment | Default vertical alignment |
| `accents` | Record\<string, string\> | Accent color map (name → hex) |
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

### Formatting

Supports `**bold**`, `*italic*`, `[hyperlinks](url)`, `~~strikethrough~~`, `++underline++`, and `:accent[colored text]`.

Use the `:name[text]` syntax to apply accent colors inline:

```markdown
Normal text with :blue[blue highlight] and :green[green highlight].
```

The default theme provides `blue`, `green`, `red`, `yellow`, and `purple`. Custom themes can define any accent names. See [Themes](./themes.md) for details.

### Examples

```typescript
text("**Bold** and :blue[highlighted]", tokens.body)
text("Section heading", tokens.h3)
```

---

## plainText

Text rendered exactly as written, without markdown parsing. Unlike `text()`, which parses bold, italic, links, and accent colors, `plainText()` takes a string and renders it exactly as written. Use it for titles, eyebrow labels, captions, and attribution lines — content that comes from a fixed string or frontmatter parameter. Available in the TypeScript DSL only.

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `style` | TextStyleName | Text style |
| `color` | string | Text color |
| `hAlign` | HorizontalAlignment | Horizontal alignment |
| `vAlign` | VerticalAlignment | Vertical alignment |
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

### Examples

```typescript
plainText("ARCHITECTURE", tokens.eyebrow)
plainText(props.label, tokens.label)
```

---

## list

Renders bullet or numbered lists with support for formatting. No `:::list` directive — markdown lists become list nodes automatically. In the TypeScript DSL, use `list()` directly.

### Examples

```markdown
- First item with **bold** text
- Second item with :blue[accent color]
- Third item
```

```markdown
1. Step one
2. Step two
3. Step three
```

```typescript
list(['First item', 'Second item', '**Bold** third item'], tokens.list)
list(['Step one', 'Step two'], tokens.list, true)
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `ordered` | boolean | Numbered list instead of bullets (default: `false`) |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `color` | string | Default text color |
| `style` | TextStyleName | Default text style |
| `linkColor` | string | Hyperlink text color (6-character hex) |
| `linkUnderline` | boolean | Whether hyperlinks are underlined |
| `hAlign` | HorizontalAlignment | Default horizontal alignment |
| `vAlign` | VerticalAlignment | Default vertical alignment |
| `accents` | Record\<string, string\> | Accent color map (name → hex) |
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

---

## card

Content card with an optional image, title, and description. Renders as a rounded rectangle with configurable background.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | string | Card title (formatting supported) |
| `description` | string | Description text (or use body content) |
| `image` | string | Path to image file |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `background` | ShapeTokens | Background shape (optional — omit to render without background) |
| `padding` | number | Inner padding (inches) |
| `gap` | GapSize | Gap between title and description |
| `hAlign` | HorizontalAlignment | Content horizontal alignment |
| `vAlign` | VerticalAlignment | Content vertical alignment |
| `title` | TextTokens | Title text tokens |
| `description` | TextTokens | Description text tokens |

`ShapeTokens` includes `fill`, `fillOpacity`, `borderColor`, `borderWidth`, `cornerRadius`, and optional `shadow`. See [`theme.ts`](../packages/theme-default/src/theme.ts) for default values.

### Examples

```markdown
:::card{title="Feature Name"}
Description of the feature.
:::
```

```markdown
:::card{title="With Image" image="./assets/diagram.png"}
Supporting detail text.
:::
```

---

## quote

Blockquote with optional attribution line. Renders as a left accent bar with quote text alongside.

Quote text is required -- provide it either via the `quote` attribute or as body content.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `quote` | string | Quote text (or use body content) |
| `attribution` | string | Attribution line |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `bar` | LineTokens | Accent bar style (color, width, dash type) |
| `gap` | GapSize | Gap between bar and text, and between quote and attribution |
| `quote` | TextTokens | Quote text tokens |
| `attribution` | PlainTextTokens | Attribution text tokens |

### Examples

```markdown
:::quote{attribution="— Sarah Chen, Design Lead"}
Consistent formatting saved us hours of manual review.
:::
```

---

## table

Native PowerPoint table with borders, cell merging, and text wrapping.

Cell content supports formatting (`**bold**`, `*italic*`, `:accent[color]`).

Markdown tables render automatically with one header row. The `:::table` directive adds header column support and theme variants.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `headerColumns` | number | Number of header columns (default: 0) |

### Examples

```markdown
| Feature      | Basic | Pro   |
|--------------|-------|-------|
| Storage      | 10GB  | 100GB |
| Users        | 1     | 10    |
| Support      | Email | 24/7  |
```

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

A horizontal or vertical rule. Supports arrows with `beginArrow` / `endArrow` for flow diagrams.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `beginArrow` | ArrowType | Arrow at start (`none`, `arrow`, `diamond`, `oval`, `stealth`, `triangle`) |
| `endArrow` | ArrowType | Arrow at end (same values as `beginArrow`) |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `color` | string | Line color |
| `width` | number | Line width in points |
| `dashType` | DashType | Dash pattern |
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

### Example

```markdown
:::line
:::
```

---

## shape

A shape with configurable fill and border.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `shape` | ShapeName | Shape type (**required**) -- e.g. `rect`, `roundRect`, `ellipse` |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `fill` | string | Fill color (6-character hex with `#` prefix) |
| `fillOpacity` | number | Fill opacity (0--1) |
| `borderColor` | string | Border color (6-character hex with `#` prefix) |
| `borderWidth` | number | Border width in points |
| `cornerRadius` | number | Corner radius in inches |
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

### Example

```markdown
:::shape{shape="roundRect"}
:::
```

---

## slideNumber

Displays the current slide number. Used in the default master slide footer. Themes place this in the master layout — authors do not add it to individual slides.

No directive parameters.

---

## image

Embeds an image. In markdown syntax, the path goes in the URL position. In the directive form, the path goes in the body.

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

### Examples

```markdown
![Architecture diagram](./assets/diagram.png)
```

```markdown
:::image
./assets/diagram.png
:::
```

Paths starting with `$` reference theme-bundled assets. See the [theme source](../packages/theme-default/src/theme.ts) for available asset keys.

File paths resolve relative to the working directory where the CLI runs.

---

## mermaid

Renders a Mermaid diagram to PNG and embeds it as an image. Theme colors are applied automatically.

`style`, `classDef`, `linkStyle`, and `%%{init}` directives are not supported -- the theme handles all styling automatically.

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `shadow` | Shadow | Drop shadow (optional — omit to suppress) |

See [`theme.ts`](../packages/theme-default/src/theme.ts) for the full mermaid token reference (colors, font, accent opacity).

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

## code

Syntax-highlighted code block rendered as a PNG image. Fenced code blocks in markdown (` ```language `) are rendered automatically. The language identifier after the opening fences is required.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `language` | string | Language identifier (**required**) -- e.g. `typescript`, `python`, `sql` |

The content is the source code. In markdown, this is the content between the fences. In the DSL, pass it as the first argument to `code()`.

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `background` | ShapeTokens | Background shape (fill, border, corner radius, optional shadow) |
| `padding` | number | Inner padding (inches) |
| `textStyle` | TextStyleName | Code font style |
| `textColor` | string | Default code text color |

`ShapeTokens` includes `fill`, `fillOpacity`, `borderColor`, `borderWidth`, `cornerRadius`, and optional `shadow`. See [`theme.ts`](../packages/theme-default/src/theme.ts) for the full code token reference (syntax colors and defaults).

### Examples

````markdown
```sql
SELECT * FROM orders WHERE status = 'active';
```
````

```typescript
code(`SELECT * FROM orders WHERE status = 'active';`, 'sql')
```

---

## testimonial

Quote card with optional image, quote text, and attribution. Renders as a rounded rectangle background (like `card`) with vertically stacked content. Unlike `quote`, which uses a left accent bar on a transparent background, `testimonial` has a filled card background and is designed for grids of customer quotes.

Quote text is required -- provide it either via the `quote` attribute or as body content.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `quote` | string | Quote text (**required** unless body content provided) |
| `attribution` | string | Attribution line, e.g. "-- Jane Smith, CTO" |
| `image` | string | Path to image/logo displayed above the quote |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `background` | ShapeTokens | Background shape (optional — omit to render without background) |
| `padding` | number | Inner padding (inches) |
| `gap` | GapSize | Gap between content sections |
| `hAlign` | HorizontalAlignment | Content horizontal alignment |
| `vAlign` | VerticalAlignment | Content vertical alignment |
| `quote` | TextTokens | Quote text tokens |
| `attribution` | PlainTextTokens | Attribution text tokens |

`ShapeTokens` includes `fill`, `fillOpacity`, `borderColor`, `borderWidth`, `cornerRadius`, and optional `shadow`. See [`theme.ts`](../packages/theme-default/src/theme.ts) for default values.

### Examples

```markdown
:::testimonial{attribution="— Jane Smith, CTO"}
This changed everything for us.
:::
```

```markdown
:::testimonial{attribution="— Jane Smith, CTO" image="./assets/logo.png"}
This changed everything for us.
:::
```

---

## Layout Components

Layout components are TypeScript DSL only — they control structure and arrangement in theme layout render functions.

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

```typescript
row({ gap: GAP.NORMAL, vAlign: VALIGN.TOP },
  card({ title: 'Left', description: 'Left content.' }, tokens.card),
  card({ title: 'Right', description: 'Right content.' }, tokens.card),
)
```

---

## column

Vertical flex container. Children are stacked top to bottom. Same parameters as [row](#row).

### Example

```typescript
column({ gap: GAP.TIGHT },
  text('Context', tokens.body),
  quote({ attribution: '— Sarah Chen', quote: 'Automating the review cycle freed up two days per sprint.' }, tokens.quote),
)
```

---

## stack

Z-order overlay container. All children occupy the same bounds; the first child renders behind, the last child renders in front.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `width` | `fill` \| `hug` | Width sizing (default: `fill`) |
| `height` | `fill` \| `hug` | Height sizing (default: `hug`) |

### Example

```typescript
stack({ height: SIZE.FILL },
  shape(tokens.background, { shape: SHAPE.RECT }),
  text('White text over blue background', tokens.body),
)
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

```typescript
grid(3,
  card({ title: 'One', description: 'First.' }, tokens.card),
  card({ title: 'Two', description: 'Second.' }, tokens.card),
  card({ title: 'Three', description: 'Third.' }, tokens.card),
)
```

---

## Creating Custom Components

Custom components add new content types to tycoslide, so authors can use them in markdown the same way as built-in components. They work in both markdown and the TypeScript DSL, and get their styling tokens from the theme.

### Component Registration

Components are defined with `defineComponent()` and registered with `componentRegistry.register()`. Defining a component does not register it. Registration is a separate step, done by the theme entry point.

```typescript
import { defineComponent, componentRegistry, component, param, token, schema } from 'tycoslide';
import { plainText } from 'tycoslide-components';
import type { InferParams, InferTokens, TextStyleName } from 'tycoslide';

const badgeParams = param.shape({
  label: param.required(schema.string()),
});

const badgeTokens = token.shape({
  backgroundColor: token.required<string>(),
  textColor: token.required<string>(),
  textStyle: token.required<TextStyleName>(),
});

export type BadgeTokens = InferTokens<typeof badgeTokens>;

// 1. Define the component (pure factory -- no side effects)
export const badgeComponent = defineComponent({
  name: 'badge',
  params: badgeParams,
  tokens: badgeTokens,
  render: (params, _content, _context, tokens) => {
    return plainText(params.label, { color: tokens.textColor, style: tokens.textStyle });
  },
});

// 2. Register (theme entry point does this)
componentRegistry.register(badgeComponent);
```

Each built-in component exports its definition object (e.g., `cardComponent`, `textComponent`, `codeComponent`) alongside its DSL function. Theme entry points collect these into a `components` array and register them. `componentRegistry.register()` accepts either a single definition or an array. See [Themes -- Theme Entry Point](./themes.md#registering-layouts-in-themes).

#### Overload Patterns

`defineComponent()` has three forms depending on what inputs the component takes:

| Pattern | Description |
|---------|-------------|
| `{ name, content: schema.string(), params?, tokens, render }` | Content component — has primary content (string or other scalar). Auto-generates directive deserializer. |
| `{ name, children: true, tokens, render }` | Container component — receives compiled `SlideNode[]` as content. DSL only. |
| `{ name, params?, tokens, render }` | Params-only component — no primary content. Supports directive if params are declared. |

### Component Structure

```typescript
{
  name: string;
  content?: schema.string() | schema.array(...);  // Primary content
  params?: param.shape({ ... });                   // Validated input params
  tokens: token.shape({ ... });                    // Theme-injected styling
  children?: true;                                 // Container — receives SlideNode[]
  render: (params, content, context, tokens) => SlideNode;
}
```

### Defining Parameters

Declare parameters with `param.shape()`. Required params are validated at build time:

```typescript
import { param, schema } from 'tycoslide';
import type { InferParams } from 'tycoslide';

const myParams = param.shape({
  title: param.required(schema.string()),                          // Required string
  description: param.optional(schema.string()),                    // Optional string
  size: param.required(schema.enum(['small', 'medium', 'large'])), // Enum
  count: param.optional(schema.number()),                          // Optional number
  enabled: param.optional(schema.boolean()),                       // Optional boolean
});

export type MyParams = InferParams<typeof myParams>;
```

### Token System

#### Declaring Tokens

Declare tokens with `token.shape()`. Use `token.required<T>()` for tokens the theme must always provide, and `token.optional<T>()` for tokens that may be omitted to suppress a feature. `InferTokens<>` derives the TypeScript type from the shape:

```typescript
import { token } from 'tycoslide';
import type { InferTokens, TextStyleName } from 'tycoslide';

const badgeTokens = token.shape({
  backgroundColor: token.required<string>(),
  textColor: token.required<string>(),
  textStyle: token.required<TextStyleName>(),
});

export type BadgeTokens = InferTokens<typeof badgeTokens>;

const badgeComponent = defineComponent({
  name: 'badge',
  params: badgeParams,
  tokens: badgeTokens,
  render: (params, _content, _context, tokens) => {
    return plainText(params.label, { color: tokens.textColor, style: tokens.textStyle });
  },
});
```

#### Providing Tokens in a Theme

Token values are set in the theme's layout token maps. The layout render function receives resolved tokens and passes them to components:

```typescript
// In a layout render function:
render: ({ title, cards }, _slots, tokens: CardsLayoutTokens) => {
  const built = cards.map(c => component(Component.Card, c, undefined, tokens.card));
  // ...
}
```

For how to define token maps in a theme, see [Themes — Overriding Layout Tokens](./themes.md#overriding-layout-tokens). Missing tokens are caught at build time.

### Content Slots

Container components accept children (compiled `SlideNode[]`) instead of scalar content. Declare `children: true` to enable this mode. The compiled markdown body is passed as the second argument to `render`.

```typescript
const calloutComponent = defineComponent({
  name: 'callout',
  params: param.shape({ title: param.required(schema.string()) }),
  children: true,
  tokens: token.shape({}),
  render: (params, children, _context, _tokens) => {
    return column(
      text(params.title, titleTokens),
      column(...children)
    );
  },
});
```

**Usage in Markdown:**

```markdown
:::callout{title="Important"}
This is the body content.

- It can have bullets
- And other markdown
:::
```

**Container components are markdown-accessible by default** — the body is compiled and passed as children. Set `directive: false` to suppress markdown access. Built-in containers (row, column, stack, grid) use `directive: false`.

### Variants

Variants apply different visual styles to the same layout structure — different colors, fonts, or spacing without changing the arrangement of elements. Variant is a slide-level setting in frontmatter, not a component parameter.

```markdown
---
layout: statement
variant: hero
---
```

Use a variant when the visual values differ. Use a different layout when the structure changes. See [Themes — Variants System](./themes.md#variants-system) for defining variants in a theme.

### Complete Example: Metric Component

Display a large metric value with a label and optional change indicator:

```typescript
import { defineComponent, componentRegistry, component, param, token, schema } from 'tycoslide';
import { column, plainText } from 'tycoslide-components';
import type { PlainTextTokens } from 'tycoslide-components';
import type { GapSize, InferParams, InferTokens } from 'tycoslide';

// 1. Declare params and tokens
const metricParams = param.shape({
  value: param.required(schema.string()),
  label: param.required(schema.string()),
  change: param.optional(schema.string()),
});

const metricTokens = token.shape({
  value: token.required<PlainTextTokens>(),
  label: token.required<PlainTextTokens>(),
  change: token.required<PlainTextTokens>(),
  positiveColor: token.required<string>(),
  negativeColor: token.required<string>(),
  gap: token.required<GapSize>(),
});

export type MetricParams = InferParams<typeof metricParams>;
export type MetricTokens = InferTokens<typeof metricTokens>;

// 2. Define component
export const metricComponent = defineComponent({
  name: 'metric',
  params: metricParams,
  tokens: metricTokens,
  render: (params, _content, _context, tokens) => {
    const elements = [
      plainText(params.value, tokens.value),
      plainText(params.label, tokens.label),
    ];

    if (params.change) {
      const isPositive = params.change.startsWith('+');
      const changeTokens = {
        ...tokens.change,
        color: isPositive ? tokens.positiveColor : tokens.negativeColor,
      };
      elements.push(plainText(params.change, changeTokens));
    }

    return column({ gap: tokens.gap }, ...elements);
  },
});

// 3. Register (theme entry point does this)
componentRegistry.register(metricComponent);

// 4. Export DSL function — tokens passed by caller
export function metric(params: MetricParams, tokens: MetricTokens) {
  return component('metric', params, undefined, tokens);
}
```

**Usage in Markdown:**
```markdown
:::metric{value="$2.4M" label="Revenue" change="+15%"}
:::
```

**Wiring tokens in a layout:** Provide token values when calling the component from a layout render function. Define the metric token object in the layout's token map and pass it through:

```typescript
render: ({ metrics }, _slots, tokens: MyLayoutTokens) => {
  return masteredSlide(
    ...metrics.map(m => metric(m, tokens.metric)),
  );
}
```

The layout's token map entry for `metric` holds the `MetricTokens` object. The theme sets these values in `theme.layouts[layoutName].variants[variantName]`.

### TypeScript DSL Functions

DSL functions are how you use components from TypeScript. All built-in DSL functions are exported from `tycoslide-components`:

```typescript
import { text, plainText, list, card, quote, testimonial, table, image, mermaid, code } from 'tycoslide-components';
import { row, column, stack, grid } from 'tycoslide-components';
import { line, shape, slideNumber } from 'tycoslide-components';
import { TEXT_STYLE, GAP, SIZE, SHAPE, HALIGN, VALIGN } from 'tycoslide';

// Lists
list(["First item", "Second **bold** item", "Third item"], tokens.list)         // Unordered
list(["Step one", "Step two"], tokens.list, true)                               // Ordered

// Table (data array + options)
table([
  ['Name', 'Role'],
  ['Alice', 'Engineer'],
], { headerRows: 1 })

// Image
image('./path/to/image.png')

// Shape (tokens first, then params)
shape(tokens.background, { shape: SHAPE.ROUND_RECT })

// Containers
column({ gap: GAP.NORMAL }, ...)
row({ gap: GAP.NORMAL }, ...)
grid(3, ...)
stack(backgroundNode, foregroundNode)
```

Components like `text`, `plainText`, `card`, and `quote` require a token argument. In layout render functions, tokens come from the layout's token map:

```typescript
text(slots.body, tokens.bodyText)
plainText(params.title, tokens.headerTitle)
card({ title: params.cardTitle }, tokens.card)  // params, then tokens
```

Custom components export their own DSL functions using `component()` from `tycoslide`:

```typescript
import { component } from 'tycoslide';

export function metric(params: MetricParams, tokens: MetricTokens) {
  return component('metric', params, undefined, tokens);
}
```

### Render Function

Every component has a render function that turns its params and content into renderable output — text, images, shapes, or containers.

```typescript
render: (params, content, context, tokens) => {
  return primitiveNode;
}
```

**Parameters:**
- `params` — Validated directive attributes, typed by the `params` shape.
- `content` — Primary content: a scalar value for content components, `SlideNode[]` for container components, `undefined` for params-only components.
- `context` — Render context: `{ theme, assets?, canvas }`
- `tokens` — Token values provided by the caller (layout render function or DSL user). `undefined` if the component declared no tokens.

**Return:** A `SlideNode` — either a primitive node (text, image, shape, container) or another component node for composition. Component nodes are further rendered by the registry.

#### Canvas

`context.canvas` lets you draw custom visuals by rendering HTML to a PNG image. Use it when a component needs visuals that PowerPoint does not support natively — syntax highlighting, diagrams, or custom layouts.

```typescript
const pngPath = await context.canvas.renderHtml(html, transparent?);
```

The first argument is a complete HTML document string. The optional second argument controls background transparency (default: `false`). The return value is a file path to the rendered PNG, suitable for use as an `ImageNode.src`. All theme fonts are automatically available in the HTML document — reference them by name exactly as defined in `FontFamily.name`. The rendered PNG is only valid for the duration of the build; do not store the returned path beyond the render function's lifetime.

The [mermaid](#mermaid) and [code](#code) components use Canvas internally. Those implementations serve as reference for components that render HTML to PNG.

### Testing Components

```typescript
import { Presentation, componentRegistry } from 'tycoslide';
import { theme } from 'tycoslide-theme-default';
import { column } from 'tycoslide-components';
import { metricComponent } from './my-component';

componentRegistry.register(metricComponent);
const pres = new Presentation(theme);

pres.add({
  content: column(
    metric({ value: "$2.4M", label: "Revenue" }, tokens.metric),
    metric({ value: "150K", label: "Users", change: "+25%" }, tokens.metric)
  ),
});

await pres.writeFile("component-test.pptx", { outputDir: "./build" });
```
