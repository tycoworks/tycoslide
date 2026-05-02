# Template Unification

Design doc for replacing the master + layout + variant system with a unified template concept.

**Status**: Design (approved directionally, April 2026)
**Branch**: multi-format-themes

## Problem

The current theme authoring model has 3 layers between Brand and Content:

1. **Master** — slide chrome (background, footer, logo). `defineMaster()` + `masterRegistry.register()`
2. **Layout** — content arrangement (title+body, two-column, cards). `defineLayout()` + `layoutRegistry.register()`
3. **Variants** — token-level diffs on a layout (body/default, body/centered)

Plus `MasterRef` wiring connecting layouts to masters through tokens.

**Issues:**
- Three concepts for theme authors to learn
- `MasterRef` plumbing in every layout token interface
- Variant dispatch adds indirection (`resolveVariantTokens`)
- Invalid combinations possible (dark master + light layout tokens)
- Markdown requires two frontmatter keys (`layout:` + `variant:`)

## Prior Art Research

| Tool | Chrome + Layout union | Variant mechanism |
|------|----------------------|-------------------|
| PowerPoint | Slide Layout inherits from Slide Master | Multiple masters (light/dark) |
| Keynote | Master Slide fuses both | Duplicate masters |
| Canva | Template (locked + unlocked elements) | Separate templates |
| Slidev | Layout (Vue component) + Theme (CSS) | CSS variables |
| Figma | Variables + Modes | Mode switching |

Key finding: PPTX has NO content area concept. Slide content can be placed anywhere — including on top of master chrome. `contentBounds` is a tycoslide invention.

## Design Decisions

### Decision 1: Template = the single authoring concept

**Template = a specific slide type. No variants. No separate master/layout for theme authors.**

Markdown surface:
```yaml
template: body-centered
```

One field. One concept. Replaces `layout: body` + `variant: centered`.

### Decision 2: Variants eliminated

Token resolution becomes direct lookup:
```typescript
// OLD: two-level dispatch
const tokens = resolveVariantTokens(theme.layouts[layoutName], layoutName, variant);

// NEW: direct lookup
const tokens = theme.templates[templateName];
```

`resolveVariantTokens` deleted entirely. Templates that share a content arrangement (body, body-centered) reuse plain functions.

### Decision 3: contentBounds moves to SDK

Core matches PPTX's actual model:
- **Masters** return `{ content, background }` only — pure chrome, no contentBounds
- **Slide** has `contentBounds: Bounds` as a caller-provided field
- **SDK's defineTemplate()** computes contentBounds from chrome dimensions/margins and attaches it to the Slide
- Core uses contentBounds for measurement sizing and position offsetting, same as today

This makes core a purer tool: "measure this tree in this box, render to PPTX."

### Decision 4: Core = typed, layout-aware PPTX generator

Core owns:
- **Model**: Typed node trees (flex containers, primitives)
- **Layout**: Browser-based flexbox measurement + positioning
- **Rendering**: PPTX output via pptxgenjs with absolute coordinates
- **Master dedup**: Grouping shared chrome for efficient PPTX
- **No semantic knowledge** of templates, themes, components, or content areas

Value over raw pptxgenjs: declarative node trees + flexbox layout + master dedup + font management + type safety.

### Decision 5: SDK owns all semantic/compositional concerns

SDK owns:
- `defineTemplate()` — computes chrome, content area, measurement bounds
- Component system (defineComponent, componentRegistry)
- Markdown compilation (documentCompiler, slideParser, slotCompiler)
- Token system (resolution, slot injection)
- Theme types (Brand, Format, ThemeDefinition, resolveThemeFormat)
- Chrome definitions (plain functions, not registered)
- Content layout functions (plain functions for reuse)

## Theme Format

```typescript
// Flat namespace, no variant wrapper
templates: {
  "body":          { chrome: primaryChrome, ...bodyTokens, vAlign: VALIGN.TOP },
  "body-centered": { chrome: primaryChrome, ...bodyTokens, vAlign: VALIGN.MIDDLE },
  "title":         { chrome: lightMinimal, ...titleTokens },
  "section":       { chrome: darkMinimal, ...sectionTokens },
}
```

## SDK: defineTemplate()

```typescript
const bodyTemplate = defineTemplate({
  name: "body",
  description: "Markdown body with optional title.",
  params: { title: param.optional(textComponent.schema) },
  slots: ["body"],
  render: ({ title }, { body }, tokens) =>
    column({ height: SIZE.FILL, vAlign: tokens.vAlign }, ...body),
});
```

- Theme author's render returns `SlideNode` (content only)
- Framework auto-extracts `tokens.chrome`, computes contentBounds, wraps into `Slide`
- Core sees standard `Slide` objects

## Chrome: Plain Functions

```typescript
export const footerChrome: ChromeDefinition<FooterChromeTokens> = (tokens, slideSize) => ({
  content: column(/* footer row */),
  background: tokens.background,
});
```

PPTX dedup works via object identity on chrome token objects.

## Content Reuse: Plain Functions

```typescript
function bodyContent({ title }, { body }, tokens) {
  return column(
    { height: SIZE.FILL, vAlign: tokens.vAlign, spacing: tokens.spacing },
    ...(title ? [headerBlock(title, tokens)] : []),
    ...body,
  );
}
```

## Layering

| Layer | Owns | Public API? |
|-------|------|-------------|
| Core | Node model, layout pipeline, PPTX rendering, master dedup | Internal (typed PPTX generator) |
| SDK | `defineTemplate()`, components, chrome, tokens, markdown, themes | Yes — theme authors use this |
| Theme | Chrome functions, content functions, template defs, token maps | Yes — theme-specific |

## Migration

Clean break:
1. Core: `MasterDefinition.render()` stops returning contentBounds. `Slide` gets explicit `contentBounds` field.
2. SDK: Add `defineTemplate()`, move contentBounds computation from masters to templates.
3. Theme-default: Migrate masters.ts → chrome functions, layouts.ts → content functions + template defs, flatten variants.
4. Remove legacy public APIs (defineMaster, defineLayout, MasterRef, resolveVariantTokens).

## Open Questions

- Template naming conventions (hyphenated: body-centered, or slashed: body/centered?)
- How format configs declare which templates are available per format
- Chrome function: should it return contentBounds (for SDK convenience) or should SDK always compute it?
