# Layouts

Layouts define the structure of a slide — where the title goes, where body content renders, and what fixed elements like footers appear. Each layout accepts specific frontmatter parameters and controls where content sits on the slide. This page covers the built-in layouts from `tycoslide-theme-default` and how to create custom layouts for your own themes.

## Available Layouts

`tycoslide-theme-default` provides 11 layouts. Custom themes can define their own (see [Creating Custom Layouts](#creating-custom-layouts)).

| Name | Purpose |
|------|---------|
| `title` | Opening slide with large centered title and optional subtitle |
| `section` | Section divider with centered heading |
| `body` | Default content slide with optional title/eyebrow and markdown body |
| `stat` | Big number or key metric with label and optional caption |
| `quote` | Standalone pull quote with accent bar and optional attribution |
| `end` | Closing slide, mirrors the title layout |
| `blank` | Full canvas for custom content |
| `two-column` | Two equal markdown columns with optional header |
| `statement` | Centered body text with optional caption |
| `agenda` | Title, optional intro, and bullet list |
| `cards` | Card grid with intro text and optional caption |

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
- Catches invalid content at build time
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


## two-column

Two equal markdown columns with optional header. Slots: `left`, `right`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |

---


## statement

Centered body text with optional caption. Use for value propositions and key statements.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |
| `body` | `string` | Body text, centered (**required**) |
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

---


## Masters

Masters control the fixed elements that appear on every slide — e.g. footers, slide numbers, background color — and define the space layouts have to work with. A layout's available space is whatever the master leaves after accounting for margins and fixed elements.

The default theme provides two masters:

- **`default`** — footer chrome with company name and slide number. Most content layouts use this master.
- **`minimal`** — margin and background only, no footer. `title`, `section`, `end`, and `blank` layouts use this master.

Each master supports multiple variants. `minimal` provides `default` (white background) and `dark` variants. `title`, `section`, and `end` use `minimal` with the `dark` variant.

---

## Creating Custom Layouts

Custom layouts define slide structure. Each layout controls where content appears, what frontmatter it accepts, what content slots it has, and how everything is positioned.

### Layout Registration

`defineLayout()` creates a layout definition — its name, params, content slots, required tokens, and render function. TypeScript catches missing tokens at compile time.

```typescript
import { defineLayout, param, token, GAP, SIZE, type InferTokens } from 'tycoslide';
import { textComponent, plainText, row, column } from 'tycoslide-components';
import type { PlainTextTokens } from 'tycoslide-components';

const twoColumnTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
});

type TwoColumnTokens = InferTokens<typeof twoColumnTokens>;

export const twoColumnLayout = defineLayout({
  name: 'two-column',
  description: 'Two equal markdown columns with optional header.',
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ['left', 'right'],
  tokens: twoColumnTokens,
  render: ({ title, eyebrow }, { left, right }, tokens: TwoColumnTokens) => ({
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
  name: string;                              // Layout name (used in frontmatter)
  description: string;                       // Human-readable description
  params: ScalarShape;                       // Schema for frontmatter parameters
  slots?: readonly string[];                 // Content slot names
  tokens: TokenShape;                        // Required token shape (use {} for no tokens)
  render: (params, slots, tokens) => Slide;  // Render with resolved tokens
}
```

### Parameters

Define parameters using `param` helpers and component schemas:

```typescript
import { param, schema } from 'tycoslide';
import { textComponent } from 'tycoslide-components';

params: {
  title: param.required(textComponent.schema),    // Required text (validated like text component)
  subtitle: param.optional(textComponent.schema), // Optional text
  reverse: param.required(schema.boolean()),      // Boolean
  columns: param.optional(schema.number()),       // Number
}
```

`textComponent.schema` validates the parameter as inline-markdown text — use it for any frontmatter value that authors write as readable text. Use `schema.*` helpers for generic types like booleans, numbers, and enums.

Every component definition exports a `.schema` property — a schema that validates the component's primary input. Layout params can reuse these schemas directly, ensuring the same validation applies whether content comes from frontmatter or a directive:

```typescript
params: {
  title: param.required(textComponent.schema),            // Validates as inline-markdown text
  image: param.required(imageComponent.schema),           // Validates as an image path or asset ref
  card: param.optional(cardComponent.schema),             // Reuses card's full schema, optional
  count: param.required(schema.number()),                 // Generic number — no component owns this
}
```

Invalid frontmatter values are caught at build time.

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

Content before the first slot marker goes into the first declared slot.

**In the render function**, slots are available as arrays of `ComponentNode[]` in the second argument:

```typescript
render: (params, slots) => ({
  content: row(
    column(...slots.body),     // Main content
    column(...slots.sidebar)   // Sidebar content
  ),
})
```

**Default slot:** If only one content area is needed, name it `body`:

```typescript
slots: ['body'],

render: (params, { body }, tokens) => ({
  content: column(
    plainText(params.title, tokens.title),
    column(...body)
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
  plainText("Section Header", tokens.eyebrow),
  row(
    { gap: GAP.NORMAL },
    column(...slots.left),
    column(...slots.right)
  )
)
```

For the full DSL function reference, see [Components — TypeScript DSL Functions](./components.md#typescript-dsl-functions).

### Render Function

The render function receives validated params, slot arrays, and resolved tokens, and returns a Slide object:

```typescript
render: (params, slots, tokens) => ({
  masterName: string,       // Which master to use (required)
  masterVariant: string,    // Which master variant (required)
  background?: string,      // Overrides master background if set
  notes?: string,           // Speaker notes
  content: ComponentNode,   // Slide content (required)
})
```

`params` holds validated frontmatter parameters. `slots` holds slot content arrays (keyed by slot name). `tokens` holds the resolved values for each key in the layout's `tokens` shape. For slot-less layouts, use `_slots` to indicate the argument is unused.

### Real-World Examples

The default theme's `title`, `section`, and `body` layouts in [`packages/theme-default/src/layouts.ts`](../packages/theme-default/src/layouts.ts) demonstrate all of these patterns — params, slots, masters, and composition with DSL functions.

### Using Masters

`defineMaster()` creates a master definition. A master returns fixed chrome elements and the `contentBounds` that tells layouts how much space they have to work with.

```typescript
import { defineMaster, token, GAP, SIZE, VALIGN, Bounds, type InferTokens } from 'tycoslide';
import type { PlainTextTokens, SlideNumberTokens } from 'tycoslide-components';
import { row, column, plainText, slideNumber } from 'tycoslide-components';

const myMasterTokens = token.shape({
  background: token.required<string>(),
  margin: token.required<number>(),
  footerHeight: token.required<number>(),
  footerText: token.required<string>(),
  slideNumber: token.required<SlideNumberTokens>(),
  footer: token.required<PlainTextTokens>(),
});

type MyMasterTokens = InferTokens<typeof myMasterTokens>;

export const myMaster = defineMaster({
  name: 'default',
  tokens: myMasterTokens,
  render: (tokens: MyMasterTokens, slideSize) => {
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
- `render` receives resolved tokens and slide dimensions
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
