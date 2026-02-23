# Design Tokens — Future Work

---

## Architectural Decision: TypeScript Themes, Not JSON

### Decision

Themes are TypeScript. There is no runtime JSON theme format and no plan to add one.

If DTCG JSON import is needed in the future, a CLI scaffold command (`tycoslide theme-init --from-dtcg tokens.json`) will consume DTCG JSON once and emit a TypeScript theme file. The JSON is an authoring input, not a runtime artifact.

### Rationale

1. **Font paths require TypeScript.** `TextStyle` references `FontFamily` objects with absolute `.woff2` paths resolved via `path.join(__dirname, ...)`. JSON cannot express environment-specific path resolution. Every workaround (conventions, manifests, template strings) means writing TypeScript to paper over what JSON cannot do.

2. **Component tokens reference typed constants.** `BORDER_STYLE.INTERNAL`, `HALIGN.CENTER`, `VALIGN.MIDDLE` are TypeScript const objects. In JSON these would be strings requiring a mapping layer, and the `satisfies Record<string, CardTokens>` compile-time safety disappears.

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

A deeper integration — extracting Figma component structure (Auto Layout, constraints, variant properties) and mapping them directly to tycoslide component definitions and layouts — is a future exploration. See the Phase 2 roadmap.

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
| `components.card.variants.default.padding` | **Yes** | Absolute values scale with canvas |
| `components.card.variants.default.titleStyle` | No | Semantic tokens, not absolute values |
| `components.*.variants.*` | No | Complete token sets per variant, shared across sizes |
| `assets.*` (fonts, icons, images) | No | File paths don't change |

**Estimated overlap: ~85%.** Colors, fonts, assets, semantic tokens, multipliers, and component styling tokens are shared. Only `slide`, `spacing.*` (absolute values), `textStyles.*.fontSize`, and `borders.*` differ.

### Recommended theme file structure

```
brand/
  palette.ts          # ColorScheme + accent definitions
  fonts.ts            # FontFamily definitions + asset paths
  components.ts       # Component variants (card, quote, table, text, shape, line, slideNumber)
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

## Variant-Only Color Model

### Problem

The philosophy states: "An author cannot break the brand." and "Theme is the single source of truth for all visual decisions." But currently, arbitrary hex colors leak through two component schemas:

| Component | Field | Current Type | Accepts Arbitrary Hex? |
|-----------|-------|-------------|----------------------|
| Text | `color` | `schema.string()` | **Yes** — any hex string |
| Text | `bulletColor` | `schema.string()` | **Yes** — any hex string |
| Shape | `fill` | `schema.string()` | **Yes** — any hex string |
| Shape | `borderColor` | `schema.string()` | **Yes** — any hex string |

Additionally, Text exposes `lineHeightMultiplier` and Shape exposes `fillOpacity`, `borderWidth`, and `cornerRadius` as author-settable props with no theme-controlled defaults.

Meanwhile, Card, Quote, and Table already enforce theme constraints correctly: all visual decisions come from tokens, the author only selects a `variant` name, and the registry resolves it against theme-defined presets.

### Decision

**Slide authors style components by picking variants. They cannot set individual color or styling properties.** The directive schema (markdown) exposes only structural props and variant selection. All visual styling flows from theme-defined variant token sets.

This is the MUI/Radix model applied to a non-browser rendering target. MUI's `<Button color="primary">` accepts only palette-keyed enum values — not hex, not CSS variables. Radix UI's `<Callout color="gray">` accepts only 24 predefined names. Both enforce constraints at the component API level through TypeScript types. tycoslide enforces constraints at the directive schema level: if the prop isn't in the schema, the author can't set it.

### Why not `resolveColor()`?

An earlier design proposed `schema.color()` + `resolveColor()`: replace hex inputs with color name inputs, resolve names to hex at expand time. This was rejected for three reasons:

1. **Error timing.** A bug in `resolveColor` or a missing color name crashes at expand time. That's too late. Errors should be as close to compile time as possible. Removing color props from schemas eliminates the error category entirely — there's nothing to mistype.

2. **Color authority constrains atoms, not outcomes.** `resolveColor()` gives authors ~15 individual color names to combine freely. `color="red" bulletColor="yellow"` uses only theme colors but looks terrible. The theme author can't prevent ugly combinations. Variant-only constrains outcomes: the theme author defines tested visual presets. No ugly combinations are possible because no combinations are possible.

3. **Composition complexity.** When Card passes a token-resolved hex to Text, `resolveColor()` needs to handle both names and hex values, requiring either a hex pass-through (security concern) or restructuring how components compose (architecture change). Variant-only avoids this entirely: the two API surfaces (directive schema for authors, TypeScript DSL for developers) are structurally disjoint.

### The two-tier API

The framework has three personas with different trust levels:

| Persona | Tool | Color control | Constraint mechanism |
|---------|------|---------------|---------------------|
| **Slide author** | Markdown directives | Variant names only | Directive schema — props not in schema can't be set |
| **Layout developer** | TypeScript DSL | Full theme hex access | Type system — `theme.colors.*` is typed |
| **Theme author** | TypeScript theme file | Full hex authoring | They ARE the brand authority |

This matches Figma exactly: a designer building a component has full access to every color and property. A user placing an instance picks from variants. The constraint gap IS the design.

It also matches the CSS design system trend. The community has converged on **semantic tokens + enum component props** as the constraint mechanism (shadcn/ui, MUI, Radix), not raw property access (Open Props) or unconstrained utility classes.

### What about inline `:accent[text]`?

The inline accent directive (`:teal[highlighted text]`) stays unchanged. It operates at a different scope:

| Scope | Mechanism | Purpose |
|-------|-----------|---------|
| **Component** (block-level) | `variant="muted"` | Styles a whole text block, card, or shape |
| **Span** (inline) | `:teal[text]` | Colors a word or phrase within prose |

In Figma terms: you cannot change a component instance's internal colors by applying a style — you pick a variant. But in a text layer within that component, you CAN apply a character style to a selected word. The inline accent is that character style.

The `:accent[text]` directive is already correctly constrained — it resolves against `theme.colors.accents` and throws on unknown names. It remains the only place where authors select individual colors, and only for inline text emphasis.

---

## Variant System

### Design: Figma model, not CSS model

The variant system follows the **Figma component variant model**, not the CSS modifier-class model.

In Figma, each variant of a component is a **complete, independent `ComponentNode`**. There is no inheritance between variants — no "base" that others extend. Each variant stores every layer, fill, stroke, and effect independently. The Figma REST API confirms this: a `ComponentSetNode` contains N complete `ComponentNode` children. There is no delta encoding.

The DTCG token spec aligns: design token tools (Tokens Studio, Style Dictionary) export variants as **complete, independent token sets**, not as deltas or partial overrides.

tycoslide follows this model:

- **Every variant is a complete token set.** No partial overrides. No inheritance. What you see is what you get.
- **Every component requires a `default` variant.** This is the appearance when no variant is specified — analogous to the top-left variant in a Figma component set.
- **DRY is achieved through TypeScript composition at authoring time**, not through runtime inheritance. The theme author uses `...spread` to share common values. The spread evaluates at import time, producing flat, resolved objects in memory.

```typescript
// CSS model (REJECTED): base + partial overrides, runtime merge
card: {
  padding: 0.25,
  backgroundColor: 'E2E8F0',
  variants: {
    dark: { backgroundColor: '1A1A2E' },  // partial — inherits padding from base
  }
}

// Figma model (ADOPTED): complete, independent variants
card: {
  variants: {
    default: { padding: 0.25, backgroundColor: 'E2E8F0', ... },  // complete
    dark:    { padding: 0.25, backgroundColor: '1A1A2E', ... },  // complete
  }
}
```

### Why the Figma model?

**1. Predictability.** Each variant is self-describing. There is no hidden merge to mentally trace. `theme.components.card.variants.dark` contains exactly the tokens that will be used — nothing more, nothing less.

**2. Compile-time validation.** `satisfies Record<string, CardTokens>` on the `variants` object validates that every variant is a complete `CardTokens` at theme authoring time. Missing tokens are caught by the TypeScript compiler. Under the CSS model with `Partial<CardTokens>`, missing tokens can only be caught at expand time.

**3. DTCG alignment.** The DTCG spec defines tokens as flat, resolved values. Token tools export variants as complete, independent token sets. The Figma model matches this directly. The CSS override model has no equivalent in the token ecosystem.

**4. Dark mode preparation.** When dark mode is added, each mode provides a complete `theme.components` tree. Each mode's variants are complete token sets. There is no question of "which base does the dark variant inherit from?" — every variant in every mode is self-contained.

### Theme authoring with TypeScript spread

Theme authors use TypeScript spread to share values across variants, avoiding repetition:

```typescript
const cardBase = {
  padding: spacing.padding,
  cornerRadius: 0.05,
  borderWidth: 0.75,
  titleStyle: TEXT_STYLE.H4,
  descriptionStyle: TEXT_STYLE.SMALL,
  gap: GAP.TIGHT,
};

card: {
  variants: {
    default: {
      ...cardBase,
      backgroundColor: colors.secondary,
      backgroundOpacity: colors.subtleOpacity,
      borderColor: colors.secondary,
      titleColor: colors.text,
      descriptionColor: colors.textMuted,
    },
    dark: {
      ...cardBase,
      backgroundColor: colors.text,
      backgroundOpacity: 100,
      borderColor: colors.primary,
      titleColor: colors.background,
      descriptionColor: colors.secondary,
    },
    minimal: {
      ...cardBase,
      backgroundColor: colors.background,
      backgroundOpacity: 0,
      borderColor: colors.background,
      borderWidth: 0,
      titleColor: colors.text,
      descriptionColor: colors.textMuted,
    },
  } satisfies Record<string, CardTokens>,
},
```

The `...cardBase` spread evaluates at import time. The `satisfies Record<string, CardTokens>` validates completeness at compile time. The theme object in memory contains flat, resolved values — no references, no inheritance. DTCG-aligned.

### How variant resolution works

Registry `expand()` — **updated from current implementation**:

```typescript
// Current: destructure base + shallow-merge overrides
const { variants: variantDefs, ...baseTokens } = componentConfig;
let tokens = { ...baseTokens };
if (variantName) tokens = { ...tokens, ...variantOverrides };

// New: direct lookup from variants map
const { variants } = componentConfig;
const variantName = props.variant ?? 'default';
const tokens = variants[variantName];
if (!tokens) throw new Error(`Unknown variant '${variantName}'. Available: ${Object.keys(variants).join(', ')}`);
```

Simpler. No merge. No destructuring. A direct map lookup. Validation is a key existence check.

### The precedence rule: props override tokens

When a component is used both standalone (author picks variant) and embedded (parent passes props), a clear precedence rule prevents conflicts:

| Priority | Source | Set by | Example |
|----------|--------|--------|---------|
| 1 (highest) | Explicit prop | Parent component or layout developer | Card passes `color: titleColor` to Text |
| 2 (lowest) | Variant token | Theme author, selected by slide author | `variant="muted"` provides `color: '64748B'` |

In expand functions: `const resolvedColor = props.color ?? tokens.color`

This means:
- Standalone `:::text{variant="muted"}` — no `props.color`, uses `tokens.color` from muted variant
- Card's child `text(title, { color: titleColor })` — `props.color` is hex from Card's variant tokens, wins over Text's own variant tokens
- Author cannot set `color` in markdown — it's not in the directive schema

### Component taxonomy

| Tier | Components | Has Tokens | Supports Variants | Styling Props in Directive Schema |
|------|-----------|------------|-------------------|----------------------------------|
| **Compound** | Card, Quote, Table | Yes (9-12 tokens) | Yes | None — all visual from variant tokens |
| **Leaf** | Text, Line | Yes (3-4 tokens) | Yes | Text: `style` only (structural) |
| **Leaf** | Shape | Yes (5 tokens) | Yes | None — all visual from variant tokens |
| **Leaf** | SlideNumber | Yes (3 tokens) | Yes | None — fully token-controlled |
| **Primitive** | Image | No | No | None — asset reference |
| **Synthetic** | Mermaid | No | No | None — derives styling from `theme.colors` directly |
| **Structural** | Row, Column, Stack, Grid | No | No | None — pure layout |
| **Dispatcher** | Document | No | No | None — parses and delegates |

The variant boundary follows an ontological distinction: **Compound and Leaf components have a visual surface that the theme controls.** Primitives, synthetics, structural containers, and dispatchers do not.

### Complete component audit

#### Card — fully covered (12 tokens, 0 directive styling gaps)

Directive schema: `image`, `title`, `description` (content), `background` (toggle), `variant`, `height` (layout). Zero styling props.

Tokens: `padding`, `cornerRadius`, `backgroundColor`, `backgroundOpacity`, `borderColor`, `borderWidth`, `titleStyle`, `titleColor`, `descriptionStyle`, `descriptionColor`, `gap`, `textGap`.

#### Quote — fully covered (9 tokens, 0 directive styling gaps)

Directive schema: `quote`, `attribution`, `image` (content), `background` (toggle), `variant`, `height` (layout). Zero styling props.

Tokens: `padding`, `cornerRadius`, `backgroundColor`, `backgroundOpacity`, `borderColor`, `borderWidth`, `quoteStyle`, `attributionStyle`, `gap`.

#### Table — fully covered (10 tokens, 0 directive styling gaps)

Directive schema: `variant`, `headerColumns` (structural). Zero styling props.

Tokens: `borderStyle`, `borderColor`, `borderWidth`, `headerBackground`, `headerTextStyle`, `cellBackground`, `cellTextStyle`, `cellPadding`, `hAlign`, `vAlign`.

#### Text — needs tokens and variant (currently 4 gaps)

Directive schema today: `style`, `color`, `hAlign`, `vAlign`, `bulletColor`, `lineHeightMultiplier`, `content`.

**Directive schema after:** `style`, `hAlign`, `vAlign`, `content`, `variant`.

Removed from directive: `color`, `bulletColor`, `lineHeightMultiplier` (become tokens).

`style` stays in the directive schema — it's a structural/semantic choice ("this is a heading"), not a visual one. The theme controls what H1 looks like, but the author decides what IS an H1. Already validated at parse time by `schema.textStyle()` Zod enum.

**New token interface — `TextTokens`:**

| Token | Type | Purpose |
|-------|------|---------|
| `color` | `string` | Foreground color (hex) |
| `bulletColor` | `string` | Bullet marker color (hex) |
| `style` | `TextStyleName` | Text style |
| `lineHeightMultiplier` | `number` | Line height multiplier |

**Theme definition:**

```typescript
const textBase = { style: TEXT_STYLE.BODY, lineHeightMultiplier: spacing.lineSpacing };

text: {
  variants: {
    default: { ...textBase, color: colors.text, bulletColor: colors.text },
    muted:   { ...textBase, color: colors.textMuted, bulletColor: colors.textMuted },
    accent:  { ...textBase, color: accents.blue, bulletColor: accents.blue },
    inverse: { ...textBase, color: colors.background, bulletColor: colors.background },
  } satisfies Record<string, TextTokens>,
},
```

**Expand function precedence:**

```typescript
// props.style may come from directive (author structural choice) or parent component
// tokens.style comes from the selected variant (complete token set)
const resolvedStyle = props.style ?? tokens.style;
const resolvedColor = props.color ?? tokens.color;
const resolvedBulletColor = props.bulletColor ?? tokens.bulletColor;
const resolvedLineHeight = props.lineHeightMultiplier ?? tokens.lineHeightMultiplier;
```

**Composition chain:** Card calls `text(title, { style: titleStyle, color: titleColor })` with hex from its own variant tokens. `props.color` wins over Text's variant `tokens.color`. No conflict. The directive schema doesn't have `color`, so authors can never set it — only parent components can.

#### Shape — needs tokens and variant (currently 5 gaps)

Directive schema today: `shape`, `fill`, `fillOpacity`, `borderColor`, `borderWidth`, `cornerRadius`.

**Directive schema after:** `shape`, `variant`.

All styling props removed. Only the geometric form and variant remain.

**New token interface — `ShapeTokens`:**

| Token | Type | Purpose |
|-------|------|---------|
| `fill` | `string` | Fill color (hex) |
| `fillOpacity` | `number` | Fill opacity (0-100) |
| `borderColor` | `string` | Border color (hex). Use `borderWidth: 0` for no border |
| `borderWidth` | `number` | Border width |
| `cornerRadius` | `number` | Corner radius |

**Theme definition:**

```typescript
const shapeBase = { fillOpacity: 100, borderWidth: 0, cornerRadius: 0 };

shape: {
  variants: {
    default:  { ...shapeBase, fill: colors.secondary, borderColor: colors.background },
    primary:  { ...shapeBase, fill: colors.primary, borderColor: colors.background },
    subtle:   { ...shapeBase, fill: colors.secondary, fillOpacity: 15, borderColor: colors.background },
    outlined: { ...shapeBase, fill: colors.background, fillOpacity: 0, borderColor: colors.primary, borderWidth: 0.75 },
    accent:   { ...shapeBase, fill: accents.blue, borderColor: colors.background },
  } satisfies Record<string, ShapeTokens>,
},
```

**TypeScript DSL uses flat props.** `ShapeProps` has `fill?, fillOpacity?, borderColor?, borderWidth?, cornerRadius?` matching token names directly. Parent components (Card, Quote) pass flat props: `shape({ fill: backgroundColor, fillOpacity: backgroundOpacity, borderColor, borderWidth, cornerRadius })`. The DSL and directive schema are structurally separate — the DSL constructs nodes directly, bypassing the directive schema.

#### Line — needs variant added (0 gaps, 3 tokens already exist)

Directive schema today: `beginArrow`, `endArrow`. Zero styling props.

**Directive schema after:** `beginArrow`, `endArrow`, `variant`.

One-line change: add `variant: schema.string().optional()` to `lineSchema`.

Tokens already exist: `color`, `width`, `dashType`.

**Theme definition (migrated to Figma model):**

```typescript
const lineBase = { width: 0.75, dashType: DASH_TYPE.SOLID };

line: {
  variants: {
    default: { ...lineBase, color: colors.secondary },
    accent:  { ...lineBase, color: colors.primary },
    muted:   { color: colors.textMuted, width: 0.5, dashType: DASH_TYPE.SOLID },
    dashed:  { color: colors.secondary, width: 0.75, dashType: DASH_TYPE.DASH },
  } satisfies Record<string, LineTokens>,
},
```

#### SlideNumber — fully covered (3 tokens, variant support)

Directive schema: `variant`. Zero styling props.

Tokens: `style`, `color`, `hAlign`.

DSL interface: `SlideNumberProps` with `style?, color?, hAlign?, variant?` for parent/layout overrides. Expand uses `props.X ?? tokens.X` precedence.

#### Image — no changes needed

Asset reference. No styling props. No tokens needed.

#### Mermaid — no changes needed

Derives all visual styling from `theme.colors` and `theme.textStyles` directly. Author style directives are actively rejected with a build error. No tokens needed.

#### Containers (Row, Column, Stack, Grid) — no changes needed

Pure layout structure. All props are structural (gap, alignment, padding, sizing). No styling props. No tokens needed.

### Data flow examples

**Author uses text variant:**

```
1. Author writes: :::text{variant="muted"}
2. Directive parser → ComponentNode { componentName: 'text', props: { variant: 'muted' } }
3. Registry reads theme.components.text.variants:
   variants = { default: { color: '1A1A2E', ... }, muted: { color: '64748B', ... } }
4. Lookup: tokens = variants['muted']
   → { color: '64748B', bulletColor: '64748B', style: 'body', lineHeightMultiplier: 1.2 }
5. expandText receives: props = { variant: 'muted' }, tokens = (above)
6. resolvedColor = props.color ?? tokens.color = undefined ?? '64748B' = '64748B'
7. TextNode.color = '64748B'
```

**Author writes text with no variant (gets default):**

```
1. Author writes: :::text
2. Registry: variantName = props.variant ?? 'default'
3. tokens = variants['default']
   → { color: '1A1A2E', bulletColor: '1A1A2E', style: 'body', lineHeightMultiplier: 1.2 }
4. Text renders with default theme appearance.
```

**Author uses text variant with structural override:**

```
1. Author writes: :::text{variant="muted" style="h2"}
2. tokens = variants['muted'] (complete token set)
3. resolvedStyle = props.style ?? tokens.style = 'h2' ?? 'body' = 'h2' (prop wins)
4. resolvedColor = props.color ?? tokens.color = undefined ?? '64748B' = '64748B'
5. Result: H2 heading in muted color. Author chose the semantic level, theme controls the color.
```

**Card composes Text (internal):**

```
1. Card's variant tokens: titleColor = '1A1A2E', titleStyle = 'h4'
2. Card calls: text(title, { style: 'h4', color: '1A1A2E' })
3. This creates a ComponentNode via TypeScript DSL (not directive parsing)
4. Registry expands Text: tokens = variants['default'] (no variant specified)
5. expandText: resolvedColor = props.color ?? tokens.color = '1A1A2E' ?? '1A1A2E' = '1A1A2E'
6. Card's title renders with Card's token-controlled color. No conflict.
```

**Card dark variant composes Text:**

```
1. Card dark variant tokens: titleColor = 'FFFFFF', backgroundColor = '1A1A2E'
2. Card calls: text(title, { style: 'h4', color: 'FFFFFF' })
3. expandText: resolvedColor = props.color = 'FFFFFF' (Card's prop wins over Text's default)
4. White title text on dark card background. Correct.
```

**Author uses shape variant:**

```
1. Author writes: :::shape{shape="roundRect" variant="outlined"}
2. Registry: tokens = variants['outlined']
   → { fill: 'FFFFFF', fillOpacity: 0, borderColor: '2563EB', borderWidth: 0.75, cornerRadius: 0 }
3. Shape expand receives complete token set, builds ShapeNode.
```

### Interaction with future dark mode

The roadmap includes per-slide dark mode. The Figma variant model makes dark mode straightforward.

Each mode provides a complete `theme.components` tree, and each component within it provides complete variant token sets:

```typescript
// Conceptual — not current API
modes: {
  light: {
    text: {
      variants: {
        default: { color: '1A1A2E', bulletColor: '1A1A2E', ... },
        muted:   { color: '64748B', bulletColor: '64748B', ... },
      }
    },
  },
  dark: {
    text: {
      variants: {
        default: { color: 'FFFFFF', bulletColor: 'FFFFFF', ... },
        muted:   { color: '94A3B8', bulletColor: '94A3B8', ... },
      }
    },
  },
}
```

An author's `variant="muted"` means "muted relative to the current mode." Light-mode muted and dark-mode muted have different hex values, but the author doesn't care — they said "muted." Every variant in every mode is a complete, self-contained token set. No inheritance across modes.

---

## Implementation Plan

### Step 1: Update `Theme` type and add token interfaces

File: `packages/core/src/core/types.ts`

- Add `TEXT_TOKEN` const, `TextTokens` interface
- Add `SHAPE_TOKEN` const, `ShapeTokens` interface
- Add `[Component.Text]: TextTokens` and `[Component.Shape]: ShapeTokens` to `ComponentTokenMap`
- Change `Theme.components` type from `ComponentTokenMap[K] & { variants?: Record<string, Partial<ComponentTokenMap[K]>> }` to `{ variants: Record<string, ComponentTokenMap[K]> }` — variants are required, complete (not Partial), and no top-level token spread

### Step 2: Update registry variant resolution

File: `packages/core/src/core/registry.ts`

- Replace the destructure + shallow-merge logic with direct variant lookup
- Default to `'default'` when no variant specified
- Keep required-tokens validation as a runtime safety net (compile-time `satisfies` catches theme authoring errors; runtime validation catches dynamic/test scenarios)

### Step 3: Update Text component

File: `packages/core/src/dsl/text.ts`

- Remove `color`, `bulletColor`, `lineHeightMultiplier` from `textSchema`
- Add `variant: schema.string().optional()` to `textSchema`
- Add `tokens` array to component registration
- Update `expandText` to use token defaults with props-override-tokens precedence

### Step 4: Update Shape component

File: `packages/core/src/dsl/primitives.ts`

- Remove `fill`, `fillOpacity`, `borderColor`, `borderWidth`, `cornerRadius` from `shapeDirectiveSchema`
- Add `variant: schema.string().optional()` to `shapeDirectiveSchema`
- Add `tokens` array to shape component registration
- Update shape expand to use token defaults, with DSL props overriding

### Step 5: Add variant to Line

File: `packages/core/src/dsl/primitives.ts`

- Add `variant: schema.string().optional()` to `lineSchema`

### Step 6: Migrate all themes to Figma model

File: `packages/theme-default/src/theme.ts` (and any other theme packages)

- Restructure all component token sections from `{ ...baseTokens, variants: { name: { ...partialOverrides } } }` to `{ variants: { default: { ...completeTokens }, name: { ...completeTokens } } }`
- Add `text` variants section (default, muted, accent, inverse)
- Add `shape` variants section (default, primary, subtle, outlined, accent)
- Add variants to `line` section (default, accent, muted, dashed)
- Define meaningful variants for `card`, `quote`, `table` (dark, accent, minimal, etc.)
- Use TypeScript spread + `satisfies Record<string, TokenInterface>` for DRY and compile-time safety

### Step 7: Update test infrastructure

Files: `packages/core/test/mocks.ts`, test files

- Update `mockTheme()` to use Figma model (variants map with `default`)
- Add `[Component.Text]` and `[Component.Shape]` entries
- Update existing variant resolution tests for new lookup model
- Add Text, Shape, Line variant resolution tests
- Add props-override-tokens precedence tests for Text

### Step 8: Update markdown examples

Files: `showcase.md`, any examples using removed props

- Replace `color="..."` with `variant="..."` or remove
- Replace `fill="..."` with `variant="..."` or remove
- Verify all examples still build

### Breaking changes

**Theme format change.** All themes must restructure `theme.components` from base-tokens-plus-variant-overrides to variants-map-with-complete-token-sets. This affects every theme package. The migration is mechanical: wrap existing base tokens in `variants: { default: { ... } }`, then make each existing variant complete by spreading the base.

**Directive schema change.** `color`, `bulletColor`, `lineHeightMultiplier` removed from Text. `fill`, `fillOpacity`, `borderColor`, `borderWidth`, `cornerRadius` removed from Shape. The migration:

1. `:::text{color="..."}` → `:::text{variant="muted"}` (or appropriate variant)
2. `:::shape{fill="..." borderColor="..."}` → `:::shape{shape="roundRect" variant="outlined"}` (or appropriate variant)
3. If a specific visual treatment is needed that no variant provides, the theme author adds a variant

**TypeScript DSL unchanged.** Layout developers and component expand functions continue to pass styling props directly.

---

## Phase 2 Roadmap

| Priority | Feature | Description |
|----------|---------|-------------|
| **1** | **Variant-only color model** | Add TextTokens and ShapeTokens. Remove styling props from directive schemas. Add variant support to Text, Shape, and Line. Migrate all components to Figma variant model (complete token sets, `default` required). |
| **2** | **Theme variant definitions** | Define meaningful variant sets for all components in the default theme. |
| **3** | **Theme file splitting** | Document recommended pattern for multi-size themes (shared palette/fonts/components, size-specific spacing/textStyles). No framework changes needed. |
| **4** | **Dark mode** | Per-slide color modes. Each slide specifies `mode: 'dark' | 'light'`. Theme defines complete component variant sets per mode. |
| **5** | **CLI theme scaffold** | `tycoslide theme-init --from-dtcg tokens.json` — consumes DTCG JSON, emits TypeScript theme package scaffold. One-time codegen, not runtime. |
| **6** | **Figma component pipeline** | Explore extracting Figma component structure (Auto Layout, variant properties) and mapping to tycoslide component definitions. Pipeline: Figma REST API → component extractor → TypeScript layouts + theme variants. |

---

## References

- [W3C DTCG Format Spec (2025.10)](https://www.designtokens.org/)
- [Style Dictionary](https://styledictionary.com/) — build tool for design tokens
- [Terrazzo](https://terrazzo.app/) — DTCG-native token CLI
- [Tokens Studio](https://docs.tokens.studio) — Figma plugin for DTCG tokens
- [architecture.md](./architecture.md) — Layout and rendering architecture
- [Figma ComponentSetNode API](https://developers.figma.com/docs/plugins/api/ComponentSetNode/) — Figma variant data model
- [Figma REST API Types](https://github.com/figma/rest-api-spec/blob/main/dist/api_types.ts) — Authoritative TypeScript types
- [Figma: Create and Use Variants](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants) — Default variant behavior
- [MUI Palette](https://mui.com/material-ui/customization/palette/) — TypeScript-enforced enum color props
- [Radix UI Color](https://www.radix-ui.com/themes/docs/theme/color) — 24-name enum color constraint
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) — Semantic CSS variable tokens
