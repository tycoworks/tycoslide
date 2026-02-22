# tycoslide

A build system for branded presentations. tycoslide compiles TypeScript or Markdown into measured, positioned, native PowerPoint files — treating marketing content like code.

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

**Extensible.** The component system is the framework's extension point. External developers can register custom content and layout components without modifying framework source or needing type casts.

**Fail fast.** Invalid layouts, missing tokens, overflow errors, and malformed markdown all throw at build time with actionable error messages. Silent fallbacks are bugs.

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
npx tycoslide build deck.md -o deck.pptx          # Build a single deck
```

## Monorepo Structure

tycoslide is an npm workspaces monorepo with two packages:

- **`packages/core`** (npm name: `tycoslide`) — The framework
- **`packages/theme-default`** (npm name: `tycoslide-theme-default`) — Default theme with Inter font, Material Design icons, three layouts

When consuming tycoslide from another project (e.g., a theme), `package.json` points `main` at `dist/index.js`. Always rebuild before running slides.

**Cross-project builds:** Themes use TypeScript project references. From a theme directory:

```bash
npx tsc --build      # Rebuilds tycoslide (if changed) then the theme
```

## Key Paths

- `packages/core/src/core/` — Types, component registry, renderer, PPTX generation
- `packages/core/src/dsl/` — Component implementations (card, table, text, image, etc.)
- `packages/core/src/layout/` — HTML measurement via Playwright, flex layout pipeline
- `packages/core/src/markdown/` — Markdown document compiler (slot compiler, slide parser)
- `packages/core/test/` — Tests (uses `node:test`, NOT vitest)
- `packages/core/docs/` — Design documents and feature specs
- `packages/theme-default/` — Default theme package (Inter font, Material Design icons, title/section/body layouts)

## Architecture

```
Markdown or TypeScript DSL
    ↓
Component tree (ComponentNodes)
    ↓ registry.expand() — resolves theme tokens, expands to primitives
Primitive node tree (TextNode, ImageNode, ShapeNode, etc.)
    ↓ layoutHtml.tsx — generates HTML, measures via Playwright
Measured + positioned nodes
    ↓ pptxRenderer — generates native PowerPoint objects
.pptx file
```

## Component System

Two registration methods enforce the content/layout split at compile time:

- **`defineContent()`** — Content components (card, table, image, etc.). Get a `.schema` for YAML validation and a `.deserialize` for `:::directive` support in markdown. Accepts `ContentComponentName`.
- **`defineLayout()`** — Layout/container components (row, column, stack, grid). Programmatic only, no schema or directive support. Accepts `LayoutComponentName`.

Each component declares:
- A **name** — built-in names from `Component.*` const objects (`core/types.ts`), or any string for custom components
- A **Zod schema** for props (validated at compile time)
- **Required tokens** — keys that the theme must provide via `theme.components`, type-constrained to `(keyof TTokens & string)[]`
- An **expand function** that receives props + resolved tokens and returns a primitive node tree

## Spec-Driven Development

Design docs in `docs/` define features with phased implementation plans. When implementing against a design doc:

1. **Read the spec first** — understand the phase requirements, decisions, and constraints before writing code
2. **Execute against the spec** — implement what the doc says, not more
3. **Verify automatically** — after completing implementation, always verify the result against the spec
