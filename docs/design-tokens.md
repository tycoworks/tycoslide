# Design Tokens & Spacing System

**Status:** Design complete, ready for implementation

---

## Overview

This document covers two related architectural concerns:

1. **W3C Design Tokens Compatibility** - Aligning the theme system with the Design Tokens Community Group standard
2. **Gap/Spacing Architecture** - Reviewing how components handle spacing

---

## Part 1: W3C Design Tokens Compatibility

### Current State

The theme is defined as a TypeScript interface in `src/core/types.ts`:

```typescript
export interface Theme {
  colors: ColorScheme;
  highlights: HighlightScheme;
  slide: SlideSize | CustomSlideSize;
  spacing: {
    unit: number;
    margin: number;
    gap: number;
    gapTight: number;
    padding: number;
    // ...
  };
  borders: { width: number; radius: number; };
  textStyles: { [K in TextStyleName]: TextStyle };
}
```

### W3C Design Tokens Format

The [Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) standard uses JSON with `$value`, `$type`, and `$description` fields:

```json
{
  "spacing": {
    "unit": {
      "$value": "0.125in",
      "$type": "dimension",
      "$description": "Base grid quantum (1/8 inch)"
    },
    "gap": {
      "normal": {
        "$value": "{spacing.unit} * 2",
        "$type": "dimension"
      },
      "small": {
        "$value": "{spacing.unit}",
        "$type": "dimension"
      }
    }
  },
  "color": {
    "primary": {
      "$value": "#7C5CD0",
      "$type": "color"
    }
  }
}
```

### Gap Analysis

| Aspect | Current TycoSlide | W3C DTCG Standard |
|--------|-------------------|-------------------|
| Format | TypeScript interface | JSON with `$value`/`$type` |
| References | Direct values (`gap: 0.25`) | Token references (`{spacing.unit} * 2`) |
| Type safety | Compile-time (TypeScript) | Runtime validation |
| Tooling | None (custom) | Figma Tokens, Style Dictionary, etc. |
| Metadata | None | `$description`, `$extensions` |

### Migration Path (Backward Compatible)

**Phase 1: Create design tokens JSON as source of truth**

```
/tokens/
  base.tokens.json      # Core tokens (spacing, colors)
  typography.tokens.json # Text styles
```

**Phase 2: Generate TypeScript from tokens**

Use [Style Dictionary](https://amzn.github.io/style-dictionary/) or a custom build script:

```bash
npm run build:tokens  # Generates src/core/generated-theme.ts
```

Existing code continues unchanged - `Theme` interface becomes a generated artifact.

**Phase 3: Add tooling integration**

Once JSON is canonical:
- Export to Figma for designer sync
- Generate CSS custom properties for HTML preview
- Add `$description` for documentation

### File Structure

| File | Purpose |
|------|---------|
| `/tokens/base.tokens.json` | CREATE - DTCG format tokens |
| `/tokens/materialize.tokens.json` | CREATE - Client-specific overrides |
| `/scripts/build-tokens.ts` | CREATE - Token → TypeScript generator |
| `src/core/types.ts` | KEEP - `Theme` interface unchanged |
| `src/core/generated-theme.ts` | GENERATE - Theme objects from tokens |

---

## Part 2: Gap/Spacing Architecture

### Current Design (Implemented)

Gap constants in `src/core/types.ts`:

```typescript
export const GAP = {
  NONE: 'none',
  TIGHT: 'tight',    // Related items (title→description)
  NORMAL: 'normal',  // Structural separation
  LOOSE: 'loose',    // Section breaks
} as const;
```

Resolution in `src/core/layout.ts`:

```typescript
function resolveGap(gap: GapSize | undefined, theme: Theme): number {
  if (gap === undefined || gap === GAP.NORMAL) return theme.spacing.gap;
  if (gap === GAP.TIGHT) return theme.spacing.gapTight;
  if (gap === GAP.LOOSE) return theme.spacing.gapLoose;
  return 0;  // GAP.NONE
}
```

### How Gap Is Used Today

| Context | Gap | Semantic Intent |
|---------|-----|-----------------|
| Card: image → text | `GAP.NORMAL` | Structural separation |
| Card: title → description | `GAP.TIGHT` | Related items |
| Column/Row default | `GAP.NORMAL` | Structural separation |

### Design Review: Is This "Mixing Presentation with Intent"?

**Verdict: The current design is appropriate.**

Gap is already semantic (`GAP.TIGHT`, `GAP.NORMAL`) rather than raw pixels. Components choose gap based on relationship type:
- `SMALL` = related items (eyebrow + title, title + description)
- `NORMAL` = structural separation (header + body, rows of cards)

This matches how modern CSS works - explicit `gap` property in flexbox/grid is preferred over margin collapse magic.

### Why NOT Contextual/Automatic Gap?

The user asked whether gap should be "relative" based on adjacent components. Analysis:

| Approach | Pros | Cons |
|----------|------|------|
| **Explicit (current)** | Predictable, debuggable | Verbose, requires author knowledge |
| **Contextual/automatic** | Less boilerplate | Hard to debug, complex rules |

**Recommendation: Keep explicit control** for these reasons:

1. **Slide layout is intentional.** Unlike web pages with flowing content, slides are designed compositions.
2. **Debugging is easier.** No need to understand inference rules to fix spacing.
3. **CSS margin collapse is a footgun.** Even CSS moved toward explicit `gap`.
4. **PowerPoint is the renderer.** Complex adaptive logic adds mismatch risk.

### Recommended Enhancements

**Rename for clearer intent:**

```typescript
export const GAP = {
  NONE: 'none',
  TIGHT: 'tight',      // Related items (eyebrow + title)
  NORMAL: 'normal',    // Structural separation
  LOOSE: 'loose',      // Major section breaks (new)
} as const;
```

**Add `LOOSE` for section breaks:**

```typescript
spacing: {
  gapTight: unit,        // 0.125"
  gap: unit * 2,         // 0.25" (existing)
  gapLoose: unit * 4,    // 0.5" (new)
}
```

**Document semantic meaning:**

| Gap | When to Use |
|-----|-------------|
| `TIGHT` | Related items within a component (eyebrow + title, title + description) |
| `NORMAL` | Structural separation between components (header + body, card rows) |
| `LOOSE` | Major section breaks, visual emphasis |

---

## Trade-offs Summary

### Design Tokens

| Approach | Benefit | Cost |
|----------|---------|------|
| Keep TypeScript-only | No build step | No tooling integration |
| JSON source + generate TS | Standards compatible, Figma sync | Build step required |

**Recommendation:** Add JSON tokens as source, generate TypeScript.

### Gap System

| Approach | Benefit | Cost |
|----------|---------|------|
| Keep current | Already works | Minor vocabulary confusion |
| Rename to TIGHT/NORMAL/LOOSE | Clearer intent | Small breaking change |

**Recommendation:** Rename for clarity, add LOOSE for section breaks.

---

## Implementation Status

1. **Gap renaming** - ✅ DONE (SMALL→TIGHT, added LOOSE)
2. **Design tokens JSON** - Foundation for tooling
3. **Token build script** - Enables generation
4. **Figma integration** - Designer workflow (future)

---

## References

- [W3C Design Tokens Community Group](https://design-tokens.github.io/community-group/format/)
- [Style Dictionary](https://amzn.github.io/style-dictionary/)
- [architecture.md](./architecture.md) - Current spacing documentation
