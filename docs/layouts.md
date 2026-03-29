# Layouts

Layouts define the structure of a slide — where the title goes, where body content renders, and what fixed elements like footers appear. Each layout accepts specific frontmatter parameters and controls where content sits on the slide. Themes package layouts alongside tokens and masters.

---

## Creating Custom Layouts

Custom layouts define slide structure. Each layout controls where content appears, what frontmatter it accepts, what content slots it has, and how everything is positioned.

### Layout Registration

`defineLayout()` creates a layout definition — its name, params, content slots, required tokens, and render function. TypeScript catches missing tokens at compile time.

```typescript
import { defineLayout, param, token, SIZE, type InferTokens } from '@tycoslide/core';
import { textComponent, plainText, row, column } from '@tycoslide/components';
import type { PlainTextTokens } from '@tycoslide/components';

import type { DefaultMasterTokens } from './master.js';
import { MASTER } from './master.js';

const twoColumnTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
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
    masterName: MASTER.DEFAULT,
    masterTokens: tokens.master,
    content: column(
      { spacing: 0, height: SIZE.FILL },
      ...(title ? [plainText(title, tokens.title)] : []),
      row({ spacing: 0, height: SIZE.FILL }, column({ spacing: 0 }, ...left), column({ spacing: 0 }, ...right)),
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
import { param, schema } from '@tycoslide/core';
import { textComponent } from '@tycoslide/components';

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
variant: default
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

Build layouts by composing container functions from `@tycoslide/components` to control how content is arranged on the slide:

```typescript
import { column, row, plainText } from '@tycoslide/components';
column(
  { spacing: tokens.spacing },
  plainText("Section Header", tokens.eyebrow),
  row(
    { spacing: tokens.spacing },
    column({ spacing: 0 }, ...slots.left),
    column({ spacing: 0 }, ...slots.right)
  )
)
```

For the full DSL function reference, see [Components — TypeScript DSL Functions](./components.md#typescript-dsl-functions).

### Render Function

The render function receives validated params, slot arrays, and resolved tokens, and returns a Slide object:

```typescript
render: (params, slots, tokens) => ({
  masterName: string,                    // Which master to use (required)
  masterTokens: Record<string, unknown>, // Master token values (required)
  background?: string,                   // Overrides master background if set
  notes?: string,                        // Speaker notes
  content: ComponentNode,                // Slide content (required)
})
```

`params` holds validated frontmatter parameters. `slots` holds slot content arrays (keyed by slot name). `tokens` holds the resolved values for each key in the layout's `tokens` shape. For slot-less layouts, use `_slots` to indicate the argument is unused.

### Real-World Examples

The default theme's `title`, `section`, and `body` layouts in [`packages/theme-default/src/layouts.ts`](../packages/theme-default/src/layouts.ts) demonstrate all of these patterns — params, slots, masters, and composition with DSL functions.

---

## Masters

Masters control the fixed elements that appear on every slide — e.g. footers, slide numbers, background color — and define the space layouts have to work with. A layout's available space is whatever the master leaves after accounting for margins and fixed elements.

`defineMaster()` creates a master definition. A master returns fixed chrome elements and the `contentBounds` that tells layouts how much space they have to work with.

```typescript
import { defineMaster, token, SIZE, VALIGN, Bounds, type InferTokens } from '@tycoslide/core';
import type { PlainTextTokens, SlideNumberTokens } from '@tycoslide/components';
import { row, column, plainText, slideNumber } from '@tycoslide/components';

const myMasterTokens = token.shape({
  background: token.required<string>(),
  margin: token.required<number>(),
  footerHeight: token.required<number>(),
  footerSpacing: token.required<number>(),
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
      { spacing: 0, height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin },
      row(
        { spacing: tokens.footerSpacing, height: footerHeight, vAlign: VALIGN.MIDDLE },
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

Masters are registered by exporting them from the theme entry point. Master tokens flow through layout token shapes — each layout declares a `master` token typed to its master's token interface.

---

## Registering Layouts in Themes

Layout files export definition objects created with `defineLayout()`:

```typescript
// my-theme/layouts.ts
import { defineLayout } from '@tycoslide/core';

export const myLayout = defineLayout({ /* layout definition */ });

export const allLayouts = [myLayout];
```

The theme entry point exports both a `layouts` array and a `masters` array. The CLI registers them automatically. See [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes) for the full pattern.

---

## Testing Layouts

**Using Markdown:**

```markdown
---
theme: my-theme
---

---
layout: two-column
variant: default
title: Test Layout
---

Left content.

::right::

Right content.
```

**Using the TypeScript DSL:**

```typescript
import { Presentation, layoutRegistry } from '@tycoslide/core';
import { theme, components, layouts } from 'my-theme';
import { componentRegistry } from '@tycoslide/core';

componentRegistry.register(components);
layoutRegistry.register(layouts);

const pres = new Presentation(theme);

// Add slides programmatically to test DSL usage,
// or use compileDocument() for markdown-based testing.
```

---

## Related

- [Components](./components.md) - Component reference and custom components
- [Themes](./themes.md) - Theme structure and token configuration
- [Markdown Syntax](./markdown-syntax.md) - Frontmatter and slide syntax
