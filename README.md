<p align="center">
  <img src="assets/logo.png" alt="tycoslide — Build slides like software." width="600" />
</p>

Create editable PowerPoint slides from markdown, with TypeScript-based themes and build-time validation.

> **Early release (v0.1.0)** — tycoslide is under active development. The API may change between minor versions.

**Why tycoslide?**
- **Editable PowerPoint slides**: Native .pptx files that open in PowerPoint, Keynote, or Google Slides
- **Pure TypeScript themes**: Design tokens, layouts, and components defined in TypeScript — no CSS needed
- **Build-time validation**: Catches missing tokens, invalid layouts, and content overflow as build errors

**[About tycoslide →](./docs/about.md)** — how it works, how it compares, and FAQs.

## Examples

Slides created from the tycoworks theme:

<table>
<tr>
<td><img src="assets/slide-1.png" alt="Title slide" /></td>
<td><img src="assets/slide-2.png" alt="Agenda slide" /></td>
<td><img src="assets/slide-3.png" alt="Statement slide" /></td>
<td><img src="assets/slide-4.png" alt="Transform slide" /></td>
</tr>
<tr>
<td><img src="assets/slide-5.png" alt="Cards slide" /></td>
<td><img src="assets/slide-6.png" alt="Comparison table slide" /></td>
<td><img src="assets/slide-7.png" alt="Mermaid diagram slide" /></td>
<td><img src="assets/slide-8.png" alt="End slide" /></td>
</tr>
</table>

## Quick Start

Install tycoslide and the tycoworks theme:

```bash
npm install @tycoworks/tycoslide @tycoworks/tycoslide-theme
```

Create `slides.md`:

```markdown
---
theme: @tycoworks/tycoslide-theme
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
