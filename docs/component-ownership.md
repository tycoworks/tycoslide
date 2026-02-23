# Component Ownership — Three-Package Architecture

---

## Summary

tycoslide splits into three npm packages:

| Package | npm name | Purpose |
|---------|----------|---------|
| `packages/core` | `tycoslide` | Framework: registry, rendering, layout engine, markdown compiler, schema, types |
| `packages/components` | `tycoslide-components` | Standard component definitions: text, image, card, quote, table, mermaid, containers |
| `packages/theme-default` | `tycoslide-theme-default` | Default theme: colors, tokens, text styles, layouts, master slides, assets |

Dependency graph (strict, no cycles, no cross-package test dependencies):

```
tycoslide-theme-default
    |
    v
tycoslide-components
    |
    v
tycoslide (core)
```

Every package depends only on packages below it. No devDependency exceptions. Core never imports from components or theme. Components never import from theme.

---

## Architectural Decision: Three Packages

### The Custom Theme Story (killer argument)

A custom theme author building `tycoslide-theme-materialized` wants the standard `card` component. With components in theme-default, they must write:

```typescript
import { card } from 'tycoslide-theme-default'; // wrong: theme depends on theme
```

With three packages:

```typescript
import { card } from 'tycoslide-components'; // correct: theme depends on components
```

Both `theme-default` and `theme-materialized` consume the same component library. Neither depends on the other.

### Evidence: Components Are Already Decoupled From Theme

Every component file (`text.ts`, `card.ts`, `quote.ts`, `table.ts`, `primitives.ts`, `containers.ts`, `mermaid.ts`) imports exclusively from `tycoslide` (core) and from sibling component files. Zero imports from `theme.ts`, `assets.ts`, `layouts.ts`, or `master.ts`. The `expand()` functions receive tokens as a parameter from the registry — they never reach into a theme object. The package boundary just needs to match the code boundary that already exists.

### Rationale (unchanged from original design)

1. **No architectural distinction between DSL functions.** Every DSL function follows an identical pattern: register with `componentRegistry.define()`, produce a `ComponentNode`, expand to node types at build time.

2. **Core infrastructure has zero imports from `components/`.** The slot compiler, document compiler, and renderer work entirely through registry dispatch.

3. **The extensibility story has a gap.** Built-in components use internal capabilities (`markdownProcessor`, `dispatchDirective`) that theme authors cannot access. Moving components out forces us to close this gap with a proper Component Author API.

4. **Themes define the vocabulary.** A different tycoslide theme should be able to define `hbox()`/`vbox()` instead of `row()`/`column()`, or use an entirely different compositional model.

5. **Now is the cheapest time.** One theme, one user, zero external consumers.

### What This Is NOT

- **Not a plugin system.** No configuration, lifecycle hooks, or dependency resolution. Components register via import side effects, exactly as today.
- **Not a breaking change to the node types.** The renderer, layout engine, and all 8 `NODE_TYPE` values are unchanged.

---

## Prerequisite: Resolve the Document Component

*(Completed — Phase 0)*

The Document component created circular coupling between `document.ts` and `slotCompiler.ts`. Solution: inline Document's compilation logic into the slot compiler as `compileBareMarkdown()`. Delete `document.ts` and `Component.Document` from the enum.

---

## Component Author API

*(Completed — Phase 1)*

Bundle all markdown processing utilities into a single `markdown` namespace object:

```typescript
export const markdown = {
  parse(content: string): Root { ... },
  extractSource, extractInlineText, extractDirectiveBody,
  dispatchDirective, compileBareMarkdown, SYNTAX,
};
```

Exported from core's barrel alongside `schema` and `component`.

---

## Package Boundaries

### `packages/core` (npm: `tycoslide`)

**Responsibilities:** Node types, registries, expansion engine, markdown pipeline, layout engine, PPTX rendering, schema helpers, markdown toolkit, CLI.

**Source files (unchanged):**
- `src/core/model/` — types, nodes, schema, bounds, syntax
- `src/core/rendering/` — registry, pptxConfigBuilder, pptxRenderer, presentation
- `src/core/layout/` — layoutHtml, measurement, pipeline, validator
- `src/core/markdown/` — slideParser, slotCompiler, documentCompiler, markdown toolkit
- `src/cli/` — build command, theme loader
- `src/utils/` — assets, font, image, log, parser, units
- `src/index.ts` — barrel export

**Test files (in core):**

| Test | Notes |
|------|-------|
| `bounds.test.ts` | No changes |
| `cli.test.ts` | No changes |
| `documentCompiler.test.ts` | Uses `mocks.ts`, `stubComponents.ts` |
| `layoutValidation.test.ts` | Uses `stubComponents.ts` |
| `layoutHtml.test.ts` | **Rewritten** — constructs element nodes directly, no component imports |
| `node.test.ts` | Uses `mocks.ts` |
| `normalizeContent.test.ts` | No component dependency |
| `pptxConfigBuilder.test.ts` | **Unit tests only** — integration tests (lines 982–1053) move to components |
| `registry.test.ts` | Uses `stubComponents.ts`, `mocks.ts` |
| `schema.test.ts` | Uses `stubComponents.ts` |
| `slideParser.test.ts` | No component dependency |
| `slotCompiler.test.ts` | Uses `stubComponents.ts` |
| `textUtils.test.ts` | Uses `mocks.ts` |
| `validator.test.ts` | No component dependency |
| `defineComponent.test.ts` | **Generic API portion only** (lines 1–215) — real component schema tests move to components |
| `stubComponents.ts` | Lightweight stubs for registration |
| `mocks.ts` | Core's own mock theme |

**Dependencies:** No dependency on `tycoslide-components` or `tycoslide-theme-default`, not even as devDependency.

### `packages/components` (npm: `tycoslide-components`) — NEW

**Source files (moved from core's `src/components/`):**
- `src/text.ts` — Text component + `text()` DSL helper
- `src/primitives.ts` — image, line, shape, slideNumber
- `src/containers.ts` — row, column, stack, grid
- `src/card.ts` — card component
- `src/quote.ts` — quote component
- `src/table.ts` — table component
- `src/mermaid.ts` — mermaid component
- `src/index.ts` — barrel export

**Test files:**

| Test | Reason it belongs here |
|------|----------------------|
| `text.test.ts` | Tests text expansion, markdown parsing, accent directives |
| `cardComponent.test.ts` | Tests card expansion, token defaults, theme overrides |
| `quoteComponent.test.ts` | Tests quote expansion, token defaults, theme overrides |
| `mermaid.test.ts` | Tests mermaid expansion, sanitization |
| `dsl.test.ts` | Tests all DSL factory functions |
| `assetResolver.test.ts` | Tests image asset resolution during expansion |
| `tokenResolution.test.ts` | Tests component+token integration: variant selection, overrides, missing token errors |
| `componentSchemas.test.ts` | Real component `.schema` tests (split from defineComponent.test.ts lines 217–301) |
| `pptxIntegration.test.ts` | 3 integration tests extracted from pptxConfigBuilder.test.ts (lines 982–1053) |
| `mocks.ts` | Components' own mock theme (copy of core's) |
| `fixtures/` | test-font.woff2, test-font-bold.woff2, test.png, etc. |

**`package.json`:**
```json
{
  "name": "tycoslide-components",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "tsc --project tsconfig.test.json && tsx --test test/*.test.ts"
  },
  "dependencies": {
    "tycoslide": "*"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.21.0",
    "typescript": "^5.3.0"
  }
}
```

Note: `unified`, `remark-parse`, `remark-directive` are already transitive dependencies from `tycoslide` (core). If the components package needs them directly (e.g. `text.ts` uses `markdown.parse()`), they would be added.

### `packages/theme-default` (npm: `tycoslide-theme-default`) — slimmed down

**Source files:**
- `src/theme.ts` — color palette, spacing, text styles, component token variants
- `src/assets.ts` — font paths, icon paths
- `src/layouts.ts` — layout definitions (imports from `tycoslide-components`)
- `src/master.ts` — master slide definition (imports from `tycoslide-components`)
- `src/index.ts` — barrel export, re-exports from `tycoslide-components`

**`src/index.ts` (after migration):**
```typescript
export { theme } from './theme.js';
export { assets } from './assets.js';
import * as layouts from './layouts.js';
export { layouts };

// Re-export components (side-effect: registers on import)
import * as components from 'tycoslide-components';
export { components };
export * from 'tycoslide-components';
```

**Dependencies:**
```json
{
  "dependencies": {
    "tycoslide": "*",
    "tycoslide-components": "*",
    "@fontsource/inter": "^5.0.0",
    "@material-design-icons/svg": "^0.14.0",
    "@mermaid-js/mermaid-cli": "^11.12.0"
  }
}
```

**Tests:** None currently. Future: layout-level integration tests.

---

## Theme Loader

`loadTheme()` is unchanged. Theme-default re-exports components via `export { components }`. When `loadTheme()` accesses `mod.components`, the re-export triggers component registration via side-effect imports.

---

## Test Strategy

### Zero cross-package test dependencies

Each package's tests import only from:
1. The package's own source (`../src/...`)
2. Packages below it in the dependency graph (`'tycoslide'` for components, `'tycoslide'` + `'tycoslide-components'` for theme)
3. Its own test helpers (`./mocks.js`, `./stubComponents.js`)

### `stubComponents.ts` — lightweight stubs in core

Registers all 13 components with minimal `componentRegistry.define()` calls. Correct names, params, body schemas, tokens, slots. Trivial expand functions that return basic element nodes. Used by:
- `slotCompiler.test.ts` — needs components registered for `compileSlot()` to find handlers
- `schema.test.ts` — needs components for schema tests
- `layoutValidation.test.ts` — needs components for validation
- `registry.test.ts` — needs components for registry API tests

The Text stub does NOT need to produce realistic `NormalizedRun[]` with `breakLine: true`. Those integration tests move to the components package.

### `layoutHtml.test.ts` — plain element nodes

Constructs element node trees directly using local helper functions:

```typescript
function textNode(body: string, props?: Partial<TextNode>): TextNode {
  return { type: NODE_TYPE.TEXT, content: [{ text: body }],
           hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP, ...props };
}

function rowNode(props: Partial<ContainerNode>, ...children: ElementNode[]): ContainerNode {
  return { type: NODE_TYPE.CONTAINER, direction: DIRECTION.ROW, children,
           width: SIZE.FILL, height: SIZE.HUG,
           vAlign: VALIGN.TOP, hAlign: HALIGN.LEFT, ...props };
}
```

No `componentRegistry`, no `expandTree`, no component imports. The system under test is `generateLayoutHTML()` — components were only used as a convenience for creating node trees.

### `mocks.ts` — each package gets its own copy

Core and components each have their own `mocks.ts` with the same `mockTheme()` factory. Intentional duplication for package isolation. Both use the same default token values.

### `defineComponent.test.ts` — split

- **Lines 1–215 (core):** Generic `componentRegistry.define()` API tests using inline test components (`test-params-comp`, `test-body-comp`, etc.). Tests `.schema` generation, Zod validation, deserializer behavior.
- **Lines 217–301 (components as `componentSchemas.test.ts`):** Tests `.schema` properties of real components (`proseComponent.schema`, `cardComponent.schema`, etc.).

### `pptxConfigBuilder.test.ts` — integration tests move out

The 3 integration tests (lines 982–1053) call `prose()` → `componentRegistry.expandTree()` → `builder.buildTextFragments()`. They need real markdown parsing in the text component's expand function. They move to `packages/components/test/pptxIntegration.test.ts`. Requires `PptxConfigBuilder` to be exported from core's barrel.

---

## Migration Plan

### Phase 0: Inline Document into Slot Compiler — DONE

### Phase 1: Create Component Author API — DONE

### Phase 2: Revert Incomplete Work

Revert all code changes from the incomplete Phase 2 attempt (which moved components to theme-default). Start fresh.

### Phase 3: Create `packages/components` Scaffold

1. Create `packages/components/` directory
2. Create `package.json`, `tsconfig.json`, `tsconfig.test.json`
3. Create placeholder `src/index.ts`
4. Update root `tsconfig.json` references
5. Update `packages/theme-default/tsconfig.json` references
6. Run `npm install` from root (workspace linking)
7. Verify `npx tsc --build` succeeds

### Phase 4: Move Component Source Files

1. Move files from `packages/core/src/components/` to `packages/components/src/`
2. Write `packages/components/src/index.ts` barrel
3. Add `"tycoslide-components": "*"` to theme-default's dependencies
4. Update `packages/theme-default/src/index.ts` to import/re-export from `tycoslide-components`
5. Update `layouts.ts` and `master.ts` imports
6. Delete `packages/core/src/components/` directory
7. Remove components barrel from core's `index.ts`
8. Update `loadTheme()` if needed (likely unchanged — theme re-exports handle it)
9. Build all three packages
10. Verify: `npx tsc --build` succeeds

### Phase 5: Move Component Tests to Components Package

1. Create `packages/components/test/`, `test/fixtures/`
2. Copy `mocks.ts` and fixtures
3. Move test files: text, card, quote, mermaid, dsl, assetResolver, tokenResolution
4. Update imports: `'../src/components/X.js'` → `'../src/X.js'`
5. Verify: `npm test` in components and core both pass

### Phase 6: Split defineComponent.test.ts and Move Integration Tests

1. Split defineComponent.test.ts: generic API tests stay in core, component schema tests → `packages/components/test/componentSchemas.test.ts`
2. Extract pptxConfigBuilder integration tests → `packages/components/test/pptxIntegration.test.ts`
3. Export `PptxConfigBuilder` from core's barrel if not already exported
4. Create `packages/core/test/stubComponents.ts` with lightweight stubs
5. Update core test imports to use stubs
6. Verify: all tests pass in both packages

### Phase 7: Rewrite layoutHtml.test.ts

1. Replace all component DSL helper calls with direct element node construction
2. Remove `componentRegistry` and `expandTree` usage
3. Add local builder helpers (`textNode`, `rowNode`, `colNode`, etc.)
4. Verify: all layoutHtml assertions still pass

### Phase 8: Remove `prose()` and `label()` DSL Helpers

1. Remove `prose()` and `label()` function exports from `text.ts`
2. Keep `labelComponent` and `proseComponent` as schema aliases
3. Update callers in `card.ts`, `quote.ts`, `layouts.ts`, `master.ts` to use `text(body, { content: CONTENT.PLAIN|PROSE })`
4. Update test files
5. Remove `prose()` export from `stubComponents.ts` if still present
6. Verify: build and tests pass

### Phase 9: Clean Up

1. Remove empty directories
2. Move `@mermaid-js/mermaid-cli` dependency to theme-default if not already there
3. Verify theme-default is minimal: theme, assets, layouts, master, re-exports
4. Update root `package.json` test script to include components workspace

### Phase 10: Final Verification

1. `npx tsc --build` from root — zero errors
2. `npm test --workspace=packages/core` — all pass
3. `npm test --workspace=packages/components` — all pass
4. Manual smoke test: `npx tycoslide build` on a markdown deck
5. Verify the custom theme story types correctly:
   ```typescript
   import { card, row, column, text } from 'tycoslide-components';
   ```

---

## What Each Package Becomes

```
tycoslide (core)
├── Node types          — What the renderer can draw
├── Registries          — How components and layouts are discovered
├── Markdown pipeline   — How markdown becomes component trees
├── Layout engine       — How component trees become positioned nodes
├── Renderer            — How positioned nodes become PowerPoint
├── schema              — API for defining component props
└── markdown            — API for parsing markdown in components

tycoslide-components
├── Text                — text, prose, label modes
├── Primitives          — image, line, shape, slideNumber
├── Containers          — row, column, stack, grid
├── Card                — title + description + image card
├── Quote               — attribution quote
├── Table               — markdown table
└── Mermaid             — diagram rendering

tycoslide-theme-default
├── Theme               — colors, fonts, spacing, text styles
├── Tokens              — component variant token values
├── Layouts             — title, section, body slide templates
├── Master              — master slide (footer)
└── Assets              — fonts, icons
```

The boundary: **core defines what CAN be drawn; components define what IS drawn; themes define how it LOOKS.**

---

## The `Component` Const and `ComponentTokenMap`

### Component Names

Keep all component name strings in core's `Component` const. Names are just string constants with zero runtime cost. The `ComponentName` type remains open: `BuiltinComponentName | (string & {})`.

### Token Map

Remove content component entries from `ComponentTokenMap` in core. Use declaration merging from the components package (or theme):

```typescript
// packages/components/src/types.ts
declare module 'tycoslide' {
  interface ComponentTokenMap {
    card: CardTokens;
    quote: QuoteTokens;
    table: TableTokens;
    text: TextTokens;
    line: LineTokens;
    shape: ShapeTokens;
    slideNumber: SlideNumberTokens;
  }
}
```

Token interfaces (`CardTokens`, etc.) and token name consts (`CARD_TOKEN`, etc.) stay in core's `types.ts` — pure type definitions with zero runtime cost.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| TypeScript DSL users must change import paths | Theme-default re-exports everything from components. Migration is find-and-replace. |
| Core test suite needs components registered | `stubComponents.ts` with minimal stubs — no cross-package dependency. |
| `compileBareMarkdown` in slotCompiler needs components | Uses `component()` factory + registry dispatch exclusively — zero imports from component files. |
| `@mermaid-js/mermaid-cli` is a heavy dependency | Stays in theme-default (I/O build step, not component logic). |
| One more package to maintain | The boundary already exists in code — the package just formalizes it. One `package.json` + `tsconfig.json`. |
| layoutHtml.test.ts rewrite misses edge cases | CSS assertions are unchanged — only node construction changes. Each test verified individually. |
| Duplicated mocks.ts | Intentional for package isolation. Same API, can drift independently. |
| `PptxConfigBuilder` not yet exported from core | Add one line to `packages/core/src/index.ts` during Phase 6. |

---

## References

- **Slidev architecture:** Core has zero content components. All content components live in themes. [sli.dev/builtin/components](https://sli.dev/builtin/components)
- **Neversink theme:** 13 theme-owned components. [gureckis.github.io/slidev-theme-neversink](https://gureckis.github.io/slidev-theme-neversink/components/admonitions.html)
- **Declaration merging:** Already documented in `core/model/types.ts:609-617`.
