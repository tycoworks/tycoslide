# Markdown Authoring

Design doc for tycoslide's markdown slide authoring system.

**Status:** Document compiler implemented (parse, validate, render). This doc captures the refined authoring model and remaining work.

---

## Vision

Two audiences, two interfaces, one pipeline:

- **Developers** build layouts and components in TypeScript (DSL)
- **Slide authors** write content in markdown files

A markdown file compiles to a `Presentation` -- the same object the TypeScript DSL produces. The downstream pipeline (measurement, layout, PPTX rendering) is unchanged.

The system is **layout-driven**: it should be impossible to create a slide that's not on brand. Layouts control all styling, spacing, and structure. Authors provide content and configuration.

---

## Authoring Model

Two rules, zero exceptions:

| Location | What goes there | How it maps |
|----------|----------------|-------------|
| **YAML frontmatter** | All parameters -- title, eyebrow, intro, bullets, quote, attribution, logo, image, cards, items, notes, etc. | Passed to layout's `render()` function after Zod validation. `notes` attached to `Slide.notes`. |
| **Body** | Only `schema.block()` content regions | Compiled to `ComponentNode[]` via block compiler |

### The rules in detail

1. **Frontmatter is for parameters.** Every named value the layout needs -- strings, numbers, booleans, arrays, structured data -- goes in YAML frontmatter. This includes `title` and `notes`. The layout's Zod schema validates layout params at compile time. `notes` is a reserved field handled by the compiler (not passed to the layout).

2. **Body is for block content.** The markdown body below the closing `---` is only used when the layout has a `schema.block()` parameter (which compiles markdown to `ComponentNode[]`). This applies to the `body` layout's body param and the `twoColumn` layout's `left`/`right` params (via `::name::` markers). If a layout has no `schema.block()` params, the body is empty.

`::name::` markers split body content into named regions for `schema.block()` params. They are never used for string parameters like `intro`, `bullets`, or `quote` -- those go in YAML frontmatter.

### Why this model

- **One way to do each thing.** No choice between putting `intro` in frontmatter vs `::intro::` in body.
- **All params visible in one place.** The frontmatter block is the complete manifest of a slide's configuration.
- **Type-enforced.** The schema type determines the authoring location: `z.string()` / `markdownComponent.input` = frontmatter. `schema.block()` = body.
- **Clean body semantics.** Everything after `---` is rendered content, never configuration.

---

## Syntax Reference

### Slide boundaries

`---` on its own line separates slides. First `---` block is global frontmatter (theme, etc.).

```markdown
---
theme: materialize_theme
---

---
layout: section
title: First Slide
---

---
layout: body
eyebrow: SECTION
title: Second Slide
---

Body content here.
```

### Global frontmatter

```yaml
---
theme: materialize_theme
---
```

### Per-slide frontmatter

```yaml
---
layout: body
title: What is Context Engineering
eyebrow: CONTEXT ENGINEERING
---
```

Every slide must have `layout:` (or `slide:` for shared slide references, or `src:` for file imports). All layout parameters go here, including `title`.

### Title

Title is a frontmatter parameter. Not a `# heading`.

```yaml
---
layout: statement
title: "Demand is growing :caution[10x faster] than teams can deliver"
eyebrow: KEY INSIGHT
---
```

For simple titles, no quoting needed: `title: Day AI`. Quote when the value contains colons, brackets, or other YAML-special characters.

### Markdown in YAML values

YAML block scalars support multiline markdown content in frontmatter:

```yaml
# Literal block (|) -- preserves line breaks. Use for bullet lists.
bullets: |
  - **Problem:** Integration polled every **30 minutes**.
  - **Solution:** Business events as live views.
  - **Result:** :metrics[**Sub-10-second**] latency.

# Folded strip (>-) -- folds line breaks to spaces. Use for prose.
quote: >-
  Materialize gives us a flexible platform for turning raw truth
  into live context, in a way that matches how an agent would
  want to read it.

# Plain string -- for single-line values.
intro: Day AI is building an AI-native CRM where agents and humans work together.
```

Bold (`**text**`), inline directives (`:metrics[text]`, `:caution[text]`), and all other inline markdown works inside YAML string values. The YAML parser returns plain strings; the layout's `markdown()` call parses them.

### Body content (schema.block() params)

When a layout has a `schema.block()` parameter, the body contains rendered markdown content:

```markdown
---
layout: body
eyebrow: CONTEXT ENGINEERING
title: What is Context Engineering
---

Context engineering is the practice of getting the **right data to AI systems at the right time**.

- Agents need fresh context from multiple systems
- Pre-compute and keep it live

:::mermaid
flowchart LR
    DB1[(Orders)] --> DP[data products]
    DB2[(Customers)] --> DP
    DP --> Agent[AI Agent]
:::
```

The body compiles to `ComponentNode[]` via the block compiler. Supported block types: paragraphs, bullet/numbered lists, headings (`##`, `###`), GFM tables, `:::image` directives, `:::mermaid` code blocks, `:::card` directives.

### Named content regions (::name::)

For layouts with multiple `schema.block()` params (like `twoColumn`):

```markdown
---
layout: twoColumn
eyebrow: COMPARISON
title: Before and After
---

::left::
### Without Materialize

- Batch ETL runs every **15 minutes**
- Cache invalidation is **manual**

::right::
### With Materialize

- Data freshness in **sub-second**
- Views are **always consistent**
```

`::name::` markers split body content into named regions. Everything before the first marker is the default slot. Only used for `schema.block()` params.

### Component directives (:::name)

Block-level components inside body content:

```markdown
:::card
title: Query Offload
description: Move heavy reads to Materialize
image: asset:solutions.queryOffload
:::

:::mermaid
flowchart LR
    A --> B --> C
:::

:::image
asset:illustrations.integrate
:::
```

These are parsed by remark-directive into `containerDirective` MDAST nodes and dispatched through the component registry.

### Speaker notes

Speaker notes are a frontmatter parameter, like everything else:

```yaml
---
layout: section
title: Context Engineering
notes: |
  Let's get into context engineering.
  This is a key concept we'll build on.
---
```

Use the YAML `|` (literal block) scalar for multiline notes. Single-line notes work as plain strings: `notes: Quick recap.`

### Asset references

Theme-defined assets use dot-path notation in frontmatter:

```yaml
logo: asset:clients.dayAi
image: asset:illustrations.integrate
```

Resolved against the theme's `assets` object at compile time. Unknown paths produce an error listing available assets.

---

## Shared Slides

Slides reused across multiple presentations. Two mechanisms: file imports (preferred) and slide registry (TypeScript escape hatch).

### File imports (src:)

A shared slide is just a standalone `.md` file:

```markdown
# shared/challenge.md
---
layout: card
title: The Challenge
intro: "It's hard to get operational data in the :caution[right shape at the right time]."
cards:
  - image: asset:illustrations.problemDatabase
    title: OLTP databases
    description: siloed and slow to query
  - image: asset:illustrations.problemWarehouse
    title: Data lakehouses
    description: minutes or hours behind
  - image: asset:illustrations.problemDiy
    title: DIY solutions
    description: costly and hard to change
caption: ":caution[Problem]"
---
```

Referenced from a presentation with `src:` and optional parameter overrides:

```markdown
---
src: ../shared/challenge.md
eyebrow: RECAP
notes: Quick recap -- same core tension.
---
```

**How it works:**
- The compiler loads the source file and parses its frontmatter
- The referencing slide's frontmatter is merged on top (referencing site wins on conflicts)
- The merged slide compiles normally through layout validation and rendering

**Parameterization** is handled by frontmatter merge -- the source file defines defaults, the reference site overrides what it needs. No template syntax (`{{var}}`), no new concepts.

**Presentation packs** are just directories of `.md` files:

```
shared/
  challenge.md
  whatIsMaterialize.md
  integrate.md
  transform.md
  serve.md
```

### Slide registry (TypeScript escape hatch)

For slides that need programmatic content (complex tables with per-cell styling, custom compositions), the TypeScript `slideRegistry` remains:

```markdown
---
slide: solutionsGrid
eyebrow: FRAMEWORK
notes: The 3x3 grid...
---
```

The `slide:` field references a `slideRegistry.define()` definition. Params are validated against the slide's Zod schema. This is the escape hatch for content that cannot be expressed in the markdown authoring model.

**Goal:** Minimize `slide:` usage over time by enhancing layouts and the block compiler to cover more patterns.

---

## Layout Catalog

All registered layouts and their parameter sources:

| Layout | Frontmatter Params | Body Content | Notes |
|--------|-------------------|--------------|-------|
| `title` | `title`, `subtitle?` | -- | Opening slide |
| `section` | `title` | -- | Section divider |
| `body` | `title?`, `eyebrow?` | `body` (schema.block()) | Default markdown layout |
| `statement` | `title`, `eyebrow`, `body`, `bodyStyle?`, `caption?` | -- | `body` is a markdown string param |
| `agenda` | `title`, `eyebrow`, `intro?`, `items[]` | -- | All params in frontmatter |
| `twoColumn` | `title`, `eyebrow`, `reverse?` | `left`, `right` (schema.block()) | Two content regions |
| `image` | `title`, `eyebrow`, `image` | -- | Full image slide |
| `card` | `title`, `eyebrow`, `intro`, `cards[]`, `caption?` | -- | Auto-grid cards |
| `numberedCard` | `title`, `eyebrow`, `intro`, `cards[]` | -- | Cards without backgrounds |
| `imageCards` | `title`, `eyebrow`, `image`, `cards[]`, `reverse?` | -- | Image + cards |
| `customerStory` | `title`, `eyebrow`, `logo?`, `intro`, `bullets`, `quote`, `attribution`, `reverse?` | -- | Customer story |

**Programmatic-only** (not available from markdown):
- `contentLayout` -- accepts `SlideNode[]`. To be eliminated.
- `twoColumnRawLayout` -- accepts `SlideNode[]` for left/right. To be eliminated.

---

## Examples

### Section slide

```markdown
---
layout: section
title: Context Engineering
notes: Let's get into context engineering.
---
```

### Body slide with content

```markdown
---
layout: body
eyebrow: CONTEXT ENGINEERING
title: "Before: Siloed and Stale"
---

Agents either :caution[waste tokens assembling context] from siloed databases, or :caution[act on stale information] from a warehouse.

:::mermaid
flowchart LR
    DB1[(Orders)] --> Agent[AI Agent]
    DB2[(Customers)] --> Agent
    DB3[(Inventory)] --> Agent
:::
```

### Customer story (all params in frontmatter)

```markdown
---
layout: customerStory
eyebrow: CUSTOMER STORY
title: Day AI
logo: asset:clients.dayAi
attribution: "-- Erik Munson, Founding Engineer"
intro: Day AI is building an AI-native CRM where agents and humans work together.
bullets: |
  - **Problem:** One field = 8 rows (AI, vendors, humans). Finding the "right" value took 2s per query.
  - **Solution:** Materialize as a live context layer. Sub-second updates from write to agent-ready context.
  - **Result:** A :metrics[**small team**] building what would traditionally require :metrics[**dozens of engineers**].
quote: >-
  Materialize gives us a flexible platform for turning raw truth
  into live context, in a way that matches how an agent would want
  to read it.
notes: Day AI is the canonical context engineering story.
---
```

### Two-column layout

```markdown
---
layout: twoColumn
eyebrow: COMPARISON
title: Before and After
---

::left::
### Without Materialize

- Batch ETL runs every **15 minutes**
- Cache invalidation is **manual and error-prone**

::right::
### With Materialize

- Data freshness in **sub-second**
- Views are **always consistent**, automatically
```

### Shared slide reference (file import)

```markdown
---
src: ../shared/challenge.md
eyebrow: RECAP
notes: Quick recap from the first session.
---
```

### Shared slide reference (TypeScript registry)

```markdown
---
slide: solutionsGrid
eyebrow: FRAMEWORK
notes: The 3x3 grid maps use cases to patterns.
---
```

---

## Decisions

### 1. Title is a frontmatter parameter

Title goes in YAML frontmatter, not as `# heading` in the body. The `#` heading extraction is removed from the parser.

**Rationale:** The `---` block is the navigational skeleton. All slide configuration -- including title -- should be visible there. The body is reserved for rendered content.

### 2. `::name::` slots are only for schema.block() params

Named slot markers in the body are only used for layout parameters with `schema.block()` type (which compiles markdown to `ComponentNode[]`). String parameters (`markdownComponent.input`, `textComponent.input`) always go in YAML frontmatter.

**Rationale:** One way to do each thing. The schema type determines the authoring location.

### 3. Markdown in YAML values

YAML block scalars (`|`, `>-`) support multiline markdown in frontmatter. Bold, inline directives, bullet lists all work. This is already proven by the `agenda` layout's `items` array.

### 4. Shared slides via src: file import

Shared slides are standalone `.md` files referenced via `src:` in frontmatter. Parameterization is handled by frontmatter merge (referencing site's values override source file's defaults).

### 5. slide: registry remains as escape hatch

The TypeScript `slideRegistry` stays for slides that need programmatic content (complex tables, custom compositions). Goal is to minimize usage over time.

### 6. Layouts are TypeScript-only

Layout definitions stay in TypeScript. If layout creation friction is a concern, better solutions are helpers, docs, or CLI scaffolding -- not a markdown-based layout definition language.

### 7. Component syntax: :::directive

Container directive syntax (`:::card`, `:::mermaid`, `:::image`) for components in body content. Parsed by remark-directive, dispatched through the component registry.

### 8. Speaker notes are a frontmatter parameter

Notes go in YAML frontmatter as `notes: |` (or plain string for single-line). Not a magic keyword in the body. Consistent with the "frontmatter = all parameters" rule. Notes are a string on the `Slide` object, not rendered content -- they belong with the other parameters.

### 9. Asset references: asset:dot.path

Theme-defined assets referenced by dot-path in frontmatter. Resolved at compile time against the theme's `assets` object.

---

## Implementation Plan

### Done

- Slide parser (line-based state machine, `---` splitting, YAML frontmatter, `::slot::` extraction)
- Document compiler (generic parameter mapping, Zod validation, layout rendering)
- Block compiler (paragraphs, lists, headings, tables, `:::card`, `:::image`, `:::mermaid`)
- Asset resolver (`asset:dot.path` in frontmatter)
- All scalar layouts registered with Zod schemas
- **Phase 1 complete:** `# heading` title extraction removed, `Note:` extraction removed, title fallback logic removed, existing `# heading` and `Note:` content migrated to frontmatter

### Phase 1: Migrate remaining slot content ~~Authoring model refinements~~

The parser/compiler cleanup is done. Remaining work is content migration:

1. ~~Remove `# heading` title extraction~~ Done
2. ~~Remove `Note:` extraction~~ Done
3. ~~Remove title fallback logic~~ Done
4. **Migrate `::intro::`, `::bullets::`, `::quote::` content** to YAML frontmatter in all customerStory slides. (Title and notes migration is complete.)

### Phase 2: Eliminate contentLayout

1. **Audit all `contentLayout` usage** -- categorize each into: (a) can use `body` layout now, (b) needs `twoColumn`, (c) needs new capability.

2. **Convert shared slides** -- `whatIsMaterialize` and others to markdown with `body` or `twoColumn` layouts. The block compiler already handles paragraphs, lists, headings, tables, cards, images, and mermaid diagrams.

3. **Migrate TypeScript presentations** that use `contentLayout` to `body` layout where possible.

4. **Delete `contentLayout` and `twoColumnRawLayout`** when no consumers remain.

### Phase 3: Shared slide file imports

1. **Add `src:` handling** to `documentCompiler.ts`. When a slide has `src:` in frontmatter, load the referenced file, parse its frontmatter and body, merge the referencing slide's frontmatter on top, and compile normally. ~30 lines in `compileSlide()`.

2. **Convert simple shared slides to markdown** -- `challenge.md`, `integrate.md`, `transform.md`, `serve.md`. These already map to registered layouts (`card`, `twoColumn`).

3. **Update presentation files** to use `src:` references instead of `slide:` for converted slides.

### Phase 4: Enhanced table support (stretch)

1. **Per-cell styling in markdown tables** -- extend the GFM table compiler or add a `:::table` block directive with YAML-based cell definitions.

2. **Convert `solutionsGrid` family** to markdown.

3. **Remove `slideRegistry`** if all slides are now markdown-expressible (or keep as a minimal escape hatch).

### Phase 5: CLI

- `tycoslide build` command
- Theme resolution by package name
- Error messages with source line numbers
- File watching / live preview
