# SDK Authoring API

Design doc for a higher-level theme authoring API in `@tycoslide/sdk`. The goal is to eliminate foot guns, reduce boilerplate, and make theme authoring safe for both humans and AI agents — while keeping `@tycoslide/core` untouched.

**Status**: Design (first stab)
**Depends on**: Multi-format themes (Phase 2 complete)

## Problem

Building the factsheet format alongside the existing presentation format surfaced systemic pain points in the theme authoring experience. The current approach works, but requires deep knowledge of undocumented conventions, manual coordination between independent calculations, and extensive boilerplate wiring. Several bugs during factsheet development were caused by values that should have been derived from a single source of truth but were instead calculated independently.

The SDK layer (`@tycoslide/sdk`) already owns multi-format types (`ThemeDefinition`, `ThemeFormat`, `defineTheme`, `resolveThemeFormat`) and all component definitions. It is the natural home for authoring helpers that sit above core's deliberately simple API.

## Pain Points

### 1. contentBounds vs Chrome Layout Drift

Masters return `{ content, contentBounds, background }` from their render function. `contentBounds` is a manually calculated `Bounds` rectangle. The chrome layout is a separately constructed node tree. Nothing ties them together.

The factsheet master had a bug where `contentBounds` reserved `footerHeight + margin/2` at the bottom while the chrome layout used `footerHeight + margin`. The content area overlapped the footer, hiding it. Fix: shared `bottomReserved` variable. But the fix is convention — the API permits drift by construction.

```typescript
// These two calculations must stay in sync manually:
const bottomReserved = footerHeight + margin;
const contentBounds = new Bounds(margin, contentTop, contentWidth,
  slideSize.height - contentTop - bottomReserved);

// ...100 lines later...
row({ height: footerHeight }, ...footer),
column({ height: margin }),  // must equal bottomReserved
```

The presentation master has the same pattern with different arithmetic (`breathing = footerHeight / 2`, `margin / 4` padding). Three masters, three independent approaches to the same structural problem.

### 2. Manual Token Assembly

Building a single format requires ~40 intermediate token objects wired in dependency order across ~200 lines:

1. Text tokens: `bodyText`, `heroTitle`, `heroSubtitle` (from base + config)
2. Label tokens: `labelH1` through `labelH4`, `labelEyebrow`, `labelMutedSmall`, etc. (from text tokens + alignments)
3. Component tokens: `cardSlotTokens`, `tableTokens`, `codeTokens`, `quoteSlotTokens`, etc. (from text + label + base)
4. Slot bundles: `bodySlotTokens` (aggregates component tokens by name)
5. Layout token maps: 11+ layouts, each assembling header + body + component tokens

The `buildPresentationFormat` and `buildFactsheetFormat` functions are structurally near-identical — same layouts, same wiring, same token shapes — differing only in which master ref to use and a handful of token overrides (factsheet uses H1 titles instead of H3, purple H2 headings, narrower quote bar). Yet the entire builder must be duplicated.

### 3. Unvalidated Slot Token Conventions

Slot injection matches component tokens by name:

```typescript
// documentCompiler.ts
const tokenMap = layoutTokens[node.componentName];
```

The convention: a layout's token map must contain keys matching `Component.*` names. This is entirely unvalidated:

```typescript
const bodySlotTokens = {
  table: tableTokens,     // must match Component.Table
  code: codeTokens,       // must match Component.Code
  quote: quoteSlotTokens, // must match Component.Quote
  // Typo "tabel" or missing key → silent failure, no tokens injected
};
```

The type is `Record<string, unknown>` all the way through. Wrong key name: silent failure. Wrong token shape: runtime crash deep in a component render function.

### 4. Padding Limitations

`ContainerNode.padding` applies uniformly to all four sides. No directional control. The quote component needed padding on the text column but not on the accent bar side. The factsheet master needed bottom breathing room without affecting the top bar. Both required spacer node workarounds.

### 5. Master Definition Complexity

`defineMaster` requires:
1. Token shape declaration
2. Render function returning chrome + contentBounds + background
3. Manual `Bounds` arithmetic (see pain point 1)
4. Manual chrome construction from primitives

There is no way to express "header at top, footer at bottom, content in the middle" declaratively. The author must reverse-engineer the geometry.

## Proposals

### Priority 1: Eliminate Bug Classes

#### 1a. Declarative Master Builder

An SDK helper that derives `contentBounds` from the chrome description, making drift impossible.

```typescript
import { defineMasterChrome } from "@tycoslide/sdk";

const factsheetMaster = defineMasterChrome({
  name: "factsheet",
  tokens: token.shape({ margin, topBarHeight, footerHeight, /* ... */ }),
  chrome: (tokens, slideSize) => ({
    top: {
      height: tokens.topBarHeight,
      content: stack(shape(...), row(...)),  // purple bar
    },
    bottom: {
      height: tokens.footerHeight,
      breathing: tokens.margin,  // space below footer
      content: row(slideNumber(...)),
    },
  }),
  margin: (tokens) => tokens.margin,
  background: (tokens) => tokens.background,
});
```

The helper computes `contentBounds` as: `Bounds(margin, margin + top.height, width - 2*margin, height - margin - top.height - bottom.height - bottom.breathing)`. Chrome and bounds share the same values. Drift is structurally impossible.

Wraps `defineMaster` from core — core stays untouched.

**Trade-off**: Constrains masters to top/bottom/left/right regions. Complex masters (percentage-based about sections) may need escape hatches or the raw `defineMaster` API.

#### 1b. Typed Slot Token Bundles

Validates slot token keys and shapes at construction time:

```typescript
import { slotTokens } from "@tycoslide/sdk";

const bodySlots = slotTokens({
  table: tableTokens,      // type-checked: must be TableTokens
  code: codeTokens,        // type-checked: must be CodeTokens
  quote: quoteSlotTokens,  // type-checked: must be QuoteTokens
  // "tabel": ...           // compile error: not a component name
});
```

Uses a typed registry pattern where component definitions register their token type. `slotTokens()` uses mapped types to enforce correct shapes per key.

### Priority 2: Reduce Boilerplate

#### 2a. Text Style Scale Generator

Generates a complete `textStyles` record from minimal input:

```typescript
import { textStyleScale } from "@tycoslide/sdk";

const textStyles = textStyleScale({
  fonts: { heading: inter, body: interLight, code: firaCode },
  baseFontSize: 14,   // body size in pt
  scale: 1.33,        // type scale ratio (perfect fourth)
  // Generates: title, h1-h4, body, small, eyebrow, footer, code
  // lineHeightMultiplier, bulletIndentPt derived automatically
});
```

Eliminates ~40 lines of textStyle definitions per format.

#### 2b. Format Variant Helper

Defines a format as deltas from another format:

```typescript
const factsheetFormat = deriveFormat(presentationFormat, {
  slide: SlideFormat.letterPortrait,
  master: factsheetMasterRef,
  textStyles: textStyleScale({ baseFontSize: 10, scale: 1.25 }),
  overrides: {
    "body.default": {
      label: { 2: { color: palette.purple } },
      quote: { bar: { width: 1 }, spacing: 0.25 },
    },
  },
});
```

Addresses the near-total duplication between `buildPresentationFormat` and `buildFactsheetFormat`. Layouts not mentioned inherit unchanged.

**Trade-off**: Makes the relationship between formats implicit. Debugging token values requires understanding the merge logic.

### Priority 3: Developer Experience

#### 3a. Directional Padding

SDK helper wrapping spacer nodes:

```typescript
import { padded } from "@tycoslide/sdk";

padded({ left: spacing, right: spacing }, ...children)
// Generates: row(column({ width: spacing }), column(...children), column({ width: spacing }))
```

If core accepts a future enhancement, `padding` on `ContainerNode` could support `{ top, right, bottom, left }` directly.

#### 3b. Master Debug Overlay

Development-time utility that renders `contentBounds` as a visible rectangle overlaid on master chrome:

```typescript
import { debugMaster } from "@tycoslide/sdk";
const debugged = debugMaster(factsheetMaster);
// Renders contentBounds as semi-transparent colored rectangle
```

Makes contentBounds/chrome misalignment immediately visible.

## AI Agent Considerations

AI agents building themes benefit most from:

1. **Strong typing** (1b) — agents rely on type errors for feedback. `Record<string, unknown>` gives no signal when wrong.
2. **Derivation over construction** (2a, 2b) — agents handle templates and deltas well, but struggle with 40 intermediate variables in dependency order.
3. **Impossible-by-construction** (1a) — agents cannot reliably verify that manual arithmetic in two places stays consistent across edits.
4. **Debug tooling** (3b) — agents need observable feedback to verify correctness in a loop.

The single highest-impact change for AI authoring is 1a (declarative master builder), because contentBounds drift is invisible without rendering output.

## Scope

All proposals are SDK-layer additions. Core remains untouched. Theme authors who prefer the raw `defineMaster` / `defineComponent` / `defineLayout` APIs can continue using them directly.

## Architect Consensus: Theme Restructure (4/4 agreement)

**Status**: Decided (April 2026, 4 independent architect analyses)

Four independent architect analyses converged on the same design. This section captures the consensus.

### Decision: Single Factory, Not deriveFormat

All four architects rejected the `deriveFormat` proposal (2b above) and recommended a single `buildFormat()` factory driven by a typed policy object.

**Why not deriveFormat:**
- Formats are peers, not parent/child. Factsheet is not "a modified presentation."
- Deep merge semantics are debugging poison — must mentally reconstruct merged output
- Breaks the "no defaults" philosophy — anything not overridden silently inherits
- When a third format arrives (battle card), which format does it derive from?

**The factory approach:**
```typescript
buildFormat(base, format: Format) → ThemeFormat
```

One function builds all ~40 intermediate token objects and wires all layout token maps. Each format declares its differences via a typed `Format` object. The factory applies those differences at construction time — no merge, no inheritance.

### Decision: File Structure

```
packages/theme-default/src/
  base.ts              — Brand constants (UNCHANGED)
  assets.ts            — Font/image paths (UNCHANGED)
  master.ts            — All master definitions (UNCHANGED)
  layouts.ts           — All layout definitions (UNCHANGED)
  formats/
    presentation.ts    — Format (dimensions + masters + overrides)
    factsheet.ts       — Format (dimensions + masters + overrides)
  buildFormat.ts       — NEW: single buildFormat() factory (~280 lines)
  theme.ts             — THIN: ~15-30 lines (defineTheme + two factory calls)
  index.ts             — Re-exports (UNCHANGED)
```

### Decision: No Per-Format Directories or Sub-Packages

Layouts and most masters are genuinely shared. Splitting into per-format directories would create duplication. Sub-packages add dependency management overhead for no benefit within a single theme.

### Decision: Layouts Stay Format-Agnostic

Layouts define spatial relationships. Token maps are the extension point. The factory builds different token maps for each format and passes them to the same layout definitions.

### The 3 Remaining Deltas Between Formats

After normalizing title subtitle color, end layout, quote dark variant (commit f7af09d), light minimal background, and body slot label[2] color (shared purple subheading), the original 8 deltas reduced to 3. All 3 feed into the shared token assembly — none require per-layout token map tweaks.

| # | Delta | Presentation | Factsheet | Applies to |
|---|-------|-------------|-----------|------------|
| 1 | Primary master | `defaultMasterRef` | `factsheetMasterRef` | `bodyBase` (body, cards, stat, agenda) |
| 2 | Header title style | H3 (compact) | H1 (prominent) | `headerTokens` |
| 3 | Quote bar width + attribution | `accentBarWidth` (2), default | `1`, `TEXT_STYLE.BODY, HALIGN.RIGHT` | `bodySlotTokens` |

Plus one structural difference: factsheet excludes 3 layouts (shapes, lines, transform).

### Resolved: Layout Override Mechanism — Not Needed

The three deltas that would have required per-layout overrides (title subtitle color, end layout master/alignment, quote dark variant) turned out to be unintentional divergences. After normalizing them, all remaining deltas are expressible as fields on the `Format` type directly. No per-layout override mechanism is needed.

### Relationship to Other Proposals

| Proposal | Status |
|----------|--------|
| 1a. Declarative master builder (`defineMasterChrome`) | Still valuable, independent workstream |
| 1b. Typed slot token bundles | Still valuable, independent workstream |
| 2a. Text style scale generator | Still valuable, can simplify Format configs |
| 2b. `deriveFormat` | **Rejected** — replaced by single factory approach |
| 2c. Layout override mechanism | **Resolved** — not needed after normalizing deltas |
| 3a. Directional padding | Deprioritized |
| 3b. Master debug overlay | Still valuable, independent |

## Next Steps

1. Implement `buildFormat.ts` with single factory
2. Define `Format` type with: dimensions, textStyles, primary master, light background, header style, body slot overrides, excluded layouts
3. Convert presentation and factsheet configs to `Format` objects
4. Reduce `theme.ts` to thin orchestrator (~15-30 lines)
5. Verify byte-identical output for both formats
6. Future: typed slot tokens (1b), declarative masters (1a) as separate workstreams
