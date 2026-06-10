# Inline Highlight & Palette Naming

Replaces the open-vocabulary `:name[text]` accent system with single-color `==text==` highlight syntax. Also renames `text.secondary` to `text.description` for consistency.

## Problem

The `:accent[text]` / `:soft[text]` / `:dark[text]` directive system gives slide authors direct color control via open-vocabulary accent names. This conflicts with tycoslide's core principle: themes control the look, authors control the content.

Issues:
- The `:` prefix conflicts with component directive syntax (caused parsing bug, fixed in 611794a)
- Open vocabulary means authors can mistype accent names (runtime error)
- 3 color choices leak visual decisions into markdown
- At scale (50 authors), accent misuse creates brand drift

## Design: `==text==` Highlight

Replace `:name[text]` with `==text==` mark syntax. One highlight color, theme-controlled.

### Author experience

```markdown
Revenue grew ==40%== last quarter.

**==Bold and highlighted==** also works, as does ==**this order**==.
```

The theme decides the highlight color (defaults to `brand.primary`). Authors express intent ("this is important"), not color.

### Implementation

**New remark plugin: `remarkMark`** — transform plugin modeled on `remark-ins` (which does `++underline++`). Regex finds `==text==` in text nodes, produces `mark` MDAST nodes.

**Pipeline flow:**
```
Markdown ==text==
  -> remarkMark transform -> MDAST mark node
  -> transformInline() -> NormalizedRun with color: highlightColor
  -> PPTX text run with overridden color
```

### Token changes

`TextTokens`, `ListTokens`, `TableTokens`: replace `accents: Record<string, string>` with `highlightColor: string`.

`deriveTokens()` `richTextBase`: replace `accents` spread with `highlightColor: palette.brand.primary`.

`MermaidTokens`: keeps its own `accents: Record<string, string>` — mermaid classDef is theme-controlled diagram styling, not author inline text.

### What happens to `primitives.accents`

The record stays in `deriveTokens` for component-level use:

```typescript
const accents: Record<string, string> = {
  accent: palette.brand.primary,
  soft: palette.brand.soft,
};
```

`dark` key removed (only existed for `:dark[text]` inline use). Themes can reference `primitives.accents` for mermaid classDefs and any component token that needs named colors. This is theme-author-controlled, never slide-author-facing.

## Palette Rename: `text.secondary` -> `text.description`

The `text` group mixes role-based names (`heading`, `body`) with hierarchy-based names (`secondary`, `subtle`). Having `secondary` without `primary` is inconsistent.

Rename `text.secondary` to `text.description`. This matches the actual consumers (card descriptions, captions, stat labels) and avoids collision with `TEXT_STYLE.CAPTION`.

Final text group:
```typescript
text: {
  heading: Hex;      // primary heading text
  body: Hex;         // body text
  description: Hex;  // descriptions, captions, stat labels
  subtle: Hex;       // table headers, attribution
};
```

## Files changed

| File | Change |
|------|--------|
| `packages/core/src/core/model/syntax.ts` | Add `MARK: "mark"` |
| `packages/sdk/src/markdown/remarkMark.ts` | New: remark transform plugin |
| `packages/sdk/src/markdown/inline.ts` | Add `case MARK`; delete `case TEXT_DIRECTIVE`; `accents` param -> `highlightColor: string` |
| `packages/sdk/src/components/text.ts` | `TextTokens.accents` -> `highlightColor: string` |
| `packages/sdk/src/components/list.ts` | `ListTokens.accents` -> `highlightColor: string` |
| `packages/sdk/src/components/table.ts` | `TableTokens.accents` -> `highlightColor: string` |
| `packages/sdk/src/theme/tokens.ts` | `richTextBase` gets `highlightColor`; remove `accents` from it; drop `dark` from accents record |
| `packages/sdk/src/theme/format.ts` | Rename `secondary` -> `description` in Palette |
| `packages/theme-default/src/brand.ts` | Rename `secondary` -> `description` in palette literals |
| `packages/theme-default/src/formats/presentation.ts` | Update palette access sites; `accents` -> `highlightColor` on component tokens |
| `packages/theme-default/src/formats/factsheet.ts` | Same updates |
| `packages/sdk/src/components/mermaid.ts` | No change (keeps own `accents`) |

## Files unchanged

- `packages/sdk/src/markdown/parser.ts` — `remarkDirective` stays for `:::component` directives
- `packages/core/` — no core types change (except syntax.ts constant)
- Renderer / layout / measurement — highlight flows through existing TextRun color

## Decisions

- 4 architects + 3 product strategists consulted; unanimous YES on simplification
- One highlight color is sufficient for 90%+ of real corporate decks
- Two-way door: if enterprise customers need named inline accents, extend later
- `remark-directive` stays in parser for component directives; only inline text directive use removed
- `description` chosen over `caption` to avoid collision with `TEXT_STYLE.CAPTION`
