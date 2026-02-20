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

## Phase 2 Roadmap

| Feature | Description |
|---------|-------------|
| **Dark mode** | Per-slide color modes. Each slide specifies `mode: 'dark' | 'light'`. Theme defines color mappings per mode. Accents stay constant; surface/text colors swap. |
| **CLI theme scaffold** | `tycoslide theme-init --from-dtcg tokens.json` — consumes DTCG JSON, emits TypeScript theme package scaffold. One-time codegen, not runtime. |

---

## References

- [W3C DTCG Format Spec (2025.10)](https://www.designtokens.org/)
- [Style Dictionary](https://styledictionary.com/) — build tool for design tokens
- [Terrazzo](https://terrazzo.app/) — DTCG-native token CLI
- [Tokens Studio](https://docs.tokens.studio) — Figma plugin for DTCG tokens
- [architecture.md](./architecture.md) — Layout and rendering architecture
