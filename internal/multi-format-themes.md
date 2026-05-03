# Multi-Format Themes & Template Unification

Single design doc for tycoslide's multi-format theme system and template unification. Covers the full journey from single-format themes → multi-format support → unified template authoring model.

**Status**: Implementation (Multi-format done; Template unification Step 3 done — May 2026)
**Branch**: multi-format-themes
**Breaking change**: Yes — mandatory `format:` frontmatter key, `SLIDE_SIZE` removed from core

---

## Table of Contents

- [Problem](#problem)
- [Prior Art](#prior-art)
- [Design: Multi-Format Themes](#design-multi-format-themes)
- [Design: Template Unification](#design-template-unification)
- [Current Architecture](#current-architecture-may-2026)
- [Implementation: Multi-Format (Done)](#implementation-multi-format-done)
- [Implementation: Template Unification](#implementation-template-unification)
- [File Inventory](#file-inventory)
- [Future Steps](#future-steps)

---

## Problem

### Multi-Format

tycoslide bound a theme to a single slide size. The `Theme` interface hardcoded one set of dimensions, text styles, and layout tokens. A company that wants both presentations (16:9) and fact sheets (US letter portrait) from the same brand must maintain two completely independent themes — duplicating all brand identity and creating drift risk.

### Template Authoring

The theme authoring model had 3 layers between Brand and Content:

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

---

## Prior Art

### Multi-Format Prior Art

| Framework | Dimensions owned by | Multi-size in theme? | Different tokens per size? |
|---|---|---|---|
| **Canva** | Brand Kit + Templates per content type | Yes (separate templates) | Yes (each template is independent) |
| **Marp** | Theme (`@size` presets) + author selects | Yes | No — CSS stays the same |
| **Slidev** | Presentation config (`aspectRatio`) | No | No |
| **Reveal.js** | JS init config | No | No |
| **tycoslide** | Theme (`formats`) + author selects via `format:` | **Yes** | **Yes** |

Our `format:` key is analogous to Marp's `size:` directive — theme declares named formats, author selects in frontmatter. But tycoslide goes further: each format has its own text sizes, spacing, and layout tokens. This is necessary because PPTX is absolute-positioned (not reflowed CSS).

### Template Prior Art

| Tool | Chrome + Layout union | Variant mechanism |
|------|----------------------|-------------------|
| PowerPoint | Slide Layout inherits from Slide Master | Multiple masters (light/dark) |
| Keynote | Master Slide fuses both | Duplicate masters |
| Canva | Template (locked + unlocked elements) | Separate templates |
| Slidev | Layout (Vue component) + Theme (CSS) | CSS variables |
| Figma | Variables + Modes | Mode switching |

Key finding: PPTX has NO content area concept. Slide content can be placed anywhere — including on top of master chrome. `contentBounds` is a tycoslide invention.

### Competitive Landscape

No existing tool combines: markdown input + design token system + component architecture + native editable PPTX objects + multi-format support.

| Tool | Native PPTX objects? | Design tokens? | Multi-format? |
|---|---|---|---|
| Marp | No (images in PPTX) | CSS themes | Size presets (dimensions only) |
| Slidev | No (images in PPTX) | CSS/Vue | No |
| md2pptx | Yes (basic) | Reference template | No |
| Pandoc | Yes (basic) | Reference template | No |
| PPTAgent/Presenton | Yes (AI-generated) | Template-based | No |
| **tycoslide** | **Yes** | **TypeScript tokens + components** | **Yes** |

---

## Design: Multi-Format Themes

### Architectural Principle: Core Is Format-Agnostic

The core compiler only ever needs one complete, flattened theme for a single build run. It does not need to know about formats, multi-format definitions, or format resolution. Multi-format is a **theme authoring concern** layered on top of the core.

```
Layer 1 — Core (pure compiler)
  Theme = { slide: { width, height }, fonts, textStyles, layouts }
  compileDocument(source, { theme })  ← the real boundary

Layer 2 — SDK (theme authoring)
  ThemeDefinition = { fonts, formats: Record<string, ThemeFormat> }
  ThemeFormat = { slide, textStyles, templates }
  resolveThemeFormat(definition, formatName) → Theme

Layer 3 — CLI (orchestrator)
  Reads format: from frontmatter, calls resolveThemeFormat, passes Theme to core
```

### Core Type: Theme

Core's `Theme` is the only type the compiler sees — flat, single-format:

```typescript
interface Theme {
  slide: { width: number; height: number };  // inches
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, TemplateConfig>;   // one config per template name
}
```

### SDK Types: ThemeDefinition + ThemeFormat

```typescript
interface ThemeDefinition {
  fonts: FontFamily[];
  formats: Record<string, ThemeFormat>;
}

interface ThemeFormat {
  slide: { width: number; height: number };
  textStyles: Record<string, TextStyle>;
  templates: Template[];
}
```

### Resolution Flow

```
Theme package exports ThemeDefinition  →  { fonts, formats: { presentation: {...}, factsheet: {...} } }
                                              ↓
CLI reads format: "factsheet" from global frontmatter
                                              ↓
CLI calls resolveThemeFormat(definition, "factsheet")  →  Theme
                                                            ↓
CLI passes flat Theme to compileDocument(source, { theme })  ←  core boundary
```

### Frontmatter

`format:` is **mandatory** in global frontmatter:

```yaml
---
theme: "@tycoslide/theme-default"
format: presentation
---
```

Error messages list available options:
- Missing `format:` → `"No format specified. Available formats: presentation, factsheet"`
- Unknown format → `"Unknown format 'factcheat'. Available formats: presentation, factsheet"`

### What Changes Between Formats

| Shared in `ThemeDefinition` | Per-format in `ThemeFormat` |
|---|---|
| `fonts` (font families) | `slide` (dimensions) |
| | `textStyles` (font sizes, line heights) |
| | `templates` (layouts + tokens for that format) |

Brand identity tokens (colors, accents, borders, shadows) live in theme source as shared constants. They flow through the token system.

### Slide Size: No Presets in Core

`SLIDE_SIZE` removed from core. Themes define dimensions freely as `{ width, height }`. Convenience presets live in theme-default:

```typescript
export const SLIDE_PRESETS = {
  S16x9: { width: 10, height: 5.625 },
  US_LETTER_PORTRAIT: { width: 7.5, height: 10 },
  A4_PORTRAIT: { width: 7.5, height: 10.5 },
} as const;
```

---

## Design: Template Unification

### Design Decisions

1. **Template = the single authoring concept.** One field in markdown: `template: body-centered`. Replaces `layout: body` + `variant: centered`.

2. **Variants eliminated.** Token resolution is direct lookup. Templates that share a content arrangement reuse the same Layout object with different tokens.

3. **Three-level internal separation** (Layout / Master / Template). Theme authors work with Templates. Layouts and Masters are implementation details for reuse.

4. **Core is master-aware but template-agnostic.** Core knows masters and layouts — two independent rendering layers. "Template" lives only in SDK.

### Three-Level Pattern

Blueprint (reusable) → Template (blueprint + tokens) → Registration (invisible plumbing)

#### Layout — structural content blueprint

```typescript
interface Layout<TTokens> {
  params: ScalarShape;
  slots?: readonly string[];
  render: (params, slots, tokens: TTokens) => SlideNode;
}
```

- 14 unique layouts → 17 templates
- Token interfaces named `*TemplateTokens`
- No name, no registration — just a structural blueprint

#### Master — chrome/background blueprint

```typescript
interface Master<TTokens> {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterResult;
}
```

- 3 masters: default, minimal, factsheet
- Plain objects — NO `defineMaster()` factory for theme authors

#### Template — the complete styled thing

```typescript
defineTemplate({
  name: TEMPLATE.BODY,
  description: "Markdown body with optional title.",
  layout: body,                          // Layout object
  master: defaultMaster,                 // Master object
  masterTokens: { background, margin },  // tokens for the master
  layoutTokens: { text, list, ... },     // tokens for the layout
})
```

### Core TemplateConfig

Core receives structured config per template name — no opaque token bags, no smuggling:

```typescript
export interface TemplateConfig {
  masterName: string;
  masterTokens: Record<string, unknown>;
  layoutTokens: Record<string, unknown>;
}

export interface Theme {
  slide: { width: number; height: number };
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, TemplateConfig>;
}
```

### Pipeline Flow

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
   c. Calls layout.render(params, slots, layoutTokens) → SlideNode (content only)
   d. Assembles Slide { masterName, masterTokens, content }

4. Core Presentation.processDeferredSlides:
   a. masterRegistry.get(masterName).render(masterTokens, slideSize) → { content, background }
   b. Render master component tree (full slide bounds)
   c. Render slide content tree (full slide bounds)
   d. Compose: master behind, content on top
```

---

## Current Architecture (May 2026)

### What's implemented

Multi-format themes and template unification Steps 1–3 are complete:

| Feature | Status |
|---------|--------|
| Core format-agnostic (`Theme` flat type) | Done |
| SDK multi-format (`ThemeDefinition`, `ThemeFormat`, `resolveThemeFormat`) | Done |
| CLI wiring (reads `format:`, resolves, passes to core) | Done |
| `defineTemplate()` with explicit master + tokens | Done |
| `Master<T>` as plain interface (no factory) | Done |
| Core `TemplateConfig` (structured, no smuggling) | Done |
| `LayoutDefinition.render` → `SlideNode` (content only) | Done |
| `resolveVariantTokens` eliminated | Done |
| Presentation + factsheet formats working | Done |
| 712 tests passing | Done |

### What was eliminated

| Removed | Replacement |
|---------|-------------|
| `SLIDE_SIZE`, `SlideSize`, `CustomSlideSize` | `{ width, height }` on Theme |
| `VariantConfig` type | `TemplateConfig` (structured) |
| `variants` nesting in `Theme.layouts` | Direct `Record<string, TemplateConfig>` |
| `MasterRef` type | Direct master object reference |
| `defineMaster()` in theme-default | Plain `Master<T>` objects |
| `mod.masters` separate export | Masters discovered from templates |
| Magic `"master"` key in token bag | Explicit `master` + `masterTokens` fields |
| `LayoutDefinition.render` returning `Slide` | Returns `SlideNode` (content only) |
| `resolveVariantTokens` | Direct `layoutTokens` read from `TemplateConfig` |
| `variant:` frontmatter key | Single `template:` name |

### SDK exports (template.ts)

```typescript
interface Master<TTokens extends object = Record<string, unknown>> {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterResult;
}

interface MasterResult {
  content: ComponentNode;
  contentBounds?: Bounds;
  background: Background;
}

interface Template {
  layout: LayoutDefinition;
  master: Master<any>;
  masterTokens: Record<string, unknown>;
  layoutTokens: Record<string, unknown>;
}
```

### Theme author experience

```typescript
// theme.ts — thin orchestrator
import { defineTheme } from '@tycoslide/sdk';
import * as base from './foundations/base.js';
import { presentationConfig } from './formats/presentation.js';
import { factsheetConfig } from './formats/factsheet.js';

export const theme = defineTheme({
  fonts: [base.fonts.inter, base.fonts.interLight, base.fonts.firaCode],
  formats: {
    presentation: presentationConfig,
    factsheet: factsheetConfig,
  },
});
```

---

## Implementation: Multi-Format (Done)

### Phase 0: Core Cleanup (SLIDE_SIZE Removal)

- Removed `SLIDE_SIZE`, `SlideSize`, `CustomSlideSize`, `CUSTOM_LAYOUT` from core types
- Changed `Theme.slide` to `{ width: number; height: number }`
- pptxRenderer always uses `defineLayout()` with custom dimensions
- Presets moved to theme-default

### Phase 1: Multi-Format Types

- `ThemeDefinition` and `ThemeFormat` interfaces in SDK
- `resolveThemeFormat(definition, format)` → flat `Theme`
- `validateThemeFonts()` iterates all formats
- CLI extracts `format:` from frontmatter, passes to theme loader

### Phase 2: Default Theme Refactor

- Shared brand tokens extracted to `foundations/`
- Format-specific configs in `formats/presentation.ts` and `formats/factsheet.ts`
- Factory function builds complete `ThemeFormat` from base + format config

---

## Implementation: Template Unification

### Step 1: defineTemplate + Layout in SDK (Done)

Added `defineTemplate()` factory and `Layout<TTokens>` interface to SDK.

### Step 2: Master as first-class SDK type (Done)

- `Master<T>` interface (plain objects, no factory)
- `Template` type with explicit `master` + `masterTokens` + `layoutTokens`
- `defineTemplate()` accepts separated fields
- `MasterRef` and old `MasterDefinition` eliminated from SDK exports
- All theme-default templates use new signature

### Step 3: Core structured config (Done)

- Added `TemplateConfig` to core types, replaced `VariantConfig`
- `Theme.layouts` is now `Record<string, TemplateConfig>` (no variants nesting)
- `LayoutDefinition.render` returns `SlideNode` (content only)
- Document compiler reads structured config, assembles `Slide`
- `resolveVariantTokens` deleted entirely
- SDK `templatesToLayouts()` produces structured `TemplateConfig`
- `defineTemplate` is a simple passthrough (no render wrapper)
- All 712 tests pass

---

## File Inventory

| File | Role |
|------|------|
| `core/model/types.ts` | `Theme`, `TemplateConfig`, `Slide` |
| `core/rendering/registry.ts` | `LayoutDefinition` (render → SlideNode), `MasterDefinition` |
| `core/rendering/presentation.ts` | Assembles master + content layers |
| `core/markdown/documentCompiler.ts` | Reads `TemplateConfig`, calls layout.render, builds `Slide` |
| `core/model/token.ts` | Token utilities (no variant resolution) |
| `sdk/template.ts` | `defineTemplate`, `Master<T>`, `Template` interface |
| `sdk/theme.ts` | `ThemeDefinition`, `ThemeFormat`, `resolveThemeFormat`, `templatesToLayouts` |
| `cli/src/build.ts` | Reads `format:`, calls `resolveThemeFormat` |
| `cli/src/themeLoader.ts` | Loads theme, resolves format |
| `theme-default/src/theme.ts` | Thin orchestrator — defineTheme with formats |
| `theme-default/src/foundations/` | Shared brand tokens (palette, fonts, accents) |
| `theme-default/src/formats/` | Per-format configs (presentation, factsheet) |

---

## Future Steps

### Move Markdown Compilation from Core to SDK

The markdown layer (`documentCompiler.ts`, `slideParser.ts`, `slotCompiler.ts`) currently lives in `packages/core/src/core/markdown/`. This should move to `packages/sdk/src/markdown/` so that core becomes a pure renderer:

- Core receives: `Slide[]` + `Theme` → produces `.pptx`
- SDK owns: markdown parsing, slot compilation, layout token injection, template resolution
- Already done on the `multi-format-themes` branch of the `tycoslide` repo (not yet merged to `tycoslide-clean`)

### Eliminate Registries from Core

Make core a pure, stateless function — no global singletons. Single entry point receives everything it needs.

#### Target API

```typescript
interface PresentationConfig {
  theme: Theme;
  assets?: Record<string, unknown>;
  masters: MasterDefinition[];
  components: ComponentDefinition[];
}

function createPresentation(config: PresentationConfig): Presentation;
```

#### Design Decisions

- **Pass registries as parameters, not inline on slides.** Slides stay pure data (`{ masterName, masterTokens, content }`). Masters and components are loaded once per build.
- **Add `renderTree` to `RenderContext`.** Components that contain sub-components (e.g., table) call `context.renderTree(node)` instead of importing a global registry. Presentation class wires this via closure over its local component Map.
- **Single entry point, not builder pattern.** One-shot operation — you have all data, create the engine, call writeFile.
- **`layoutRegistry` already only used by SDK.** Moves with markdown compilation.
- **`componentRegistry` also becomes a parameter.** Passed into `createPresentation()`, stored as local Map, accessed via `context.renderTree`.

#### Implementation Steps

1. Add `renderTree` to `RenderContext` interface (additive, non-breaking)
2. `Presentation` constructor accepts `PresentationConfig` (masters + components arrays), builds internal Maps
3. Wire `renderTree` on context to use local component Map (closure)
4. Update table.ts (and any other components) to use `context.renderTree()` instead of importing `componentRegistry`
5. Update `documentCompiler.ts` to receive components list (for `resolveTokens` lookups)
6. Export `createPresentation()` as public entry point
7. Remove `componentRegistry`, `masterRegistry`, `layoutRegistry` singleton exports from `core/index.ts`
8. Update CLI `themeLoader.ts` to pass data through instead of mutating globals

### Master as Layout Composition (Investigate)

Masters and layouts use the same component primitives. A master could be decomposed into:
- **Background**: pure function from tokens → Background
- **Chrome layout**: a `Layout` that renders decorative nodes (footer, logo, bars)
- **Chrome tokens**: token values for the chrome layout

Benefits if viable: masters become declarative, chrome layouts are reusable across masters, converges the type system. Investigate after markdown moves to SDK.

### SDK Authoring API (future)

Higher-level helpers proposed in `sdk-authoring-api.md`:
- **Declarative master builder** (`defineMasterChrome`) — uses SDK-side `contentBounds` to compute layout padding
- **Typed slot token bundles** — compile-time validation of component token keys
- **Text style scale generator** — generates textStyles from base size + scale ratio

These build on top of the completed template unification and are independent workstreams.
