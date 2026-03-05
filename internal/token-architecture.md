# Token Architecture

Design decisions for the component token system. Companion to [roadmap.md](./roadmap.md).

---

## Complete Text Tokens on Parent Components

**Status**: Planned (Next tier in roadmap)

### Problem

Card, quote, and testimonial pass only `color` and `style` to their child text components. Everything else — `lineHeightMultiplier`, `linkColor`, `linkUnderline` — silently falls back to `text.variants.default`.

This means changing text's default variant unknowingly changes how card descriptions, quote text, and testimonial attributions render. The coupling is invisible: a theme author looking at card's variant tokens sees `titleColor` and `titleStyle` but has no way to know that `lineHeightMultiplier` comes from a completely different part of the theme.

### Decision: Flat Explicit Tokens (Option B)

Each parent component declares ALL text tokens per child slot on its own token surface. No variant references, no helpers, no indirection. The parent's expand function passes every property explicitly to `text()`.

Card example — current vs proposed:

```typescript
// Current (card.ts:103): passes 2 of 6 text properties
text(title, { style: titleStyle, color: titleColor })

// Proposed: passes all 5
text(title, {
  style: titleStyle,
  color: titleColor,
  lineHeightMultiplier: titleLineHeightMultiplier,
  linkColor: titleLinkColor,
  linkUnderline: titleLinkUnderline,
})
```

The existing `props.X ?? tokens.X` chain in `expandText` already handles this — when all props are provided, the `tokens.X` fallback is never reached. Direct `text()` usage is unaffected. No changes to core, registry, or text's expand function.

### Token growth

| Component | Current | Proposed | New tokens |
|-----------|---------|----------|------------|
| Card | 13 | 21 | +8 (4 per text slot × 2 slots) |
| Quote | 7 | 15 | +8 |
| Testimonial | 14 | 22 | +8 |

### Why this is fine

- **Themes are AI-generated**, not hand-written. Verbosity is invisible to the AI.
- **`validateTheme()` catches missing tokens** at load time. You can't forget one.
- **TypeScript enforces completeness** at compile time via the token interface.
- **No new abstractions** — just more tokens using the existing pattern.

### Why not other approaches

Six options were evaluated against W3C DTCG principles, Material Design 3 patterns, and tycoslide's philosophy ("build system for content, TypeScript themes, no design opinions in core").

| Option | Description | Verdict |
|--------|-------------|---------|
| A. Current state | Partial override + implicit fallback | Rejected — invisible coupling, arbitrary boundary |
| **B. All tokens flat** | **Parent exposes all text tokens per slot** | **Chosen — most W3C DTCG aligned, simplest model** |
| C. Variant name reference | Parent has `titleTextVariant: 'card-title'` | Rejected — "weird to edit text to style a card", cross-component group reference has no DTCG primitive |
| D. Cohesion groups | Override all-or-none within a group | Rejected — no prior art, novel abstraction |
| E. Nested text object | `titleText: { color, lineHeightMultiplier, ... }` | Rejected — breaks flat token model, needs recursive validation |
| F. Hybrid key + variant | Keep key tokens, add variant for the rest | Rejected — three-layer resolution, inconsistent |

**W3C DTCG alignment ranking**: B > E > C > F > D > A

In DTCG, every token is a standalone name-value pair. MD3 component tokens like `md.comp.card.headline.color` are standalone — they may alias system tokens but exist as first-class entities. Option B mirrors this exactly.

Option C (variant reference) felt like DTCG's alias concept, but DTCG aliases point to individual tokens, not groups. A `titleTextVariant: 'card-title'` that resolves to 6 values simultaneously has no DTCG primitive.

### Implementation

Mechanical changes only:

1. **Component files** (card.ts, quote.ts, testimonial.ts): Add token constants, interface fields, defineComponent tokens array entries, destructure in expand, pass all props to text()
2. **Theme files** (theme-default, materialize): Add new token values to every affected variant. Use shared base objects (existing pattern) to reduce repetition.
3. **Test fixtures**: Add new tokens to mock themes. `validateTheme()` catches anything missed.

---

## ExpansionContext & Information Hiding

**Status**: Analyzed, deferred

### Current state

Every component's expand function receives `context: ExpansionContext` which carries the full `Theme` object:

```typescript
interface ExpansionContext {
  theme: Theme;     // ← full theme, including theme.components (all other components' tokens)
  assets?: Record<string, unknown>;
  canvas: Canvas;
}
```

### Audit results

Exhaustive audit of all 15 component expand functions:

**Components that read `context.theme`** (8):
- text — `textStyles[style]`, `spacing.bulletIndentMultiplier`, `colors` (for accent directives)
- table — `textStyles[style]`
- slideNumber — `textStyles[style]`
- row — `spacing.gap/gapTight/gapLoose` (via resolveGap)
- column — same as row
- image — `spacing.maxScaleFactor`
- mermaid — `textStyles[style]`, `colors.accents`, `spacing.maxScaleFactor`
- code — `spacing.maxScaleFactor`

**Components that DON'T read `context.theme`** (7): card, quote, testimonial, stack, grid, line, shape

**`theme.components` (other components' tokens)**: accessed by ZERO expand functions. Only the registry itself reads this for token resolution.

### The question

Should we restrict `context.theme` to a narrow `ThemeContext` exposing only `textStyles`, `colors`, and a spacing subset?

**Arguments for restricting:**
- Enforces the principle that components only access what they need
- Prevents future components from creating hidden dependencies on other components' tokens
- Compiler catches violations

**Arguments against (for now):**
- No component actually abuses the access today
- Custom components may have legitimate needs we haven't anticipated — the full theme is an escape hatch
- This is a build system for content, not a security boundary
- Premature restriction adds complexity without solving an actual problem

### Decision

**Defer.** The complete text tokens change (above) eliminates the actual coupling problem. The ThemeContext restriction solves a theoretical problem. If custom component authors start creating problematic dependencies through `context.theme`, revisit then.

If we do restrict later, the design is ready:

```typescript
interface ThemeContext {
  readonly textStyles: { readonly [K in TextStyleName]: TextStyle };
  readonly colors: Readonly<ColorScheme>;
  readonly spacing: {
    readonly bulletIndentMultiplier: number;
    readonly gap: number;
    readonly gapTight: number;
    readonly gapLoose: number;
    readonly maxScaleFactor: number;
  };
}
```

Runtime projection (build a new object with only allowed fields) is preferred over type-only restriction, for true information hiding.

---

## Design Principles

These emerged from the analysis and inform future token decisions:

1. **Complete sets, not partial overrides.** When a parent creates a child, it passes everything or nothing. No silent fallback to another component's defaults. (W3C DTCG: tokens resolve to complete values.)

2. **Flat tokens, not nested objects.** Every token is a standalone key-value pair. No composite token types, no nested structures. (DTCG: tokens are individually addressable.)

3. **Style names, not style objects, in themes.** Theme authors write `titleStyle: TEXT_STYLE.H4` (semantic reference). The registry resolves it to a font/size/weight object. This keeps themes concise and leverages the type scale. (MD3: component tokens reference system tokens.)

4. **Themes are the source of truth.** Component expand functions read tokens and produce nodes. They don't make styling decisions — they execute what the theme specified. (Philosophy: no design opinions in core.)

5. **AI-generated themes tolerate verbosity.** Token count per variant is not a DX concern when the author is an AI. Explicitness beats cleverness.

---

## Appendix: Ecosystem Theming Research

How presentation tools in the Markdown-to-slides ecosystem handle theming, and how their approaches informed the decisions above. Research conducted 2026-03-04.

### Comparison

| | Marp | Reveal.js | Slidev | tycoslide |
|---|---|---|---|---|
| **Theme format** | Pure CSS | SCSS → CSS | UnoCSS + CSS vars + Vue | TypeScript |
| **Theming mechanism** | CSS vars on `section` | SCSS vars → `--r-*` CSS vars on `:root` | `--slidev-theme-*` CSS vars on `body` | Component token objects per variant |
| **Per-component tokens** | None | None | None | Yes — each component declares required tokens |
| **Parent→child styling** | CSS cascade | CSS cascade | CSS cascade + Vue slots | Explicit prop passing from parent expand to child DSL |
| **Style scoping** | PostCSS auto-scoping | `.reveal` descendant selectors | `.slidev-layout.{name}` class hierarchy | Component tokens (each component only sees its own) |
| **Token validation** | None | None | None | `validateTheme()` catches missing tokens at load time |
| **Type safety** | None (CSS vars are untyped strings) | None | None | TypeScript interfaces on all token sets |
| **Variants** | CSS class on `section` (`.lead`, `.invert`) | `has-dark-background` class (JS runtime) | Different layout names = different Vue files | Named variants per component in theme object |
| **Output format** | HTML | HTML | HTML (Vite SPA) | PPTX + HTML measurement |

All three CSS tools use the same fundamental pattern: **global CSS custom properties cascading through the DOM**. This works for HTML output because missing styles degrade gracefully (wrong color, fallback font). tycoslide targets PPTX, where there is no cascade — every element needs explicit values, and missing values break rather than degrade.

### W3C DTCG Alignment

| DTCG Concept | Marp | Reveal | Slidev | tycoslide |
|---|---|---|---|---|
| Tokens as typed name-value pairs | No (untyped CSS vars) | No | No | Yes (TypeScript interfaces) |
| Component-level token namespacing | No (flat global vars) | No | No | Yes (`theme.components.card.variants.default.*`) |
| Token validation | No (missing = `unset`) | No | No | Yes (`validateTheme()` at load time) |
| Variant system | CSS classes | CSS classes | Different layout files | Named variants per component |
| Alias/reference mechanism | CSS `var()` | SCSS vars → CSS vars | CSS `var()` | TypeScript references (`TEXT_STYLE.H4`) |

The CSS tools can't easily close this gap because CSS custom properties are untyped (`--card-bg: potato` is valid CSS), missing vars degrade silently to `unset`, and component namespacing requires naming conventions with no enforcement. This gap exists because tycoslide targets PPTX where there is no cascade — the validation and type safety are requirements of the output format.

### Key insight

"Complete parent tokens" is the PPTX equivalent of CSS cascade. In Reveal.js, a blockquote inherits `--r-main-color` from its parent via CSS cascade for free. In tycoslide, card must explicitly pass `titleColor` to its child text node. The token completeness requirement isn't over-engineering — it replaces what cascade provides automatically in HTML.

### Per-tool details

**Marp / Marpit** — Pure CSS themes. Theming API is CSS custom properties on `section`. No component model — all content is standard HTML elements styled via descendant selectors. PostCSS auto-scoping. Per-slide variants via CSS classes (`.lead`, `.invert`).

**Reveal.js** — SCSS files compiled to static CSS. Four-file pipeline: `mixins → settings → overrides → theme`. An `exposer.scss` file bridges ~25 SCSS variables to `--r-*` CSS custom properties on `:root`. No component model. Many values hardcoded in templates (list indentation, blockquote width, padding).

**Slidev** — UnoCSS + CSS custom properties + Vue components. One primary CSS variable (`--slidev-theme-primary`). Themes are npm packages with Vue SFC layouts. `themeConfig` in frontmatter allows presentation-level overrides — this contradicts tycoslide's philosophy that themes ARE the brand.
