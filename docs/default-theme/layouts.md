# Layouts

`tycoslide-theme-default` provides three layouts registered with `layoutRegistry`. Each layout defines a slide structure and its accepted frontmatter parameters.

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

### Replacing the master

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
