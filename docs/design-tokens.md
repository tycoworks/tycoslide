# Design Tokens & Spacing System

**Status:** Implemented

---

## Overview

This document covers three implemented architectural concerns:

1. **Component Design Tokens & Color Semantic Layer** - DTCG-aligned three-tier token model with component-level tokens
2. **Named Variants** - Theme-defined variant presets for components
3. **Gap/Spacing Architecture** - How components handle spacing semantically

---

## Part 1: Component Design Tokens & Color Semantic Layer

### Color Semantic Layer

The old `accent1-5` positional system and `highlights` named pairs have been replaced with a unified `accents: Record<string, string>` map on `ColorScheme`.

**Removed from types.ts:**
- `COLOR_NAME` enum
- `BaseColorScheme`
- `HighlightScheme`

**Kept as internal render type:**
- `HighlightPair` — remains on `NormalizedRun` as an internal type used by the renderer

**How highlights work now:**
- Highlights are derived from accents at parse time
- `{ bg: colors.background, text: accentColor }` — background flips to the slide background, text takes the accent color
- Mermaid `classDef` blocks iterate `theme.colors.accents` (e.g., `classDef teal fill:#08F0D4`)
- Markdown `:teal[text]` resolves via `theme.colors.accents.teal`

**Semantic accent names:**

Accent names can be semantic (describing purpose) or literal (describing color). The framework treats all accent names identically — it just looks up the key. Semantic meaning lives entirely in the theme.

```typescript
accents: {
  // Color names — useful when the author is thinking about visual appearance
  teal: palette.teal,
  pink: palette.pink,
  orange: palette.orange,

  // Semantic names — useful when the author is thinking about content meaning
  problem: palette.orange,     // "before" state, pain points
  solution: palette.teal,      // "after" state, improvements
  metrics: palette.teal,       // quantitative results
  definition: palette.lightPurple,  // terms being defined
}
```

Both `:teal[text]` and `:solution[text]` work — content authors choose whichever name fits their intent. A theme can map multiple semantic names to the same color (e.g., `solution` and `metrics` both map to teal). This is intentional: the semantic name documents _why_ the color is used, making presentations easier to maintain when the brand palette changes.

### DTCG-Aligned Three-Tier Token Model

Tokens are organized into three tiers following the [Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) model:

| Tier | Location | Description |
|------|----------|-------------|
| **Tier 1: Primitive tokens** | `theme.colors`, `theme.spacing`, `theme.borders` | Raw values — colors, sizes, radii |
| **Tier 2: Component tokens** | `theme.components.{name}` | Per-component visual decisions |
| **Tier 3: Named variants** | `theme.components.{name}.variants` | Theme-defined presets (e.g., `variant: 'clean'`) |

### Token Resolution

Each component declares a `defaults(theme: Theme)` function that computes its full token set from theme primitives. The registry resolves tokens through a three-step merge:

```typescript
// 1. Component defaults from theme primitives
const defaults = def.defaults(theme);

// 2. Base overrides from theme.components.{name}
const { variants, ...baseOverrides } = theme.components[name];
let tokens = { ...defaults, ...baseOverrides };

// 3. Variant overrides (if variant prop specified)
if (variantName) {
  tokens = { ...tokens, ...variants[variantName] };
}
```

Tokens are passed as a typed third argument to the component's expand function:

```typescript
expand(props, context, tokens)  // TTokens generic ensures type safety
```

Theme authors can override component tokens with autocomplete via `satisfies`:

```typescript
components: {
  card: {
    padding: 0.4,
    backgroundColor: '#1A1A2E',
  } satisfies Partial<CardTokens>,
}
```

### Theme Shape

```typescript
export interface Theme {
  colors: ColorScheme;
  slide: SlideSize | CustomSlideSize;
  spacing: {
    unit: number;
    margin: number;
    gap: number;
    gapTight: number;
    gapLoose: number;
    padding: number;
    cellPadding: number;
    bulletSpacing: number;
    bulletIndentMultiplier: number;
    maxScaleFactor: number;
    lineSpacing: number;
  };
  borders: { width: number; radius: number };
  textStyles: { [K in TextStyleName]: TextStyle };
  components: Record<string, Record<string, unknown> & {
    variants?: Record<string, Record<string, unknown>>;
  }>;
}
```

`ColorScheme` shape:

```typescript
export interface ColorScheme {
  background: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  subtleOpacity: number;
  accents: Record<string, string>;  // replaces accent1-5 + HighlightScheme
}
```

### Migrated Components

| Component | Content params (stay in DSL call) | Tokens (moved to theme) |
|-----------|-----------------------------------|-------------------------|
| `card` | image, title, description, background | padding, cornerRadius, backgroundColor, backgroundOpacity, borderColor, borderWidth, titleStyle, titleColor, descriptionStyle, descriptionColor, gap, textGap |
| `quote` | quote, attribution, image, background | padding, cornerRadius, backgroundColor, backgroundOpacity, borderColor, borderWidth, quoteStyle, attributionStyle, gap |
| `line` | beginArrow, endArrow | color, width, dashType |
| `slideNumber` | (none) | style, color, hAlign |
| `table` | data, columnWidths, headerRows, headerColumns | borderStyle, borderColor, borderWidth, cellPadding, cellTextStyle, headerTextStyle |

The separation principle: content that changes per slide stays in the DSL call; visual appearance that should be consistent across slides lives in the theme.

---

## Part 2: Named Variants (Implemented)

Named variants are theme-defined presets that override component tokens. Content authors select a variant by name; the theme controls what it means visually.

### Variant Definition

Variants are defined inside `theme.components.{name}.variants`:

```typescript
components: {
  table: {
    variants: {
      clean:      { borderStyle: BORDER_STYLE.INTERNAL },
      minimal:    { borderStyle: BORDER_STYLE.NONE },
      horizontal: { borderStyle: BORDER_STYLE.HORIZONTAL },
      grid:       { borderStyle: BORDER_STYLE.INTERNAL, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE },
    },
  },
}
```

### Usage in DSL

```typescript
table(data, { headerRows: 1, variant: 'clean' })
```

### Design Decisions

- **Single variant only** — no stacking. Ambiguous merge order and combinatorial explosion make multi-variant unreliable.
- **Error on unknown variant** — the registry throws with available variant names listed.
- **Variant names are strings** — theme-defined, not framework enums. Runtime validation at the registry boundary.
- **Variants override tokens only** — they cannot change structural props (like `background: true/false` on cards). Structural decisions stay as props.

---

## Part 3: Gap/Spacing Architecture (Implemented)

### Gap Constants

Gap constants in `src/core/types.ts`:

```typescript
export const GAP = {
  NONE: 'none',
  TIGHT: 'tight',    // Related items (title → description)
  NORMAL: 'normal',  // Structural separation
  LOOSE: 'loose',    // Section breaks
} as const;
```

### Resolution

Gap resolves in `src/core/layout.ts`:

```typescript
function resolveGap(gap: GapSize | undefined, theme: Theme): number {
  if (gap === undefined || gap === GAP.NORMAL) return theme.spacing.gap;
  if (gap === GAP.TIGHT) return theme.spacing.gapTight;
  if (gap === GAP.LOOSE) return theme.spacing.gapLoose;
  return 0;  // GAP.NONE
}
```

Spacing values:

```typescript
spacing: {
  gapTight: unit,        // 0.125" — related items
  gap: unit * 2,         // 0.25" — structural separation
  gapLoose: unit * 4,    // 0.5"  — section breaks
}
```

### Semantic Meaning

| Gap | When to Use |
|-----|-------------|
| `GAP.TIGHT` | Related items within a component (eyebrow + title, title + description) |
| `GAP.NORMAL` | Structural separation between components (header + body, card rows) |
| `GAP.LOOSE` | Major section breaks, visual emphasis |
| `GAP.NONE` | No space (explicit zero) |

### Design Rationale

Gap is semantic rather than raw pixels. Explicit control is kept over contextual/automatic gap because:

1. **Slide layout is intentional.** Unlike web pages with flowing content, slides are designed compositions.
2. **Debugging is easier.** No inference rules to understand when fixing spacing.
3. **CSS moved toward explicit `gap`.** Margin collapse is a well-documented footgun.
4. **PowerPoint is the renderer.** Complex adaptive logic adds mismatch risk between HTML measurement and PPTX output.

---

## Phase 2 Roadmap

| Feature | Description |
|---------|-------------|
| **JSON theme format** | DTCG-compatible JSON as the portable theme format. JSON defines brand identity (colors, spacing, typography values, component tokens, variants). TypeScript binding layer maps JSON to `Theme` interface and resolves environment-specific concerns (font file paths, asset paths, layout functions). Enables "bring your own design tokens" — export from Figma/Style Dictionary, drop in a JSON file. |
| Dark mode | Per-slide color modes via context |
| Style Dictionary integration | Import DTCG tokens from Style Dictionary pipeline |
| Figma sync | Bidirectional token sync with Figma variables |

---

## References

- [W3C Design Tokens Community Group](https://design-tokens.github.io/community-group/format/)
- [Style Dictionary](https://amzn.github.io/style-dictionary/)
- [architecture.md](./architecture.md) - Layout and rendering architecture
