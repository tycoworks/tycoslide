# Markdown Slide Authoring — Design Doc

**Status:** Research complete. Key decisions made. Layout registry is next implementation step.

---

## Vision

Two audiences, two interfaces, one pipeline:

- **Developers** build layouts and components in TypeScript (DSL)
- **Slide authors** write content in markdown files

A markdown file compiles to a `Presentation` — the same object the TypeScript DSL produces. The downstream pipeline (measurement, layout, PPTX rendering) is unchanged.

---

## Two Levels of Markdown

tycoslide has two distinct markdown features:

| | Inline Markdown | Document Compiler |
|---|---|---|
| **Interface** | `markdown("**bold** :teal[text]")` | `slides.md` file |
| **Scope** | Single text block within a slide | Full presentation (many slides) |
| **Output** | `TextNode` (single text box) | `Presentation` with `Slide[]` |
| **Used by** | Developers writing TypeScript | Slide authors writing content |
| **Status** | Phase 1 complete | This document |

They share the same remark parser and run transformer, but serve different purposes.

---

## Prior Art

### Slidev (sli.dev) — Closest to Our Model

**Slide boundaries:** `---` (horizontal rule)

**Layout selection:** YAML frontmatter per slide with `layout:` property

**Layout parameters:** Additional frontmatter properties passed as props

**Multi-region content:** Slot markers `::slotname::`

```markdown
---
layout: two-cols
---

# Left Column
Default slot content

::right::

# Right Column
Right slot content
```

**Custom layouts:** Vue SFCs in `./layouts/` directory. Frontmatter props passed automatically.

**Components in markdown:** Vue components directly, or MDC syntax `::component{prop="value"}`

**Key insight:** Slidev is the only tool with a **named layout system with parameters** — exactly what tycoslide needs. Every slide has a layout (defaults to `cover` for first slide, `default` for rest).

### Marp/Marpit — Clean Directive Syntax

**Slide boundaries:** `---`

**Directives:** YAML frontmatter or HTML comments `<!-- directive: value -->`

**Directive scoping:** Global (whole deck), local (this slide + following), scoped (`_`-prefixed, this slide only)

```markdown
---
theme: default
paginate: true
---

# Slide 1

---

<!-- _backgroundColor: aqua -->
# This Slide Only
```

**No named layouts.** All layout is CSS-based. Multi-column requires manual HTML `<div>` wrappers. Marp explicitly says "layout is CSS's job."

**Image extensions:** `![bg left:40%](image.jpg)` — powerful but syntax-heavy.

**Key insight:** Directive scoping (global / local / scoped) is a good model for cascading configuration.

### reveal.js — Attribute Injection

**Slide boundaries:** `---` (horizontal), `--` (vertical/sub-slides)

**Attributes:** HTML comments `<!-- .slide: data-background="#f00" -->`

**Speaker notes:** `Note:` separator

**No named layouts.** Per-slide attributes control background, transition, etc.

**Key insight:** The `Note:` separator for speaker notes is clean and widely adopted.

### Remark.js — Template Inheritance

**Slide boundaries:** `---`

**Slide properties:** Key-value pairs at start of each slide

```markdown
name: intro
class: center, middle
layout: true

# Template Header

---

# Slide Content
(inherits template)
```

**Key insight:** `layout: true` makes a slide into a template for subsequent slides. Interesting but fragile — implicit state.

### Deckset — Per-Slide Directives

**Slide boundaries:** `---`

**Directives:** `[.command: value]` syntax, global at top or per-slide

```markdown
theme: Fira, 3
autoscale: true

---

[.autoscale: true]
# My Slide
```

**Key insight:** `[.directive]` syntax is markdown-safe (renders as text in non-Deckset parsers). Good for portability.

---

## Design Constraints

### Hard Requirements

1. **Named layouts only** — Slides must reference a registered layout. No ad-hoc positioning.
2. **Layouts have typed parameters** — `contentSlide(title, eyebrow, ...content)` is not just a template; it's a function with a specific signature.
3. **Everything is theme-bound** — Fonts, colors, highlights, images, layouts, spacing — all controlled by the theme. Slide authors can only use what the theme provides. This is a feature: it makes it impossible to produce off-brand presentations. No inline CSS, no arbitrary colors, no relative image paths.
4. **Single output format** — Compiles to `Presentation` (same as TypeScript DSL).

### Unique Challenges vs Prior Art

Prior art tools render to **HTML/CSS** where layout is flexible. We render to **PPTX** where:

- Every element has absolute positioning
- Text boxes are discrete objects (no CSS flow)
- Layouts are pre-defined spatial arrangements, not CSS grids
- Components (card, table, diagram) are complex parameterized objects

This means we can't do what Marp does (dump markdown into CSS and let the browser figure it out). We need structured mapping from markdown to layout parameters.

---

## Proposed Syntax

### File Structure

```markdown
---
theme: materialize
---

# My Presentation Title

---
layout: content
eyebrow: INTRODUCTION

Body content here with **bold** and :accent1[highlights].

- Bullet point one
- Bullet point two

---
layout: twoColumn
eyebrow: COMPARISON

::left::

Left column content.

::right::

Right column content.
```

### Slide Boundaries

`---` (universal standard). First `---` block is global frontmatter.

### Global Frontmatter

```yaml
---
theme: materialize    # Theme package name
title: My Deck        # Presentation metadata
---
```

### Per-Slide Frontmatter

```yaml
---
layout: content       # Required: named layout
eyebrow: SECTION      # Layout parameter
title: Slide Title    # Layout parameter (alternative to # heading)
notes: |              # Speaker notes
  Remember to mention X
---
```

### The Title Question

How should slide titles be specified? Three options:

**Option A: Title in frontmatter only**
```markdown
---
layout: content
title: My Slide Title
eyebrow: SECTION
---

Body content here.
```
Pro: Clean separation of metadata and content. Title is a layout parameter.
Con: Doesn't read naturally as a document.

**Option B: First `#` heading becomes title**
```markdown
---
layout: content
eyebrow: SECTION
---

# My Slide Title

Body content here.
```
Pro: Reads naturally. Standard markdown.
Con: `#` means "H1 heading" in markdown, not "layout title parameter." Semantic overloading.

**Option C: Both supported, frontmatter wins**
```markdown
---
layout: content
eyebrow: SECTION
---

# My Slide Title

Body content here.
```
If `title:` is in frontmatter, it's used. Otherwise first `# heading` is extracted as title. Heading is consumed (not rendered as content).

**Recommendation:** Option C. Natural for authors, explicit when needed.

### Content Slots

For multi-region layouts (Slidev pattern):

```markdown
---
layout: twoColumn
eyebrow: COMPARISON
---

# Problem

Legacy systems can't keep up.

::right::

# Solution

Materialize provides real-time views.
```

Slot markers: `::name::` on its own line. Default slot is implicit (everything before first marker).

### Speaker Notes

reveal.js pattern:

```markdown
---
layout: content
eyebrow: ARCHITECTURE
---

# Event-Driven Pipeline

Sources push changes into materialized views.

Note:
Emphasize that this is push-based, not polling.
Mention the latency guarantees.
```

Everything after `Note:` (on its own line) until next slide boundary.

---

## Layout Registry — IMPLEMENTED

### Design

`LayoutDefinition` is a tycoslide core type. Each layout has a name, description, and a typed `render` function:

```typescript
interface LayoutDefinition<TParams = Record<string, unknown>> {
  name: string;
  description: string;
  render: (params: TParams) => Slide;
}
```

TypeScript generics provide compile-time type safety. There is no runtime parameter schema — that will be added in Phase 3 using Zod when the markdown compiler needs to validate frontmatter.

Themes define concrete param types for each layout:

```typescript
interface ContentParams {
  title: string;
  eyebrow: string;
  content: SlideNode[];
}

const contentLayout: LayoutDefinition<ContentParams> = {
  name: 'content',
  description: 'General content with eyebrow, title, and flexible centered body.',
  render: ({ title, eyebrow, content }) =>
    masteredSlide(headerBlock(eyebrow, title), contentBody(...content)),
};
```

### Registry

`LayoutRegistry` is a singleton (`layoutRegistry`) following the same pattern as `ComponentRegistry`. Themes call `registerMaterializeLayouts()` to register all layouts at initialization.

### Validation Strategy (Phase 3)

When the document compiler arrives, each layout will add a Zod schema alongside its TypeScript interface. Zod provides:
- Runtime validation of frontmatter YAML
- TypeScript type inference from the schema (eliminating double bookkeeping)
- `.describe()` for AI discovery and error messages

This avoids building a homebrew type system now that would be replaced by Zod later.

### Materialize Layouts

All layouts take a single typed params object:

| Layout | Params Type | Key Fields |
|--------|------------|------------|
| `title` | `TitleParams` | `title`, `subtitle?` |
| `section` | `SectionParams` | `title` |
| `content` | `ContentParams` | `title`, `eyebrow`, `content: SlideNode[]` |
| `agenda` | `AgendaParams` | `title`, `eyebrow`, `intro?`, `items: string[]` |
| `bullet` | `BulletParams` | `title`, `eyebrow`, `intro`, `bullets: string[]` |
| `card` | `CardSlideParams` | `title`, `eyebrow`, `intro`, `cards: CardProps[]` |
| `numberedCard` | `NumberedCardSlideParams` | `title`, `eyebrow`, `intro`, `cards: CardProps[]` |
| `image` | `ImageSlideParams` | `title`, `eyebrow`, `image` |
| `table` | `TableSlideParams` | `title`, `eyebrow`, `intro`, `rows: TextContent[][]` |
| `twoColumn` | `TwoColumnParams` | `title`, `eyebrow`, `left`, `right` |

### Frontmatter Mapping (Phase 3)

When the markdown compiler is built, it will map frontmatter + content to these params:

| Layout | Frontmatter Fields | Content Mapping |
|--------|-------------------|-----------------|
| `title` | `subtitle?` | Title from `#` heading |
| `section` | — | Title from `#` heading |
| `content` | `eyebrow` | Title from `#`, body → `content` |
| `agenda` | `eyebrow`, `intro?` | Title from `#`, bullets → `items` |
| `bullet` | `eyebrow`, `intro` | Title from `#`, bullets → `bullets` |
| `card` | `eyebrow`, `intro` | Title from `#`, `:::card` directives → `cards` |
| `image` | `eyebrow`, `image` | Title from `#` |
| `table` | `eyebrow`, `intro` | Title from `#`, markdown table → `rows` |
| `twoColumn` | `eyebrow` | Title from `#`, `::left::`/`::right::` → slots |

---

## Content Compilation

### Block-Level Mapping

When markdown body is compiled to `SlideContent[]`:

| Markdown Block | Compiles To |
|---------------|-------------|
| Paragraph | `TextNode` with `NormalizedRun[]` |
| Bullet list (entire list) | Single `TextNode` with bullet runs |
| Numbered list | Single `TextNode` with numbered bullet runs |
| Markdown table | `TableNode` |
| `![](asset:name)` | `ImageNode` (resolved from theme assets) |
| Multiple blocks | `ColumnNode` wrapping the above |

This is the "block compiler" model — each block-level MDAST element becomes its own `ElementNode`. A single paragraph stays a single `TextNode`. Multiple blocks get wrapped in a `ColumnNode` with theme-default gap.

### Headings Within Content

Within the content body (after title extraction), headings map to styled text:

| Markdown | Maps To |
|----------|---------|
| `## Subheading` | `TextNode` with `TEXT_STYLE.H2` |
| `### Label` | `TextNode` with `TEXT_STYLE.H3` |

This is where the block compiler diverges from the inline `markdown()` component. In the inline component, everything is one `TextNode`. In the document compiler, each block is independent — headings get their own `TextNode` with the appropriate style.

### Component Directives

For tycoslide-specific components, use a directive syntax:

```markdown
:::card
title: Feature A
description: Fast and reliable
backgroundColor: #FF6B35
:::

:::card
title: Feature B
description: Scales automatically
:::
```

Or for diagrams:

```markdown
:::diagram{direction=LR}
[Source DB] --> [Materialize] --> [App]
:::
```

The `:::name` syntax is the container directive from remark-directive (already in our dependency tree). Content between `:::` markers is parsed according to the component's schema.

---

## Compilation Pipeline

```
slides.md
    |
    v
Parse markdown (unified + remark-parse + remark-directive)
    |
    v
Split on --- boundaries → SlideBlock[]
    |
    v
For each SlideBlock:
  1. Parse YAML frontmatter → { layout, params }
  2. Extract title from first # heading (if not in frontmatter)
  3. Extract speaker notes (after Note:)
  4. Compile remaining content → SlideContent[]
  5. Look up layout in registry
  6. Call layout.render(params, content) → Slide
    |
    v
Presentation { slides: Slide[] }
    |
    v
(existing pipeline: measure, position, render PPTX)
```

---

## Decisions

### 1. Layout control for authors

**Decision:** Layouts handle all sizing. Authors write content only. If the layout doesn't support what you need, ask a developer to create a new layout. No `height: FILL` or similar in markdown.

### 2. Inline `markdown()` stays as-is

**Decision:** The inline `markdown()` component does NOT evolve to a block model. It stays as a single `TextNode` for inline rich text. The document compiler's block model is a separate compilation path — not an evolution of the inline component.

### 3. Component syntax: `:::directive`

**Decision:** Use `:::card` container directive syntax (remark-directive). Reads naturally as markdown.

```markdown
:::card
title: Speed
description: Sub-second query results
:::

:::card
title: Scale
description: Handles billions of rows
:::
```

### 4. Images come from theme assets

**Decision:** Images must reference theme-defined assets, not relative file paths. The theme's asset registry is the source of truth. Syntax TBD (likely `![](asset:solutions.queryOffload)` or similar named reference).

### 5. Highlight names are theme-defined

**Note:** Highlight names (`:accent1[text]`, `:primary[text]`) are defined by the theme author, not hardcoded. The Materialize theme uses names like `teal`, `pink`, `orange` but other themes may use `accent1`, `accent2`, etc.

### 6. CLI needed (later)

**Decision:** Yes, a CLI is needed. See [cli-architecture.md](./cli-architecture.md) for existing design work. This is Phase 5 — after the compiler works programmatically.

### 7. Slide boundaries

**Decision:** `---` (horizontal rule) for slide boundaries. Not `#` headings.

---

## Open Questions

### 1. Speaker notes syntax

The `Note:` separator (reveal.js pattern) is proposed but not confirmed. Is there a better approach?

### 2. Layout registry scope — RESOLVED

`LayoutDefinition` is a tycoslide core type. `LayoutRegistry` is a core singleton. Themes register their layouts at initialization. No runtime param schema until Phase 3 (Zod).

---

## Implementation Phases

### Phase 1: Inline Markdown Component — DONE

`markdown("**bold** and :accent1[highlighted]")` → single TextNode.

### Phase 2: Layout Registry — IN PROGRESS

- [x] Define `LayoutDefinition<TParams>` interface in tycoslide core (`src/core/layoutRegistry.ts`)
- [x] `LayoutRegistry` singleton with register/get/has/getAll
- [x] Export from `src/index.ts`
- [x] Refactor Materialize layouts from positional functions to `LayoutDefinition` objects with typed params
- [x] `registerMaterializeLayouts()` for theme initialization
- [ ] Migrate all session scripts to new `layout.render({...})` API
- No runtime param schema — deferred to Phase 3 (Zod)

### Phase 3: Document Compiler

- Markdown file parser (slide splitting, frontmatter extraction)
- Block-level content compiler (paragraph → TextNode, list → TextNode with bullets, table → TableNode, heading → styled TextNode)
- Layout parameter mapping (frontmatter → layout params, `#` → title extraction)
- Component directive handlers (`:::card`, `:::diagram`, etc.)
- Slot markers (`::left::`, `::right::`) for multi-region layouts

### Phase 4: CLI / DX

- `tycoslide build` command (see [cli-architecture.md](./cli-architecture.md))
- File watching / live preview
- Error messages with line numbers

---

## References

### Prior Art Documentation
- [Slidev Syntax Guide](https://sli.dev/guide/syntax) — Layout system, frontmatter, slot markers
- [Slidev Built-in Layouts](https://sli.dev/builtin/layouts) — 17 named layouts with props
- [Marp Directives](https://marpit.marp.app/directives) — Global/local/scoped directive cascade
- [Marpit Image Syntax](https://marpit.marp.app/image-syntax) — Extended image directives
- [reveal.js Markdown](https://revealjs.com/markdown/) — Slide/element attributes via HTML comments
- [Remark.js Wiki](https://github.com/gnab/remark/wiki/Markdown) — Template inheritance model
- [Deckset Configuration](https://docs.deckset.com/English.lproj/Customization/01-configuration-commands.html) — Per-slide directive syntax

### tycoslide Internal
- [Inline Markdown Component](./markdown.md) — Phase 0-1 design (implemented)
- Materialize layouts: `clients/materialize/theme/src/layouts.ts`
- Component registry: `src/core/componentRegistry.ts`
- Presentation API: `src/presentation.ts`
