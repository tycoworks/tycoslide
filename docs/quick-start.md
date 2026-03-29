# Quick Start

Get your first presentation built in 5 minutes.

## Create a New Project

```bash
mkdir my-slides && cd my-slides
npm init -y
```

## Install tycoslide

```bash
npm install @tycoslide/cli @tycoslide/theme-default
npx playwright-core install chromium
```

Verify the installation:

```bash
npx tycoslide --version
```

## Create Your First Presentation

Create a file called `slides.md`:

```markdown
---
theme: "@tycoslide/theme-default"
---

---
layout: title
variant: default
title: My Presentation
subtitle: Built with tycoslide
---

---
layout: body
variant: default
title: First Slide
eyebrow: INTRODUCTION
---

Your content goes here.

- First point
- Second point
- Third point
```

## Build the Presentation

```bash
npx tycoslide build slides.md
```

Output: `slides.pptx` — ready to open and present. A `slides-build/` directory is also generated with per-slide HTML previews for quick inspection without opening PowerPoint.

## Open the Output

Open `slides.pptx` in PowerPoint, Keynote, or Google Slides.

## See What's Possible

The [showcase example](../examples/showcase.md) demonstrates all built-in layouts and components — title, agenda, statement, cards, comparison tables, mermaid diagrams, and more. Build it the same way:

```bash
npx tycoslide build examples/showcase.md
```

## Next Steps

- **Markdown syntax:** See [Markdown Syntax](./markdown-syntax.md)
- **Add components:** See [Components](./components.md)
- **Slide layouts:** See [Layouts](./layouts.md)
- **Customize themes:** See [Themes](./themes.md)
- **CLI options:** See [CLI](./cli.md)
