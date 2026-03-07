# Master Slide Redesign

Design for elevating master slides from an untyped escape hatch to a first-class token-driven system.

**Status**: Proposed

---

## Problem

The current master implementation conflates three concerns — slide chrome (footer, slide number), content bounds computation, and background — into a single opaque `getContent()` callback with an untyped `Record<string, unknown>` token bag. Five specific problems:

1. **Margin in wrong place.** `SLIDE_SIZE` constants carry `margin: 0.5` alongside width/height/layout. Slide dimensions are a physical format property (16:9 at 10"x5.625"); margin is a design preference. The master already reads `theme.slide.margin` to compute `contentBounds`, so margin is simultaneously a format constant AND a design parameter.

2. **`theme.master` is untyped.** `Record<string, unknown>` means no compile-time validation, no token completeness checking, and an unsafe cast inside the master: `t.master as { footerHeight: number; slideNumber: SlideNumberTokens; footer: PlainTextTokens }`.

3. **Background hardcoded on Master object.** Every other visual property lives in `theme.master`. Background alone is `background: 'FFFFFF'` on the `Master` instance. The theme cannot control master background without constructing a new `Master` object.

4. **Only one master, and it's optional.** `masteredSlide()` hardcodes `DEFAULT_MASTER`. Dark-background layouts (title, section, end) skip the master entirely rather than using a dark master. The `Presentation.masters` Map supports multiple masters, but nothing wires them. The optional master creates two code paths in Presentation (mastered vs non-mastered) that complicate bounds computation and background handling.

5. **`getContent()` receives raw theme.** An imperative escape hatch in a declarative system. Components receive resolved tokens; layouts receive resolved tokens; masters receive `Theme` and do their own extraction.

---

## Current State

### Master interface (types.ts)

```typescript
export interface Master {
  name: string;
  background: string;
  getContent(theme: Theme): {
    content: ComponentNode;
    contentBounds: Bounds;
  };
}
```

### Default master (theme-default/src/master.ts)

```typescript
function masterContent(t: Theme) {
  const { width, height, margin } = t.slide;
  const masterTokens = t.master as { footerHeight: number; slideNumber: SlideNumberTokens; footer: PlainTextTokens };
  // ... builds footer row, computes contentBounds from margin
}

export const DEFAULT_MASTER: Master = {
  name: 'DEFAULT',
  background: 'FFFFFF',
  getContent: masterContent,
};
```

### Theme (theme-default/src/theme.ts)

```typescript
master: {
  footerHeight,
  slideNumber: { style, color, hAlign, vAlign },
  footer: { style, color, hAlign, vAlign },
},
```

### Layout usage (theme-default/src/layouts.ts)

```typescript
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    master: DEFAULT_MASTER,
    content: column({ gap: GAP.NONE, height: SIZE.FILL }, ...content),
  };
}
```

Layouts either use `masteredSlide()` (body, stat, quote, cards, etc.) or return raw `{ content, background }` without a master (title, section, end, blank).

### Presentation (presentation.ts)

- `fullBounds`: `new Bounds(width, height, margin)` — applies margin for non-mastered slides
- `masterBounds`: `new Bounds(width, height)` — full slide surface for master content
- When a slide has a master, content bounds come from `master.getContent().contentBounds`
- When a slide has NO master, it gets `fullBounds` (margin-inset)

### pptxRenderer

- `defineMaster()`: passes `background` to `pptxgenjs.defineSlideMaster()`
- `renderSlide()`: slide `background` overrides master; masterless slides get white (`FFFFFF`)

---

## Design

### MasterRegistry in registry.ts

Masters follow the same pattern as components and layouts: `defineMaster()` factory + `MasterRegistry` class extending `Registry<MasterDefinition>`.

```typescript
// registry.ts

export interface MasterDefinition {
  name: string;
  tokens: string[];
  getContent: (tokens: Record<string, unknown>, slideSize: { width: number; height: number }) => {
    content: ComponentNode;
    contentBounds: Bounds;
  };
}

export function defineMaster<TTokens>(def: {
  name: string;
  tokens: (keyof TTokens & string)[];
  getContent: (tokens: TTokens, slideSize: { width: number; height: number }) => {
    content: ComponentNode;
    contentBounds: Bounds;
  };
}): MasterDefinition {
  return def as unknown as MasterDefinition;
}

class MasterRegistry extends Registry<MasterDefinition> {
  constructor() { super('Master'); }

  validateTheme(theme: Theme): void {
    // mirrors LayoutRegistry.validateTheme()
    // checks theme.masters[name].variants[DEFAULT_VARIANT] has all required tokens
  }

  resolveTokens(masterName: string, variant: string, theme: Theme): Record<string, unknown> {
    // mirrors LayoutRegistry.resolveTokens()
  }
}

export const masterRegistry = new MasterRegistry();
```

Key difference from current: `getContent` receives **resolved tokens** and **slide dimensions**, not the raw theme. The framework resolves tokens from `theme.masters[name].variants[variant]` before calling `getContent`.

### MasterTokens type

```typescript
// In theme-default or as a shared type:
interface MasterTokens {
  background: string;              // slide background color or image path
  margin: number;                  // content inset from slide edges (inches)
  footerHeight: number;            // space reserved at bottom for footer
  footerText: string;              // copyright/footer string (currently hardcoded 'tycoworks')
  slideNumber: SlideNumberTokens;  // styling for slide number
  footer: PlainTextTokens;         // styling for footer text
}
```

Changes from current:
- `background` moves from `Master` object into tokens (fixes backcolor issue)
- `margin` moves from `SLIDE_SIZE` into master tokens (fixes margin placement)
- `footerText` tokenized (currently hardcoded as `'tycoworks'`)

### Theme type changes

```typescript
export interface Theme {
  slide: SlideSize | CustomSlideSize;  // margin REMOVED from SlideSize
  spacing: { normal: number; tight: number; loose: number };
  fonts: FontFamily[];
  textStyles: { [K in TextStyleName]: TextStyle };
  layouts: Record<string, {
    variants: { [DEFAULT_VARIANT]: Record<string, unknown> } & Record<string, Record<string, unknown>>;
  }>;
  masters: Record<string, {                     // NEW: plural, with variants
    variants: { [DEFAULT_VARIANT]: Record<string, unknown> } & Record<string, Record<string, unknown>>;
  }>;
}
```

`theme.master` (singular, untyped) becomes `theme.masters` (plural, variant structure matching layouts).

### SLIDE_SIZE changes

```typescript
export const SLIDE_SIZE = {
  S16x9:  { layout: 'LAYOUT_16x9',  width: 10,    height: 5.625 },
  S16x10: { layout: 'LAYOUT_16x10', width: 10,    height: 6.25  },
  S4x3:   { layout: 'LAYOUT_4x3',   width: 10,    height: 7.5   },
  WIDE:   { layout: 'LAYOUT_WIDE',  width: 13.33, height: 7.5   },
} as const;
```

Margin removed. Slide dimensions are pure format descriptors.

### Slide interface changes

```typescript
export interface Slide {
  masterName: string;         // REQUIRED: every slide has a master (replaces master?: Master)
  masterVariant?: string;     // which variant (defaults to DEFAULT_VARIANT)
  background?: string;        // overrides master background if set
  notes?: string;
  content: ComponentNode;
  name?: string;
}
```

**Masters are mandatory.** Every slide must specify a master. This eliminates the dual code path in Presentation (mastered vs non-mastered bounds) and ensures every slide gets its margin, background, and chrome from a single source of truth. Layouts that previously skipped masters (title, section, end, blank) use a `minimal` master instead — providing margin and background with no footer chrome.

Layouts reference masters by name, not by object import. The presentation resolves master name to definition at `add()` time.

### Refactored default master

```typescript
// theme-default/src/master.ts
import { defineMaster, Bounds, VALIGN, GAP, SIZE } from 'tycoslide';
import { row, column, plainText, slideNumber } from 'tycoslide-components';
import type { PlainTextTokens, SlideNumberTokens } from 'tycoslide-components';

interface DefaultMasterTokens {
  background: string;
  margin: number;
  footerHeight: number;
  footerText: string;
  slideNumber: SlideNumberTokens;
  footer: PlainTextTokens;
}

export const defaultMaster = defineMaster<DefaultMasterTokens>({
  name: 'default',
  tokens: ['background', 'margin', 'footerHeight', 'footerText', 'slideNumber', 'footer'],
  getContent: (tokens, slideSize) => {
    const { margin, footerHeight } = tokens;
    const contentBounds = new Bounds(
      margin,
      margin,
      slideSize.width - margin * 2,
      slideSize.height - margin * 2 - footerHeight,
    );
    const content = column(
      { height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin },
      row(
        { gap: GAP.TIGHT, height: footerHeight, vAlign: VALIGN.MIDDLE },
        plainText(tokens.footerText, tokens.footer),
        slideNumber(tokens.slideNumber),
      ),
    );
    return { content, contentBounds };
  },
});
```

No `theme` parameter. No unsafe cast. No hardcoded background or footer text. `slideSize` is the pure `{ width, height }` from `theme.slide`.

### Presentation changes

With masters mandatory, Presentation simplifies significantly. The `fullBounds` field (margin-inset fallback for masterless slides) is eliminated. Every slide gets its bounds from its master's `contentBounds`.

```typescript
// presentation.ts constructor:
constructor(theme: Theme) {
  const { width, height } = theme.slide;  // no margin — pure dimensions
  this.masterBounds = new Bounds(width, height);  // full slide surface for master content
  // No fullBounds — every slide has a master
}

// Master expansion (Phase 1 of processDeferredSlides):
for (const deferred of this.deferredSlides) {
  const { masterName, masterVariant } = deferred.slide;
  if (!this.masters.has(masterName)) {
    const def = masterRegistry.get(masterName);  // throws if not registered
    const tokens = masterRegistry.resolveTokens(masterName, masterVariant ?? DEFAULT_VARIANT, this._theme);
    const { content: rawContent, contentBounds } = def.getContent(tokens, { width, height });
    // ... expand, measure, etc.
    const background = (tokens as any).background;
    this.renderer.defineMaster({ name: masterName, background, content: positioned });
  }
}

// Slide bounds — always from master, no fallback:
const bounds = this.masters.get(masterName)!.contentBounds;
```

### Theme file changes

```typescript
// theme-default/src/theme.ts
masters: {
  default: {
    variants: {
      default: {
        background: 'FFFFFF',
        margin: 0.5,          // was on SLIDE_SIZE
        footerHeight,
        footerText: 'tycoworks',
        slideNumber: { style: TEXT_STYLE.FOOTER, color: colors.textMuted, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
        footer: { style: TEXT_STYLE.FOOTER, color: colors.textMuted, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
      },
    },
  },
},
```

### Layout helper changes

```typescript
// layouts.ts
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    masterName: 'default',   // string reference, not object import
    content: column({ gap: GAP.NONE, height: SIZE.FILL }, ...content),
  };
}
```

### Two required masters: `default` and `minimal`

Since masters are mandatory, every layout must reference one. The default theme ships two:

**`default`** — Footer chrome (copyright + slide number) with margin. Used by most layouts (body, stat, quote, cards, etc.).

**`minimal`** — Margin and background only, no footer chrome. Used by full-bleed layouts (title, section, end, blank) that previously skipped masters entirely.

```typescript
// A minimal master (no footer, just margin + background)
export const minimalMaster = defineMaster<MinimalMasterTokens>({
  name: 'minimal',
  tokens: ['background', 'margin'],
  getContent: (tokens, slideSize) => {
    const { margin } = tokens;
    const contentBounds = new Bounds(
      margin, margin,
      slideSize.width - margin * 2,
      slideSize.height - margin * 2,
    );
    return { content: column({ height: SIZE.FILL }), contentBounds };
  },
});
```

Theme provides both:

```typescript
masters: {
  default: { variants: { default: { background: 'FFFFFF', margin: 0.5, ... } } },
  minimal: { variants: {
    default: { background: 'FFFFFF', margin: 0.5 },
    dark:    { background: '1A1A2E', margin: 0.5 },
  }},
},
```

Layouts choose:

```typescript
// title layout (was masterless, now uses minimal):
return { masterName: 'minimal', masterVariant: 'dark', content: ... };

// body layout (has footer):
return { masterName: 'default', content: ... };
```

This eliminates the current pattern where dark layouts skip masters and lose slide numbering. It also eliminates the dual code path in Presentation — every slide follows the same master-based bounds resolution.

---

## Phased Implementation

### Phase 1: Type the existing system (minimal)

1. Define `MasterTokens` interface matching what the default master already expects
2. Move `background` from `Master.background` into tokens
3. Move `footerText` from hardcoded string into tokens
4. Replace `theme.master: Record<string, unknown>` with typed `theme.master: MasterTokens`
5. Remove unsafe cast in master.ts

~5 files, no architectural shift. Fixes backcolor bug and type safety.

### Phase 2: Registry + mandatory masters

1. Add `defineMaster()` factory and `MasterRegistry` to registry.ts
2. Add `theme.masters` (plural, with variants) to Theme type
3. Move margin from `SLIDE_SIZE` to master tokens
4. Make `Slide.masterName` required (not optional)
5. Remove `fullBounds` from Presentation — every slide gets bounds from its master
6. Create `minimal` master (margin + background, no footer chrome)
7. Update all layouts: `masteredSlide()` uses `'default'`, title/section/end/blank use `'minimal'`
8. Add `masterVariant` to Slide for dark/light variants on minimal master
9. Register masters via `loadTheme()` alongside components and layouts
10. Add `masterRegistry.validateTheme()` call

This is the big change — eliminates the mastered/non-mastered split, simplifies Presentation, and makes every slide's margin, background, and chrome come from a single source.

### Phase 3: Custom masters (stretch)

Future themes can define additional masters beyond `default` and `minimal` — e.g., a `branded` master with a watermark, or a `presenter` master with speaker prompts. The infrastructure from Phase 2 supports this with no framework changes.

---

## Files Affected

| Phase | File | Changes |
|-------|------|---------|
| 1 | `core/model/types.ts` | Type `theme.master`, remove `background` from `Master` |
| 1 | `theme-default/src/master.ts` | Read background + footerText from tokens |
| 1 | `theme-default/src/theme.ts` | Add background + footerText to master tokens |
| 1 | `core/rendering/pptxRenderer.ts` | Read background from tokens |
| 1 | `core/rendering/presentation.ts` | Pass tokens to master (minor) |
| 2 | `core/rendering/registry.ts` | Add `defineMaster()`, `MasterRegistry`, `masterRegistry` |
| 2 | `core/model/types.ts` | `theme.masters` (plural), `Slide.masterName` required, remove margin from SlideSize |
| 2 | `core/model/bounds.ts` | Remove margin constructor path (or keep for compat) |
| 2 | `core/rendering/presentation.ts` | Remove `fullBounds`, all slides use master bounds |
| 2 | `core/rendering/pptxRenderer.ts` | Read background from resolved tokens |
| 2 | `theme-default/src/master.ts` | Rewrite with `defineMaster()`, add `minimal` master |
| 2 | `theme-default/src/theme.ts` | `masters:` section with `default` + `minimal`, remove margin from slide |
| 2 | `theme-default/src/layouts.ts` | All layouts specify masterName: `'default'` or `'minimal'` |
| 2 | `core/src/index.ts` | Export `defineMaster`, `masterRegistry` |
| 2 | Tests | Mock theme updates, new master registry tests |

---

## Design Principles Applied

1. **Complete sets, not partial overrides.** Master tokens are a complete specification — background, margin, footer styling, footer text. No hidden defaults in framework code.

2. **Flat tokens, not nested objects.** Master tokens follow the same flat key-value pattern as component and layout tokens. `slideNumber` and `footer` are sub-objects because they map 1:1 to child component token surfaces (same pattern as card's `title: TextTokens`).

3. **Themes are the source of truth.** The master definition declares what tokens it needs; the theme provides them. Missing tokens fail at `validateTheme()`. The framework makes no design decisions about margin, background, or footer content.

4. **Fail fast.** Missing master tokens, unknown master names, unknown variants — all throw at build time with actionable messages.

5. **W3C DTCG alignment.** Masters use the same variant resolution as layouts: `theme.masters[name].variants[variant]`. Consistent token resolution across all three registries (component, layout, master).
