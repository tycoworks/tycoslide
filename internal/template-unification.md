# Template Unification

Design doc for replacing the master + layout + variant system with a unified template concept.

**Status**: Implementation (Step 2 done, Step 3 next — May 2026)
**Branch**: multi-format-themes
**Related docs**: `multi-format-themes.md` (multi-format design, mostly implemented), `sdk-authoring-api.md` (future SDK helpers)

## Table of Contents

- [Problem](#problem)
- [Prior Art](#prior-art)
- [Design Decisions](#design-decisions)
- [Three-Level Pattern](#three-level-pattern-approved)
- [Current Architecture](#current-architecture-post-step-2-may-2026)
- [Target Architecture](#target-architecture)
- [Implementation Progress](#implementation-progress)
- [Next Steps](#next-steps-core-structured-config-step-3)
- [File Inventory](#file-inventory)
- [Relationship to Other Work](#relationship-to-other-work)

---

## Problem

The current theme authoring model has 3 layers between Brand and Content:

1. **Master** — slide chrome (background, footer, logo). `defineMaster()` + `masterRegistry.register()`
2. **Layout** — content arrangement (title+body, two-column, cards). `defineLayout()` + `layoutRegistry.register()`
3. **Variants** — token-level diffs on a layout (body/default, body/centered)

Plus `MasterRef` wiring connecting layouts to masters through tokens.

**Issues:**
- Three concepts for theme authors to learn
- `MasterRef` plumbing in every layout token interface
- Variant dispatch adds indirection (`resolveVariantTokens`)
- Invalid combinations possible (dark master + light layout tokens)
- Markdown requires two frontmatter keys (`layout:` + `variant:`)

## Prior Art

| Tool | Chrome + Layout union | Variant mechanism |
|------|----------------------|-------------------|
| PowerPoint | Slide Layout inherits from Slide Master | Multiple masters (light/dark) |
| Keynote | Master Slide fuses both | Duplicate masters |
| Canva | Template (locked + unlocked elements) | Separate templates |
| Slidev | Layout (Vue component) + Theme (CSS) | CSS variables |
| Figma | Variables + Modes | Mode switching |

Key finding: PPTX has NO content area concept. Slide content can be placed anywhere — including on top of master chrome. `contentBounds` is a tycoslide invention.

## Design Decisions

### Decision 1: Template = the single authoring concept

**Template = a specific slide type. No variants. No separate master/layout for theme authors.**

Markdown surface:
```yaml
template: body-centered
```

One field. One concept. Replaces `layout: body` + `variant: centered`.

### Decision 2: Variants eliminated

Token resolution becomes direct lookup. Templates that share a content arrangement (body, body-centered) reuse the same Layout object with different tokens.

### Decision 3: Three-level separation (Layout / Master / Template)

Internally, templates decompose into reusable blueprints:

- **Layout** = structural content blueprint (reusable across templates)
- **Master** = chrome/background blueprint (reusable across templates)
- **Template** = Layout + Master + tokens (the complete styled thing)

Theme authors work with Templates. Layouts and Masters are implementation details for reuse.

### Decision 4: Core is master-aware but template-agnostic

Core has first-class masters and layouts. It knows how to render a master layer and a content layer independently. But it knows nothing about "templates" — that concept lives in the SDK. The SDK decomposes templates into master + layout at the core boundary. Core also does NOT resolve variants or do contentBounds enforcement — it renders two independent layers (master behind, content on top).
---

## Three-Level Pattern (approved)

Blueprint (reusable) → Template (blueprint + tokens) → Registration (invisible plumbing)

### Layout — structural content blueprint

```typescript
interface Layout<TTokens> {
  params: ScalarShape;
  slots?: readonly string[];
  render: (params, slots, tokens: TTokens) => SlideNode;
}
```

- Defined in `layouts.ts` (14 unique layouts → 17 templates)
- Each layout is a cohesive section: token interface → ASCII diagram → Layout object
- Token interfaces named `*TemplateTokens` (e.g., `BodyTemplateTokens`)
- No name, no registration — just a structural blueprint
- Multiple templates can share one layout (body + body-centered share `body` layout)

### Master — chrome/background blueprint

```typescript
interface Master<TTokens> {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterResult;
}
```

- Defined in `masters.ts` (3 masters: default, minimal, factsheet)
- Plain objects with typed render function — like Layout, just a generic interface
- NO `defineMaster()` factory for theme authors — masters are plain objects
- `defineTemplate` handles conversion to core's `MasterDefinition` internally (idempotent)

### Template — the complete styled thing

```typescript
defineTemplate({
  name: TEMPLATE.BODY,
  description: "Markdown body with optional title. Default layout.",
  layout: body,                          // Layout<BodyTemplateTokens> — the object
  master: defaultMaster,                 // Master<DefaultMasterTokens> — the object
  masterTokens: { background, margin },  // separate from content tokens
  layoutTokens: { text: bodyText, ... }, // clean — content only
})
```

- `defineTemplate()` is a pure factory — creates a `LayoutDefinition` for core registration
- Internally: wraps layout render to inject masterName + masterTokens into the Slide
- `master` and `masterTokens` are first-class fields — no magic token-bag key
- `layoutTokens` (not `tokens`) — the name makes the separation explicit

---


## Current Architecture (post-Step 2, May 2026)

Step 2 is complete. The SDK-level authoring API is clean:

### SDK Types (4 exports from template.ts)

```typescript
/** Chrome blueprint — plain object, no factory needed. */
interface Master<TTokens extends object = Record<string, unknown>> {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterResult;
}

/** Return type from master render. */
interface MasterResult {
  content: ComponentNode;
  contentBounds?: Bounds;  // SDK-level convenience, NOT enforced by core
  background: Background;
}

/** Structural content blueprint. */
interface Layout<TTokens, TParams, TSlots> {
  params: TParams;
  slots?: TSlots;
  render: (params, slots, tokens: TTokens) => SlideNode;
}

/** Complete template: layout + master + separated tokens. */
interface Template {
  layout: LayoutDefinition;
  master: Master<any>;
  masterTokens: Record<string, unknown>;
  layoutTokens: Record<string, unknown>;
}
```

### Theme authoring (what theme authors write)

```typescript
defineTemplate({
  name: TEMPLATE.BODY,
  description: "Markdown body with optional title.",
  layout: body,                          // Layout object
  master: defaultMaster,                 // Master object (not a string, not a ref)
  masterTokens: { background, margin },  // tokens for the master
  layoutTokens: { text, list, ... },     // tokens for the layout
})
```

### What was eliminated in Step 2

| Removed | Replacement |
|---------|-------------|
| `MasterRef` type | Direct master object reference + inline shape |
| `MasterDefinition<T>` | Collapsed into `Master<T>` |
| `defineMaster()` from core in theme-default | Plain `Master<T>` objects |
| `mod.masters` separate export | Masters discovered from templates |
| Magic `"master"` key in token bag (authoring side) | Explicit `master` + `masterTokens` fields |
| `TemplateTokenEntry` | `Template` interface |

### What still exists (the smuggling hack)

The SDK's `templatesToLayouts()` still packs master info into a flat token bag under a `"master"` key, because core's `LayoutDefinition.render` returns a full `Slide` (including `masterName` + `masterTokens`), and the only way to pass master identity into the render closure is through the token parameter.

This round-trip exists because **core doesn't have first-class master assignment in its theme config**. The layout render is the only place that decides which master a slide gets. This is the problem Step 3 fixes.

---

## Target Architecture (Step 3)

### Principle: Core IS master-aware

Core has first-class concepts of masters and layouts. The SDK's "template" decomposes into master + layout at the core level. No smuggling hacks.

### Principle: Two independent layers

Masters and content are two independent rendering layers that can overlap freely. `contentBounds` is NOT a core constraint — it's an SDK-level convenience for themes that want non-overlapping layers.

### Principle: No variant resolution in core

Core doesn't resolve variants. The theme config provides a flat structured entry per layout name. "Flat map" means no indirection — but the map is structured (has typed fields), not an opaque `Record<string, unknown>`.

### Core type changes

**New `LayoutConfig` replaces `VariantConfig`:**

```typescript
// packages/core/src/core/model/types.ts

/** Structured config for a layout variant — master assignment + layout tokens. */
export interface LayoutConfig {
  masterName: string;
  masterTokens: Record<string, unknown>;
  layoutTokens: Record<string, unknown>;
}

export interface Theme {
  slide: { width: number; height: number };
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, LayoutConfig>;  // one config per template name, no variants nesting
}
```

Note: `variants` nesting is gone. Each template name maps directly to one `LayoutConfig`. The "variant" concept was already eliminated — `body` and `body-centered` are separate template names, not variants of `body`.

**`LayoutDefinition.render` returns `SlideNode` (content only):**

```typescript
// packages/core/src/core/rendering/registry.ts

export interface LayoutDefinition {
  name: string;
  description: string;
  params: SchemaShape;
  slots?: readonly string[];
  render: (params: any, slots: any, tokens: unknown) => SlideNode;  // content only
}
```

Layouts don't know about masters. They return content.

**`MasterDefinition` drops `contentBounds`:**

```typescript
// packages/core/src/core/rendering/registry.ts

export interface MasterDefinition {
  name: string;
  render: (tokens: Record<string, unknown>, slideSize: { width: number; height: number }) => {
    content: ComponentNode;
    background: Background;
  };
}
```

Master is just another rendering layer. No contentBounds constraint.

### New pipeline flow

```
1. Theme author writes:
   defineTemplate({ layout: body, master: defaultMaster, masterTokens: {...}, layoutTokens: {...} })

2. SDK resolveThemeFormat() → templatesToLayouts() produces:
   theme.layouts["body"] = {
     masterName: "default",
     masterTokens: { background, margin, footerHeight, ... },
     layoutTokens: { text, list, spacing, ... },
   }

3. Core documentCompiler → compileLayoutSlide:
   a. Reads layoutName from frontmatter
   b. Looks up theme.layouts[layoutName] → { masterName, masterTokens, layoutTokens }
   c. Validates params/slots
   d. Calls layout.render(params, slots, layoutTokens) → SlideNode (content only)
   e. Assembles Slide { masterName, masterTokens, content }

4. Core Presentation.processDeferredSlides:
   a. masterRegistry.get(masterName).render(masterTokens, slideSize) → { content, background }
   b. Render master component tree (full slide bounds)
   c. Render slide content tree (full slide bounds — layout positions itself via tokens)
   d. Compose: master behind, content on top
```

### What gets eliminated in Step 3

| Removed | Replacement |
|---------|-------------|
| `VariantConfig` type | `LayoutConfig` (structured, typed) |
| `variants` nesting in `Theme.layouts` | Direct `Record<string, LayoutConfig>` |
| `LayoutDefinition.render` returning `Slide` | Returns `SlideNode` (content only) |
| `contentBounds` in core `MasterDefinition` | Removed — two free layers |
| `MASTER_TOKEN_KEY` constant | Gone — no smuggling |
| `defineTemplate` render wrapper (unpack master) | Passthrough — layout.render called directly |
| `resolveVariantTokens` | Simplified — just reads `layoutTokens` from config |

### What stays

| Thing | Why |
|-------|-----|
| `masterRegistry` + `MasterDefinition` | Core renders masters — it needs them registered |
| `layoutRegistry` + `LayoutDefinition` | Core renders layouts — it needs them registered |
| `Slide.masterName` + `masterTokens` | Core's internal model for the compiled slide |
| SDK's `Master<T>` with optional `contentBounds` in `MasterResult` | SDK convenience for themes |
| PPTX dedup via masterTokens object identity | Same mechanism |

### SDK `contentBounds` convention

If a theme author wants non-overlapping master/content layers, the SDK's `Master<T>.render` can still return `contentBounds`. The layout uses this to compute padding/margins in its own tokens. But core doesn't enforce it — it's a convention between the master definition and its layouts, mediated by the SDK's `defineTemplate` or future helpers.

---

## Implementation Progress

### Step 1: defineTemplate + Layout in SDK (DONE)

Added `defineTemplate()` and `Layout<TTokens>` to SDK.

### Step 2: Master as first-class SDK type (DONE)

- `Master<T>` interface (plain objects, no factory)
- `Template` type with explicit `master` + `masterTokens` + `layoutTokens`
- `defineTemplate()` accepts separated fields
- Masters discovered from templates (no separate export/registration)
- `MasterRef` and `MasterDefinition` eliminated from SDK exports
- All theme-default templates use new signature
- 254/255 tests pass (1 pre-existing unrelated failure)

### Step 3: Core structured config (NEXT)

Make core master-aware with structured layout config. Eliminate the smuggling hack.

---

## Next Steps: Core structured config (Step 3)

### Step 3a: Add `LayoutConfig` to core types

**File**: `packages/core/src/core/model/types.ts`

Replace:
```typescript
layouts: Record<string, { variants: VariantConfig }>;
```

With:
```typescript
layouts: Record<string, LayoutConfig>;
```

Where `LayoutConfig = { masterName, masterTokens, layoutTokens }`.

### Step 3b: Change `LayoutDefinition.render` return type

**File**: `packages/core/src/core/rendering/registry.ts`

`render` returns `SlideNode` instead of `Slide`.

### Step 3c: Remove `contentBounds` from `MasterDefinition`

**File**: `packages/core/src/core/rendering/registry.ts`

Master render returns `{ content, background }` only.

### Step 3d: Update `documentCompiler`

**File**: `packages/core/src/core/markdown/documentCompiler.ts`

The compiler reads `masterName`/`masterTokens`/`layoutTokens` from the structured config, calls `layout.render(params, slots, layoutTokens)` to get content only, and assembles the `Slide`.

### Step 3e: Update `Presentation.processDeferredSlides`

**File**: `packages/core/src/core/rendering/presentation.ts`

Remove `contentBounds` usage. Render content against full slide bounds. Layout is responsible for its own positioning (via margin/padding tokens).

### Step 3f: Simplify `resolveVariantTokens`

**File**: `packages/core/src/core/model/token.ts`

No longer resolves from an opaque flat bag. Reads `layoutTokens` directly from config.

### Step 3g: Update SDK bridge

**Files**: `packages/sdk/src/template.ts`, `packages/sdk/src/theme.ts`

- `defineTemplate` becomes a simple passthrough (no render wrapper)
- `templatesToLayouts()` produces structured `LayoutConfig` (no smuggling)
- SDK's `defineMaster` adapter drops `contentBounds` passthrough to core

### Step 3h: Update theme-default masters

**File**: `packages/theme-default/src/masters.ts`

Masters return `{ content, background }` — drop `contentBounds` from the return value.

### Step 3i: Update tests

---

## File Inventory

| File | Current State | Step 3 Target |
|------|---------------|---------------|
| `core/model/types.ts` | `layouts: Record<string, { variants: VariantConfig }>` | `layouts: Record<string, LayoutConfig>` |
| `core/rendering/registry.ts` | `LayoutDefinition.render` → `Slide`; `MasterDefinition` has `contentBounds` | `render` → `SlideNode`; no `contentBounds` |
| `core/rendering/presentation.ts` | Uses `contentBounds` to constrain content | Renders content at full slide bounds |
| `core/markdown/documentCompiler.ts` | Calls `layout.render()`, expects `Slide` back | Reads structured config, assembles `Slide` |
| `core/model/token.ts` | `resolveVariantTokens` from flat bag | Reads `layoutTokens` from `LayoutConfig` |
| `sdk/template.ts` | Render wrapper smuggles master through flat bag | Passthrough — no wrapper needed |
| `sdk/theme.ts` | `templatesToLayouts` packs `MasterRef` into flat bag | Produces structured `LayoutConfig` |
| `theme-default/masters.ts` | Returns `{ content, contentBounds, background }` | Returns `{ content, background }` |

---

## Relationship to Other Work

### Multi-Format Themes (done)

Fully implemented:
- Core is format-agnostic (flat `Theme` type)
- SDK owns multi-format types (`ThemeDefinition`, `ThemeFormat`, `resolveThemeFormat`)
- CLI wires: reads `format:` from frontmatter, resolves, passes Theme to core
- Presentation + factsheet formats both working

### SDK Authoring API (future)

The `sdk-authoring-api.md` doc proposes higher-level helpers:
- **Declarative master builder** (`defineMasterChrome`) — uses SDK-side `contentBounds` to compute layout padding
- **Typed slot token bundles** — compile-time validation of component token keys
- **Text style scale generator** — generates textStyles from base size + scale ratio

These build ON TOP of Steps 2+3 and are independent workstreams.

---

## Future Investigation: Master as Layout Composition

**Status**: Not yet designed — investigate after Step 3

### Observation

Masters and layouts use the same component primitives to produce node trees. A master's chrome (footer bar, header bar) is structurally a layout — a spatial arrangement of nodes driven by tokens.

### Hypothesis

A master could be decomposed into:
- **Background**: a pure function from tokens → Background
- **Chrome layout**: a Layout that renders the decorative nodes (footer, logo, bars)
- **Chrome tokens**: token values for the chrome layout

```typescript
// Hypothetical declarative master
{
  name: "default",
  background: (tokens) => ({ color: tokens.surface }),
  chrome: footerLayout,        // a Layout<FooterTokens> — reusable!
  chromeTokens: { ... },
}
```

### Benefits if viable

- Masters become declarative (what) rather than imperative (how)
- Chrome layouts are reusable across masters (e.g., same footer in default + factsheet)
- Reduces the master render function to composition rather than custom code
- Converges the type system without merging Master and Layout into one type

### Questions to answer

1. Do all masters decompose cleanly into background + chrome layout?
2. Does this constrain masters too much? (e.g., masters that need slideSize-dependent logic)
3. How does this interact with the SDK's `contentBounds` convention?
4. Is this just `defineMasterChrome` from the SDK authoring API doc, formalized?

### Relationship

This builds on Step 3 (core structured config) and relates to `sdk-authoring-api.md`'s `defineMasterChrome` helper. Investigate after Step 3 stabilizes.
