# Markdown Slide Authoring — Design Doc

**Status:** Layout registry complete. All sessions migrated. Document compiler is next.

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
2. **Layouts have typed parameters** — Layouts are functions with specific typed signatures. Parameters must be scalar values (strings, numbers, booleans, arrays of scalars, data objects like `CardProps`) — NOT component trees.
3. **Everything is theme-bound** — Fonts, colors, highlights, images, layouts, spacing — all controlled by the theme. Slide authors can only use what the theme provides. This is a feature: it makes it impossible to produce off-brand presentations. No inline CSS, no arbitrary colors, no relative image paths.
4. **Single output format** — Compiles to `Presentation` (same as TypeScript DSL).
5. **Scalar-only layout parameters** — Layout params must be expressible as YAML frontmatter. This means no `SlideNode[]`, no component trees, no builder objects. Layouts own all component construction internally.

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
layout: statement
eyebrow: INTRODUCTION
body: |
  Materialize is a :teal[live data layer] that lets software engineers
  join and transform operational data with SQL.

---
layout: twoColumn
eyebrow: COMPARISON

::left::

Legacy systems can't keep up with real-time demands.

::right::

Materialize provides incrementally maintained views.
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
layout: statement     # Required: named layout (error if omitted)
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
layout: statement
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
layout: statement
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
layout: statement
eyebrow: SECTION
---

# My Slide Title

Body content here.
```
If `title:` is in frontmatter, it's used. Otherwise first `# heading` is extracted as title. Heading is consumed (not rendered as content).

**Decision:** Option C. Natural for authors, explicit when needed.

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
layout: statement
eyebrow: ARCHITECTURE
---

# Event-Driven Pipeline

Sources push changes into materialized views.

Note:
Emphasize that this is push-based, not polling.
Mention the latency guarantees.
```

**Decision:** Everything after `Note:` (on its own line) until next slide boundary becomes `Slide.notes`.

---

## Layout Registry — IMPLEMENTED

### Design

`LayoutDefinition` is a tycoslide core type. Each layout has a name, description, a typed `render` function, and (Phase 3) a Zod schema for runtime validation:

```typescript
interface LayoutDefinition<TParams = Record<string, unknown>> {
  name: string;
  description: string;
  render: (params: TParams) => Slide;
  schema?: ZodType<TParams>;  // Phase 3: runtime validation for document compiler
}
```

TypeScript generics provide compile-time type safety. The optional `schema` field will be added in Phase 3 using Zod when the markdown compiler needs to validate frontmatter.

Themes define concrete param types for each layout. **All params must be scalar-only** (expressible as YAML):

```typescript
interface StatementProps {
  title: string;
  eyebrow: string;
  body: string;
  bodyStyle?: TextStyleName;
  caption?: string;
}

const statementLayout: LayoutDefinition<StatementProps> = {
  name: 'statement',
  description: 'Body text with optional style and caption.',
  render: ({ title, eyebrow, body, bodyStyle, caption }) =>
    masteredSlide(
      headerBlock(eyebrow, title),
      contentBody(
        text(body, bodyStyle ? { style: bodyStyle } : undefined),
        ...(caption ? [text(caption, { style: TEXT_STYLE.SMALL })] : []),
      ),
    ),
};
```

### Registry

`LayoutRegistry` is a singleton (`layoutRegistry`) following the same pattern as `ComponentRegistry`. Themes call `registerMaterializeLayouts()` to register all layouts at initialization.

### Validation Strategy (Phase 3)

Each layout will add a Zod schema alongside its TypeScript interface. Zod provides:
- Runtime validation of frontmatter YAML
- TypeScript type inference from the schema (eliminating double bookkeeping)
- `.describe()` for AI discovery and error messages

Schemas live on the `LayoutDefinition` itself (optional `schema` field), so the registry can validate params at lookup time.

### Materialize Layouts (Current)

All layouts take a single typed params object. **Scalar-compatible** means all params can be expressed as YAML frontmatter.

| Layout | Params Type | Key Fields | Scalar-Compatible |
|--------|------------|------------|-------------------|
| `title` | `TitleProps` | `title`, `subtitle?` | YES |
| `section` | `SectionProps` | `title` | YES |
| `content` | `ContentProps` | `title`, `eyebrow`, `content: SlideNode[]` | **NO** — escape hatch, to be deprecated |
| `agenda` | `AgendaProps` | `title`, `eyebrow`, `intro?`, `items: string[]` | YES |
| `card` | `CardSlideProps` | `title`, `eyebrow`, `intro`, `cards: CardProps[]` | YES (CardProps is all scalars) |
| `numberedCard` | `NumberedCardSlideProps` | `title`, `eyebrow`, `intro`, `cards: CardProps[]` | YES |
| `image` | `ImageSlideProps` | `title`, `eyebrow`, `image` | YES |
| `twoColumn` | `TwoColumnProps` | `title`, `eyebrow`, `left`, `right`, `reverse?` | **NO** — left/right are `SlideNode`, needs redesign |
| `customerStory` | `CustomerStoryProps` | `title`, `eyebrow`, `logo?`, `intro`, `bullets`, `quote`, `attribution`, `reverse?` | YES |
| `statement` | `StatementProps` | `title`, `eyebrow`, `body`, `bodyStyle?`, `caption?` | YES |
| `imageCards` | `ImageCardsProps` | `title`, `eyebrow`, `image`, `cards: CardProps[]`, `reverse?` | YES |

### Scalar-Only Migration Plan

Two layouts need redesign:

**`contentLayout`** — Currently accepts `content: SlideNode[]`. This is an escape hatch that lets callers bypass the layout system. 35% of all slides (56 of 160) use it to pass arbitrary component trees. These cluster into patterns that should become their own layouts:

| Pattern | Count | New Layout |
|---------|-------|------------|
| Text + Diagram | 14 | `diagramLayout` (TypeScript-only, diagrams stay imperative) |
| Text + Table | 7 | `tableLayout` with `rows: TextContent[][]` |
| Text + Card Row | 8 | Extend existing `cardLayout` flexibility |
| Text + Image | 3 | Extend `imageLayout` with `description?` |
| Multi-block text | 4 | Use `statementLayout` |
| Shared slides | 7 uses | Each becomes its own layout or uses existing layouts |

Once these are covered, `contentLayout` can be deprecated.

**`twoColumnLayout`** — Currently accepts `left/right: SlideNode | SlideNode[]`. For the markdown compiler, the left/right params should be markdown strings that the layout compiles internally. For TypeScript users building complex column content (cards, diagrams), specific layouts like `imageCardsLayout` already exist or can be created.

### Frontmatter Mapping (Phase 3)

When the markdown compiler is built, it will map frontmatter + content to layout params:

| Layout | Frontmatter Fields | Content Mapping |
|--------|-------------------|-----------------|
| `title` | `subtitle?` | Title from `#` heading |
| `section` | — | Title from `#` heading |
| `agenda` | `eyebrow`, `intro?` | Title from `#`, bullets → `items` |
| `card` | `eyebrow`, `intro` | Title from `#`, `:::card` directives → `cards` |
| `numberedCard` | `eyebrow`, `intro` | Title from `#`, `:::card` directives → `cards` |
| `image` | `eyebrow`, `image` | Title from `#` |
| `statement` | `eyebrow`, `bodyStyle?`, `caption?` | Title from `#`, body text → `body` |
| `customerStory` | `eyebrow`, `logo?`, `intro`, `quote`, `attribution`, `reverse?` | Title from `#`, bullets → `bullets` |
| `imageCards` | `eyebrow`, `image`, `reverse?` | Title from `#`, `:::card` directives → `cards` |
| `twoColumn` | `eyebrow`, `reverse?` | Title from `#`, `::left::`/`::right::` → slots |
| `table` | `eyebrow`, `intro?`, table options | Title from `#`, markdown table → `rows` |
| `diagram` | `eyebrow`, `description?` | Title from `#`, diagram (TypeScript-only) |

---

## Block Compiler

The **block compiler** is a shared tycoslide core utility that converts a markdown string into a `ComponentNode` tree. It is used by:

1. **Markdown-aware layouts** — layouts that accept a `body: string` param compile it internally via the block compiler
2. **The document compiler** — to validate and extract content from markdown slide bodies
3. **Slot compilation** — `twoColumn` layout compiles `::left::` / `::right::` slot content

The block compiler extends the existing inline markdown parser (`src/dsl/text.ts`) to handle block-level elements. The inline parser produces a single `TextNode` with `NormalizedRun[]`. The block compiler produces multiple independent nodes:

### Block-Level Mapping

| Markdown Block | Compiles To |
|---------------|-------------|
| Paragraph | `text("paragraph content")` — ComponentNode |
| Bullet list (entire list) | `text("- item1\n- item2")` — ComponentNode with bullet runs |
| Numbered list | `text("1. item1\n2. item2")` — ComponentNode with numbered runs |
| `## Subheading` | `text("Subheading", { style: TEXT_STYLE.H2 })` — ComponentNode |
| `### Label` | `text("Label", { style: TEXT_STYLE.H3 })` — ComponentNode |
| Markdown table | `table([...])` — ComponentNode |
| `![](asset:name)` | `image(resolvedPath)` — ComponentNode (asset resolved from theme) |
| Multiple blocks | `column(block1, block2, block3)` — wrapped in column with theme-default gap |

This is where the block compiler diverges from the inline `markdown()` component. In the inline component, everything is one `TextNode`. In the block compiler, each block is independent — headings get their own `TextNode` with the appropriate style.

### Component Directives

For tycoslide-specific components, use the container directive syntax from remark-directive (already in our dependency tree):

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

The `:::name` syntax is parsed by remark-directive into `containerDirective` mdast nodes. The block compiler maps these to DSL calls (`card()`, etc.) using the directive's attributes as `CardProps`.

### Diagrams — TypeScript Only (for now)

Diagrams use an imperative `DiagramBuilder` API that cannot be expressed as YAML. Diagram slides must be authored in TypeScript using the DSL.

**Future option:** Accept mermaid syntax strings and parse them. The diagram rendering pipeline already goes through mermaid-cli, so this is a natural extension. But it's not needed for the initial document compiler.

---

## Compilation Pipeline

```
slides.md
    |
    v
Parse markdown (unified + remark-parse + remark-frontmatter + remark-directive + remark-gfm)
    |
    v
Split on --- boundaries → RawSlideBlock[]
    |
    v
For each RawSlideBlock:
  1. Parse YAML frontmatter → raw key-value pairs
  2. Look up `layout:` in registry (error if missing or unknown)
  3. Extract title from first # heading (if not in frontmatter)
  4. Extract speaker notes (after Note:)
  5. Extract slot content (::left::, ::right::, etc.)
  6. Map frontmatter + extracted content to layout's expected params
  7. Validate params against layout's Zod schema
  8. Call layout.render(validatedParams) → Slide
  9. Attach notes to Slide
    |
    v
Presentation { slides: Slide[] }
    |
    v
(existing pipeline: measure, position, render PPTX)
```

### Key design choice: layouts compile their own content

Under the scalar-only constraint, the document compiler does NOT produce `SlideNode[]`. It extracts scalar values from frontmatter and markdown content, then passes them to the layout. The layout's `render` function constructs all components internally.

For layouts that accept markdown body text (like `statement` with `body: string`), the layout calls the block compiler internally to convert the markdown string into a component tree.

This means:
- The compiler is simple: extract strings, validate against schema, pass to layout
- The layout controls rendering: text styles, spacing, structure are all layout decisions
- Frontmatter can express everything: all params are YAML-compatible scalars
- Validation is straightforward: Zod validates scalar types, not recursive component trees

### Asset Resolution

Images in markdown reference theme-defined assets using dot-path notation:

```markdown
![](asset:illustrations.integrate)
```

The compiler resolves `illustrations.integrate` by traversing the theme's `assets` object:

```typescript
// Theme assets object (nested)
const assets = {
  illustrations: {
    integrate: '/path/to/integrate.png',
    transform: '/path/to/transform.png',
  },
  brand: {
    logo: '/path/to/logo.png',
  },
};

// Compiler resolves dot-path to string
resolveAsset('illustrations.integrate', assets) → '/path/to/integrate.png'
```

The resolver walks the nested object using the dot-separated path. Unknown asset paths produce a compile error with available asset names listed for discoverability.

### Error Handling

The compiler collects all errors and reports them with source locations:

```
deck.md:15: Unknown layout "bulleted" — available layouts: title, section, statement, agenda, card, ...
deck.md:28: Layout "agenda" missing required field "items"
deck.md:42: Unknown asset "illustrations.intgrate" — did you mean "illustrations.integrate"?
```

Errors include the markdown file path and line number. The compiler is fail-fast by default (first error stops compilation) but can be configured for collect-all-errors mode for CI use.

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

**Decision:** Images reference theme-defined assets using `![](asset:dot.path)` syntax. The compiler resolves dot-paths against the theme's `assets` object. No relative file paths — the theme is the source of truth.

### 5. Highlight names are theme-defined

**Note:** Highlight names (`:accent1[text]`, `:primary[text]`) are defined by the theme author, not hardcoded. The Materialize theme uses names like `teal`, `pink`, `orange` but other themes may use `accent1`, `accent2`, etc.

### 6. CLI needed (later)

**Decision:** Yes, a CLI is needed. See [cli-architecture.md](./cli-architecture.md) for design work. This is Phase 4 — after the compiler works programmatically.

### 7. Slide boundaries

**Decision:** `---` (horizontal rule) for slide boundaries. Not `#` headings.

### 8. Layout is required

**Decision:** Every slide must have a `layout:` field in its frontmatter. Omitting it is a compile error. This is a strict system — there is no "default" layout. The first slide (before any `---`) is special: if it has only a `#` heading, it becomes a `title` layout automatically.

### 9. Scalar-only layout parameters

**Decision:** All layout parameters must be scalar values expressible as YAML frontmatter: strings, numbers, booleans, string arrays, and data objects with scalar fields (like `CardProps`). No `SlideNode[]`, no component trees, no builder objects. Layouts own all component construction.

### 10. Speaker notes syntax

**Decision:** The `Note:` separator (reveal.js pattern). Everything after `Note:` on its own line until the next slide boundary becomes `Slide.notes`. Simple, well-established, unambiguous.

### 11. Zod schemas on LayoutDefinition

**Decision:** Add an optional `schema: ZodType<TParams>` field to `LayoutDefinition`. Themes provide the schema alongside the render function. The compiler uses it for runtime validation. TypeScript users can ignore it (compile-time types are sufficient).

### 12. Diagrams are TypeScript-only

**Decision:** The `DiagramBuilder` API is imperative and cannot be expressed as YAML. Diagram slides must be authored in TypeScript. Mermaid string support is a future stretch goal.

---

## Open Questions

### 1. twoColumn markdown representation

How should `twoColumn` work in markdown? The `::left::` / `::right::` slot markers define two regions. But the layout currently accepts `SlideNode | SlideNode[]` — which needs to become scalar.

**Proposed:** Each slot's markdown content is compiled by the block compiler (inside the layout's render function). The compiler passes raw markdown strings for each slot:

```typescript
interface TwoColumnMarkdownProps {
  title: string;
  eyebrow: string;
  left: string;    // markdown, compiled internally
  right: string;   // markdown, compiled internally
  reverse?: boolean;
}
```

**Open:** Should the TypeScript `twoColumnLayout` (which accepts `SlideNode[]`) and the markdown variant (which accepts strings) be the same layout with a union type, or two separate layouts?

### 2. Block compiler location

Where does the block compiler module live?

**Proposed:** `src/compiler/blockCompiler.ts` in tycoslide core. It's a shared utility used by markdown-aware layouts and by the document compiler. NOT inside layouts, NOT inside the CLI.

---

## Implementation Phases

### Phase 1: Inline Markdown Component — DONE

`markdown("**bold** and :accent1[highlighted]")` → single TextNode.

### Phase 2: Layout Registry — DONE

- [x] Define `LayoutDefinition<TParams>` interface in tycoslide core (`src/core/registry.ts`)
- [x] `LayoutRegistry` singleton with register/get/has/getAll
- [x] Export from `src/index.ts`
- [x] Refactor Materialize layouts from positional functions to `LayoutDefinition` objects with typed params
- [x] `registerMaterializeLayouts()` for theme initialization
- [x] Migrate all session scripts to new `layout.render({...})` API

### Phase 3: Document Compiler

Sub-phases in implementation order:

**3a: Block compiler** — markdown string → ComponentNode[]
- New remark pipeline that identifies block-level nodes (paragraphs, lists, headings, tables, images)
- Reuses the `text()` DSL component for text-containing blocks (paragraphs, lists, headings) — does NOT share internal parsing logic from `text.ts`
- Calls `table()` and `image()` DSL components for non-text blocks
- Returns `ComponentNode[]` — callers decide how to arrange them
- Unit tests for each block type

**3b: File parser** — slide splitting and frontmatter extraction
- Add `remark-frontmatter` and `remark-gfm` to dependencies
- Split on `---` boundaries into `RawSlideBlock[]`
- Extract YAML frontmatter, `#` title, `Note:` speaker notes
- Extract `::slot::` content for multi-region layouts

**3c: Zod schemas** — runtime validation for all layouts
- Add Zod schemas to each Materialize `LayoutDefinition`
- Validate frontmatter params against schema
- Error messages with field names and suggestions

**3d: Layout parameter mapping** — frontmatter + content → validated params
- Map extracted data to layout's expected param types
- Handle title extraction (Option C: heading or frontmatter)
- Handle slot mapping for `twoColumn`

**3e: Asset resolution** — `asset:dot.path` → file paths
- Dot-path resolver for theme assets object
- Error messages listing available assets on unknown path

**3f: Component directives** — `:::card` etc.
- Map `containerDirective` mdast nodes to `CardProps` and other data types
- Validate directive attributes against component schemas

**3g: Scalar-only layout migration**
- Create `tableLayout`, `diagramLayout` (TypeScript-only)
- Extend `imageLayout` with `description?`
- Redesign `twoColumnLayout` for markdown strings
- Deprecate `contentLayout`

### Phase 4: CLI / DX

- `tycoslide build` command (Commander.js, see [cli-architecture.md](./cli-architecture.md))
- Theme resolution by package name (`--theme materialize` → `materialize_theme`)
- Error messages with markdown source line numbers
- File watching / live preview (future)

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
- Registry: `src/core/registry.ts`
- Presentation API: `src/presentation.ts`
- Block compiler (Phase 3): `src/compiler/blockCompiler.ts` (planned)
