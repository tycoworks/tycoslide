# Master/Layout Unification Design

Status: **Phases 1-3 complete, Phase 4 in progress**

## Decision

Eliminate the Master/Layout distinction entirely. Masters and Layouts become the same type.

### Template = Background + Layout + Tokens

```ts
interface Template {
  layout: LayoutDefinition;
  background: Background;
  spatial: Record<string, unknown>;
  visual: Record<string, unknown>;
  componentOverrides?: Record<string, Record<string, unknown>>;
}
```

### What Disappears
- `MasterDefinition` type — gone from core ✅
- `contentBounds` / `Bounds` arithmetic — gone (layout manages own margins via padding) ✅
- `masters.ts` — replaced by chrome composer functions ✅
- `collectMasterObjects()` in pptxRenderer — replaced by `splitByLayer()` ✅
- Phase 1 & 4 of presentation.ts pipeline (master rendering/dedup) — collapsed to 3-phase ✅
- `masterDefs`, `masters`, `masterBounds` maps in Presentation — gone ✅
- `Format.masters` field ✅

### Chrome Reuse via Composition

3 chrome composer functions replace masters.ts: ✅
- `withFooterChrome(content, tokens)` — margin + bottom footer row
- `withMargin(content, margin)` — margin only
- `withFactsheetChrome(content, tokens)` — top bar + footer

Higher-order wrapper: `chromed('footer', innerLayout)` wraps any layout with chrome.
Existing layout render functions stay unchanged.

### Render Layers

Nodes in the positioned tree can target one of two **layers**:

```ts
export const LAYER = {
  MASTER: "master",
  CONTENT: "content",
} as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];
```

- `LAYER.MASTER` — rendered via `defineSlideMaster({ objects })`, shared/deduped across slides
- `LAYER.CONTENT` — rendered per-slide via `addSlide()` content

Layout authors tag container nodes with `layer: LAYER.MASTER` to place them on the master layer.
Default (undefined) = content layer. The layer system is generic — any node can target the master
layer (chrome, watermarks, decorative elements, etc.).

Chrome composers in theme-default tag their containers with `layer: LAYER.MASTER`.

`splitByLayer(positioned)` walks the root's direct children, partitions into master vs content nodes.
Split happens AFTER layout (chrome participates in flex measurement for correct positioning).

`SlideNumberNode` defaults to `LAYER.MASTER` (SDK sets this automatically).

### PPTX Master Dedup

`defineSlideMaster()` still used for dedup — keyed on template name.
Templates sharing the same name share a PPTX master automatically.
Theme authors never think about masters. Pipeline handles it internally.

`defineMaster(name, background, masterNodes)` renders master-layer nodes as pptxgenjs `objects`,
handles `SlideNumberNode` via the master's `slideNumber` property (not `objects`).

### PptxGenJS Confirmation
- `defineSlideMaster()` `objects` field is OPTIONAL (confirmed from PptxGenJS source)
- Background-only masters are valid PPTX
- Chrome on slide layer is also valid — but we prefer dedup via master layer

### Implementation Approach
Phase 1: Make `defineSlideMaster()` background-only (stop passing chrome objects) ✅
Phase 2: Move chrome into layout composition functions ✅
Phase 3: Remove `MasterDefinition` from core types ✅
Phase 4: Implement layer-based master dedup in pipeline ← CURRENT

#### Phase 4 Detail

1. Add `LAYER` const and `Layer` type to `core/src/core/model/nodes.ts`
2. Add `layer?: Layer` to container node types (LayoutNode base)
3. Chrome composers tag containers with `layer: LAYER.MASTER`
4. New `splitByLayer(positioned)` utility in `core/src/core/rendering/`
5. Restore `defineMaster(name, background, masterNodes)` on PptxRenderer
6. Pipeline Phase 3: split positioned tree, route master nodes to `defineMaster()`, content to `renderSlide()`

Key files:
- `core/src/core/model/nodes.ts` — add LAYER const, layer field on containers
- `core/src/core/rendering/splitByLayer.ts` — NEW utility
- `core/src/core/rendering/pptxRenderer.ts` — restore defineMaster with new signature
- `core/src/core/rendering/presentation.ts` — use splitByLayer in Phase 3
- `theme-default/src/chrome.ts` — tag chrome containers with LAYER.MASTER

### Other Cleanup (from Phase 7 review)
- Remove spatial walk from font validator (spatial shouldn't contain fonts)
- Inline DesignTokens into format.ts (22-line interface doesn't need its own file)
- Rename spatial/visual to spatialTokens/visualTokens
- Make fillOpacity:100 and backgroundOpacity:0 structural defaults in components
- Add radiusLarge to Format (replace f.radius * 1.5 magic)
- Add accentOpacity to Format (replace magic 15 in mermaid)
- light/dark on Brand.colors: keep as-is (industry norm, widen later if needed)
