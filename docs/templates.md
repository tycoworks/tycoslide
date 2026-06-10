# Templates

Templates are named slide recipes — each one combines a layout, background, and visual tokens into a complete slide design. Authors select templates via `template:` frontmatter. Theme developers define templates using `defineTemplate()`.

## What a Template Contains

A template has four parts:

- **Layout** — spatial blueprint that controls where content goes (params, slots, render function)
- **Background** — slide background (color fill or gradient)
- **Tokens** — all visual values injected into the layout (text styles, colors, spacing, component tokens)
- **Chrome** — fixed elements like footers and margins, composed into the layout via wrapper functions

```typescript
import { defineTemplate } from '@tycoslide/sdk';

defineTemplate({
  name: 'body',
  description: 'Markdown body with optional title. Default layout.',
  layout: withFooterChrome(body, chromeTokens),
  background: tokens.surfaces.elevated,
  tokens: {
    title: tokens.onLight.headings.h3,
    text: tokens.onLight.text,
    list: tokens.onLight.list,
    spacing: 24,
    // component tokens (table, code, mermaid, quote, etc.)
  },
});
```

### Background

Slide background color and opacity. Both fields are optional — omit `background` entirely for a transparent slide.

| Field | Type | Description |
|-------|------|-------------|
| `color` | `string` | 6-character hex color (e.g., `'#1A1A2E'`) |
| `opacity` | `number` | 0 (invisible) to 100 (opaque). Default: 100 |

```typescript
background: { color: '#1A1A2E', opacity: 100 },
```

---

## Layouts

A layout is a spatial blueprint — it defines where content goes without any design tokens. Multiple templates can share the same layout with different token values (e.g., `title` and `title-dark` share the same title layout with light and dark tokens).

### Layout Interface

```typescript
interface Layout<TTokens, TParams, TSlots> {
  params: TParams;
  slots?: TSlots;
  render: (params, slots, tokens: TTokens) => SlideNode;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `params` | `ScalarShape` | Schema for frontmatter parameters |
| `slots` | `readonly string[]` | Content slot names (optional) |
| `render` | `(params, slots, tokens) => SlideNode` | Returns a node tree |

The render function receives validated params, slot content arrays, and resolved tokens. It returns a `SlideNode` — the root of a primitive node tree built with DSL functions.

### Defining a Layout

```typescript
import { param, SIZE, column, row, plainText, textComponent } from '@tycoslide/sdk';

export const body = {
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ['body'] as const,
  render: (params, slots, tokens) => {
    return column(
      { spacing: tokens.spacing, height: SIZE.FILL, vAlign: tokens.vAlign },
      ...(params.eyebrow ? [plainText(params.eyebrow, tokens.eyebrow)] : []),
      ...(params.title ? [plainText(params.title, tokens.title)] : []),
      column({ spacing: tokens.spacing }, ...slots.body),
    );
  },
};
```

---

## Chrome Composition

Chrome — footers, margins, slide numbers — is composed into layouts via wrapper functions. Chrome elements participate in flex layout measurement alongside content.

### withFooterChrome

Wraps a layout with uniform margin padding and a footer row at the bottom:

```typescript
import { withFooterChrome } from './chrome.js';

const chromed = withFooterChrome(body, {
  margin: 48,
  footerHeight: 24,
  bottomPadding: 24,
  footerLogo: assets.logo,
  footerText: 'My Company',
  footerSpacing: 12,
  slideNumber: { style: TEXT_STYLE.FOOTER, color: palette.text.description, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
  footer: { style: TEXT_STYLE.FOOTER, color: palette.text.description, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
  footerImage: {},
});
```

### withMarginChrome

Wraps a layout with uniform padding only — no footer or other fixed elements:

```typescript
import { withMarginChrome } from './chrome.js';

const chromed = withMarginChrome(title, { margin: 48 });
```

### Layers

Chrome elements are tagged with `LAYER.MASTER` so they render on the slide master (shared across slides using the same template). Content renders on `LAYER.CONTENT`. This separation is automatic — chrome composers handle the layer tagging internally.

---

## Parameters

Define parameters using `param` helpers and component schemas:

```typescript
import { param, schema, textComponent, imageComponent } from '@tycoslide/sdk';

params: {
  title: param.required(textComponent.schema),
  subtitle: param.optional(textComponent.schema),
  reverse: param.required(schema.boolean()),
  columns: param.optional(schema.number()),
}
```

`textComponent.schema` validates the parameter as inline-markdown text. Use `schema.*` helpers for generic types (booleans, numbers, enums). Every component definition exports a `.schema` property — layout params can reuse these schemas directly.

Invalid frontmatter values are caught at build time.

---

## Content Slots

Slots let authors place markdown content at specific positions in the layout.

**Declaring slots:**

```typescript
slots: ['body', 'sidebar'] as const,
```

**In Markdown**, use `::slotname::` syntax to switch between slots:

```markdown
---
template: my-layout
title: Title
---

Main body content here.

::sidebar::

Sidebar content here.
```

Content before the first slot marker goes into the first declared slot.

**In the render function**, slots are available as arrays of `SlideNode[]`:

```typescript
render: (params, slots, tokens) => {
  return row(
    column(...slots.body),
    column(...slots.sidebar),
  );
},
```

**Default slot:** If only one content area is needed, name it `body`:

```typescript
slots: ['body'] as const,

render: (params, { body }, tokens) => {
  return column(
    plainText(params.title, tokens.title),
    column(...body),
  );
},
```

---

## TypeScript DSL

Build layouts by composing container functions from `@tycoslide/sdk`:

```typescript
import { column, row, plainText } from '@tycoslide/sdk';

column(
  { spacing: tokens.spacing },
  plainText("Section Header", tokens.eyebrow),
  row(
    { spacing: tokens.spacing },
    column({ spacing: 0 }, ...slots.left),
    column({ spacing: 0 }, ...slots.right),
  ),
)
```

For the full DSL function reference, see [Components — TypeScript DSL Functions](./components.md#typescript-dsl-functions).

---

## Assembling Templates in a Format

Templates are assembled inside a format builder function and returned as part of a `ThemeFormat`. Each template wires a layout (optionally chromed) to a background and tokens:

```typescript
import { defineTemplate, deriveTokens } from '@tycoslide/sdk';
import { withFooterChrome, withMarginChrome } from '../chrome.js';
import { body, title, section } from '../layouts.js';

export function buildPresentationFormat(palette: Palette): ThemeFormat {
  const t = deriveTokens(palette, config);
  const chrome = buildChromeTokens(palette, config);

  return {
    slide: config.slide,
    textStyles: config.textStyles,
    templates: [
      defineTemplate({
        name: 'title',
        description: 'Opening slide with large title.',
        layout: withMarginChrome(title, chrome.margin),
        background: t.surfaces.elevated,
        tokens: { title: t.onLight.headings.h1, subtitle: t.onLight.headings.h3 },
      }),
      defineTemplate({
        name: 'body',
        description: 'Markdown body with optional title.',
        layout: withFooterChrome(body, chrome.footer),
        background: t.surfaces.elevated,
        tokens: { title: t.onLight.headings.h3, text: t.onLight.text, ...componentTokens },
      }),
      // ... more templates
    ],
  };
}
```

See [Themes — Building a Custom Theme](./themes.md#building-a-custom-theme) for the full theme assembly pattern.

---

## Testing Templates

**Using Markdown:**

```markdown
---
theme: my-theme
format: presentation
---

---
template: two-column
title: Test Layout
---

Left content.

::right::

Right content.
```

**Using the TypeScript DSL:**

```typescript
import { Presentation } from '@tycoslide/sdk';
import { theme, components } from 'my-theme';

const pres = new Presentation(theme);
// Add slides programmatically or use compileDocument() for markdown.
```

Test with minimal content first to verify structure, then with all component types to verify token wiring.

---

## Related

- [Themes](./themes.md) - Theme structure and token configuration
- [Components](./components.md) - Component reference and custom components
- [Markdown Syntax](./markdown-syntax.md) - Frontmatter and slide syntax
