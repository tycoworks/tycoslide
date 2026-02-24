# tycoslide

Generate branded PPTX presentations from Markdown or TypeScript. Theme-based styling, parameterized layouts, and 13 built-in components — output opens natively in PowerPoint, Keynote, or Google Slides.

## What is it?

A build system for presentations. tycoslide compiles Markdown or TypeScript into .pptx files with programmatic layout control and theme-based styling.

**Why tycoslide?**
- **Native PowerPoint output** — Recipients can edit slides in PowerPoint, Keynote, or Google Slides without special tools
- **Brand compliance at build time** — Missing tokens, invalid layouts, and content overflow fail the build
- **Markdown authoring** — Write content in Markdown
- **TypeScript API** — Build custom themes and components

**[Read the full introduction →](./docs/guide/introduction.md)** to understand tycoslide's philosophy and how it differs from Slidev, Marp, and Reveal.js.

## Quick Start

Install tycoslide and a theme:

```bash
npm install tycoslide tycoslide-theme-default tycoslide-components
```

Create `slides.md`:

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: My Presentation
subtitle: Built with tycoslide
---

---
layout: body
title: First Slide
eyebrow: INTRODUCTION
---

Your content goes here.
```

Build your presentation:

```bash
npx tycoslide build slides.md
```

Output: `slides.pptx` — ready to open and present.

**[Full quick start guide →](./docs/guide/quick-start.md)**

## Documentation

**Guide:**
- **[Introduction](./docs/guide/introduction.md)** - Philosophy and comparison to other tools
- **[Quick Start](./docs/guide/quick-start.md)** - Build your first presentation
- **[Markdown Syntax](./docs/guide/markdown-syntax.md)** - Markdown syntax reference
- **[Components](./docs/guide/components.md)** - Using built-in components
- **[CLI](./docs/guide/cli.md)** - Command-line tool
- **[Troubleshooting](./docs/guide/troubleshooting.md)** - Common issues and solutions

**Extending:**
- **[Creating Components](./docs/extending/creating-components.md)** - Build custom components
- **[Creating Layouts](./docs/extending/creating-layouts.md)** - Build custom layouts
- **[Creating Themes](./docs/extending/creating-themes.md)** - Build custom themes

**Default Theme:**
- **[Overview](./docs/default-theme/)** - Layouts and components in the default theme
- **[Component Tokens](./docs/default-theme/component-tokens.md)** - Token reference
- **[Layouts](./docs/default-theme/layouts.md)** - Available layouts
- **[Customizing](./docs/default-theme/customizing.md)** - Extending the default theme

## License

[License information]
