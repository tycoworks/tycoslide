# About tycoslide

tycoslide is a presentation build tool that generates editable PowerPoint slides from markdown, with TypeScript-based themes and build-time validation.

---

## How does it compare to other tools?

| Dimension | tycoslide | Slidev | Marp | Reveal.js |
|-----------|-----------|--------|------|-----------|
| Output format | .pptx (native objects) | HTML, PDF, .pptx (image-based) | PDF, HTML, .pptx (image-based) | HTML, PDF |
| Editable output | Yes (shapes, text, tables) | No (slides rendered as images) | No (slides rendered as images) | N/A (web + PDF) |
| Input format | Markdown + directives | Markdown + Vue | Markdown | Markdown + HTML |
| Component system | Typed, registry-based | Vue components | CSS themes, Markdown-It plugins | Plugins |
| Design token validation | Build-time | No | No | No |
| Live preview | No | Yes | Yes | Yes |

---

## Why PowerPoint? Why not HTML?

PowerPoint is the universal editable format. It opens everywhere, works offline, and can be shared with anyone for last-mile edits. HTML presentations can't do any of that.

tycoslide gives you the content-as-code workflow (version control, automation, build-time validation) without asking anyone to adopt new presentation software.

---

## Why TypeScript for themes? Why not CSS?

CSS has hundreds of properties that can interact in surprising ways. You style one slide and accidentally break another. Your color override doesn't take because something else has higher priority.

tycoslide uses a pure TypeScript layout model with declarative containers and components. It is still a flexbox underneath, but purpose-built for slides, with colors, typography, spacing, and component styling all defined in one place.

---

## What does build-time validation catch?

Layout overflows, missing tokens, and invalid parameters surface at build time. tycoslide is designed to fail fast and loud rather than silently produce broken slides.

---

## How can my team use tycoslide?

A developer typically builds a theme for your organisation in TypeScript, comprising design tokens, layouts, and components. Once the theme is in place, authors can then write slide decks in markdown without touching any code.

---

## Can I reuse my existing design tokens?

tycoslide's token model is designed to align with the W3C Design Token Community Group standard. If your tokens come from Figma, Tokens Studio, or another DTCG-compliant source, they should map naturally to the theme format.

---

## Can I extend it with custom components?

Yes, via the TypeScript DSL. See [Components — Creating Custom Components](./components.md#creating-custom-components).

---

## How does it work under the hood?

tycoslide renders your slides as HTML and CSS, measures the position and size of every element, then rebuilds the layout as native PowerPoint objects (text boxes, shapes, and tables). This relies on a few assumptions about rendering behaviour between HTML and PowerPoint — if you hit any problems, please [open an issue](https://github.com/tycoworks/tycoslide/issues).

---

## Next Steps

- **[Quick Start](./quick-start.md)** — Install tycoslide and build your first presentation
- **[Markdown Syntax](./markdown-syntax.md)** — Learn the essential markdown syntax for authoring
- **[Components](./components.md)** — Built-in components and creating custom ones
- **[Themes](./themes.md)** — Theme system, customization, and building themes
- **[Layouts](./layouts.md)** — Default layouts and creating custom layouts
