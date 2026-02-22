# Design Tokens — Future Work

---

## Architectural Decision: TypeScript Themes, Not JSON

### Decision

Themes are TypeScript. There is no runtime JSON theme format and no plan to add one.

If DTCG JSON import is needed in the future, a CLI scaffold command (`tycoslide theme-init --from-dtcg tokens.json`) will consume DTCG JSON once and emit a TypeScript theme file. The JSON is an authoring input, not a runtime artifact.

### Rationale

1. **Font paths require TypeScript.** `TextStyle` references `FontFamily` objects with absolute `.woff2` paths resolved via `path.join(__dirname, ...)`. JSON cannot express environment-specific path resolution. Every workaround (conventions, manifests, template strings) means writing TypeScript to paper over what JSON cannot do.

2. **Component tokens reference typed constants.** `BORDER_STYLE.INTERNAL`, `HALIGN.CENTER`, `VALIGN.MIDDLE` are TypeScript const objects. In JSON these would be strings requiring a mapping layer, and the `satisfies Partial<CardTokens>` compile-time safety disappears.

3. **The theme file is ~100 lines.** Only ~40 lines are JSON-friendly (colors, spacing numbers). The rest are fonts and typed component tokens. JSON support would add a runtime resolver layer to replace the simplest part of theme authoring.

4. **Style Dictionary validates this model.** Style Dictionary is a *build tool* — it outputs `.ts` files, not runtime JSON. Its pipeline is `JSON -> transforms -> generated code`. The output for TypeScript is a generated `.ts` file with typed constants. No JSON is loaded at runtime.

5. **No user demand.** One theme today (Materialize), possibly 2-3 future. Creating a second theme is "copy, change values" — minutes in TypeScript. JSON doesn't make this faster.

### Analogy

The same pattern as Zod (schema IS TypeScript), Prisma (schema -> generated client), and Protocol Buffers (`.proto` -> generated code). The interchange format is an authoring input consumed by a build tool. The runtime format is native code.

---

## DTCG Ecosystem & Future Tooling

### W3C DTCG Specification

The [Design Tokens Community Group](https://www.designtokens.org/) published **version 2025.10** — the first stable, production-ready spec. Backed by Figma, Penpot, Sketch, Framer, Supernova, and others.

Token types relevant to tycoslide: `color`, `dimension`, `fontFamily`, `fontWeight`, `number`, `border`, `typography` (composite).

References use curly-brace syntax: `"{color.palette.blue}"`. Files use `.tokens` or `.tokens.json` extension.

### Tooling Landscape

| Tool | Role | Status |
|------|------|--------|
| [Style Dictionary v4](https://styledictionary.com/) (Amazon) | Build tool: tokens JSON -> platform outputs (CSS, TS, Swift, etc.) | De facto standard, first-class DTCG support |
| [Terrazzo](https://terrazzo.app/) (formerly Cobalt UI) | DTCG-native CLI alternative to Style Dictionary | MIT, outputs CSS/Sass/JS/TS/Tailwind |
| [Tokens Studio](https://docs.tokens.studio) | Figma plugin: define tokens in Figma, sync to GitHub as DTCG JSON | Dominant Figma integration |

### Future: Figma -> tycoslide Pipeline

If a Figma-to-tycoslide workflow is needed, the pipeline would be:

```
Figma Variables
    |  (Tokens Studio plugin — syncs to GitHub)
    v
tokens.json (DTCG format)
    |  (tycoslide CLI — one-time scaffold)
    v
theme.ts (TypeScript Theme object)
    + assets.ts (font paths — manual, environment-specific)
    + layouts.ts (layout functions — manual, TypeScript logic)
```

The CLI command would:
1. Read DTCG JSON
2. Map `color.*` tokens to `ColorScheme` fields
3. Map `spacing.*` / `border.*` tokens to `spacing` and `borders` fields
4. Map `typography.*` composite tokens to `textStyles` (with `// TODO: configure font paths`)
5. Emit a complete `theme.ts` scaffold

Style Dictionary or Terrazzo could also be used directly — they output typed TypeScript constants that a thin adapter maps to the `Theme` interface.

---

## Theme Structure: One Theme = One Slide Size

### Decision

A theme is bound to a single slide size. If a brand needs 16:9 and 4:3 output, it provides two theme files that share a common base. There is no size-polymorphic theme, no percentage-based spacing, and no auto-scaling.

### Rationale

**1. DTCG tokens are flat, resolved values.**

The W3C Design Tokens spec defines tokens as concrete values — not formulas, not conditionals. A spacing token resolves to `0.5`, not `5%` or `slideWidth * 0.05`. When a design system needs different values per context (mobile vs. desktop, 16:9 vs. 4:3), the DTCG answer is separate token files per context — not conditional logic within one file.

**2. Figma uses absolute dimensions.**

Figma frames have explicit pixel dimensions. Auto Layout uses absolute spacing (8px gap, 16px padding), not percentages. When a designer needs a 4:3 version of a slide template, they create a new frame at 4:3 and adjust spacing. They do not expect 16:9 spacing to "scale down" — because spacing that works at one aspect ratio often fails at another.

**3. Font sizes are absolute.**

Text styles use point sizes (36pt H1, 14pt body). These do not scale with slide dimensions — a 36pt heading is a 36pt heading. If margins scaled proportionally but fonts did not, the proportional relationship between text and whitespace would break unpredictably across sizes.

**4. Percentages introduce hidden computation.**

The philosophy says "no hidden defaults in framework code." Percentage-based spacing means an implicit multiplication step (`actualMargin = percentage * slideDimension`) that runs during expansion. If a designer sets `margin: 0.05` thinking it means 5% of width, but it gets applied to height too, the error is invisible until render. Absolute values fail fast.

**5. A size-keyed map changes what a theme IS.**

If `Theme` contained `{ S16x9: { spacing: {...} }, S4x3: { spacing: {...} } }`, it would become a conditional dispatch table — not a flat bag of resolved tokens. The expand function would need to select sub-themes at runtime. Failure would move from theme-load time to slide-build time, which is later and worse.

### What changes per size?

Analysis of both existing themes (default + Materialize):

| Category | Size-dependent? | Notes |
|----------|----------------|-------|
| `colors.*`, `accents.*` | No | Palette is brand identity |
| `textStyles.*.fontFamily` | No | Font choice is brand identity |
| `textStyles.*.fontSize` | **Yes** | Must scale for readability at different canvas sizes |
| `spacing.margin` | **Yes** | 0.5" margin on 10" canvas (5%) vs on a smaller canvas |
| `spacing.gap`, `gapTight`, `gapLoose` | **Yes** | Element spacing scales with canvas |
| `spacing.padding`, `cellPadding` | **Yes** | Container padding scales with canvas |
| `spacing.bulletSpacing`, `bulletIndentMultiplier` | No | These are multipliers, not absolute sizes |
| `spacing.maxScaleFactor`, `lineSpacing` | No | Ratios, not absolute sizes |
| `spacing.unit` | No | Grid quantum precision choice |
| `borders.width` | **Yes** | Border thickness relative to canvas |
| `borders.radius` | **Yes** | Corner radius maintains visual weight |
| `components.card.padding`, `cornerRadius` | **Yes** | Absolute values scale with canvas |
| `components.card.titleStyle`, `borderStyle`, etc. | No | Semantic tokens, not absolute values |
| `components.*.variants` | No | Override same token types as base |
| `assets.*` (fonts, icons, images) | No | File paths don't change |

**Estimated overlap: ~85%.** Colors, fonts, assets, semantic tokens, multipliers, and component styling tokens are shared. Only `slide`, `spacing.*` (absolute values), `textStyles.*.fontSize`, and `borders.*` differ.

### Recommended theme file structure

```
brand/
  palette.ts          # ColorScheme + accent definitions
  fonts.ts            # FontFamily definitions + asset paths
  components.ts       # Component tokens (card, quote, table, line, slideNumber)
  theme-16x9.ts       # imports above + SLIDE_SIZE.S16x9 + spacing + textStyles
  theme-4x3.ts        # imports above + SLIDE_SIZE.S4x3  + spacing + textStyles
  assets.ts           # Brand assets (logos, icons, illustrations)
  layouts.ts          # Layout functions
  master.ts           # Master slide definition
  index.ts            # Re-exports selected theme
```

The shared modules (`palette.ts`, `fonts.ts`, `components.ts`) capture the ~85% that's size-independent. Each size-specific theme file is ~20 lines importing the shared base plus the absolute spacing and font size values.

### No framework changes required

This is a theme authoring pattern, not a framework change. The `Theme` interface stays unchanged. Authors `import { palette } from './palette.js'` and compose the Theme object. The framework never knows or cares that the theme was assembled from shared parts.

If we later want a CLI convenience (`tycoslide theme-derive --from brand-16x9 --size 4x3`), it can generate a second theme file by applying a scale factor to absolute values. But that's a tool, not a runtime feature.

---

## Color Authority: Theme-Constrained Color System

### Problem

The philosophy states: "An author cannot break the brand." and "Theme is the single source of truth for all visual decisions." But currently, arbitrary hex colors leak through multiple component schemas:

| Component | Field | Current Type | Accepts Arbitrary Hex? |
|-----------|-------|-------------|----------------------|
| Text | `color` | `schema.string()` | **Yes** — any hex string |
| Text | `bulletColor` | `schema.string()` | **Yes** — any hex string |
| Shape | `fill` | `schema.string()` | **Yes** — any hex string |
| Shape | `borderColor` | `schema.string()` | **Yes** — any hex string |

Meanwhile, two patterns already enforce theme constraints correctly:

| Pattern | How It Works | Status |
|---------|-------------|--------|
| `:accentName[text]` inline directives | Resolves against `theme.colors.accents`, throws on unknown names | Correct |
| `variant="dark"` on card/quote/table | Resolves against `theme.components.*.variants`, throws on unknown | Correct |

The inline accent system (`:teal[highlighted text]`) is the proof that constrained color works. The `variant` system is the proof that constrained per-instance styling works. The `color: schema.string()` fields bypass both.

### Decision

**All color inputs — from both markdown AND TypeScript — must resolve against theme-defined color names.** No persona (author, developer, or layout builder) should be able to inject arbitrary hex values. This protects the brand even from the developer building layouts.

The Figma analogy: component instances only accept color styles from the library. You cannot enter a raw hex code. Even the designer building the component picks from defined styles. The color style library IS the constraint boundary.

### `schema.color()` — a theme-aware color schema

Add a new domain schema helper that validates color values against a known vocabulary:

```typescript
// In schema.ts
export const schema = {
  // ... existing helpers ...

  /** Theme color reference. Accepts accent names and semantic color names.
   *  Resolved to hex during component expansion, not at parse time. */
  color: () => z.string(),  // Parse-time: any string (names, not hex)
};
```

At parse time, `schema.color()` accepts a string (color name). At expansion time, the registry resolves the name against the theme's color vocabulary:

```
theme.colors.accents.*     — accent names (teal, pink, brandPurple, metrics, etc.)
theme.colors.text          — primary text color
theme.colors.textMuted     — muted text color
theme.colors.primary       — brand primary
theme.colors.secondary     — brand secondary
theme.colors.background    — slide background
```

If the name is not found, expansion throws with available color names — same pattern as the existing `:accent[text]` directive handler and the variant resolver.

### Resolution mechanism

The color resolution lives in the registry's `expand()` path, not in individual components. Two options:

**Option A: Resolve in each component's expand function.**

Each component that accepts color props calls a shared `resolveColor(name, theme)` helper. This keeps expand functions explicit but requires every color-accepting component to remember to call it.

**Option B: Resolve in the registry before calling expand.**

The registry scans the component's schema for `schema.color()` fields and resolves them before passing props to expand. Components receive resolved hex values and never deal with names.

**Recommendation: Option A.** Explicit resolution in expand functions is consistent with how tokens already work — the expand function receives tokens and maps them to node properties. Adding a `resolveColor()` call is one line per color field, easy to audit, and doesn't require schema introspection machinery.

```typescript
// Shared helper — src/core/colors.ts
export function resolveColor(name: string, theme: Theme): string {
  // Check accents first (most common case)
  if (name in theme.colors.accents) return theme.colors.accents[name];
  // Check semantic color names
  const semanticColors: Record<string, string> = {
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    background: theme.colors.background,
  };
  if (name in semanticColors) return semanticColors[name];
  // Fail with available names
  const available = [
    ...Object.keys(theme.colors.accents),
    ...Object.keys(semanticColors),
  ].join(', ');
  throw new Error(
    `Unknown color '${name}'. Available theme colors: ${available}`
  );
}
```

### Impact on existing components

**Text** (`src/dsl/text.ts`):
```typescript
// Before:
color: schema.string().optional(),
bulletColor: schema.string().optional(),

// After:
color: schema.color().optional(),
bulletColor: schema.color().optional(),
```
Expand function calls `resolveColor(props.color, context.theme)` before setting `TextNode.color`.

**Shape** (`src/dsl/primitives.ts`):
```typescript
// Directive schema (markdown authors):
// Before:
fill: schema.string().optional(),
borderColor: schema.string().optional(),

// After:
fill: schema.color().optional(),
borderColor: schema.color().optional(),
```

**TypeScript DSL** (`ShapeProps` interface):
```typescript
// Before:
fill?: { color: string; opacity?: number };

// After:
fill?: { color: string; opacity?: number };  // string is a color NAME, not hex
```
The TypeScript type stays `string`, but the expand function resolves it through `resolveColor()`. A developer calling `shape({ fill: { color: 'teal' } })` gets the theme's teal. Calling `shape({ fill: { color: 'FF00FF' } })` throws.

**Inline `:accent[text]` directives** — already correct, no change needed. The text transformer already resolves against `theme.colors.accents` and throws on unknown names.

**Card/Quote/Table** — already correct. Colors come from theme tokens, not from author/developer input.

**Line/SlideNumber** — already correct. Colors come from theme tokens (`LineTokens.color`, `SlideNumberTokens.color`).

### What about the `:accent[text]` pattern?

The inline directive pattern (`:teal[this is teal]`) resolves accent names at the text transformer level. The new `schema.color()` pattern resolves at the component expand level. They are complementary:

- `:accent[text]` — colors a span of text inline, using an accent name
- `color: "teal"` — sets the default color for an entire text block, using any theme color name (accents + semantic)

The inline pattern stays limited to accent names (that's its job). The `schema.color()` pattern has a broader vocabulary (accents + semantic colors like `text`, `textMuted`, `primary`).

### Migration

This is a breaking change for any markdown or TypeScript code that passes raw hex to `color`, `bulletColor`, `fill`, or `borderColor`. The migration is mechanical:

1. For hex values that match a theme accent, replace with the accent name: `color="7C5CD0"` -> `color="brandPurple"`
2. For hex values that match a semantic color, replace with the semantic name: `color="FFFFFF"` -> `color="text"`
3. For hex values that don't exist in the theme, the designer must add them to `theme.colors.accents`

The showcase markdown (`showcase.md`) is the primary consumer that needs updating. Its shape gallery currently uses raw hex colors not in the Materialize palette.

---

## Variant System Audit

### Current state

| Component | Has `variant` in Schema | Has Tokens | Variant Resolution |
|-----------|------------------------|-----------|-------------------|
| Card | Yes | Yes (10 tokens) | Works — registry merges variant overrides into base tokens |
| Quote | Yes | Yes (9 tokens) | Works — same mechanism |
| Table | Yes | Yes (10 tokens) | Works — same mechanism |
| Line | **No** | Yes (3 tokens) | Missing — has tokens but no variant prop |
| SlideNumber | **No** | Yes (3 tokens) | Missing — has tokens but no variant prop |
| Shape | **No** | **No** | N/A — no tokens at all |
| Text | **No** | **No** | N/A — no tokens (uses text styles from theme) |
| Image | **No** | **No** | N/A — asset reference, no styling |
| Mermaid | **No** | **No** | N/A — renders to image |
| Document | **No** | **No** | N/A — parser/dispatcher |
| Row/Column/Stack/Grid | **No** | **No** | N/A — pure layout, no styling |

### How variant resolution works

Registry `expand()` (registry.ts:293-308):

1. Extract base tokens from `theme.components[componentName]`
2. If `props.variant` is set, look up `variantDefs[variantName]`
3. If unknown variant, throw with available names
4. Shallow-merge variant overrides into base tokens
5. Validate all required tokens present
6. Pass merged tokens to expand function

The mechanism is generic — any component with a `tokens` array and `variant` in its schema gets variant support for free.

### Gaps

**Line should support variants.** It has 3 tokens (color, width, dashType). Use cases:
- `variant: "accent"` — primary color line
- `variant: "muted"` — secondary/faded divider
- `variant: "dashed"` — dashed separator

Adding variant support is a one-line schema change (`variant: schema.string().optional()`) since the registry mechanism handles everything else. The theme author defines `line.variants.accent: { color: palette.brandPurple }`.

**SlideNumber could support variants** but has low ROI — typically one instance per slide with a single appearance. Defer unless a real use case emerges.

**Shape does not need variants** because shapes don't have theme tokens. Shapes use the new `schema.color()` resolution for fill/border colors. If a designer wants a "branded shape preset," the answer is a custom component that wraps `shape()` with token-resolved defaults, not variants on a primitive.

### Recommendation

Add `variant: schema.string().optional()` to Line. Leave SlideNumber and Shape as-is.

---

## Phase 2 Roadmap

| Feature | Description |
|---------|-------------|
| **Color authority** | Replace `schema.string()` with `schema.color()` for all color inputs. Add `resolveColor()` helper. Enforce theme-only colors across both markdown and TypeScript. |
| **Line variants** | Add `variant` prop to Line component schema. Theme authors define line appearance presets. |
| **Theme file splitting** | Document recommended pattern for multi-size themes (shared palette/fonts/components, size-specific spacing/textStyles). No framework changes needed. |
| **Dark mode** | Per-slide color modes. Each slide specifies `mode: 'dark' | 'light'`. Theme defines color mappings per mode. Accents stay constant; surface/text colors swap. |
| **CLI theme scaffold** | `tycoslide theme-init --from-dtcg tokens.json` — consumes DTCG JSON, emits TypeScript theme package scaffold. One-time codegen, not runtime. |

---

## References

- [W3C DTCG Format Spec (2025.10)](https://www.designtokens.org/)
- [Style Dictionary](https://styledictionary.com/) — build tool for design tokens
- [Terrazzo](https://terrazzo.app/) — DTCG-native token CLI
- [Tokens Studio](https://docs.tokens.studio) — Figma plugin for DTCG tokens
- [architecture.md](./architecture.md) — Layout and rendering architecture
