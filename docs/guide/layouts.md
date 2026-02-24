# Layouts

`tycoslide-theme-default` provides three layouts. These are the layouts that come with the default theme — custom themes can define their own layouts (see [Creating Layouts](../extending/creating-layouts.md)).

## Available Layouts

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
