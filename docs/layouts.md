# Layouts

Layouts define the structure and visual arrangement of a slide — where the title goes, where body content renders, and what fixed elements like footers appear. Each layout accepts specific frontmatter parameters and controls how content is positioned on the slide.

This page covers the built-in layouts provided by `tycoslide-theme-default` and how to create custom layouts for your own themes.

## Available Layouts

`tycoslide-theme-default` provides 19 layouts. Custom themes can define their own (see [Creating Custom Layouts](#creating-custom-layouts)).

| Name | Purpose |
|------|---------|
| `title` | Opening slide with large centered title and optional subtitle |
| `section` | Section divider with centered heading |
| `body` | Default content slide with optional title/eyebrow and markdown body |
| `stat` | Big number or key metric with label and optional caption |
| `quote` | Standalone pull quote with accent bar and optional attribution |
| `end` | Closing slide, mirrors the title layout |
| `blank` | No chrome, full canvas for custom content |
| `image` | Full image with title and optional eyebrow |
| `image-left` | Image on left, markdown prose on right |
| `image-right` | Image on right, markdown prose on left |
| `two-column` | Two equal markdown columns with optional header |
| `comparison` | Two columns with individual headers |
| `statement` | Centered body text with optional style and caption |
| `agenda` | Title, optional intro, and bullet list |
| `cards` | Card grid with intro text and optional caption |
| `bio` | Person introduction with photo, name, role, and bio |
| `caption` | Image with caption text below |
| `title-only` | Title bar with empty canvas below |
| `team` | Grid of team members with name, role, and optional photo |

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

Section divider with centered title on a dark background. No body content or master footer.

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

Markdown body with optional title. This is the default layout when no `layout` is specified in frontmatter.

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

The body slot accepts any markdown content: text, bullets, headings, tables, and component directives.

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

::::row{gap="normal"}
:::card{title="Author" height="fill"}
Writes Markdown, chooses layouts.
:::
:::card{title="Developer" height="fill"}
Builds themes and components.
:::
:::card{title="Designer" height="fill"}
Defines tokens and color palettes.
:::
::::
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

No chrome. Full canvas for custom content. No master footer. The `body` slot accepts any markdown.

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

Image on right, markdown prose on left. Slots: `body`.

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

Two columns with individual headers for side-by-side comparisons. Slots: `left`, `right`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |
| `leftTitle` | `string` | Left column header (**required**) |
| `rightTitle` | `string` | Right column header (**required**) |

---

## statement

Centered body text with optional text style and caption.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title (**required**) |
| `eyebrow` | `string` | Small label above the title |
| `body` | `string` | Body text, centered (**required**) |
| `bodyStyle` | `h1 \| h2 \| h3 \| h4 \| body \| small \| eyebrow \| footer` | Text style for the body |
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

## bio

Person introduction with photo, name, role, and bio text. Slots: `body`.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `person` | `string` | Person name (**required**) |
| `role` | `string` | Job title or role |
| `image` | `string` | Path to the person's photo |

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

## team

Grid of team members with name, role, and optional photo. Automatically adjusts columns based on member count.

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Slide title |
| `eyebrow` | `string` | Small label above the title |
| `members` | `object[]` | Array of member objects (each with `name`, `role`, `image`) (**required**) |

Each member object:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Person name (**required**) |
| `role` | `string` | Job title or role |
| `image` | `string` | Path to the person's photo |

---

## Default Master

Most layouts use the `DEFAULT_MASTER`, which adds:

- **Footer row** at the bottom of every slide — `0.25"` tall
  - Left: "Your Company Name" in `footer` style — replace this in your theme's master
  - Right: slide number via the `slideNumber` component
- **Content bounds** — the usable area for slide content, inset by `0.5"` margin on all sides and shrunk by the footer height at the bottom

`title`, `section`, `end`, and `blank` layouts do not use the master — they render without a footer.

---

## Creating Custom Layouts

Custom layouts define slide structure. Each layout controls where content appears, what frontmatter parameters are accepted, what content slots are available, and how everything is positioned on the slide.

### When to Create Custom Layouts

Create a custom layout when:
- You need a slide structure not provided by the theme you're using
- You have a repeating slide pattern across many presentations
- You want to enforce consistent structure (title placement, eyebrow, content bounds)
- You're building a theme for your organization

### Layout Registration

Layouts are defined with `defineLayout()` and registered with `layoutRegistry.register()`:

```typescript
import { defineLayout, schema, TEXT_STYLE, GAP, SIZE, CONTENT } from 'tycoslide';
import { textComponent, text, row, column } from 'tycoslide-components';

export const twoColumnLayout = defineLayout({
  name: 'two-column',
  description: 'Two-column layout for side-by-side content',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
  },
  slots: ['left', 'right'],
  render: (props) => ({
    content: column(
      { gap: GAP.NORMAL },
      ...(props.title ? [text(props.title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3 })] : []),
      row(
        { gap: GAP.NORMAL },
        column(...props.left),
        column(...props.right)
      )
    ),
  }),
});
```

Registration happens in the theme entry point:

```typescript
import { layoutRegistry } from 'tycoslide';
import { twoColumnLayout } from './layouts.js';

layoutRegistry.register(twoColumnLayout);
```

`defineLayout()` is a pure factory — it validates the definition but does not register it. See [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes) for the full pattern.

### Layout Structure

```typescript
interface LayoutDefinition {
  name: string;               // Layout name (used in frontmatter)
  description: string;        // Human-readable description
  params: ScalarShape;        // Schema for frontmatter parameters
  slots?: readonly string[];  // Content slot names
  render: (props) => Slide;   // Render function
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
  align: schema.hAlign().optional(),              // Horizontal alignment enum
}
```

For parameter schema helpers and shared value types, see [Components — Defining Parameters](./components.md#defining-parameters).

`textComponent.schema` validates the parameter as text content with the same rules as the text component — it accepts a string that supports inline markdown formatting. Use this for any layout parameter that authors write as human-readable text in frontmatter.

Parameters are validated at build time. Invalid frontmatter values cause build errors.

### Content Slots

Slots allow markdown body content to be inserted into specific positions in the layout.

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
    text(props.title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3 }),
    column(...props.body)
  ),
})
```

### TypeScript DSL for Layout Development

Layouts are built by composing container functions from `tycoslide-components`. The core pattern is nesting `column` and `row` calls to define structure, then placing content nodes inside them:

```typescript
import { column, row, text } from 'tycoslide-components';
import { GAP, TEXT_STYLE, CONTENT } from 'tycoslide';

column(
  { gap: GAP.NORMAL },
  text("Section Header", { content: CONTENT.PLAIN, style: TEXT_STYLE.EYEBROW }),
  row(
    { gap: GAP.NORMAL },
    column(...props.left),
    column(...props.right)
  )
)
```

For the complete DSL function reference including all content and container components, see [Components — TypeScript DSL Functions](./components.md#typescript-dsl-functions).

### Render Function

The render function receives validated props and returns a Slide object:

```typescript
render: (props) => ({
  master?: Master,          // Master slide (optional)
  background?: string,      // Background color hex (optional)
  notes?: string,           // Speaker notes (optional)
  content: ComponentNode,   // Slide content (required)
})
```

`props` contains all validated frontmatter parameters plus slot arrays. The function must return at minimum a `content` node.

### Real-World Examples

The default theme's `title`, `section`, and `body` layouts in [`packages/theme-default/src/layouts.ts`](../packages/theme-default/src/layouts.ts) demonstrate all of these patterns — params, slots, masters, and composition with DSL functions.

### Using Masters

Masters define fixed elements that appear on every slide using a layout (footers, logos, page numbers) and set the content bounds — the region where slide content renders.

```typescript
import type { Master, Theme } from 'tycoslide';

const myMaster: Master = {
  name: 'default',
  background: '#FFFFFF',
  getContent: (theme: Theme) => ({
    content: /* fixed footer/header nodes */,
    contentBounds: {
      x: theme.spacing.margin,
      y: theme.spacing.margin,
      width: theme.slide.width - (theme.spacing.margin * 2),
      height: theme.slide.height - (theme.spacing.margin * 2) - 0.3,
    },
  }),
};
```

Pass the master in the render function's return value: `render: (props) => ({ master: myMaster, content: ... })`.

**Key concepts:**
- `contentBounds` defines where the layout's `content` tree renders (x, y, width, height in inches)
- `contentBounds` must account for fixed elements — if the master has a footer bar at the bottom, reduce `height` accordingly
- Masters can include slide numbers, logos, headers, and background elements

#### Replacing the Default Master

To customize the footer (company name, logo, colors), create your own master and pass it to your layout definitions:

```typescript
import { HALIGN, VALIGN, TEXT_STYLE, GAP, SIZE, CONTENT, Bounds, type Master, type Theme } from 'tycoslide';
import { row, column, text, slideNumber } from 'tycoslide-components';

const unit = 0.03125;
const FOOTER_HEIGHT = unit * 8; // 0.25"

export const MY_MASTER: Master = {
  name: 'MY_MASTER',
  getContent: (theme: Theme) => {
    const { margin } = theme.spacing;
    const { width, height } = theme.slide;

    const contentBounds = new Bounds(
      margin,
      margin,
      width - margin * 2,
      height - margin * 2 - FOOTER_HEIGHT,
    );

    const content = row(
      { gap: GAP.TIGHT, height: FOOTER_HEIGHT, vAlign: VALIGN.MIDDLE },
      column(
        { width: SIZE.FILL, vAlign: VALIGN.MIDDLE },
        text('Acme Corp', {
          content: CONTENT.PLAIN,
          style: TEXT_STYLE.FOOTER,
          hAlign: HALIGN.LEFT,
          vAlign: VALIGN.MIDDLE,
        }),
      ),
      slideNumber(),
    );

    return { content, contentBounds };
  },
};
```

### Registering Layouts in Themes

Layout files export definition objects created with `defineLayout()`:

```typescript
// my-theme/layouts.ts
import { defineLayout } from 'tycoslide';

export const myLayout = defineLayout({ /* layout definition */ });

export const allLayouts = [myLayout];
```

The theme entry point exports the layouts array. The CLI registers them automatically. See [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes) for the full pattern.

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

Test with minimal content, maximal content, all parameter combinations, and check for overflow.

### Best Practices

**Keep layouts simple:**
- One clear purpose per layout
- Minimal required parameters
- Sensible defaults via optional params

**Use composition:**
- Build from `row`, `column`, `grid`, `stack`, and component functions
- Don't reimplement container logic

**Validate parameters:**
- Use `schema.*` helpers for type safety
- Use `textComponent.schema` for text parameters that authors write in frontmatter
- Document required vs optional in the layout description

**Consider masters:**
- Use masters for consistent footers and headers across slides
- Define `contentBounds` carefully — content that overflows bounds may be clipped
- Account for fixed elements when calculating available content height

**Test thoroughly:**
- Test with minimal content
- Test with maximal content
- Test all parameter combinations
- Check for overflow in constrained slots
