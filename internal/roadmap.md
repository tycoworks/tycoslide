# Roadmap

Future work and planned improvements for tycoslide.

---

## Completed

| Feature | Description | Status |
|---------|-------------|--------|
| **Component migration** | All 13 DSL component definitions moved from `packages/core` to `packages/components` (`tycoslide-components`). Core is now a pure engine with zero component knowledge. See [component-ownership.md](./component-ownership.md). | Done |
| **Variant-only color model** | Added `TextTokens` and `ShapeTokens`. Removed styling props (color, fill, borderColor, etc.) from directive schemas. All components now style via variant selection only. | Done |
| **Theme variant definitions** | Defined variant sets for all components in the default theme: Card (default, flat), Text (default, muted, accent, inverse), Shape (default, primary, subtle, outlined, accent), Line/Quote/Table/SlideNumber (default). | Done |
| **Runtime theme validation** | `componentRegistry.validateTheme(theme)` validates all registered components at runtime. Replaced the old compile-time `ComponentTokenMap`. | Done |
| **Component Author API** | `markdown` toolkit namespace and `schema` helpers provide a clean API for custom component authors. | Done |
| **`prose()` / `label()` removal** | Removed in favor of `text(body, { style: TEXT_STYLE.X })`. Simpler, more explicit. | Done |

---

## Phase 2 Roadmap

| Priority | Feature | Description |
|----------|---------|-------------|
| **1** | **Theme file splitting** | Document recommended pattern for multi-size themes (shared palette/fonts/components, size-specific spacing/textStyles). No framework changes needed. |
| **2** | **Dark mode** | Per-slide color modes. Each slide specifies `mode: 'dark' | 'light'`. Theme defines complete component variant sets per mode. |
| **3** | **CLI theme scaffold** | `tycoslide theme-init --from-dtcg tokens.json` — consumes DTCG JSON, emits TypeScript theme package scaffold. One-time codegen, not runtime. |
| **4** | **Figma component pipeline** | Explore extracting Figma component structure (Auto Layout, variant properties) and mapping to tycoslide component definitions. Pipeline: Figma REST API -> component extractor -> TypeScript layouts + theme variants. |

---

## Future: Figma -> tycoslide Pipeline

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

A deeper integration — extracting Figma component structure (Auto Layout, constraints, variant properties) and mapping them directly to tycoslide component definitions and layouts — is a future exploration.

---

## Recommended Theme File Structure for Multi-Size

For brands that need multiple slide sizes (16:9, 4:3), the recommended structure is:

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

This is a theme authoring pattern, not a framework change. The `Theme` interface stays unchanged. Authors `import { palette } from './palette.js'` and compose the Theme object. The framework never knows or cares that the theme was assembled from shared parts.

If we later want a CLI convenience (`tycoslide theme-derive --from brand-16x9 --size 4x3`), it can generate a second theme file by applying a scale factor to absolute values. But that's a tool, not a runtime feature.
