# tycoslide

Generate branded PPTX presentations from Markdown or TypeScript. Theme-based styling, parameterized layouts, and 15 built-in components — output opens natively in PowerPoint, Keynote, or Google Slides.

## What is it?

A build system for presentations. tycoslide compiles Markdown or TypeScript into .pptx files with programmatic layout control and theme-based styling.

**Why tycoslide?**
- **Markdown authoring** — Content as code, version-controlled, reviewable
- **TypeScript themes with build-time validation** — Missing tokens, invalid layouts, and content overflow fail the build
- **Native PowerPoint output** — Editable presentations that open in PowerPoint, Keynote, or Google Slides

**[Read the full introduction →](./docs/introduction.md)** to understand tycoslide's philosophy and how it differs from Slidev, Marp, and Reveal.js.

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

**[Full quick start guide →](./docs/quick-start.md)**

## Documentation

**[Read the documentation →](./docs/)**

Covers markdown syntax, components, layouts, themes, CLI usage, and troubleshooting.

## License

[License information]
