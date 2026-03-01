# Documentation Update Plan

## Context

User-facing docs (in `docs/`) were last updated Feb 24. The codebase has since added a code component, changed the component/layout registration API from single-step to define-then-register, added 19 layouts to the default theme (docs only mention 3), and evolved the token/schema system.

## Research Completed

A deep codebase scan identified 14 gaps between docs and code. The top two commits (`572a6e1`, `2bab88f`) then changed the registration API further, making existing doc examples incorrect.

---

## Gaps to Address

### Critical (docs are wrong / will mislead users)

1. **Component registration API rewrite** — Docs show `componentRegistry.define({...})` throughout. This no longer exists. The new API is `defineComponent({...})` (pure factory) + `componentRegistry.register(def)`. Every code example in `components.md` and `themes.md` that shows component registration needs rewriting.

2. **Layout registration API rewrite** — Same pattern: `layoutRegistry.define({...})` is now `defineLayout({...})` + `layoutRegistry.register(def)`. All examples in `layouts.md` need rewriting.

3. **Theme package contract changed** — Docs show side-effect imports (`import './layouts'`). New contract: themes must export `components` array and `layouts` array. The CLI's `themeLoader` calls `componentRegistry.register(components)` and `layoutRegistry.register(layouts)`. The `themes.md` "Registering Layouts in Themes" section and `layouts.md` cross-references need rewriting.

4. **Code component missing entirely** — New component with Shiki syntax highlighting, `:::code{language="typescript"}` directive, fenced code blocks auto-compile to it (language required), 15 theme tokens (`CodeTokens`), `LANGUAGE` enum with ~200+ entries. Needs a full section in `components.md`.

### Major (significant features undocumented)

5. **19 layouts in theme-default, docs list 3** — `title`, `section`, `body`, `stat`, `quote`, `end`, `blank`, `image`, `image-left`, `image-right`, `two-column`, `comparison`, `statement`, `agenda`, `cards`, `bio`, `caption`, `title-only`, `team`. The `layouts.md` page needs a complete listing.

6. **Component count is 14, not 13** — Summary tables in `components.md` and `README.md` need updating.

7. **Components export definition objects** — Each component now exports its definition (e.g., `cardComponent`, `textComponent`) alongside DSL functions. Theme authors need to know about these for the `components` array.

8. **`theme.fonts` manifest** — Commit `28d4aec` added explicit font registration. Check if Theme interface now has a `fonts` field.

9. **`Canvas` (was `RenderService`)** — `ExpansionContext` now has `canvas: Canvas` instead of the old `RenderService`. Affects custom component authoring docs.

### Medium (new features to document)

10. **`schema.content()` and `schema.size()`** — Two new schema helpers not in the component authoring reference table.

11. **`Theme.spacing.lineSpacing`** — New required field in the spacing section of `themes.md`.

12. **CONTENT.RICH vs CONTENT.PROSE behavior** — RICH mode disables block-level constructs at the parser. The gotcha (e.g., `text("1. Item")` renders as plain paragraph, not ordered list) isn't documented.

13. **Shape selective borders** — `borderTop/Right/Bottom/Left` boolean props on shapes.

14. **1-slot directive limitation** — Slotted components in `:::directive` syntax only support 1 slot.

15. **Accent colors are open vocabulary** — `Record<string, string>`, not fixed set of 5.

16. **`--render-scale` CLI flag** — Controls Playwright's deviceScaleFactor for HTML-to-PNG rendering of mermaid diagrams and code blocks. Values: 1 (fast/low quality), 2 (retina, default), 3 (print quality). Optional parameter. Needs documentation in `cli.md`.

### Minor (corrections/clarifications)

17. **Troubleshooting** — Add code component error messages (language required, unknown language).

---

## Files to Update

| File | Scope of Changes |
|------|-----------------|
| `components.md` | Heavy — add code component, fix all `componentRegistry.define()` examples, update summary tables (14 components), add `schema.content()`/`schema.size()`, document shape borders, 1-slot limitation, CONTENT.RICH behavior, accent open vocabulary |
| `layouts.md` | Heavy — document all 19 layouts, fix `layoutRegistry.define()` examples to use `defineLayout()` + `register()` |
| `themes.md` | Medium — fix theme package contract (components/layouts arrays), add `lineSpacing`, update registration examples, document `fonts` manifest if applicable |
| `README.md` | Light — update component count, verify quick start still accurate |
| `troubleshooting.md` | Light — add code component errors |
| `introduction.md` | Light — update component count reference if present |
| `quick-start.md` | Light — verify examples still work |
| `markdown-syntax.md` | Light — add fenced code block → code component behavior |
| `cli.md` | Light — document `--render-scale <factor>` flag for HTML-to-PNG rendering |
| `docs/README.md` | None — index page, already accurate |

---

## Agent Team

### Pipeline: Researcher → Writer → Reviewer

**Phase 1: Deep Research (DONE)**
Already completed. All gaps identified above.

**Phase 2: Writing (executor-high agent, Opus)**
A single executor-high agent gets the full gap list above and rewrites all doc files. Using executor-high (not writer/haiku) because:
- Needs to read source files to get API signatures exactly right
- Must produce code examples that actually compile against the new API
- Heavy cross-referencing between docs pages
- 8 files, ~600 lines of changes

The agent receives:
- This plan as the task brief
- Access to all source files for reference
- Instruction to preserve doc structure/style but update all content

**Phase 3: Review (code-reviewer agent, Opus)**
After writing is done, a code-reviewer verifies every changed doc:
- Every code example compiles against the actual API
- No stale references to old APIs (`componentRegistry.define`, `layoutRegistry.define`, side-effect imports)
- Cross-references between pages are consistent
- Component counts match everywhere
- Theme package contract is accurately described

**Phase 4: Fix-up (if needed)**
If reviewer finds issues, a quick executor pass fixes them.

---

## Key API Changes Reference (for writer agent)

### Old → New: Component Registration

```typescript
// OLD (docs currently show this — WRONG)
componentRegistry.define({
  name: 'badge',
  params: { label: schema.string() },
  tokens: ['backgroundColor', 'textColor'],
  expand: (props, context, tokens) => { ... },
});

// NEW (correct)
import { defineComponent, componentRegistry } from 'tycoslide';

export const badgeComponent = defineComponent({
  name: 'badge',
  params: { label: schema.string() },
  tokens: ['backgroundColor', 'textColor'],
  expand: (props, context, tokens) => { ... },
});

// Registration happens in the theme:
componentRegistry.register(badgeComponent);
// Or: componentRegistry.register([badgeComponent, otherComponent, ...]);
```

### Old → New: Layout Registration

```typescript
// OLD (docs currently show this — WRONG)
layoutRegistry.define({
  name: 'two-column',
  description: 'Two columns',
  params: { title: textComponent.schema.optional() },
  slots: ['left', 'right'],
  render: (props) => ({ ... }),
});

// NEW (correct)
import { defineLayout, layoutRegistry } from 'tycoslide';

export const twoColumnLayout = defineLayout({
  name: 'two-column',
  description: 'Two columns',
  params: { title: textComponent.schema.optional() },
  slots: ['left', 'right'],
  render: (props) => ({ ... }),
});

// Registration happens in the theme:
layoutRegistry.register(twoColumnLayout);
```

### Old → New: Theme Package Entry Point

```typescript
// OLD (docs currently show this — WRONG)
// my-theme/index.ts
import './layouts';  // Side-effect registration
export { theme } from './theme';

// NEW (correct)
// my-theme/index.ts
import { cardComponent, textComponent, ... } from 'tycoslide-components';
import { allLayouts } from './layouts.js';

export const components = [cardComponent, textComponent, ...];
export const layouts = allLayouts;
export { theme } from './theme.js';
```

### ExpansionContext

```typescript
// OLD: context.render or RenderService
// NEW: context.canvas: Canvas
export interface Canvas {
  renderHtml(html: string, transparent?: boolean): Promise<string>;
}
```
