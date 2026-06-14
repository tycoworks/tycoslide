# Pending Changes Review

## tycoslide core (5 files changed)

### 1. SIZE.FIXED — `packages/core/src/core/model/types.ts`

Added `FIXED: "fixed"` to the `SIZE` const. Containers with `SIZE.FIXED` use the `weight` field as a pixel dimension instead of a flex proportion.

**Semantics:**
- Main axis: `flex: 0 0 <weight>px` — does not grow or shrink
- Cross axis: explicit CSS `height`/`width: <weight>px`
- `childContext`: `SIZE.FIXED` → `heightIsConstrained = true` (same as old numeric heights)
- Grid: `SIZE.FIXED` triggers `gridAutoRows: 1fr` (same as FILL)

**The `weight` field is overloaded:** when size is `FILL`, weight is a flex proportion (default 1). When size is `FIXED`, weight is pixels. This avoids adding a new field but means the name `weight` is misleading for the fixed case.

### 2. flexSize + childContext — `packages/core/src/core/layout/layoutHtml.tsx`

`flexSize()` gains a `SIZE.FIXED` branch before the existing `SIZE.FILL`/`SIZE.HUG` branches. `childContext()` changes `typeof node.height === "number"` to `node.height === SIZE.FIXED`. Grid `gridAutoRows` check likewise updated.

### 3. Tests — `packages/core/test/layoutHtml.test.ts`

6 tests updated from old numeric `height: 0.33` / `width: 3` syntax to `height: SIZE.FIXED, weight: 32` syntax. Pixel values now explicit (was `0.33 * 96 = 31.68`, now `32`). Comments about DPI conversion removed.

### 4. Docs — `docs/components.md`

- `row`, `column`, `stack`, `grid` parameter tables updated: width/height now show `fill | hug | fixed`
- `weight` description updated: "When size is `fill`: proportional share. When size is `fixed`: dimension in pixels."
- New example: mixed fixed/flexible children in a row (logo + spacer + page number)

### 5. Positioning — `internal/positioning.md`

Rewritten with "headless brand engine" framing, competitive landscape table, Templafy comparison, go-to-market strategy, "collateral as code" narrative. (Non-code, product strategy doc.)

---

## materialize-theme (new repo, no prior commits)

### Key files

- `src/formats/presentation.ts` — 3 templates: cover, agenda-dark, agenda-light
  - `buildChromeTokens()` parameterized with `colors: { slideNumber, footer }` instead of hardcoded hex
  - Two chrome sets (dark/light) with separate footer wrappers
  - Agenda templates use `vAlign: VALIGN.MIDDLE` (matching reference PPTX `anchor="ctr"`)
- `src/brand.ts` — Materialize color palettes (light/dark)
- `src/chrome.ts` — `withFooterChrome` and `withBackgroundImage` wrappers
- `src/layouts.ts` — `body` and `cover` layouts (no pixel values)
- `src/index.ts` — Theme entry, template name consts, calls `buildPresentationFormat(brand.colors.light)`
- `src/fonts.ts` — Host Grotesk, Inter Light, Fira Code
- `src/assets.ts` — Asset catalog (logos, backgrounds)
- `examples/test-materialize.md` — Test deck with cover + agenda-dark + agenda-light

### Known issues

1. **Bullet character**: reference uses `●` (U+25CF), tycoslide defaults to `•` (U+2022). Needs `bulletChar` on ListTokens.
2. **List font size**: reference uses 16pt, theme uses TEXT_STYLE.BODY (14pt). Theme-level fix needed.
3. **Line spacing**: reference uses 200% on list items. Not yet addressed.
4. **darkBodyBase spreads light-palette component tokens** (table, code, mermaid, etc.) — pre-existing, not urgent.

---

## Resolved questions

1. **weight overloading** — Acceptable for now, but JSDoc must document dual semantics.
2. **PPTX renderer** — Transparent. Operates on measured+positioned Bounds. No changes needed.
3. **SIZE.FIXED + no weight** — Must throw (fail fast), not silently produce 0px.
4. **Grid + SIZE.FIXED** — Correct. `gridAutoRows: 1fr` distributes rows equally within the fixed budget.

---

## TODO (prioritized)

### SIZE.FIXED hardening (tycoslide core)

1. ~~**Crash when FIXED used without explicit weight.**~~ DONE — throws in both main and cross axis paths.
2. ~~**Update JSDoc on ContainerNode.weight.**~~ DONE — documents dual semantics.
3. ~~**Update Size type docs.**~~ DONE — width/height comments include FIXED.
4. **Stack/Grid sizing decision.** Stack and Grid have `width`/`height` (accept `Size` including FIXED) but no `weight` field. Options: (a) remove sizing from Stack/Grid — always wrap in a container, (b) add `weight` to Stack/Grid. Decision: TBD.
5. ~~**Fix stale test.**~~ DONE — migrated to `SIZE.FIXED, weight: 192`.

### SDK: deriveTokens component support

6. **Add `onLight/onDark.components` to `deriveTokens`.** Currently `deriveTokens` does onLight/onDark symmetry for text/headings/lists but NOT for components (table, code, card, quote, testimonial, mermaid, image, label). The Palette has all the info needed — fills swap, text colors swap, accents stay. This was in the original design spec. Without it, every theme duplicates the same inversion boilerplate. Work is in `packages/sdk/src/theme/tokens.ts`.

### materialize-theme cleanup

7. ~~**Use `Hex` type from `@tycoslide/sdk`.**~~ DONE.
8. **Split componentTokens into light/dark variants (interim).** Stopgap until SDK `deriveTokens` has `onLight/onDark.components`. `darkBodyBase` currently spreads light-palette component tokens — tables/cards/quotes on dark slides will be invisible.

### Bullet/list fidelity (tycoslide + theme)

8. **Add `bulletChar` to ListTokens**, pipe through `NormalizedRun.bullet` to PptxGenJS. PptxGenJS already supports `characterCode`. Reference uses `●` (U+25CF, characterCode "25CF"), tycoslide defaults to `•` (U+2022).
9. **Fix agenda list font size.** Reference uses 16pt, theme uses TEXT_STYLE.BODY (14pt). Theme-level fix — either override list style or add a 16pt text style.
10. **Investigate list line spacing.** Reference uses `<a:lnSpc><a:spcPct val="200000"/></a:lnSpc>` (200%). Check if tycoslide can set per-component line spacing.
11. **Check cover slide text box alignment** against reference PPTX anchor values.
