# Multi-Format Themes

Design doc for multi-format theme support in tycoslide. Enables a single theme package to produce output in multiple formats — 16:9 presentations, US letter fact sheets, A4 documents, etc. — with shared brand identity but format-specific dimensions, typography, spacing, and layout tokens.

**Status**: Design
**Breaking change**: Yes — mandatory `format:` frontmatter key, `SLIDE_SIZE` removed from core

## Problem

tycoslide binds a theme to a single slide size. The `Theme` interface hardcodes one set of dimensions, text styles, and layout tokens:

```typescript
interface Theme {
  slide: SlideSize | CustomSlideSize;  // Single dimensions
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;  // Single set of font sizes
  layouts: Record<string, { variants: VariantConfig }>;  // Single set of layout tokens
}
```

A company that wants both presentations (16:9) and fact sheets (US letter portrait) from the same brand must maintain two completely independent themes. This duplicates all brand identity — colors, fonts, accents, visual component tokens — and creates drift risk.

## Prior Art

### Canva

Canva's architecture separates brand from format:

- **Brand Kit** — centralized identity (logos, fonts, colors). Shared across ALL content types.
- **Templates per content type** — presentations, social media, documents are separate template categories with different dimensions and layouts, but all pull from the Brand Kit.
- **Magic Resize** — AI-powered adaptation that rearranges elements (not just scales) to fit new formats.

Canva's model: **shared brand identity + separate templates per format + AI bridging**. Our approach is the same conceptually — shared brand tokens + separate layout tokens per format — but declarative at build time.

### Marp

Themes declare named size presets via `@size` metadata in CSS. Authors select via `size:` global directive in frontmatter:

```css
/** @theme gaia
 *  @size 4:3 960px 720px
 *  @size 16:9 1280px 720px
 */
section { width: 1280px; height: 720px; }
```

```yaml
---
theme: gaia
size: 4:3
---
```

Key constraint: **sizes only change dimensions — CSS styling stays identical.** No per-size typography or spacing.

### Slidev

Dimensions are presentation-level config, decoupled from themes:

```yaml
---
aspectRatio: 16/9
canvasWidth: 980
---
```

Themes can set defaults via `package.json`, but the author can override. No concept of different styling per size.

### Reveal.js

Dimensions set in JavaScript initialization. Themes are pure CSS files, fully decoupled from dimensions. No multi-format concept.

### Comparison

| Framework | Dimensions owned by | Multi-size in theme? | Different tokens per size? |
|---|---|---|---|
| **Canva** | Brand Kit + Templates per content type | Yes (separate templates) | Yes (each template is independent) |
| **Marp** | Theme (`@size` presets) + author selects | Yes | No — CSS stays the same |
| **Slidev** | Presentation config (`aspectRatio`) | No | No |
| **Reveal.js** | JS init config | No | No |
| **tycoslide** | Theme (`formats`) + author selects via `format:` | **Yes** | **Yes** |

Our `format:` key is analogous to Marp's `size:` directive — theme declares named formats, author selects in frontmatter. But tycoslide goes further: each format has its own text sizes, spacing, and layout tokens. This is necessary because PPTX is absolute-positioned (not reflowed CSS), so a 14pt body font designed for projection on a 10"-wide slide doesn't work on a 7.5" × 10" printed fact sheet.

### Competitive Landscape

No existing tool combines: markdown input + design token system + component architecture + native editable PPTX objects + multi-format support.

| Tool | Native PPTX objects? | Design tokens? | Multi-format? |
|---|---|---|---|
| Marp | No (images in PPTX) | CSS themes | Size presets (dimensions only) |
| Slidev | No (images in PPTX) | CSS/Vue | No |
| md2pptx | Yes (basic) | Reference template | No |
| Pandoc | Yes (basic) | Reference template | No |
| frontend-slides | No (HTML only) | None | No |
| PPTAgent/Presenton | Yes (AI-generated) | Template-based | No |
| **tycoslide** | **Yes** | **TypeScript tokens + components** | **Proposed** |

## Design

### Architectural Principle: Core Is Format-Agnostic

The core compiler only ever needs one complete, flattened theme for a single build run. It does not need to know about formats, multi-format definitions, or format resolution. Multi-format is a **theme authoring concern** layered on top of the core.

```
Layer 1 — Core (pure compiler)
  Theme = { slide: { width, height }, fonts, textStyles, layouts }
  compileDocument(source, { theme })  ← the real boundary

Layer 2 — CLI (orchestrator, temporary home for multi-format)
  ThemeDefinition = { fonts, formats: Record<string, ThemeFormat> }
  ThemeFormat = { slide, textStyles, layouts }
  resolveThemeFormat(definition, formatName) → Theme
  validateThemeFonts(definition) → void

Layer 3 — Future: @tycoslide/theme-tools (when a second theme exists)
  Extract ThemeDefinition, defineTheme, resolveThemeFormat from CLI
```

### Type Changes

Core's `Theme` is the only type the compiler sees. It keeps its current shape, with one simplification — `slide` becomes `{ width: number; height: number }` (removing the pptxgenjs `layout` string leak):

```typescript
// Core: what the compiler receives. One complete theme for one build run.
interface Theme {
  slide: { width: number; height: number };  // inches
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, { variants: VariantConfig }>;
}
```

Two types live in the CLI (or future theme-tools), not in core:

```typescript
// CLI: what a theme package exports.
interface ThemeDefinition {
  fonts: FontFamily[];
  formats: Record<string, ThemeFormat>;
}

// CLI: per-format config within a ThemeDefinition.
interface ThemeFormat {
  slide: { width: number; height: number };
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, { variants: VariantConfig }>;
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

Core never sees ThemeDefinition. It receives a flat Theme and compiles.

### Frontmatter

`format:` is **mandatory** in global frontmatter:

```yaml
---
theme: "@tycoslide/theme-default"
format: presentation
---
```

Error messages follow tycoslide's pattern of listing available options:
- Missing `format:` → `"No format specified. Add 'format: <name>' to the global frontmatter. Available formats in this theme: presentation, factsheet"`
- Unknown format → `"Unknown format 'factcheat'. Available formats: presentation, factsheet"`

### What Changes Between Formats

| Shared in `ThemeDefinition` | Per-format in `ThemeFormat` |
|---|---|
| `fonts` (font families) | `slide` (dimensions) |
| | `textStyles` (font sizes, line heights) |
| | `layouts` (layout token maps with spacing, padding, margins) |

Brand identity tokens (colors, accents, borders, shadows, visual styling) live in the theme author's source code as shared constants. They are used when constructing each format's layout token maps. The framework doesn't need to know about them — they flow through the existing token system.

### Slide Size: No Presets in Core

`SLIDE_SIZE` is removed from core. The `layout` field was a pptxgenjs implementation detail leaking into the model layer. Themes define their own slide dimensions freely as `{ width: number; height: number }`.

Convenience presets live in theme-default (or a future shared utils package), not core:

```typescript
// In @tycoslide/theme-default or shared utils
export const SLIDE_PRESETS = {
  S16x9: { width: 10, height: 5.625 },
  S16x10: { width: 10, height: 6.25 },
  S4x3: { width: 10, height: 7.5 },
  US_LETTER_PORTRAIT: { width: 7.5, height: 10 },
  A4_PORTRAIT: { width: 7.5, height: 10.5 },
} as const;
```

The pptxRenderer always uses `defineLayout()` with custom dimensions — no more built-in layout name strings.

### Framework vs Theme Concepts

The core framework knows about:
- `Theme` — flat, single-format theme for the compiler
- `compileDocument()` — the compiler boundary

The CLI / theme-tools layer knows about:
- `ThemeDefinition` — multi-format container
- `ThemeFormat` — per-format slide/textStyles/layouts
- `format:` — mandatory global frontmatter key
- `resolveThemeFormat()` — resolution function
- `validateThemeFonts()` — multi-format validation

The framework does NOT know about:
- Margins (theme master tokens)
- Footers, sidebars, chrome (theme master render functions)
- Spacing scales, padding (theme layout token values)
- Color palettes, accents (theme constants)
- Brand identity sharing patterns (theme author's TypeScript)

### Theme Author Experience

#### Single-format theme

```typescript
import { defineTheme } from '@tycoslide/cli';  // or future @tycoslide/theme-tools

export const theme = defineTheme({
  fonts: [myFont],
  formats: {
    default: {
      slide: { width: 10, height: 5.625 },
      textStyles: { h1: {...}, body: {...}, ... },
      layouts: {
        body: { variants: { default: bodyLayout.tokenMap({...}) } },
        title: { variants: { default: titleLayout.tokenMap({...}) } },
      },
    },
  },
});
```

```yaml
---
theme: my-theme
format: default
---
```

#### Multi-format theme (recommended pattern)

```
my-theme/src/
├── base.ts              ← Shared: palette, fonts, accents, visual token bases
├── formats/
│   ├── presentation.ts  ← Dimensions, spacing, text sizes for 16:9
│   └── factsheet.ts     ← Dimensions, spacing, text sizes for US letter
├── buildTheme.ts        ← Factory: base + format config → ThemeFormat
├── theme.ts             ← defineTheme() orchestrator
├── layouts.ts           ← Layout definitions (shared across formats)
├── master.ts            ← Master definitions (shared across formats)
├── assets.ts            ← Fonts, images (shared across formats)
└── index.ts             ← Exports theme, components, layouts, masters
```

```typescript
// theme.ts
import { defineTheme } from '@tycoslide/cli';  // or future @tycoslide/theme-tools
import * as base from './base.js';
import { presentationConfig } from './formats/presentation.js';
import { factsheetConfig } from './formats/factsheet.js';
import { buildThemeFormat } from './buildTheme.js';

export const theme = defineTheme({
  fonts: [base.fonts.inter, base.fonts.interLight, base.fonts.firaCode],
  formats: {
    presentation: buildThemeFormat(base, presentationConfig),
    factsheet: buildThemeFormat(base, factsheetConfig),
  },
});
```

The `buildThemeFormat` factory is theme-specific code (not a framework function). It takes shared brand tokens + format-specific dimensional values and assembles the complete `ThemeFormat` — building intermediate token objects, master configs, and layout token maps.

## Implementation

### Phase 0: Core Cleanup (SLIDE_SIZE Removal)

#### Step 0a: Simplify `Theme.slide`

**File**: `packages/core/src/core/model/types.ts`

- Remove `SLIDE_SIZE` const object
- Remove `SlideSize` type (the union of built-in layout strings)
- Remove `CustomSlideSize` type
- Remove `CUSTOM_LAYOUT` const
- Change `Theme.slide` to `{ width: number; height: number }`

#### Step 0b: Update pptxRenderer

**File**: `packages/core/src/core/rendering/pptxRenderer.ts`

- Always use `defineLayout()` with dimensions from `theme.slide`
- Remove conditional logic for built-in layout names
- Always set `pres.layout = "CUSTOM"`

#### Step 0c: Move presets to theme-default

**File**: `packages/theme-default/src/slidePresets.ts` (**new**)

- Export `SLIDE_PRESETS` with convenience dimension objects
- Update `packages/theme-default/src/theme.ts` to use presets

#### Step 0d: Update all consumers

- Fix all imports/references to removed types across packages
- Update test mocks that reference `SlideSize`, `CUSTOM_LAYOUT`, etc.
- Update docs that reference `SLIDE_SIZE`

### Phase 1: Multi-Format Support

#### Step 1: Add multi-format types to CLI

**File**: `packages/cli/src/themeDefinition.ts` (**new**)

- Define `ThemeDefinition` and `ThemeFormat` interfaces
- Export `defineTheme(definition: ThemeDefinition): ThemeDefinition` — validates and returns

#### Step 2: Add resolution function to CLI

**File**: `packages/cli/src/themeFormat.ts` (**new**)

- `resolveThemeFormat(definition: ThemeDefinition, format: string | undefined): Theme`
- Validates format is provided and exists in definition
- Error messages list available formats
- Assembles `Theme` from `definition.fonts` + `definition.formats[format]`

#### Step 3: Add multi-format validation to CLI

**File**: `packages/cli/src/themeValidator.ts` (**new**)

- `validateThemeFonts(definition: ThemeDefinition): void`
- Validates font paths on shared `fonts` array
- Iterates each format's `textStyles` and `layouts` to validate font registration per-format

#### Step 4: Update theme loader

**File**: `packages/cli/src/build.ts`

- Extract `format` from `parsed.global.format`
- Pass `format` to `loadTheme()`

**File**: `packages/cli/src/themeLoader.ts`

- Accept `format: string | undefined` parameter
- Call `resolveThemeFormat(mod.theme, format)` to get flat `Theme`
- Return `LoadedTheme` with resolved `Theme`

#### Step 4b: Programmatic API

Users who call `compileDocument()` directly (not through the CLI) work with the flat `Theme` type — no format resolution needed. If they want multi-format support, they import `resolveThemeFormat` from the CLI package (or future theme-tools).

#### Step 5: Core's `defineTheme()` stays flat

**File**: `packages/core/src/core/rendering/registry.ts`

- `defineTheme()` accepts and returns flat `Theme` (no change from pre-multi-format)
- `validateThemeFonts()` in core validates a flat `Theme` (font paths + textStyle font registration)

### Phase 2: Default Theme Refactor

#### Step 6: Extract shared base tokens

**New file**: `packages/theme-default/src/base.ts`

Move all format-independent constants from `theme.ts`:
- `TEXT_STYLE` names (current lines 32-43)
- `palette`, `accents` — colors (current lines 49-67)
- `borderWidth`, `cornerRadius`, `cornerRadiusLarge`, `accentBarWidth` — visual decoration constants (current lines 83-86)
- `subtleBorder`, `shadow` — visual decoration objects (current lines 87-96)
- `richTextBase`, `heroBase`, `labelBase` — text token bases that reference palette (current lines 107-114)
- `cardBackground` — visual card styling (current lines 171-176)
- `imageBase` — base image tokens (current line 159)
- `HIGHLIGHT_THEME.GITHUB_DARK` reference
- Alignment constants (`alignLeft`, `alignCenter`)
- Font references from `assets.ts`

These are all brand-identity values. Colors, visual styling, font families — things that define the brand regardless of output format.

#### Step 7: Create format configs

**New file**: `packages/theme-default/src/formats/presentation.ts`

Extract from current `theme.ts` — all dimensional values for the existing 16:9 format:
- `slide: SLIDE_PRESETS.S16x9`
- `unit = 0.03125` (1/32 inch), `spacing = unit * 8`, `spacingTight = unit * 4`
- `padding = unit * 8`, `margin = 0.5`, `footerHeight = unit * 8`
- `lineSpacing = 1.2`, `bulletIndentMultiplier = 1.5`
- `textStyles` with current font sizes: title 56pt, h1 44pt, h2 32pt, h3 24pt, h4 18pt, body 14pt, small 12pt, eyebrow 11pt, footer 8pt, code 11pt

**New file**: `packages/theme-default/src/formats/factsheet.ts`

New format-specific values for US letter portrait:
- `slide: SLIDE_PRESETS.US_LETTER_PORTRAIT` (7.5" × 10")
- Adjusted spacing scale for document density (smaller base unit)
- `margin = 0.75` (wider margins for print)
- Smaller text styles appropriate for a document: h1 28pt, h2 22pt, h3 18pt, h4 14pt, body 11pt, small 10pt, eyebrow 9pt, footer 7pt, code 9pt

#### Step 8: Create theme build function

**New file**: `packages/theme-default/src/buildTheme.ts`

Factory function: `buildThemeFormat(base, formatConfig) → ThemeFormat`

Takes shared brand tokens (base) + format-specific dimensional config. Assembles:
1. Body text tokens — base colors + format text style names
2. Heading label tokens — base colors + format text style names
3. Component token groups (card, table, code, quote, mermaid, testimonial) — base visual tokens + format spacing/padding
4. Body slot token bundle — aggregates all component tokens
5. Master configs — format margins/footerHeight + base colors
6. Layout token maps — format spacing + base visual tokens + master configs
7. Returns `{ slide, textStyles, layouts }` — a complete `ThemeFormat`

This is the function that replaces the current inline construction in `theme.ts`. All the intermediate objects (`bodyText`, `cardBase`, `bodySlotTokens`, `bodyBase`, `cardsBase`, etc.) are built inside this function using both base and format values.

#### Step 9: Update theme entry points

**Update**: `packages/theme-default/src/theme.ts` — becomes a thin orchestrator:

```typescript
import { defineTheme } from '@tycoslide/cli';
import * as base from './base.js';
import { presentationConfig } from './formats/presentation.js';
import { factsheetConfig } from './formats/factsheet.js';
import { buildThemeFormat } from './buildTheme.js';

export const theme = defineTheme({
  fonts: [base.fonts.inter, base.fonts.interLight, base.fonts.firaCode],
  formats: {
    presentation: buildThemeFormat(base, presentationConfig),
    factsheet: buildThemeFormat(base, factsheetConfig),
  },
});
```

**Update**: `packages/theme-default/src/index.ts` — still exports `theme`, `components`, `layouts`, `masters`. No structural change needed.

### Phase 3: Tests & Docs

#### Step 10: Update tests

- Update test markdown fixtures to include `format:` in global frontmatter
- Add tests for format resolution:
  - Valid format → correct `Theme` returned
  - Unknown format → error listing available formats
  - Missing format → error with guidance

#### Step 11: Update docs

- `docs/themes.md` — update `defineTheme()` examples, document `ThemeDefinition`/`ThemeFormat`, add format docs
- `docs/markdown-syntax.md` — document mandatory `format:` global frontmatter key
- `docs/quick-start.md` — add `format: presentation` to example frontmatter

### Phase 4: Verify

- `npm run build` — all four packages compile
- `npm test` — all existing tests pass (with format fixtures updated)
- Build test deck with `format: presentation` → identical PPTX output as before (regression)
- Build test deck with `format: factsheet` → portrait US letter PPTX (7.5" × 10")
- Build test deck without `format:` → clear error message
- Build test deck with `format: nonexistent` → error listing available formats
- Open both outputs in PowerPoint/Google Slides to verify dimensions and visual quality

## Critical Files

| File | Change |
|------|--------|
| `packages/core/src/core/model/types.ts` | Remove `SLIDE_SIZE`, `SlideSize`, `CustomSlideSize`, `CUSTOM_LAYOUT`; simplify `Theme.slide` |
| `packages/core/src/core/rendering/pptxRenderer.ts` | Always use `defineLayout()` with dimensions |
| `packages/cli/src/themeDefinition.ts` | **New** — `ThemeDefinition`, `ThemeFormat`, multi-format `defineTheme()` |
| `packages/cli/src/themeFormat.ts` | **New** — `resolveThemeFormat()` with format validation |
| `packages/cli/src/themeValidator.ts` | **New** — multi-format `validateThemeFonts()` |
| `packages/cli/src/build.ts` | Extract mandatory `format:`, pass to `loadTheme()` |
| `packages/cli/src/themeLoader.ts` | Accept `format`, call `resolveThemeFormat()` |
| `packages/theme-default/src/slidePresets.ts` | **New** — convenience dimension presets |
| `packages/theme-default/src/base.ts` | **New** — shared brand tokens |
| `packages/theme-default/src/formats/presentation.ts` | **New** — 16:9 format config |
| `packages/theme-default/src/formats/factsheet.ts` | **New** — US letter portrait format config |
| `packages/theme-default/src/buildTheme.ts` | **New** — factory: base + format → ThemeFormat |
| `packages/theme-default/src/theme.ts` | Simplified — calls defineTheme with formats |

## Unchanged

- **`Theme` type name** — stays as `Theme` (no rename needed)
- **`Theme` type shape** — `{ slide, fonts, textStyles, layouts }` (slide simplified to `{ width, height }`)
- **Compiler** (`documentCompiler.ts`) — receives `Theme`, no changes
- **Presentation class** (`presentation.ts`) — receives `Theme`, no changes
- **PPTX renderer** (`pptxRenderer.ts`) — minor change to always use `defineLayout()`
- **Layout pipeline** (`pipeline.ts`, `htmlRenderer.ts`) — no changes
- **Component definitions** — shared across all formats, no changes
- **Layout definitions** (`layouts.ts`) — shared across all formats, no changes
- **Master definitions** (`master.ts`) — shared across all formats, no changes
- **Token system** — `token.shape()`, `.tokenMap()`, validation unchanged
