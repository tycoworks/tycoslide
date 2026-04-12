# Multi-Format Themes

Design doc for multi-format theme support in tycoslide. Enables a single theme package to produce output in multiple formats — 16:9 presentations, US letter fact sheets, A4 documents, etc. — with shared brand identity but format-specific dimensions, typography, spacing, and layout tokens.

**Status**: Design  
**Breaking change**: Yes — new `ThemeDefinition` / `ThemeFormat` types, mandatory `format:` frontmatter key

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

### Type Changes

Three types. `Theme` (what the compiler uses) keeps its current shape unchanged. Two new types sit above it:

```typescript
// What defineTheme() produces. What theme packages export.
interface ThemeDefinition {
  fonts: FontFamily[];
  formats: Record<string, ThemeFormat>;
}

// Per-format config within a ThemeDefinition.
interface ThemeFormat {
  slide: SlideSize | CustomSlideSize;
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, { variants: VariantConfig }>;
}

// What the compiler receives. Resolved from ThemeDefinition + format name.
// This is today's Theme interface — unchanged in shape.
interface Theme {
  slide: SlideSize | CustomSlideSize;
  fonts: FontFamily[];
  textStyles: Record<string, TextStyle>;
  layouts: Record<string, { variants: VariantConfig }>;
}
```

### Resolution Flow

```
defineTheme({ fonts, formats })  →  ThemeDefinition
                                        ↓
theme loader reads format: "factsheet" from global frontmatter
                                        ↓
resolveThemeFormat(definition, "factsheet")  →  Theme
                                                  ↓
compileDocument(source, { theme })  ←  unchanged from here down
```

Resolution is analogous to how layouts resolve variants:
- `layout: body` + `variant: centered` → specific layout token map
- `theme: @brand/theme` + `format: factsheet` → specific Theme (slide + textStyles + layouts)

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

### Framework Concepts vs Theme Concepts

The framework knows about:
- `ThemeDefinition` — multi-format container
- `ThemeFormat` — per-format slide/textStyles/layouts
- `Theme` — resolved single-format theme for the compiler
- `format:` — mandatory global frontmatter key
- `resolveThemeFormat()` — resolution function
- `SLIDE_SIZE` presets (including new portrait sizes)

The framework does NOT know about:
- Margins (theme master tokens)
- Footers, sidebars, chrome (theme master render functions)
- Spacing scales, padding (theme layout token values)
- Color palettes, accents (theme constants)
- Brand identity sharing patterns (theme author's TypeScript)

### Theme Author Experience

#### Single-format theme

```typescript
export const theme = defineTheme({
  fonts: [myFont],
  formats: {
    default: {
      slide: SLIDE_SIZE.S16x9,
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
import { defineTheme } from '@tycoslide/core';
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

### Portrait Slide Size Presets

New convenience presets in `SLIDE_SIZE`:

```typescript
export const SLIDE_SIZE = {
  // Existing
  S16x9:  { layout: "LAYOUT_16x9",  width: 10, height: 5.625 },
  S16x10: { layout: "LAYOUT_16x10", width: 10, height: 6.25 },
  S4x3:   { layout: "LAYOUT_4x3",   width: 10, height: 7.5 },
  WIDE:   { layout: "LAYOUT_WIDE",  width: 13.33, height: 7.5 },
  // New
  US_LETTER_PORTRAIT: { layout: "CUSTOM" as typeof CUSTOM_LAYOUT, width: 7.5, height: 10 },
  A4_PORTRAIT:        { layout: "CUSTOM" as typeof CUSTOM_LAYOUT, width: 7.5, height: 10.5 },
} as const;
```

`US_LETTER_PORTRAIT` uses 7.5" × 10" — the printable area of US Letter (matching PowerPoint's standard letter slide size). `CustomSlideSize` still supports arbitrary dimensions.

## Implementation

### Phase 1: Core Framework Changes

#### Step 1: Add types and resolution function

**File**: `packages/core/src/core/model/types.ts`

- Add `ThemeDefinition` and `ThemeFormat` interfaces
- Add `resolveThemeFormat(definition: ThemeDefinition, format: string): Theme`
- Add `US_LETTER_PORTRAIT` and `A4_PORTRAIT` to `SLIDE_SIZE`
- `Theme` interface stays exactly as-is

#### Step 2: Update `defineTheme()`

**File**: `packages/core/src/core/rendering/registry.ts`

- `defineTheme()` accepts `{ fonts, formats }` (the `ThemeDefinition` shape)
- Validates font paths (existing behavior)
- Returns `ThemeDefinition`

#### Step 3: Export new types

**File**: `packages/core/src/index.ts`

- Export `ThemeDefinition`, `ThemeFormat`, `resolveThemeFormat`

#### Step 4: Update theme loader

**File**: `packages/cli/src/build.ts`

- After `parseSlideDocument()`, extract `format` from `parsed.global.format`
- Error if missing: `"No format specified. Add 'format: <name>' to the global frontmatter."`
- Pass `format` to `loadTheme()`

**File**: `packages/cli/src/themeLoader.ts`

- Accept `format: string` parameter
- Call `resolveThemeFormat(mod.theme, format)` to resolve `ThemeDefinition` → `Theme`
- Return `LoadedTheme` with the resolved `Theme` (everything downstream unchanged)

### Phase 2: Default Theme Refactor

#### Step 5: Extract shared base tokens

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

#### Step 6: Create format configs

**New file**: `packages/theme-default/src/formats/presentation.ts`

Extract from current `theme.ts` — all dimensional values for the existing 16:9 format:
- `slide: SLIDE_SIZE.S16x9`
- `unit = 0.03125` (1/32 inch), `spacing = unit * 8`, `spacingTight = unit * 4`
- `padding = unit * 8`, `margin = 0.5`, `footerHeight = unit * 8`
- `lineSpacing = 1.2`, `bulletIndentMultiplier = 1.5`
- `textStyles` with current font sizes: title 56pt, h1 44pt, h2 32pt, h3 24pt, h4 18pt, body 14pt, small 12pt, eyebrow 11pt, footer 8pt, code 11pt

**New file**: `packages/theme-default/src/formats/factsheet.ts`

New format-specific values for US letter portrait:
- `slide: SLIDE_SIZE.US_LETTER_PORTRAIT` (7.5" × 10")
- Adjusted spacing scale for document density (smaller base unit)
- `margin = 0.75` (wider margins for print)
- Smaller text styles appropriate for a document: h1 28pt, h2 22pt, h3 18pt, h4 14pt, body 11pt, small 10pt, eyebrow 9pt, footer 7pt, code 9pt

#### Step 7: Create theme build function

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

#### Step 8: Update theme entry points

**Update**: `packages/theme-default/src/theme.ts` — becomes a thin orchestrator:

```typescript
import { defineTheme } from '@tycoslide/core';
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

#### Step 9: Update tests

- Update tests that construct `Theme` via `defineTheme()` to use new multi-format shape
- Update test markdown fixtures to include `format:` in global frontmatter
- Add tests for format resolution:
  - Valid format → correct `Theme` returned
  - Unknown format → error listing available formats
  - Missing format → error with guidance

#### Step 10: Update docs

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
| `packages/core/src/core/model/types.ts` | Add `ThemeDefinition`, `ThemeFormat`, portrait presets, `resolveThemeFormat()` |
| `packages/core/src/core/rendering/registry.ts` | Update `defineTheme()` to accept `{ fonts, formats }` |
| `packages/core/src/index.ts` | Export new types and function |
| `packages/cli/src/build.ts` | Extract mandatory `format:`, pass to `loadTheme()` |
| `packages/cli/src/themeLoader.ts` | Accept `format`, call `resolveThemeFormat()` |
| `packages/theme-default/src/base.ts` | **New** — shared brand tokens |
| `packages/theme-default/src/formats/presentation.ts` | **New** — 16:9 format config |
| `packages/theme-default/src/formats/factsheet.ts` | **New** — US letter portrait format config |
| `packages/theme-default/src/buildTheme.ts` | **New** — factory: base + format → ThemeFormat |
| `packages/theme-default/src/theme.ts` | Simplified — calls defineTheme with formats |

## Unchanged

- **`Theme` type shape** — `{ slide, fonts, textStyles, layouts }` stays exactly the same
- **Compiler** (`documentCompiler.ts`) — receives `Theme`, no changes
- **Presentation class** (`presentation.ts`) — receives `Theme`, no changes
- **PPTX renderer** (`pptxRenderer.ts`) — receives `Theme`, no changes
- **Layout pipeline** (`pipeline.ts`, `htmlRenderer.ts`) — no changes
- **Component definitions** — shared across all formats, no changes
- **Layout definitions** (`layouts.ts`) — shared across all formats, no changes
- **Master definitions** (`master.ts`) — shared across all formats, no changes
- **Token system** — `token.shape()`, `.tokenMap()`, validation unchanged
