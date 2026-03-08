# What is tycoslide?

A build system for branded presentations. tycoslide compiles TypeScript or Markdown into measured, positioned .pptx files — treating marketing content like code.

tycoslide is in active development. APIs may change between releases.

## Philosophy

**Content as code.** Presentations are built in CI/CD pipelines, not manually in PowerPoint. tycoslide enforces brand compliance, type safety, and reproducible output. If something is wrong, it fails at build time — not after the deck ships.

**Separation of concerns:**

| Persona | Works in | Produces | Concerns |
|---------|----------|----------|----------|
| **Designer** | Design tools (Figma, Tokens Studio) | Design tokens, color palettes, typography scales | Visual identity, brand consistency |
| **Developer** | TypeScript | Theme files, layouts, custom components | Structural correctness, component contracts, layout mechanics |
| **Author** | Markdown | Slide decks | Content, narrative, choosing the right layout |

Each layer constrains the next: designers set the visual vocabulary, developers build sanctioned layouts using that vocabulary, authors fill those layouts with content. An author cannot break the brand. A developer cannot override the designer's tokens without editing the theme.

**Theme is the single source of truth.** All visual decisions — colors, typography, spacing, component styling — live in the theme file. Components declare what tokens they need; the theme provides them. Missing tokens fail the build immediately.

**Open component registry.** External developers can register custom content and layout components without modifying framework source.

**Fail fast.** Invalid layouts, missing tokens, overflow errors, and malformed markdown all throw at build time with actionable error messages.

## How is tycoslide different?

| Dimension | tycoslide | Slidev | Marp | Reveal.js |
|-----------|-----------|--------|------|-----------|
| Output format | .pptx (native objects) | HTML (web) | PDF, HTML, .pptx (image-based) | HTML (web) |
| Editable output | Yes (shapes, text, tables) | N/A (web) | No (slides rendered as images) | N/A (web) |
| Input format | Markdown + directives | Markdown + Vue | Markdown | Markdown + HTML |
| Component system | Typed, registry-based | Vue components | CSS themes, Markdown-It plugins | Plugins |
| Design token validation | Build-time errors | No | No | No |
| Live preview | No | Yes | Yes | Yes |

**Slidev** optimizes for web-first presentations with live reload, Vue components, and browser-based interactivity. tycoslide trades the live preview and web delivery for a native .pptx output that recipients can open and edit directly in PowerPoint.

**Marp** renders slides as images for its PPTX export, so recipients cannot edit individual text or shapes. tycoslide generates native PowerPoint objects (text boxes, shapes, tables) that recipients can edit directly.

**Reveal.js** creates HTML presentations with rich browser-based interactivity and a mature plugin ecosystem. tycoslide targets editable .pptx output rather than hosted web presentations.

## Next Steps

- **[Quick Start](./quick-start.md)** — Install tycoslide and build your first presentation in 5 minutes
- **[Markdown Syntax](./markdown-syntax.md)** — Learn the markdown syntax for creating slides
- **[Themes](./themes.md)** — Theme system, customization, and building themes
- **[Components](./components.md)** — Built-in components and creating custom ones
- **[Layouts](./layouts.md)** — Default layouts and creating custom layouts
