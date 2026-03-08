# What is tycoslide?

A build system for branded presentations. tycoslide compiles TypeScript or Markdown into native .pptx files.

tycoslide is in active development. APIs may change between releases.

## Design Principles

For the ideas behind tycoslide's design — content as code, the three-persona model, and fail-fast validation — see [Design Principles](./design-principles.md).

## How is tycoslide different?

| Dimension | tycoslide | Slidev | Marp | Reveal.js |
|-----------|-----------|--------|------|-----------|
| Output format | .pptx (native objects) | HTML (web) | PDF, HTML, .pptx (image-based) | HTML (web) |
| Editable output | Yes (shapes, text, tables) | N/A (web) | No (slides rendered as images) | N/A (web) |
| Input format | Markdown + directives | Markdown + Vue | Markdown | Markdown + HTML |
| Component system | Typed, registry-based | Vue components | CSS themes, Markdown-It plugins | Plugins |
| Design token validation | Build-time errors | No | No | No |
| Live preview | No | Yes | Yes | Yes |

**Slidev** produces HTML presentations with live reload, Vue components, and browser-based interactivity. tycoslide produces native .pptx files that recipients open and edit in PowerPoint.

**Marp** can export .pptx, but renders each slide as an image — recipients cannot edit text or shapes. tycoslide generates native PowerPoint objects (text boxes, shapes, tables).

**Reveal.js** creates HTML presentations with a plugin ecosystem for browser-based interactivity. tycoslide targets editable .pptx output rather than hosted web presentations.

## Next Steps

- **[Quick Start](./quick-start.md)** — Install tycoslide and build your first presentation in 5 minutes
- **[Markdown Syntax](./markdown-syntax.md)** — Learn the markdown syntax for creating slides
- **[Themes](./themes.md)** — Theme system, customization, and building themes
- **[Components](./components.md)** — Built-in components and creating custom ones
- **[Layouts](./layouts.md)** — Default layouts and creating custom layouts
