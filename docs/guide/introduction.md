# What is tycoslide?

A build system for branded presentations. tycoslide compiles TypeScript or Markdown into measured, positioned .pptx files — treating marketing content like code.

## Philosophy

**Content as code.** Presentations are built in CI/CD pipelines, not manually in PowerPoint. tycoslide enforces brand compliance, type safety, and reproducible output. If something is wrong, it fails at build time — not after the deck ships.

**Three personas, strict boundaries:**

| Persona | Works in | Produces | Concerns |
|---------|----------|----------|----------|
| **Designer** | Design tools (Figma, Tokens Studio) | Design tokens, color palettes, typography scales | Visual identity, brand consistency |
| **Developer** | TypeScript | Theme files, layouts, custom components | Structural correctness, component contracts, layout mechanics |
| **Author** | Markdown | Slide decks | Content, narrative, choosing the right layout |

Each layer constrains the next: designers set the visual vocabulary, developers build sanctioned layouts using that vocabulary, authors fill those layouts with content. An author cannot break the brand. A developer cannot override the designer's tokens without editing the theme.

**Theme is the single source of truth.** All visual decisions — colors, typography choices, spacing, component styling — live in the theme file. Components declare what tokens they need; the theme provides them. Missing tokens fail the build immediately. This aligns with the W3C Design Tokens (DTCG) model where the token file is the complete specification. No hidden defaults in framework code.

**Open component registry.** External developers can register custom content and layout components without modifying framework source.

**Fail fast.** Invalid layouts, missing tokens, overflow errors, and malformed markdown all throw at build time with actionable error messages. Silent fallbacks are bugs.

## How is tycoslide different?

### Design Philosophy

tycoslide differs from other tools in three ways:

1. It generates native .pptx files — not HTML exports, not PNG-embedded slides, not LibreOffice conversions. Recipients open the output directly in PowerPoint, Keynote, or Google Slides and can edit it without special tools.
2. It enforces brand compliance at build time through a typed component and token system. Invalid layouts, missing tokens, and overflow errors fail the build rather than silently degrading.
3. It treats presentation authoring as a three-layer system with strict boundaries: designers control tokens, developers build layouts, authors write content. Each layer constrains the next.

| Dimension | tycoslide | Slidev | Marp | Reveal.js |
|-----------|-----------|--------|------|-----------|
| Output format | .pptx (native objects) | HTML (web) | PDF, HTML, .pptx (image-based) | HTML (web) |
| Editable output | Yes (shapes, text, tables) | N/A (web) | No (slides rendered as images) | N/A (web) |
| Input format | Markdown + directives | Markdown + Vue | Markdown | Markdown + HTML |
| Component system | Typed, registry-based | Vue components | CSS themes, Markdown-It plugins | Plugins |
| Design token validation | Build-time errors | No | No | No |
| Live preview | No | Yes | Yes | Yes |

**Slidev** optimizes for web-first presentations with live reload, Vue components, and browser-based interactivity. tycoslide trades the live preview and web delivery for a native .pptx output that recipients can open and edit directly in PowerPoint.

**Marp** converts Markdown to PDF, HTML, and PPTX with a focus on simplicity. Its PowerPoint export renders slides as images rather than native PowerPoint objects, so recipients cannot edit individual text or shapes. tycoslide generates native PowerPoint objects (text boxes, shapes, tables) that recipients can edit directly.

**Reveal.js** creates HTML presentations with rich browser-based interactivity and a mature plugin ecosystem. tycoslide targets editable .pptx output rather than hosted web presentations.

## When to use tycoslide

**Good fit:**
- Corporate presentations with strict brand guidelines
- Marketing decks that need version control and CI/CD
- Sales teams that distribute .pptx files
- Organizations with design token systems
- Teams that want to treat presentations as code

**Not a good fit:**
- Interactive web presentations
- Live coding demonstrations
- Presentations requiring browser-based animations
- Quick, informal slide decks without brand requirements

## Architecture Overview

tycoslide's pipeline runs: Markdown or TypeScript DSL → component tree → primitive node tree (via `registry.expand()`) → measured and positioned nodes (via Playwright-based HTML measurement) → native PowerPoint objects in a .pptx file. See the [main README](../README.md) for full details.

## Next Steps

- **[Quick Start](./quick-start.md)** — Install tycoslide and build your first presentation in 5 minutes
- **[Markdown Syntax](./markdown-syntax.md)** — Learn the markdown syntax for creating slides
- **[Creating Themes](../extending/creating-themes.md)** — Understand the theme system and how to customize themes
- **[Components](./components.md)** — Built-in components and building custom ones
- **[Creating Layouts](../extending/creating-layouts.md)** — Layout system and building custom layouts
