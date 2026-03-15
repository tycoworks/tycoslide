# tycoslide

Create editable PowerPoint slides from markdown, with TypeScript-based themes and build-time validation.

**Why tycoslide?**
- **Editable PowerPoint slides** — Native .pptx files that open in PowerPoint, Keynote, or Google Slides
- **Pure TypeScript themes** — Design tokens, layouts, and components defined in one place
- **Build-time validation** — Catches missing tokens, invalid layouts, and content overflow as build errors

**[About tycoslide →](./docs/about.md)** — how it works, how it compares, and FAQs.

## Quick Start

Install tycoslide and the default theme:

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

## Community

[Join the Discord](https://discord.gg/r5qCW8aBEy)

## License

[MIT](./LICENSE)
