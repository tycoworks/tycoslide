# Layouts

Layouts define the structure of a slide — where the title goes, where body content renders, and what fixed elements like footers appear. Each layout accepts specific frontmatter parameters and controls where content sits on the slide. This page covers the built-in layouts from `tycoslide-theme-default` and how to create custom layouts for your own themes.

## Available Layouts

`tycoslide-theme-default` provides 17 layouts. Custom themes can define their own (see [Creating Custom Layouts](#creating-custom-layouts)).

| Name | Purpose |
|------|---------|
| `title` | Opening slide with large centered title and optional subtitle |
| `section` | Section divider with centered heading |
| `body` | Default content slide with optional title/eyebrow and markdown body |
| `stat` | Big number or key metric with label and optional caption |
| `quote` | Standalone pull quote with accent bar and optional attribution |
| `end` | Closing slide, mirrors the title layout |
| `blank` | Full canvas for custom content |
| `image` | Full image with title and optional eyebrow |
| `image-left` | Image on left, markdown prose on right |
| `image-right` | Image on right, markdown prose on left |
| `two-column` | Two equal markdown columns with optional header |
| `comparison` | Two columns with individual headers |
| `statement` | Centered body text with optional caption |
| `agenda` | Title, optional intro, and bullet list |
| `cards` | Card grid with intro text and optional caption |
| `caption` | Image with caption text below |
| `title-only` | Title bar with empty canvas below |

---

## title

Opening slide with large title and optional subtitle, centered on a dark background.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Main title text (**required**) |
| `subtitle` | `string` | Subtitle text below the title |

### Example

```markdown
---
layout: title
title: My Presentation
subtitle: A Brief Overview
---
```

---

## section

Section divider with centered title on a dark background.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Section name (**required**) |

### Example

```markdown
---
layout: section
title: Part 1: Getting Started
---
```

---

## body

Markdown body with optional title. Slides that omit `layout` from their frontmatter use `body` automatically.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title, rendered as `h3` style |
| `eyebrow` | `string` | Small label above the title, rendered in `eyebrow` style |

### Slots

| Slot | Description |
|------|-------------|
| `body` | Main content area — accepts any markdown |

### Markdown body content

The body slot accepts any markdown: text, bullets, headings, tables, and components.

```markdown
---
layout: body
title: Key Features
eyebrow: OVERVIEW
---

tycoslide compiles Markdown to native PowerPoint:

- Brand-compliant output without manual formatting
- Component system for cards, tables, and diagrams
- Fails at build time on invalid content
```

```markdown
---
layout: body
title: Architecture
---

:::card{title="Author"}
Writes Markdown, chooses layouts.
:::

:::card{title="Developer"}
Builds themes and components.
:::

:::card{title="Designer"}
Defines tokens and color palettes.
:::
```

---

## stat

Big number or key metric with label and optional caption.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `value` | `string` | The metric value, rendered as `h1` (**required**) |
| `label` | `string` | Label below the value, rendered as `h3` (**required**) |
| `caption` | `string` | Optional caption below the label |

---

## quote

Standalone pull quote with left accent bar and optional attribution.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `quote` | `string` | Quote text (**required**) |
| `attribution` | `string` | Attribution line below the quote |

---

## end

Closing slide. Mirrors the title layout with centered text on a dark background.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Closing title text (**required**) |
| `subtitle` | `string` | Subtitle text below the title |

---

## blank

Full canvas for custom content. The `body` slot accepts any markdown.

### Parameters

None.

---

## image

Full image with title and optional eyebrow.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |
| `image` | `string` | Path to the image file (**required**) |

---

## image-left

Image on left, markdown prose on right. Slots: `body`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |
| `image` | `string` | Path to the image file (**required**) |

---

## image-right

Mirror of `image-left` — image on right, markdown prose on left. Slots: `body`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |
| `image` | `string` | Path to the image file (**required**) |

---

## two-column

Two equal markdown columns with optional header. Slots: `left`, `right`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |

---

## comparison

Two columns with individual headers for side-by-side comparisons. Unlike `two-column`, which shares a single title across both columns, `comparison` gives each column its own header via `leftTitle` and `rightTitle`. Slots: `left`, `right`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |
| `leftTitle` | `string` | Left column header (**required**) |
| `rightTitle` | `string` | Right column header (**required**) |

---

## statement

Centered body text with optional caption. Use for value propositions and key statements.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |
| `body` | `string` | Body text, centered (**required**) |
| `variant` | `string` | Layout variant (default: `default`). `hero` renders body in `h3` style. See [Themes — Variants](./themes.md#variants-system) |
| `caption` | `string` | Caption below the body text |

---

## agenda

Title, optional intro text, and a bullet list of items.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |
| `intro` | `string` | Introductory text above the list |
| `items` | `string[]` | List of agenda items (**required**) |

### YAML Array Syntax

Array parameters use YAML block sequence syntax:

```markdown
---
layout: agenda
title: Today's Agenda
items:
  - Introduction and context
  - Live demo
  - Q&A
---
```

---

## cards

Card grid with optional intro text and caption. Automatically adjusts columns based on card count.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |
| `intro` | `string` | Introductory text above the cards |
| `cards` | `object[]` | Array of card objects (each with `title`, `description`, `image`) (**required**) |
| `caption` | `string` | Caption below the cards |
| `variant` | `string` | Card variant applied to all cards |

---

## caption

Image with caption text below.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `image` | `string` | Path to the image file (**required**) |
| `caption` | `string` | Caption text below the image (**required**) |

---

## title-only

Title bar with empty canvas below.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |

---

## Masters

Masters control the fixed elements that appear on every slide — footers, slide numbers, background color — and define the content bounds (the rectangle where layout content renders). A layout's available space is whatever the master leaves after accounting for margins and chrome.

The default theme provides two masters:

- **`default`** — footer chrome with company name and slide number. Most content layouts use this master.
- **`minimal`** — margin and background only, no footer. `title`, `section`, `end`, and `blank` layouts use this master.

Each master supports multiple variants. `minimal` provides `default` (white background) and `dark` variants. `title`, `section`, and `end` use `minimal` with the `dark` variant.

---

## Creating Custom Layouts

Custom layouts define slide structure. Each layout controls where content appears, what frontmatter it accepts, what content slots it has, and how everything is positioned.

### Layout Registration

`defineLayout<TTokens>()` creates a layout definition — its name, params, content slots, required tokens, and render function. The type parameter constrains which tokens the theme must supply.

```typescript
import { defineLayout, schema, GAP, SIZE, VALIGN, HALIGN } from 'tycoslide';
import { textComponent, plainText, row, column } from 'tycoslide-components';
import type { PlainTextTokens } from 'tycoslide-components';

type TwoColumnTokens = {
  title: PlainTextTokens;
  eyebrow: PlainTextTokens;
};

export const twoColumnLayout = defineLayout<TwoColumnTokens>({
  name: 'two-column',
  description: 'Two equal markdown columns with optional header.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
  },
  slots: ['left', 'right'],
  tokens: ['title', 'eyebrow'],
  render: ({ title, eyebrow, left, right }, tokens) => ({
    masterName: 'default',
    masterVariant: 'default',
    content: column(
      { gap: GAP.NONE, height: SIZE.FILL },
      ...(title ? [plainText(title, tokens.title)] : []),
      row({ height: SIZE.FILL }, column(...left), column(...right)),
    ),
  }),
});
```

`defineLayout()` is a pure factory — it does not register the layout. See [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes) for the full pattern.

### Layout Structure

```typescript
interface LayoutDefinition {
  name: string;                     // Layout name (used in frontmatter)
  description: string;              // Human-readable description
  params: ScalarShape;              // Schema for frontmatter parameters
  slots?: readonly string[];        // Content slot names
  tokens?: string[];                // Required token keys
  render: (props, tokens) => Slide; // Render with resolved tokens
}
```

### Parameters

Define parameters using `schema` helpers and component schemas:

```typescript
import { schema } from 'tycoslide';
import { textComponent } from 'tycoslide-components';

params: {
  title: textComponent.schema,                    // Required text (validated like text component)
  subtitle: textComponent.schema.optional(),      // Optional text
  reverse: schema.boolean(),                      // Boolean
  columns: schema.number(),                       // Number
}
```

`textComponent.schema` validates the parameter as inline-markdown text — use it for any frontmatter value that authors write as readable text. Use `schema.*` helpers for generic types like booleans, numbers, and enums.

Every component definition exports a `.schema` property — a Zod schema that validates the component's primary input. Layout params can reuse these schemas directly, ensuring the same validation applies whether content comes from frontmatter or a directive:

```typescript
params: {
  title: textComponent.schema,            // Validates as inline-markdown text
  image: imageComponent.schema,           // Validates as an image path or asset ref
  card: cardComponent.schema.optional(),  // Reuses card's full schema, optional
  count: schema.number(),                 // Generic number — no component owns this
}
```

Invalid frontmatter values fail the build.

### Content Slots

Slots let authors place markdown content at specific positions in the layout.

**Declaring slots:**

```typescript
slots: ['body', 'sidebar']
```

**In Markdown**, use `::slotname::` syntax to switch between slots:

```markdown
---
layout: my-layout
title: Title
---

Main body content here.

::sidebar::

Sidebar content here.
```

Content before the first slot marker goes into the first declared slot (or `body` if that name is used).

**In the render function**, slots are available as arrays of `ComponentNode[]`:

```typescript
render: (props) => ({
  content: row(
    column(...props.body),     // Main content
    column(...props.sidebar)   // Sidebar content
  ),
})
```

**Default slot:** If only one content area is needed, name it `body`:

```typescript
slots: ['body'],

render: (props) => ({
  content: column(
    plainText(props.title, { style: TEXT_STYLE.H3 }),
    column(...props.body)
  ),
})
```

### TypeScript DSL for Layout Development

Build layouts by composing container functions from `tycoslide-components` to control how content is arranged on the slide:

```typescript
import { column, row, plainText } from 'tycoslide-components';
import { GAP, TEXT_STYLE } from 'tycoslide';

column(
  { gap: GAP.NORMAL },
  plainText("Section Header", { style: TEXT_STYLE.EYEBROW }),
  row(
    { gap: GAP.NORMAL },
    column(...props.left),
    column(...props.right)
  )
)
```

For the full DSL function reference, see [Components — TypeScript DSL Functions](./components.md#typescript-dsl-functions).

### Render Function

The render function receives validated props and resolved tokens, and returns a Slide object:

```typescript
render: (props, tokens) => ({
  masterName: string,       // Which master to use (required)
  masterVariant: string,    // Which master variant (required)
  background?: string,      // Overrides master background if set
  notes?: string,           // Speaker notes
  content: ComponentNode,   // Slide content (required)
})
```

`props` has all validated frontmatter parameters plus slot arrays. `tokens` has the resolved values for each key in the layout's `tokens` array.

### Real-World Examples

The default theme's `title`, `section`, and `body` layouts in [`packages/theme-default/src/layouts.ts`](../packages/theme-default/src/layouts.ts) demonstrate all of these patterns — params, slots, masters, and composition with DSL functions.

### Using Masters

`defineMaster<TTokens>()` creates a master definition. A master returns fixed chrome elements and the `contentBounds` that tells layouts how much space they have to work with.

```typescript
import { defineMaster, VALIGN, GAP, SIZE, Bounds } from 'tycoslide';
import type { PlainTextTokens, SlideNumberTokens } from 'tycoslide-components';
import { row, column, plainText, slideNumber } from 'tycoslide-components';

interface MyMasterTokens {
  background: string;
  margin: number;
  footerHeight: number;
  footerText: string;
  slideNumber: SlideNumberTokens;
  footer: PlainTextTokens;
}

export const myMaster = defineMaster<MyMasterTokens>({
  name: 'default',
  tokens: ['background', 'margin', 'footerHeight', 'footerText', 'slideNumber', 'footer'],
  getContent: (tokens, slideSize) => {
    const { background, margin, footerHeight } = tokens;
    const contentBounds = new Bounds(
      margin,
      margin,
      slideSize.width - margin * 2,
      slideSize.height - margin * 2 - footerHeight,
    );
    const content = column(
      { height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin },
      row(
        { gap: GAP.TIGHT, height: footerHeight, vAlign: VALIGN.MIDDLE },
        plainText(tokens.footerText, tokens.footer),
        slideNumber(tokens.slideNumber),
      ),
    );
    return { content, contentBounds, background };
  },
});
```

**Key concepts:**
- `contentBounds` defines where layout content renders (x, y, width, height in inches)
- `contentBounds` must account for fixed chrome — reduce height by footer height if a footer bar is present
- `getContent` receives resolved tokens and slide dimensions
- Masters are registered by exporting them from the theme entry point alongside layouts

Masters are registered in the theme entry point and their tokens are provided via `theme.masters`. See [`packages/theme-default/src/master.ts`](../packages/theme-default/src/master.ts) for the complete reference implementation.

### Registering Layouts in Themes

Layout files export definition objects created with `defineLayout()`:

```typescript
// my-theme/layouts.ts
import { defineLayout } from 'tycoslide';

export const myLayout = defineLayout({ /* layout definition */ });

export const allLayouts = [myLayout];
```

The theme entry point exports both a `layouts` array and a `masters` array. The CLI registers them automatically. See [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes) for the full pattern.

### Testing Layouts

**Using Markdown:**

```markdown
---
theme: tycoslide-theme-default
---

---
layout: two-column
title: Test Layout
---

Left content.

::right::

Right content.
```

**Using the TypeScript DSL:**

```typescript
import { Presentation, layoutRegistry } from 'tycoslide';
import { theme, components, layouts } from 'tycoslide-theme-default';
import { componentRegistry } from 'tycoslide';

componentRegistry.register(components);
layoutRegistry.register(layouts);

const pres = new Presentation(theme);

// Add slides programmatically to test DSL usage,
// or use compileDocument() for markdown-based testing.
```
