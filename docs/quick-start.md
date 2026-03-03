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

This creates `slides.pptx` and a `slides-html/` directory containing a per-slide HTML preview.

## Open the Output

Open `slides.pptx` in PowerPoint, Keynote, or LibreOffice Impress.

## Next Steps

- **Markdown syntax:** See [Markdown Syntax](./markdown-syntax.md)
- **Add components:** See [Components](./components.md)
- **Slide layouts:** See [Layouts](./layouts.md)
- **Customize themes:** See [Themes](./themes.md)
- **CLI options:** See [CLI](./cli.md)
