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

tycoslide is an npm workspaces monorepo with four packages:

- **`packages/core`** (npm: `@tycoslide/core`) — The framework engine (rendering, layout, model, markdown compilation)
- **`packages/sdk`** (npm: `@tycoslide/sdk`) — SDK with 16 standard components, presets (SlideFormat, Component names, highlighting themes), and theme-authoring helpers
- **`packages/cli`** (npm: `@tycoslide/cli`) — CLI entry point (`tycoslide` binary), build command, theme loader
- **`packages/theme-default`** (npm: `@tycoslide/theme-default`) — Default theme with Inter font and Material Design icons

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
- `packages/cli/src/` — CLI entry point, build command, theme loader
- `packages/core/src/utils/` — Shared parser, font utils, image utils, units
- `packages/sdk/src/components/` — All 16 component definitions
- `packages/sdk/src/presets/` — SlideFormat, Component names, highlighting themes
- `packages/theme-default/src/` — Default theme (Inter font, Material Design icons)
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
- A **name** — built-in names from `Component.*` const objects (`packages/sdk/src/presets/names.ts`), or any string for custom components
- A **params schema** via `param.shape({...})` (validated at compile time)
- **Token shape** via `token.shape({...})` — delivered via `node.tokens` (set by DSL helpers or slot injection from parent layouts)
- A **render function** `(params, content, context, tokens) => SlideNode` that returns a primitive node tree

## Spec-Driven Development

Design docs in `internal/` define features with phased implementation plans. When implementing against a design doc:

1. **Read the spec first** — understand the phase requirements, decisions, and constraints before writing code
2. **Execute against the spec** — implement what the doc says, not more
3. **Verify automatically** — after completing implementation, always verify the result against the spec
