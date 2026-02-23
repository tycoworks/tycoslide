# Component Ownership — Move All DSL to Theme

---

## Summary

Move all DSL component functions from `packages/core/src/components/` to `packages/theme-default/`. Core becomes the engine (node types, registries, markdown pipeline, layout engine, renderer). The theme owns the entire component vocabulary.

**Prerequisite:** Inline the Document component's compilation logic into the slot compiler to eliminate circular coupling before moving any files.

---

## Architectural Decision: Components Belong in Themes

### Decision

All DSL component functions — including primitives like `text()`, `image()`, `row()`, `column()` — move from `packages/core` to `packages/theme-default`. Core retains only:

- Node types and interfaces (`NODE_TYPE`, `TextNode`, `ContainerNode`, etc.)
- Registries (`componentRegistry`, `layoutRegistry`) and expansion engine
- Markdown pipeline (slot compiler, document compiler, slide parser)
- Layout engine (HTML measurement, flex positioning, validation)
- Renderer (`pptxRenderer`, `pptxConfigBuilder`)
- Component Author API (`schema`, `markdown` toolkit)
- Constants and enums (`HALIGN`, `VALIGN`, `SIZE`, `DIRECTION`, `GAP`, `SHAPE`)

### Rationale

1. **No architectural distinction between DSL functions.** Every DSL function follows an identical pattern: register with `componentRegistry.define()`, produce a `ComponentNode`, expand to node types at build time. `row()` expands to `NODE_TYPE.CONTAINER` the same way `card()` expands to containers + shapes + text. The renderer doesn't know about any of them.

2. **Core infrastructure has zero imports from `components/`.** The slot compiler, document compiler, and renderer work entirely through registry dispatch. The only reference to DSL files is the barrel re-export in `index.ts`. The engine is already decoupled.

3. **The extensibility story has a gap.** Built-in components use internal capabilities (`markdownProcessor`, `dispatchDirective`) that theme authors cannot access. Moving components out forces us to close this gap with a proper Component Author API. Dogfooding validates the API.

4. **Themes define the vocabulary.** Slidev's architecture has zero content components in core — all content components (cards, admonitions, speech bubbles) live in themes. A different tycoslide theme should be able to define `hbox()`/`vbox()` instead of `row()`/`column()`, or use an entirely different compositional model.

5. **Now is the cheapest time.** One theme, one user, zero external consumers. API changes cost nothing. Every component added while DSL lives in core widens the implicit internal API surface.

### Analogy

From financial markets trading systems: the core API provides order primitives (create, cancel, fill). An "order plugin" wraps those primitives into business logic. Users extend the system by wrapping or tweaking that plugin, not by modifying the core API. Components are the plugins; node types are the core API.

### What This Is NOT

- **Not a plugin system.** No configuration, lifecycle hooks, or dependency resolution. Components register via import side effects, exactly as today.
- **Not a breaking change to the node types.** The renderer, layout engine, and all 8 `NODE_TYPE` values are unchanged.
- **Not moving layouts.** Layouts already live in theme-default. This change makes components consistent with that.

---

## Prerequisite: Resolve the Document Component

### Problem

The Document component creates a circular coupling between `document.ts` and `slotCompiler.ts`:

```
slotCompiler.ts
  → componentRegistry.setDefault('document')
  → flushBareGroup() wraps bare MDAST in component('document', { body: rawSource })

document.ts
  → expandDocument() parses markdown, dispatches blocks
  → For :::directives, calls dispatchDirective() imported from slotCompiler.ts
```

Document is not a visual component. It has zero theme tokens, zero visual opinion. It is markdown pipeline logic masquerading as a component.

### Solution

Inline Document's compilation logic into the slot compiler.

**Step 1:** Extract `compileNode()` and `expandDocument()` from `document.ts` into `slotCompiler.ts` as `compileBareMarkdown(source: string): ComponentNode`.

**Step 2:** Change `flushBareGroup()` to call `compileBareMarkdown()` directly:

```typescript
// Before
nodes.push(component(componentRegistry.getDefault(), { body: rawSource }));

// After
nodes.push(compileBareMarkdown(rawSource));
```

**Step 3:** Remove `setDefault()`/`getDefault()` from `ComponentRegistry`. The indirection serves no purpose — only ever set to `'document'`, never overridden.

**Step 4:** Reduce `document.ts` to a thin DSL wrapper (moves to theme with everything else):

```typescript
export function document(content: string): ComponentNode {
  return compileBareMarkdown(content);
}
```

**Step 5:** Remove the `:::document` directive. Bare markdown already triggers the same behavior. Update tests accordingly.

### Why This Comes First

After this refactor, every remaining DSL file is a clean "register + expand to node types" pattern with no circular dependencies. The move to theme becomes mechanical.

---

## Component Author API

### Problem

Content components (`document.ts`, `table.ts`) use internal functions that are not part of core's public API:

- `markdownProcessor` from `src/utils/parser.ts`
- `extractDirectiveBody` from `src/utils/parser.ts`
- `dispatchDirective` from `src/core/markdown/slotCompiler.ts`
- `SYNTAX` from `src/core/model/syntax.ts`
- `extractSource`, `extractInlineText` from `src/core/model/syntax.ts`

Exporting these individually creates a fragile, hard-to-discover API surface.

### Solution: `markdown` Namespace

Bundle all markdown processing utilities into a single namespace object, following the `schema` pattern already in the codebase:

```typescript
// packages/core/src/core/markdown/toolkit.ts
export const markdown = {
  parse(content: string): Root { ... },
  extractSource(node, source): string { ... },
  extractInlineText(nodes): string { ... },
  extractDirectiveBody(directive, source): string { ... },
  dispatchDirective(directive, source, context): ComponentNode { ... },
  SYNTAX: { PARAGRAPH, HEADING, LIST, TABLE, ... },
} as const;
```

**Import experience for component authors:**

```typescript
import {
  componentRegistry, component, schema, markdown,
  type ExpansionContext, type ComponentNode,
  // primitives (from theme, not core)
  column, prose, text, label,
  // constants
  HALIGN, VALIGN, TEXT_STYLE,
} from 'tycoslide';
```

One new export. Card and quote don't even need it — they only use composition primitives. Only components that parse markdown internally (table, document) need the `markdown` toolkit.

### Why Not a Base Class

Components are pure functions (`expand: (props, context, tokens) => nodes`). A `ComponentBase` class would impose unnecessary structure on simple cases like card and quote. The namespace groups related helpers by domain without adding ceremony.

---

## Theme Loader Changes

### Current State

`loadTheme()` in `cli/themeLoader.ts` imports `mod.layouts` for side effects (triggering `layoutRegistry.define()` calls).

### Change

Add a `components` import:

```typescript
if (mod.components) {
  void mod.components; // Side-effect: registers components
}
```

Theme-default's `index.ts` gains:

```typescript
import * as components from './components.js';
export { components };
```

Where `components.ts` is a barrel that imports all component files, each of which calls `componentRegistry.define()` on import.

---

## The `Component` Const and `ComponentTokenMap`

### Component Names

Keep all component name strings in core's `Component` const. Names are just string constants with zero runtime cost. Removing them would break every import site for no benefit. The `ComponentName` type remains open: `BuiltinComponentName | (string & {})`.

### Token Map

Remove content component entries from `ComponentTokenMap` in core:

```typescript
// Before (core/types.ts)
export interface ComponentTokenMap {
  card: CardTokens;
  quote: QuoteTokens;
  table: TableTokens;
  line: LineTokens;
  slideNumber: SlideNumberTokens;
  text: TextTokens;
  shape: ShapeTokens;
}

// After (core/types.ts) — only components that stay in core's token map
// Actually: ALL component tokens move out. Core's ComponentTokenMap is empty.
// Theme-default uses declaration merging to add its tokens:
```

```typescript
// theme-default/src/types.ts
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

The `Theme.components` type already has a `Record<string, ...>` intersection for runtime access. Declaration merging provides compile-time enforcement for themes that use these components.

Token interfaces (`CardTokens`, `QuoteTokens`, etc.) and token name consts (`CARD_TOKEN`, `QUOTE_TOKEN`, etc.) stay in core's `types.ts`. They are pure type definitions with zero runtime cost and serve as the "alphabet" component authors use.

---

## Migration Plan

### Phase 0: Inline Document into Slot Compiler

1. Move `compileNode()` + `expandDocument()` logic into `slotCompiler.ts` as `compileBareMarkdown()`
2. Change `flushBareGroup()` to call `compileBareMarkdown()` directly
3. Remove `setDefault()`/`getDefault()` from registry
4. Update `slotCompiler.test.ts` — remove `:::document` directive tests, add `compileBareMarkdown` tests
5. Keep `document.ts` temporarily as thin wrapper
6. Build + test: 575/575 must pass

### Phase 1: Create Component Author API

1. Create `packages/core/src/core/markdown/toolkit.ts` with the `markdown` namespace
2. Export `markdown` from `packages/core/src/index.ts`
3. Re-export key mdast types (`ContainerDirective`, `Root`, etc.)
4. Build + test

### Phase 2: Move ALL DSL Files to Theme-Default

1. Move files from `packages/core/src/components/` to `packages/theme-default/src/components/`
2. Rewrite imports: relative `../core/rendering/registry.js` → package `tycoslide`
3. Create `packages/theme-default/src/components.ts` barrel
4. Export `components` from `packages/theme-default/src/index.ts`
5. Update `loadTheme()` to import `mod.components`
6. Remove `components/` barrel from core's `index.ts`
7. Build + test

### Phase 3: Move Token Types

1. Empty `ComponentTokenMap` in core
2. Add declaration merging in theme-default
3. Move token interface tests to theme-default
4. Build + test

### Phase 4: Move Tests

1. Move `cardComponent.test.ts`, `quoteComponent.test.ts`, `mermaid.test.ts` to theme-default
2. Split `dsl.test.ts` and `slotCompiler.test.ts` — core tests import theme-default for component registration
3. Update `documentCompiler.test.ts` and integration tests
4. Build + all tests pass

### Phase 5: Clean Up

1. Remove empty `components/` directory from core
2. Update core's `package.json` — move `@mermaid-js/mermaid-cli` to theme-default
3. Update documentation and examples
4. Verify TypeScript DSL imports work from theme-default

---

## File Movement Summary

### Files Moving: `packages/core/src/components/` → `packages/theme-default/src/components/`

| File | Components | Notes |
|------|-----------|-------|
| `text.ts` | text, prose, label | Used by card, quote, document |
| `primitives.ts` | image, shape, line, slideNumber | Used by card, quote, layouts |
| `containers.ts` | row, column, stack, grid | Used by card, quote, layouts, grid depends on row+column |
| `card.ts` | card | Composes stack + column + shape + text + image |
| `quote.ts` | quote | Composes stack + column + row + shape + prose + label |
| `table.ts` | table | Uses `markdown.parse()` for cell content |
| `mermaid.ts` | mermaid | Shells out to mermaid-cli |
| `document.ts` | document | Thin wrapper after Phase 0 |

### Files Staying in Core

| File | Purpose |
|------|---------|
| `core/model/nodes.ts` | NODE_TYPE enum, all node interfaces |
| `core/model/types.ts` | Theme, enums, constants, token interfaces |
| `core/rendering/registry.ts` | ComponentRegistry, LayoutRegistry, expansion engine |
| `core/rendering/pptxRenderer.ts` | PPTX generation |
| `core/rendering/pptxConfigBuilder.ts` | pptxgenjs config |
| `core/model/bounds.ts` | Geometry |
| `core/markdown/slotCompiler.ts` | Slot compilation + `compileBareMarkdown()` |
| `core/markdown/documentCompiler.ts` | Full document pipeline |
| `core/markdown/slideParser.ts` | YAML frontmatter + slide parsing |
| `core/markdown/toolkit.ts` | `markdown` namespace (NEW) |
| `core/layout/*` | Measurement, positioning, validation |
| `core/model/schema.ts` | Schema helpers for component authors |
| `core/rendering/presentation.ts` | Presentation class |
| `utils/*` | Assets, font, logging, parser |
| `cli/*` | Build command, theme loader |

---

## What Core Becomes

After this refactor, core is **the engine**:

```
tycoslide (core)
├── Node types          — What the renderer can draw
├── Registries          — How components and layouts are discovered
├── Markdown pipeline   — How markdown becomes component trees
├── Layout engine       — How component trees become positioned nodes
├── Renderer            — How positioned nodes become PowerPoint
├── schema              — API for defining component props
└── markdown            — API for parsing markdown in components

tycoslide-theme-default
├── Components          — The vocabulary (text, image, card, table, etc.)
├── Layouts             — The page templates (title, section, body)
├── Theme               — The design tokens (colors, fonts, spacing)
└── Assets              — Fonts, icons
```

The boundary is clean: **core defines what CAN be drawn; themes define what IS drawn.**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| TypeScript DSL users must change import paths | Theme-default re-exports everything. Migration is find-and-replace. |
| Core test suite needs theme components loaded | Import theme-default in test setup. Or split integration tests to theme-default. |
| `compileBareMarkdown` in slotCompiler needs `prose()`, `table()`, `column()` | The slot compiler calls these via `component()` factory + registry dispatch. Note: `document.ts` does directly import `prose()`, `table()`, and `column()` from sibling files, but since all component files move together, these relative imports remain valid. |
| `@mermaid-js/mermaid-cli` is a heavy dependency | Moving it to theme-default is a win — core gets lighter. |
| `:::document` directive removed | Rarely used. Bare markdown does the same thing. |

---

## References

- **Slidev architecture:** Core has zero content components. All content components live in themes. [sli.dev/builtin/components](https://sli.dev/builtin/components)
- **Neversink theme:** 13 theme-owned components (admonitions, speech bubbles, sticky notes, etc.). [gureckis.github.io/slidev-theme-neversink](https://gureckis.github.io/slidev-theme-neversink/components/admonitions.html)
- **Declaration merging:** Already documented in `core/model/types.ts:609-617` for third-party component token extension.
