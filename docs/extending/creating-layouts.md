# Creating Custom Layouts

Custom layouts define slide structure. Each layout controls where content appears, what frontmatter parameters are accepted, what content slots are available, and how everything is positioned on the slide.

## When to Create Custom Layouts

Create a custom layout when:
- You need a slide structure not provided by the theme you're using
- You have a repeating slide pattern across many presentations
- You want to enforce consistent structure (title placement, eyebrow, content bounds)
- You're building a theme for your organization

## Layout Registration

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

## Layout Structure

```typescript
interface LayoutDefinition {
  name: string;               // Layout name (used in frontmatter)
  description: string;        // Human-readable description
  params: ScalarShape;        // Schema for frontmatter parameters
  slots?: readonly string[];  // Content slot names
  render: (props) => Slide;   // Render function
}
```

## Parameters

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

**Parameter patterns:**

| Helper | Type | Values |
|--------|------|--------|
| `textComponent.schema` | Text content | Same validation as the text component |
| `schema.string()` | Plain string | Any string |
| `schema.number()` | Numeric value | Any number |
| `schema.boolean()` | Boolean | `true` / `false` |
| `schema.enum([...])` | Enumerated values | Declared members |
| `schema.gap()` | Gap size | `none` / `tight` / `normal` / `loose` |
| `schema.hAlign()` | Horizontal alignment | `left` / `center` / `right` |
| `schema.vAlign()` | Vertical alignment | `top` / `middle` / `bottom` |

`textComponent.schema` validates the parameter as text content with the same rules as the text component — it accepts a string that supports inline markdown formatting. Use this for any layout parameter that authors write as human-readable text in frontmatter.

Parameters are validated at build time. Invalid frontmatter values cause build errors.

## Content Slots

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

## TypeScript DSL for Layout Development

Layouts are built by composing functions from `tycoslide-components`.

### Container Functions

```typescript
import { column, row, grid, stack } from 'tycoslide-components';
import { GAP, SIZE, HALIGN, VALIGN } from 'tycoslide';

// Vertical container
column(
  { gap: GAP.NORMAL },
  text("Top"),
  text("Bottom")
)

// Horizontal container
row(
  { gap: GAP.NORMAL, vAlign: VALIGN.TOP },
  card({ title: "Left" }),
  card({ title: "Right" })
)

// Equal-width columns
grid(
  { columns: 3, gap: GAP.NORMAL },
  card({ title: "1" }),
  card({ title: "2" }),
  card({ title: "3" })
)

// Layered overlay
stack(
  shape({ shape: SHAPE.RECT, fill: '#000000' }),
  text("Overlaid", { color: '#FFFFFF' })
)
```

### Text Functions

```typescript
import { text } from 'tycoslide-components';
import { TEXT_STYLE, CONTENT, HALIGN } from 'tycoslide';

// Rich text — default mode (inline bold, italic, :accent[colors])
text("**Bold** and _italic_ text", {
  style: TEXT_STYLE.H1,
  color: '#000000',
  hAlign: HALIGN.CENTER,
})

// Plain text — no parsing, single run (for eyebrows, labels)
text("ARCHITECTURE", {
  content: CONTENT.PLAIN,
  style: TEXT_STYLE.EYEBROW,
})

// Prose — full markdown (bullets, paragraphs, headings)
text("- First item\n- Second item\n\nA paragraph.", {
  content: CONTENT.PROSE,
})
```

### Component Functions

```typescript
import { card, quote, table } from 'tycoslide-components';
import { SIZE } from 'tycoslide';

card({
  title: "Card Title",
  description: "Description",
  image: "./image.png",
  variant: "default",
  height: SIZE.FILL,
})

quote({
  quote: "The quote text",
  attribution: "Author Name",
})

table([
  ["Header 1", "Header 2"],
  ["Cell 1", "Cell 2"],
], { headerRows: 1 })
```

## Render Function

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

## Complete Example: Two-Column Layout

```typescript
import { layoutRegistry, schema, TEXT_STYLE, GAP, SIZE, CONTENT } from 'tycoslide';
import { textComponent, text, row, column } from 'tycoslide-components';

layoutRegistry.define({
  name: 'two-column',
  description: 'Side-by-side content with optional title',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    reverse: schema.boolean().optional(),
  },
  slots: ['left', 'right'],
  render: (props) => {
    const leftColumn = column({ gap: GAP.TIGHT, height: SIZE.FILL }, ...props.left);
    const rightColumn = column({ gap: GAP.TIGHT, height: SIZE.FILL }, ...props.right);

    const columns = props.reverse
      ? row({ gap: GAP.NORMAL }, rightColumn, leftColumn)
      : row({ gap: GAP.NORMAL }, leftColumn, rightColumn);

    return {
      content: column(
        { gap: GAP.NORMAL },
        ...(props.eyebrow ? [text(props.eyebrow, { content: CONTENT.PLAIN, style: TEXT_STYLE.EYEBROW })] : []),
        ...(props.title ? [text(props.title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3 })] : []),
        columns
      ),
    };
  },
});
```

**Usage in Markdown:**

```markdown
---
layout: two-column
title: Before vs After
eyebrow: COMPARISON
---

## Before

- Manual process
- Time consuming
- Error prone

::right::

## After

- Automated
- Fast
- Reliable
```

## Using Masters

Masters define fixed elements that appear on every slide using a layout (footers, logos, page numbers) and set the content bounds — the region where slide content renders.

```typescript
import type { Master, Theme } from 'tycoslide';
import { row, text, slideNumber } from 'tycoslide-components';
import { VALIGN, HALIGN } from 'tycoslide';

const defaultMaster: Master = {
  name: 'default',
  background: '#FFFFFF',
  getContent: (theme: Theme) => ({
    content: row(
      { vAlign: VALIGN.BOTTOM, hAlign: HALIGN.RIGHT },
      slideNumber()
    ),
    contentBounds: {
      x: theme.spacing.margin,
      y: theme.spacing.margin,
      width: theme.slide.width - (theme.spacing.margin * 2),
      height: theme.slide.height - (theme.spacing.margin * 2) - 0.3,
    },
  }),
};

layoutRegistry.define({
  name: 'my-layout',
  description: 'Layout with footer',
  params: { title: textComponent.schema },
  slots: ['body'],
  render: (props) => ({
    master: defaultMaster,
    content: column(
      text(props.title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3 }),
      column({ height: SIZE.FILL }, ...props.body)
    ),
  }),
});
```

**Master components:**
- Fixed footers (slide numbers, logos)
- Headers
- Background elements
- `contentBounds` — defines where the layout's `content` tree renders (x, y, width, height in inches)

`contentBounds` should account for fixed elements. If the master includes a footer bar at the bottom, reduce the `height` accordingly.

## Registering Layouts in Themes

Layouts must be registered before building presentations. The standard pattern is to import the layout file as a side-effect from the theme entry point:

```typescript
// my-theme/layouts.ts
import { layoutRegistry } from 'tycoslide';

layoutRegistry.define({ /* layout 1 */ });
layoutRegistry.define({ /* layout 2 */ });

// my-theme/index.ts
import './layouts';  // Registers layouts via side-effect
import { theme } from './theme';

export { theme };
```

When a user imports the theme, layouts are registered automatically.

## Testing Layouts

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

## Best Practices

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

---

## See Also

- [Default Theme Layouts](../default-theme/layouts.md) — title, section, body layout reference
- [Creating Components](./creating-components.md)
- [Creating Themes](./creating-themes.md)
