# Plan: SDK DX Overhaul — Consistent Authoring API

## Context

After implementing token descriptors (`token.allRequired()`, `token.spec()`), an architect audit of all four authoring surfaces revealed inconsistencies:

1. **Three names for the same function**: `expand` (components), `render` (layouts), `getContent` (masters)
2. **Three declarations for one concept**: TOKEN const + Tokens type + TOKEN_SPEC must be kept in sync manually
3. **No `defineTheme()`**: themes use `satisfies Theme` while everything else uses `defineX()`
4. **`description` is layout-only**: other surfaces can't describe themselves

This plan unifies all four surfaces into a single consistent pattern.

## Final API Surface

Every authoring surface follows: **`defineX({ name, tokens: token.shape({...}), render })`**

Two namespaces provide building blocks consumed by `defineX()`:
- `schema.*` — param type descriptors (wraps Zod): `schema.string()`, `schema.object()`
- `token.*` — token requirement descriptors: `token.required<T>()`, `token.optional<T>()`, `token.shape()`

```typescript
// ─── COMPONENT ───
const cardTokens = token.shape({
  background: token.optional<ShapeTokens>(),
  padding: token.required<number>(),
  gap: token.required<GapSize>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  title: token.required<TextTokens>(),
  description: token.required<TextTokens>(),
});
type CardTokens = InferTokens<typeof cardTokens>;

export const cardComponent = defineComponent({
  name: "card",
  params: { title: textComponent.schema.optional(), ... },
  tokens: cardTokens,
  render(props, context, tokens) { ... },
});

// ─── LAYOUT ───
const bodyTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  text: token.required<TextTokens>(),
  list: token.required<ListTokens>(),
  ...
});

export const bodyLayout = defineLayout({
  name: "body",
  description: "Header + markdown body",
  params: { title: schema.string(), ... },
  slots: ["body"],
  tokens: bodyTokens,
  render(props, tokens) { ... },      // already "render"
});

// ─── MASTER ───
const defaultMasterTokens = token.shape({
  background: token.required<Background>(),
  margin: token.required<number>(),
  footerHeight: token.required<number>(),
  ...
});

export const defaultMaster = defineMaster({
  name: "default",
  tokens: defaultMasterTokens,
  render(tokens, slideSize) { ... },   // was: getContent
});

// ─── THEME ───
export default defineTheme({
  slide: SLIDE_SIZE.S16x9,
  fonts: [...],
  textStyles: { ... },
  layouts: { body: bodyLayout.tokenMap({ ... }) },
  masters: { default: defaultMaster.tokenMap({ ... }) },
});
```

## Design Decisions

### Why `token.shape()` not `defineTokens()`

`defineX()` means "create a named, registerable entity" — components, layouts, masters all have names and registries. Token shapes are subordinate descriptors consumed by `defineX()` calls. They have no name, no registry, no independent identity.

The parallel: `schema.string()`, `schema.object()` are namespace-qualified descriptor builders. `token.shape()`, `token.required()`, `token.optional()` follow the same pattern. Two namespaces for building blocks, `defineX()` for entities.

### Why phantom types for `token.required<T>()`

Mirrors the Zod pattern: one declaration carries both runtime semantics (`_optional: boolean`) and type information (`_type?: T` phantom field). Collapses three manually-synced declarations into one `token.shape()` call + a derived `InferTokens<>` type.

## Phase 1: Infrastructure

### 1a. `packages/core/src/core/model/token.ts` — Phantom types

Replace the current descriptor values with generic functions:

```typescript
// NEW: Phantom type descriptor
export interface TokenDescriptor<T = unknown, Opt extends boolean = false> {
  readonly _optional: Opt;
  readonly _type?: T;  // phantom — erased at runtime, exists for type inference
}

// NEW: Type inference utility
export type InferTokens<S extends Record<string, TokenDescriptor<any, boolean>>> =
  { [K in keyof S as S[K] extends { _optional: true } ? never : K]:
      S[K] extends TokenDescriptor<infer T, any> ? T : never } &
  { [K in keyof S as S[K] extends { _optional: true } ? K : never]?:
      S[K] extends TokenDescriptor<infer T, any> ? T : never };

// UPDATED: token namespace
export const token = {
  required: <T>(): TokenDescriptor<T, false> => ({ _optional: false } as any),
  optional: <T>(): TokenDescriptor<T, true> => ({ _optional: true } as any),
  shape: <S extends TokenShape>(s: S): S => s,
};

// KEEP: TokenShape (updated alias)
export type TokenShape = Record<string, TokenDescriptor<any, boolean>>;

// KEEP UNCHANGED: parseTokenShape(), resolveVariantTokens(), validateTokens()
// (They only read _optional, which TokenDescriptor still has)

// REMOVE: TokenRequired, TokenOptional, TokenSpec, ValidTokenShape
// REMOVE: token.allRequired(), token.spec()
```

### 1b. `packages/core/src/core/rendering/registry.ts` — Rename + generics

**Rename `expand` → `render`:**
- `ComponentDefinition.expand` → `ComponentDefinition.render`
- `ComponentRegistry.expand()` → `ComponentRegistry.render()`
- `ComponentRegistry.expandTree()` → `ComponentRegistry.renderTree()`
- `ExpansionContext` → `RenderContext`

**Rename `getContent` → `render`:**
- `MasterDefinition.getContent` → `MasterDefinition.render`

**Update generics** on all `defineX` functions:

```typescript
// OLD: TTokens = the final type, ValidTokenShape checks spec matches type
defineComponent<..., TTokens = undefined>(def: {
  tokens: TTokens extends undefined ? TokenShape : ValidTokenShape<TTokens>;
  expand: (props, context: ExpansionContext, tokens: TTokens) => SlideNode;
})

// NEW: TShape = the token shape, InferTokens derives the final type
defineComponent<..., TShape extends TokenShape = TokenShape>(def: {
  tokens: TShape;
  render: (props, context: RenderContext, tokens: InferTokens<TShape>) => SlideNode;
})
```

Same pattern for `defineLayout` and `defineMaster`.

**Add `defineTheme()`:**
```typescript
export function defineTheme(theme: Theme): Theme { return theme; }
```

**Optional `description`** on `ComponentDefinition` and `MasterDefinition` (already exists on `LayoutDefinition`).

### 1c. `packages/core/src/index.ts` — Update exports

```typescript
// ADD:
export { type InferTokens, type TokenDescriptor } from "./core/model/token.js";
export { defineTheme, type RenderContext } from "./core/rendering/registry.js";

// REMOVE:
// TokenRequired, TokenOptional, TokenSpec, ValidTokenShape, ExpansionContext
```

### 1d. Internal callers of renamed APIs

Files that call `componentRegistry.expand()` / `.expandTree()` or reference `ExpansionContext`:
- `packages/core/src/core/rendering/presentation.ts` — calls expandTree
- `packages/core/src/core/layout/measurement.ts` — calls expandTree (if any)
- `packages/core/src/core/markdown/documentCompiler.ts` — references expand
- Any test files referencing expand/ExpansionContext

Files that call `def.getContent`:
- `packages/core/src/core/rendering/presentation.ts` — calls master.getContent

## Phase 2: Migrate Components

Each component file replaces 3 declarations (TOKEN const + Tokens type + TOKEN_SPEC) with 1 (`token.shape()` + derived type). Also renames `expand` → `render` in `defineComponent` call.

### Pattern for all-required (most components)

```typescript
// BEFORE (3 declarations):
export const TEXT_TOKEN = { COLOR: "color", STYLE: "style", ... } as const;
export type TextTokens = { color: string; style: TextStyleName; ... };
export const TEXT_TOKEN_SPEC = token.allRequired(TEXT_TOKEN);
export const textComponent = defineComponent({ tokens: TEXT_TOKEN_SPEC, expand(...) { ... } });

// AFTER (1 declaration + derived type):
export const textTokens = token.shape({
  color: token.required<string>(),
  style: token.required<TextStyleName>(),
  linkColor: token.required<string>(),
  linkUnderline: token.required<boolean>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  accents: token.required<Record<string, string>>(),
});
export type TextTokens = InferTokens<typeof textTokens>;
export const textComponent = defineComponent({ tokens: textTokens, render(...) { ... } });
```

### Pattern for mixed required/optional

```typescript
// BEFORE (3 declarations):
export const CARD_TOKEN = { BACKGROUND: "background", ... } as const;
export type CardTokens = { background?: ShapeTokens; padding: number; ... };
export const CARD_TOKEN_SPEC = token.spec(CARD_TOKEN, { optional: [CARD_TOKEN.BACKGROUND] });

// AFTER (1 declaration + derived type):
export const cardTokens = token.shape({
  background: token.optional<ShapeTokens>(),
  padding: token.required<number>(),
  ...
});
export type CardTokens = InferTokens<typeof cardTokens>;
```

### Component migration table

| File | Components | Optional tokens? |
|------|-----------|-----------------|
| `text.ts` | text | No |
| `plainText.ts` | plainText | No |
| `list.ts` | list | No |
| `table.ts` | table | No |
| `code.ts` | code | No |
| `mermaid.ts` | mermaid | No |
| `card.ts` | card | Yes (background) |
| `testimonial.ts` | testimonial | Yes (background) |
| `quote.ts` | quote | No |
| `primitives.ts` | shape, line, slideNumber | Yes (shape has 5 optional) |
| `containers.ts` | row, column, stack, grid | No tokens (empty shape `{}`) |
| `image.ts` | image | No tokens (empty shape `{}`) |
| `components/src/index.ts` | barrel exports | Remove old TOKEN/SPEC exports |

### Naming convention

Old pattern: `TEXT_TOKEN` (SCREAMING_SNAKE), `TEXT_TOKEN_SPEC`
New pattern: `textTokens` (camelCase) — matches `textComponent`, `cardSchema`

## Phase 3: Migrate Layouts, Masters, Theme

### Layouts (`packages/theme-default/src/layouts.ts`)

11 layouts, each with TOKEN const + Tokens type + `token.allRequired()`. Same migration pattern as components. Layout `render` function name is already correct — no rename needed.

| Layout | Has optional tokens? |
|--------|---------------------|
| title (+ end reuse) | No |
| section | No |
| body | No |
| stat | No |
| quote | No |
| blank | No |
| twoColumn | No |
| statement | No |
| agenda | No |
| cards | No |

### Masters (`packages/theme-default/src/master.ts`)

2 masters. Rename `getContent` → `render`. Replace TOKEN const + Tokens type + `token.allRequired()` with `token.shape()`.

| Master | Has optional tokens? |
|--------|---------------------|
| default | No |
| minimal | No |

### Theme (`packages/theme-default/src/theme.ts`)

Replace `} satisfies Theme;` with `defineTheme({ ... })`.

## Phase 4: Cleanup

- Remove old type exports from `packages/core/src/index.ts`: `TokenRequired`, `TokenOptional`, `TokenSpec`, `ValidTokenShape`, `ExpansionContext`
- Remove old TOKEN const exports from `packages/components/src/index.ts` (e.g., `TEXT_TOKEN`, `CARD_TOKEN`)
- Update `packages/core/test/` files: rename expand→render references, update mock tokens
- Update `packages/components/test/` files: same
- Update `docs/components.md`: new API examples

## Files to Modify

| File | Changes |
|------|---------|
| `packages/core/src/core/model/token.ts` | Phantom types, remove old helpers |
| `packages/core/src/core/rendering/registry.ts` | Rename expand→render, getContent→render, update generics, add defineTheme |
| `packages/core/src/index.ts` | Update exports |
| `packages/core/src/core/rendering/presentation.ts` | Rename expandTree→renderTree, getContent→render |
| `packages/components/src/text.ts` | token.shape + render |
| `packages/components/src/plainText.ts` | token.shape + render |
| `packages/components/src/list.ts` | token.shape + render |
| `packages/components/src/table.ts` | token.shape + render |
| `packages/components/src/code.ts` | token.shape + render |
| `packages/components/src/mermaid.ts` | token.shape + render |
| `packages/components/src/card.ts` | token.shape + render |
| `packages/components/src/testimonial.ts` | token.shape + render |
| `packages/components/src/quote.ts` | token.shape + render |
| `packages/components/src/primitives.ts` | token.shape + render |
| `packages/components/src/containers.ts` | render rename |
| `packages/components/src/image.ts` | render rename |
| `packages/components/src/index.ts` | Update exports |
| `packages/theme-default/src/layouts.ts` | token.shape (render already correct) |
| `packages/theme-default/src/master.ts` | token.shape + render |
| `packages/theme-default/src/theme.ts` | defineTheme() |
| `packages/core/test/*.ts` | Rename references |
| `packages/components/test/*.ts` | Rename references |
| `docs/components.md` | Update examples |

## Execution Order

1. **token.ts**: Add `TokenDescriptor`, `InferTokens`, update `token` namespace. Keep old types temporarily for compilation.
2. **registry.ts**: Rename expand→render, getContent→render. Update generics to use `TShape`. Add `defineTheme`, `RenderContext`.
3. **index.ts**: Update barrel exports.
4. **Internal callers**: presentation.ts, documentCompiler.ts — rename method calls.
5. **Components**: Migrate all 16 component files (token.shape + render).
6. **Layouts**: Migrate all 11 layout definitions (token.shape, render already correct).
7. **Masters**: Migrate 2 master definitions (token.shape + render).
8. **Theme**: Switch to defineTheme().
9. **Test files**: Update all test references.
10. **Cleanup**: Remove old type aliases, old TOKEN const exports.
11. **`npm run build && npm test`** — verify green.

## Verification

1. `npm run build` — no type errors across all 3 packages
2. `npm test` — all 698 tests pass
3. `InferTokens` correctly derives required/optional fields from `token.shape()`
4. `token.shape()` objects work with `parseTokenShape()` (same `_optional` field)
5. All `defineX()` functions accept `token.shape()` result for `tokens:`
6. `render` is the function name on all 4 surfaces
7. `defineTheme()` validates theme structure
8. `.tokenMap()` still works for compile-time token validation in theme
