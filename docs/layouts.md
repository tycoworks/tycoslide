# Layouts

Layouts define the structure and visual arrangement of a slide — where the title goes, where body content renders, and what fixed elements like footers appear. Each layout accepts specific frontmatter parameters and controls how content is positioned on the slide.

This page covers the built-in layouts provided by `tycoslide-theme-default` and how to create custom layouts for your own themes.

## Available Layouts

`tycoslide-theme-default` provides three layouts. Custom themes can define their own (see [Creating Custom Layouts](#creating-custom-layouts)).

| Name | Purpose |
|------|---------|
| `title` | Opening or closing slide — large centered title with optional subtitle |
| `section` | Section divider — centered heading, no body content |
| `body` | Default content slide — optional title/eyebrow with a full markdown body |

---

## title

Opening and closing slides. Renders title and optional subtitle centered vertically and horizontally.

### Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `title` | yes | Main title text |
| `subtitle` | no | Subtitle text, rendered below the title in `textMuted` color |

### Example

```markdown
---
layout: title
title: My Presentation
subtitle: A Brief Overview
---
```

```markdown
---
layout: title
title: Thank You
subtitle: Questions?
---
```

---

## section

Section divider. A single centered heading with no body content or master footer.

### Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `title` | yes | Section name |

### Example

```markdown
---
layout: section
title: Part 1: Getting Started
---
```

---

## body

Default content layout. Accepts markdown in the slide body and renders it inside a content area bounded by the default master (footer + margins).

### Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `title` | no | Slide title, rendered as `h3` style |
| `eyebrow` | no | Small label above the title, rendered in `eyebrow` style (uppercased automatically) |

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

## Default Master

All `body` layout slides use the `DEFAULT_MASTER`, which adds:

- **Footer row** at the bottom of every slide — `0.25"` tall
  - Left: "Your Company Name" in `footer` style — replace this in your theme's master
  - Right: slide number via the `slideNumber` component
- **Content bounds** — the usable area for slide content, inset by `0.5"` margin on all sides and shrunk by the footer height at the bottom

`title` and `section` layouts do not use the master — they render without a footer.

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

Layouts are defined using `layoutRegistry.define()`:

```typescript
import { layoutRegistry, schema, TEXT_STYLE, GAP, SIZE, CONTENT } from 'tycoslide';
import { textComponent, text, row, column } from 'tycoslide-components';

layoutRegistry.define({
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

Each layout file calls `layoutRegistry.define()` to register itself:

```typescript
// my-theme/layouts.ts
import { layoutRegistry } from 'tycoslide';

layoutRegistry.define({ /* layout definition */ });
```

For how to package layouts with your theme entry point, see [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes).

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
import { Presentation } from 'tycoslide';
import { theme } from 'tycoslide-theme-default';
import { card } from 'tycoslide-components';
import './my-layouts';  // Register layouts

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
