# tycoslide

See [README.md](README.md) for what this project is.

## About

For design principles and FAQ, see [`docs/about.md`](docs/about.md).

## Build & Test

```bash
# From repo root:
npm run build        # Build all workspaces
npm test             # Run core test suite (node:test, NOT vitest)

# From packages/core/:
npm run build        # Build core only
npm test             # Run tests
npm run typecheck    # Type-check including test files
```

**Building slides from markdown:**

```bash
npx tycoslide build deck.md          # Build a single deck (outputs deck.pptx)
```

## Monorepo Structure

tycoslide is an npm workspaces monorepo with three packages:

- **`packages/core`** (npm: `@tycoworks/tycoslide`) — The framework
- **`packages/components`** (npm: `@tycoworks/tycoslide-components`) — 16 standard components: text, plainText, list, card, quote, testimonial, table, image, mermaid, code, line, shape, slideNumber, row, column, stack, grid
- **`packages/theme-tycoworks`** (npm: `@tycoworks/tycoslide-theme`) — tycoworks theme with Inter font, Material Design icons, 11 layouts

When consuming tycoslide from another project (e.g., a theme), `package.json` points `main` at `dist/index.js`. Always rebuild before running slides.

**Cross-project builds:** Themes use TypeScript project references. From a theme directory:

```bash
npx tsc --build      # Rebuilds tycoslide (if changed) then the theme
```

## Key Paths

- `packages/core/src/core/model/` — Types, schema, nodes, syntax constants
- `packages/core/src/core/rendering/` — Component registry, PPTX renderer, presentation
- `packages/core/src/core/markdown/` — Document compiler, slot compiler, slide parser
- `packages/core/src/core/layout/` — HTML measurement via Playwright, flex layout pipeline
- `packages/core/src/cli/` — CLI entry point, build command, theme loader
- `packages/core/src/utils/` — Shared parser, font utils, image utils, units
- `packages/components/src/` — All 16 component definitions (see Monorepo Structure above)
- `packages/theme-tycoworks/src/` — tycoworks theme (Inter font, Material Design icons, 11 layouts)
- `packages/core/test/` — Tests (uses `node:test`, NOT vitest)

## Architecture

```
Markdown + TypeScript DSL
    ↓
Component tree (ComponentNodes)
    ↓ registry.render() — resolves theme tokens, renders to primitives
Primitive node tree (TextNode, ImageNode, ShapeNode, etc.)
    ↓ measurement.ts / pipeline.ts — generates HTML, measures via Playwright
Measured + positioned nodes
    ↓ pptxRenderer — generates native PowerPoint objects
.pptx file
```

## Component System

Two registries handle component and layout registration:

- **`defineComponent()`** + **`componentRegistry.register()`** — All components (content and container). `defineComponent()` is a pure factory with three patterns:
  - Content: `{ name, content: schema.string(), tokens, render }` — auto-generates directive deserializer
  - Content + params: `{ name, content, params: param.shape({...}), tokens, render }` — content plus extra attributes
  - Children: `{ name, children: true, tokens, render }` — body compiled as ComponentNode[]
- **`defineLayout()`** + **`layoutRegistry.register()`** — Slide layouts. Declares params schema and a render function.

Each component declares:
- A **name** — built-in names from `Component.*` const objects (`packages/components/src/names.ts`), or any string for custom components
- A **params schema** via `param.shape({...})` (validated at compile time)
- **Token shape** via `token.shape({...})` — delivered via `node.tokens` (set by DSL helpers or slot injection from parent layouts)
- A **render function** `(params, content, context, tokens) => SlideNode` that returns a primitive node tree

## Spec-Driven Development

Design docs in `internal/` define features with phased implementation plans. When implementing against a design doc:

1. **Read the spec first** — understand the phase requirements, decisions, and constraints before writing code
2. **Execute against the spec** — implement what the doc says, not more
3. **Verify automatically** — after completing implementation, always verify the result against the spec
