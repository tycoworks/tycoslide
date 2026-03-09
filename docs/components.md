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
| [quote](#quote) | Blockquote with optional attribution and image | `:::quote` |
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

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `style` | TextStyleName | Override text style (`h1`--`h4`, `body`, `small`, `eyebrow`, `footer`) |
| `hAlign` | `left` \| `center` \| `right` | Horizontal alignment |
| `vAlign` | `top` \| `middle` \| `bottom` | Vertical alignment |
| `color` | string | Text color (6-character hex, DSL only) |
| `lineHeightMultiplier` | number | Line height multiplier (DSL only) |
| `linkColor` | string | Hyperlink text color (6-character hex, DSL only) |
| `linkUnderline` | boolean | Whether hyperlinks are underlined (DSL only) |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `color` | string | Default text color |
| `style` | TextStyleName | Default text style |
| `lineHeightMultiplier` | number | Default line height multiplier |
| `linkColor` | string | Hyperlink text color (6-character hex) |
| `linkUnderline` | boolean | Whether hyperlinks are underlined |

### Formatting

Supports `**bold**`, `*italic*`, `[hyperlinks](url)`, `~~strikethrough~~`, `++underline++`, and `:accent[colored text]`.

Use the `:name[text]` syntax to apply accent colors inline:

```markdown
Normal text with :blue[blue highlight] and :green[green highlight].
```

The default theme provides `blue`, `green`, `red`, `yellow`, and `purple`. Custom themes can define any accent names. See [Themes](./themes.md) for details.

### Examples

```typescript
text("**Bold** and :blue[highlighted]")
text("Custom styled", { style: TEXT_STYLE.H3, color: '#FF0000' })
```

---

## plainText

Text rendered exactly as written, without markdown parsing. Unlike `text()`, which parses bold, italic, links, and accent colors, `plainText()` takes a string and renders it exactly as written. Use it for titles, eyebrow labels, captions, and attribution lines — content that comes from a fixed string or frontmatter parameter. Available in the TypeScript DSL only.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `style` | TextStyleName | Override text style (`h1`--`h4`, `body`, `small`, `eyebrow`, `footer`) |
| `color` | string | Text color (6-character hex) |
| `lineHeightMultiplier` | number | Line height multiplier |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `style` | TextStyleName | Default text style |
| `color` | string | Default text color |
| `lineHeightMultiplier` | number | Default line height multiplier |

### Examples

```typescript
plainText("ARCHITECTURE", { style: TEXT_STYLE.EYEBROW })
plainText(props.label, { style: tokens.labelStyle, color: tokens.labelColor })
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
list(['First item', 'Second item', '**Bold** third item'])
list(['Step one', 'Step two'], { ordered: true })
list(['Item with :blue[accent]'], { color: '#0066CC' })
```

### Parameters

| Prop | Type | Description |
|------|------|-------------|
| `ordered` | boolean | Numbered list instead of bullets (default: `false`) |
| `style` | TextStyleName | Override text style |
| `color` | string | Text color (6-character hex) |
| `hAlign` | `left` \| `center` \| `right` | Horizontal alignment |
| `vAlign` | `top` \| `middle` \| `bottom` | Vertical alignment |
| `lineHeightMultiplier` | number | Line height multiplier |
| `linkColor` | string | Hyperlink text color (6-character hex) |
| `linkUnderline` | boolean | Whether hyperlinks are underlined |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `color` | string | Default text color |
| `style` | TextStyleName | Default text style |
| `lineHeightMultiplier` | number | Default line height multiplier |
| `linkColor` | string | Hyperlink text color (6-character hex) |
| `linkUnderline` | boolean | Whether hyperlinks are underlined |

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
| `padding` | number | Inner padding (inches) |
| `cornerRadius` | number | Corner radius (inches) |
| `backgroundColor` | string | Background fill color |
| `backgroundOpacity` | number | Background opacity (0--100) |
| `borderColor` | string | Border color |
| `borderWidth` | number | Border width (pt) |
| `titleStyle` | TextStyleName | Title text style |
| `titleColor` | string | Title text color |
| `titleLineHeightMultiplier` | number | Title line height multiplier |
| `titleLinkColor` | string | Title hyperlink color |
| `titleLinkUnderline` | boolean | Title hyperlink underline |
| `descriptionStyle` | TextStyleName | Description text style |
| `descriptionColor` | string | Description text color |
| `descriptionLineHeightMultiplier` | number | Description line height multiplier |
| `descriptionLinkColor` | string | Description hyperlink color |
| `descriptionLinkUnderline` | boolean | Description hyperlink underline |
| `gap` | GapSize | Gap between title and description |
| `hAlign` | HorizontalAlignment | Content horizontal alignment |
| `vAlign` | VerticalAlignment | Content vertical alignment |

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

Blockquote with optional attribution line and optional image/logo. Renders as a rounded rectangle with configurable background.

Quote text is required -- provide it either via the `quote` attribute or as body content.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `quote` | string | Quote text (or use body content) |
| `attribution` | string | Attribution line |
| `image` | string | Path to logo/image shown above quote |

### Tokens

| Token | Type | Description |
|-------|------|-------------|
| `barColor` | string | Accent bar color |
| `barWidth` | number | Accent bar width (pt) |
| `quoteStyle` | TextStyleName | Quote text style |
| `quoteColor` | string | Quote text color |
| `quoteLineHeightMultiplier` | number | Quote line height multiplier |
| `quoteLinkColor` | string | Quote hyperlink color |
| `quoteLinkUnderline` | boolean | Quote hyperlink underline |
| `attributionStyle` | TextStyleName | Attribution text style |
| `attributionColor` | string | Attribution text color |
| `attributionLineHeightMultiplier` | number | Attribution line height multiplier |
| `gap` | GapSize | Gap between quote and attribution |

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

The following properties are available in the TypeScript DSL only (not in directive syntax):

| Param | Type | Description |
|-------|------|-------------|
| `fill` | string | Fill color (6-character hex with `#` prefix) |
| `fillOpacity` | number | Fill opacity (0--1) |
| `borderColor` | string | Border color (6-character hex with `#` prefix) |
| `borderWidth` | number | Border width in points |
| `borderTop` | boolean | Show top border only |
| `borderRight` | boolean | Show right border only |
| `borderBottom` | boolean | Show bottom border only |
| `borderLeft` | boolean | Show left border only |
| `cornerRadius` | number | Corner radius in inches |

When any `borderTop`/`borderRight`/`borderBottom`/`borderLeft` prop is set, only the specified sides render a border.

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

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `alt` | string | Alt text for the image |

### Examples

```markdown
![Architecture diagram](./assets/diagram.png)
```

```markdown
:::image{alt="Architecture diagram"}
./assets/diagram.png
:::
```

Paths starting with `$` reference theme-bundled assets. See the [theme source](../packages/theme-default/src/theme.ts) for available asset keys.

File paths resolve relative to the working directory where the CLI runs.

---

## mermaid

Renders a Mermaid diagram to PNG and embeds it as an image. Theme colors are applied automatically.

`style`, `classDef`, `linkStyle`, and `%%{init}` directives are not supported -- the theme handles all styling automatically.

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

## code

Syntax-highlighted code block rendered as a PNG image. Fenced code blocks in markdown (` ```language `) are rendered automatically. The language identifier after the opening fences is required.

See [`theme.ts`](../packages/theme-default/src/theme.ts) for code component token keys and defaults.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `language` | string | Language identifier (**required**) -- e.g. `typescript`, `python`, `sql` |

The `body` contains the source code. In markdown, this is the content between the fences. In the DSL, pass it as the first argument to `code()`.

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
| `padding` | number | Inner padding (inches) |
| `cornerRadius` | number | Corner radius (inches) |
| `backgroundColor` | string | Background fill color |
| `backgroundOpacity` | number | Background opacity (0--100) |
| `borderColor` | string | Border color |
| `borderWidth` | number | Border width (pt) |
| `quoteStyle` | TextStyleName | Quote text style |
| `quoteColor` | string | Quote text color |
| `quoteLineHeightMultiplier` | number | Quote line height multiplier |
| `quoteLinkColor` | string | Quote hyperlink color |
| `quoteLinkUnderline` | boolean | Quote hyperlink underline |
| `attributionStyle` | TextStyleName | Attribution text style |
| `attributionColor` | string | Attribution text color |
| `attributionLineHeightMultiplier` | number | Attribution line height multiplier |
| `attributionHAlign` | HorizontalAlignment | Attribution horizontal alignment |
| `gap` | GapSize | Gap between content sections |
| `hAlign` | HorizontalAlignment | Content horizontal alignment |
| `vAlign` | VerticalAlignment | Content vertical alignment |

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
  card({ title: 'Left' }, 'Left content.'),
  card({ title: 'Right' }, 'Right content.'),
)
```

---

## column

Vertical flex container. Children are stacked top to bottom. Same parameters as [row](#row).

### Example

```typescript
column({ gap: GAP.TIGHT },
  text('Context'),
  quote({ attribution: '— Sarah Chen' }, 'Automating the review cycle freed up two days per sprint.'),
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
  shape({ shape: SHAPE.RECT, fill: '#0066CC' }),
  text('White text over blue background'),
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
  card({ title: 'One' }, 'First.'),
  card({ title: 'Two' }, 'Second.'),
  card({ title: 'Three' }, 'Third.'),
)
```

---

## Creating Custom Components

Custom components add new content types to tycoslide, so authors can use them in markdown the same way as built-in components. They work in both markdown and the TypeScript DSL, and get their styling tokens from the theme.

### Component Registration

Components are defined with `defineComponent()` and registered with `componentRegistry.register()`. Defining a component does not register it. Registration is a separate step, done by the theme entry point.

```typescript
import { defineComponent, componentRegistry, component, schema } from 'tycoslide';
import { text } from 'tycoslide-components';

// 1. Define the component (pure factory -- no side effects)
export const badgeComponent = defineComponent({
  name: 'badge',
  params: {
    label: schema.string(),
  },
  tokens: ['backgroundColor', 'textColor', 'textStyle'],
  expand: (props, context, tokens) => {
    return text(props.label, {
      style: tokens.textStyle,
      color: tokens.textColor,
    });
  },
});

// 2. Register (theme entry point does this)
componentRegistry.register(badgeComponent);
```

Each built-in component exports its definition object (e.g., `cardComponent`, `textComponent`, `codeComponent`) alongside its DSL function. Theme entry points collect these into a `components` array and register them. `componentRegistry.register()` accepts either a single definition or an array. See [Themes -- Theme Entry Point](./themes.md#registering-layouts-in-themes).

#### Overload Patterns

`defineComponent()` has five forms depending on what inputs the component takes:

| Pattern | Description |
|---------|-------------|
| `{ name, body: schema.string(), expand }` | Single body text, no named params |
| `{ name, body, params: {...}, expand }` | Body text plus additional named attributes |
| `{ name, params: {...}, expand }` | Multiple named attributes, no primary body |
| `{ name, slots: ['children'], expand }` | Body compiled as `ComponentNode[]`. Set `directive: false` to suppress markdown access. |
| `{ name, expand }` | TypeScript DSL only — no markdown directive |

### Component Structure

```typescript
{
  name: string;           // Unique component name
  params?: SchemaShape;   // Zod schema for directive attributes
  body?: ZodType;         // Schema for body content (e.g., schema.string())
  tokens?: string[];      // Token keys this component needs (provided by the layout's token map)
  slots?: string[];       // Named content slots (for container components)
  expand: Function;       // Expansion to primitives
}
```

### Defining Parameters

Define parameters using the validation helpers from `tycoslide`. Required params without `.optional()` are validated at build time:

```typescript
import { schema } from 'tycoslide';

params: {
  title: schema.string(),                          // Required string
  description: schema.string().optional(),         // Optional string
  size: schema.enum(['small', 'medium', 'large']), // Enum
  count: schema.number(),                          // Number
  enabled: schema.boolean(),                       // Boolean
}
```

### Token System

#### Declaring Tokens

Components declare required token keys by name. The theme supplies values for those keys through layout token maps. When a component is given explicit props in markdown (e.g., `color`), those props override the token values:

```typescript
const BADGE_TOKEN = {
  BACKGROUND_COLOR: 'backgroundColor',
  TEXT_COLOR: 'textColor',
  TEXT_STYLE: 'textStyle',
} as const;

export type BadgeTokens = {
  [BADGE_TOKEN.BACKGROUND_COLOR]: string;
  [BADGE_TOKEN.TEXT_COLOR]: string;
  [BADGE_TOKEN.TEXT_STYLE]: TextStyleName;
};

const badgeComponent = defineComponent({
  name: 'badge',
  params: { label: schema.string() },
  tokens: Object.values(BADGE_TOKEN),
  expand: (props, context, tokens: BadgeTokens) => {
    return text(props.label, {
      style: tokens.textStyle,
      color: tokens.textColor,
    });
  },
});
```

#### Providing Tokens in a Theme

Token values are set in the theme's layout token maps. The layout render function receives resolved tokens and passes them to components:

```typescript
// In a layout render function:
render: ({ title, cards }, tokens: CardsLayoutTokens) => {
  const built = cards.map(c => component(Component.Card, c, tokens.card));
  // ...
}
```

For how to define token maps in a theme, see [Themes — Overriding Layout Tokens](./themes.md#overriding-layout-tokens). Missing tokens are caught at build time.

### Content Slots

Slots let authors put markdown inside a component. The component defines the slot; the slide author fills it with markdown. Use slots when your component wraps markdown content rather than fixed parameters — authors write freeform content inside the directive.

```typescript
const calloutComponent = defineComponent({
  name: 'callout',
  params: { title: schema.string() },
  slots: ['children'],
  tokens: [],
  expand: (props, context, tokens) => {
    return column(
      text(props.title, { style: TEXT_STYLE.H3 }),
      column(...props.children)
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

The `children` slot receives the compiled content as an array of `ComponentNode[]`.

**Slotted components are markdown-accessible by default** — the body is compiled and passed to the first slot. Components with multiple named slots must be used via the TypeScript DSL, where each slot is passed as a separate prop. Built-in containers (row, column, stack, grid) opt out of markdown access with `directive: false`.

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
import { defineComponent, componentRegistry, component, schema } from 'tycoslide';
import { column, text, plainText } from 'tycoslide-components';
import type { TextStyleName, GapSize } from 'tycoslide';

// 1. Define token constants and types
const METRIC_TOKEN = {
  VALUE_STYLE: 'valueStyle',
  VALUE_COLOR: 'valueColor',
  LABEL_STYLE: 'labelStyle',
  LABEL_COLOR: 'labelColor',
  CHANGE_STYLE: 'changeStyle',
  POSITIVE_COLOR: 'positiveColor',
  NEGATIVE_COLOR: 'negativeColor',
  GAP: 'gap',
} as const;

export type MetricTokens = {
  valueStyle: TextStyleName;
  valueColor: string;
  labelStyle: TextStyleName;
  labelColor: string;
  changeStyle: TextStyleName;
  positiveColor: string;
  negativeColor: string;
  gap: GapSize;
};

// 2. Define component
export const metricComponent = defineComponent({
  name: 'metric',
  params: {
    value: schema.string(),
    label: schema.string(),
    change: schema.string().optional(),
  },
  tokens: Object.values(METRIC_TOKEN),
  expand: (props, context, tokens: MetricTokens) => {
    const elements = [
      plainText(props.value, { style: tokens.valueStyle, color: tokens.valueColor }),
      plainText(props.label, { style: tokens.labelStyle, color: tokens.labelColor }),
    ];

    if (props.change) {
      const isPositive = props.change.startsWith('+');
      elements.push(
        plainText(props.change, {
          style: tokens.changeStyle,
          color: isPositive ? tokens.positiveColor : tokens.negativeColor,
        })
      );
    }

    return column({ gap: tokens.gap }, ...elements);
  },
});

// 3. Register (theme entry point does this)
componentRegistry.register(metricComponent);

// 4. Export DSL function — tokens passed by caller
export function metric(props: MetricProps, tokens: MetricTokens) {
  return component('metric', props, tokens);
}
```

**Usage in Markdown:**
```markdown
:::metric{value="$2.4M" label="Revenue" change="+15%"}
:::
```

**Wiring tokens in a layout:** Provide token values when calling the component from a layout render function. Define the metric token object in the layout's token map and pass it through:

```typescript
render: ({ metrics }, tokens: MyLayoutTokens) => {
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
list(["First item", "Second **bold** item", "Third item"])       // Unordered
list(["Step one", "Step two"], { ordered: true })                 // Ordered

// Table (data array + options)
table([
  ['Name', 'Role'],
  ['Alice', 'Engineer'],
], { headerRows: 1 })

// Image
image('./path/to/image.png')

// Shape
shape({ shape: SHAPE.ROUND_RECT, fill: '#FF0000', cornerRadius: 0.1 })

// Containers
column({ gap: GAP.NORMAL }, ...)
row({ gap: GAP.NORMAL }, ...)
grid(3, ...)
stack(backgroundNode, foregroundNode)
```

Components like `text`, `plainText`, `card`, and `quote` require a token argument. In layout render functions, tokens come from the layout's token map:

```typescript
text(props.body, tokens.bodyText)
plainText(props.title, tokens.headerTitle)
card({ title: props.cardTitle }, tokens.card)
```

Custom components export their own DSL functions using `component()` from `tycoslide`:

```typescript
import { component } from 'tycoslide';

export function metric(props: MetricProps, tokens: MetricTokens) {
  return component('metric', props, tokens);
}
```

### Expansion Function

Every component has an expand function that turns its props into renderable output — text, images, shapes, or containers.

```typescript
expand: (props, context, tokens) => {
  return primitiveNode;
}
```

**Parameters:**
- `props` — Validated component properties. Includes `body` if a body schema is defined, or parsed directive body.
- `context` — Expansion context: `{ theme, assets?, canvas }`
- `tokens` — Token values provided by the caller (layout render function or DSL user). Present only if the component declared tokens; `undefined` otherwise.

**Return:** A `SlideNode` — either a primitive node (text, image, shape, container) or another component node for composition. Component nodes are further expanded by the registry.

#### Canvas

`context.canvas` lets you draw custom visuals by rendering HTML to a PNG image. Use it when a component needs visuals that PowerPoint does not support natively — syntax highlighting, diagrams, or custom layouts.

```typescript
const pngPath = await context.canvas.renderHtml(html, transparent?);
```

The first argument is a complete HTML document string. The optional second argument controls background transparency (default: `false`). The return value is a file path to the rendered PNG, suitable for use as an `ImageNode.src`. All theme fonts are automatically available in the HTML document — reference them by name exactly as defined in `FontFamily.name`. The rendered PNG is only valid for the duration of the build; do not store the returned path beyond the expand function's lifetime.

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
    metric({ value: "$2.4M", label: "Revenue" }),
    metric({ value: "150K", label: "Users", change: "+25%" })
  ),
});

await pres.writeFile("component-test.pptx", { outputDir: "./build" });
```
