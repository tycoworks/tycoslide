# Quick Start

Get your first presentation built in 5 minutes.

## Install tycoslide

```bash
npm install tycoslide tycoslide-components tycoslide-theme-default
```

Verify the installation:

```bash
npx tycoslide --version
```

## Create Your First Presentation

Create a file called `slides.md`:

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: Q3 Team Update
subtitle: Engineering & Design
---

---
layout: section
title: Summary
---

---
layout: body
title: What We Shipped
eyebrow: ENGINEERING
---

This slide uses the **body** layout with an eyebrow label, title, and bullet list.

- Migrated auth service to new provider
- Reduced page load time by 400ms
- Shipped dashboard redesign to beta

---
layout: body
title: Team Priorities
eyebrow: NEXT QUARTER
---

Cards display structured content in a grid. Each card has a title and description.

::::grid{columns=3 gap="normal"}
:::card{title="Infrastructure" height="fill"}
Migrate remaining services to new cluster.
:::

:::card{title="Performance" height="fill"}
Target sub-second load times on key pages.
:::

:::card{title="Design System" height="fill"}
Publish component library v2 with tokens.
:::
::::

---
layout: section
title: Questions?
---
```

## Build the Presentation

```bash
npx tycoslide build slides.md
```

This creates `slides.pptx` in the same directory.

## Open the Output

Open `slides.pptx` in PowerPoint, Keynote, or LibreOffice Impress. The output is a native PowerPoint file:

- Title slide, section dividers, and content slides with text, bullets, and cards
- All slides styled from the theme (colors, typography, spacing)
- Editable — no special software needed to view or present
- Version control friendly (source is Markdown)

## Next Steps

- **Markdown syntax:** See [Markdown Syntax](./markdown-syntax.md)
- **Add components:** See [Components](./components.md)
- **Slide layouts:** See [Layouts](../default-theme/layouts.md)
- **Customize themes:** See [Creating Themes](../extending/creating-themes.md)
- **CLI options:** See [CLI](./cli.md)

## Editor Setup (Optional)

Optional editor configuration:

**VS Code:**
- Markdown syntax highlighting (built-in)
- Markdown preview (built-in)
- YAML support for frontmatter

**Other editors:**
- Any editor with Markdown support works fine
- Syntax highlighting for fenced code blocks is helpful
