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
| **Body** | Only `schema.slot()` content regions | Compiled to `ComponentNode[]` via slot compiler |

### The rules in detail

1. **Frontmatter is for parameters.** Every named value the layout needs -- strings, numbers, booleans, arrays, structured data -- goes in YAML frontmatter. This includes `title` and `notes`. The layout's Zod schema validates layout params at compile time. `notes` is a reserved field handled by the compiler (not passed to the layout).

2. **Body is for block content.** The markdown body below the closing `---` is only used when the layout has a `schema.slot()` parameter (which compiles markdown to `ComponentNode[]`). This applies to the `body` layout's body param and the `twoColumn` layout's `left`/`right` params (via `::name::` markers). If a layout has no `schema.slot()` params, the body is empty.

`::name::` markers split body content into named slots. By convention, slots target `schema.slot()` params. String parameters like `intro`, `bullets`, or `quote` go in YAML frontmatter.

### Why this model

- **One way to do each thing.** No choice between putting `intro` in frontmatter vs `::intro::` in body.
- **All params visible in one place.** The frontmatter block is the complete manifest of a slide's configuration.
- **Type-driven.** By convention, the schema type determines the authoring location: `z.string()` / `markdownComponent.input` = frontmatter. `schema.slot()` = body.
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

Every slide must have `layout:`. All layout parameters go here, including `title`.

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

### Body content (schema.slot() params)

When a layout has a `schema.slot()` parameter, the body contains rendered markdown content:

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

The body compiles to `ComponentNode[]` via the slot compiler. Supported block types: paragraphs, bullet/numbered lists, headings (`##`, `###`), GFM tables, `:::image` directives, `:::mermaid` code blocks, `:::card` directives.

### Slots (::name::)

For layouts with multiple `schema.slot()` params (like `twoColumn`):

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

`::name::` markers split body content into named slots. Everything before the first marker is the default slot.

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

## Shared Layouts

Reusable slides (e.g. "The Challenge", "What is Materialize?") are registered as layouts via `layoutRegistry.define()` in the theme's shared modules. Markdown files target them with `layout:` just like any other layout. If a shared layout needs content variations, parameterize via frontmatter fields.

---

## Layout Catalog

All registered layouts and their parameter sources:

| Layout | Frontmatter Params | Body Content | Notes |
|--------|-------------------|--------------|-------|
| `title` | `title`, `subtitle?` | -- | Opening slide |
| `section` | `title` | -- | Section divider |
| `body` | `title?`, `eyebrow?` | `body` (schema.slot()) | Default markdown layout |
| `statement` | `title`, `eyebrow`, `body`, `bodyStyle?`, `caption?` | -- | `body` is a markdown string param |
| `agenda` | `title`, `eyebrow`, `intro?`, `items[]` | -- | All params in frontmatter |
| `twoColumn` | `title`, `eyebrow`, `reverse?` | `left`, `right` (schema.slot()) | Two content regions |
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

---

## Decisions

### 1. Title is a frontmatter parameter

Title goes in YAML frontmatter, not as `# heading` in the body. The `#` heading extraction is removed from the parser.

**Rationale:** The `---` block is the navigational skeleton. All slide configuration -- including title -- should be visible there. The body is reserved for rendered content.

### 2. `::name::` slots target schema.slot() params by convention

Named slot markers in the body conventionally target `schema.slot()` params (compiled markdown). String parameters go in YAML frontmatter. This is a convention, not enforced by the compiler — Zod validation handles type mismatches.

**Rationale:** One way to do each thing. The schema type guides the authoring location.

### 3. Markdown in YAML values

YAML block scalars (`|`, `>-`) support multiline markdown in frontmatter. Bold, inline directives, bullet lists all work. This is already proven by the `agenda` layout's `items` array.

### 4. Shared slides: copy-paste for v1

No `src:` imports or slide registry in v1. Duplicate frontmatter between files.

### 5. Layouts are TypeScript-only

Layout definitions stay in TypeScript. If layout creation friction is a concern, better solutions are helpers, docs, or CLI scaffolding -- not a markdown-based layout definition language.

### 6. Component syntax: :::directive

Container directive syntax (`:::card`, `:::mermaid`, `:::image`) for components in body content. Parsed by remark-directive, dispatched through the component registry.

### 7. Speaker notes are a frontmatter parameter

Notes go in YAML frontmatter as `notes: |` (or plain string for single-line). Not a magic keyword in the body. Consistent with the "frontmatter = all parameters" rule. Notes are a string on the `Slide` object, not rendered content -- they belong with the other parameters.

### 8. Asset references: asset:dot.path

Theme-defined assets referenced by dot-path in frontmatter. Resolved at compile time against the theme's `assets` object.

---

## Implementation Plan

### Done

- Slide parser (line-based state machine, `---` splitting, YAML frontmatter, `::slot::` extraction)
- Document compiler (generic parameter mapping, Zod validation, layout rendering)
- Slot compiler (directives dispatched through component registry, bare MDAST auto-wrapped in default component)
- Asset resolver (`asset:dot.path` in frontmatter)
- All scalar layouts registered with Zod schemas
- **Phase 1 complete:** `# heading` title extraction removed, `Note:` extraction removed, title fallback logic removed, existing `# heading` and `Note:` content migrated to frontmatter

### Phase 1: Migrate remaining slot content ~~Authoring model refinements~~

The parser/compiler cleanup is done. Remaining work is content migration:

1. ~~Remove `# heading` title extraction~~ Done
2. ~~Remove `Note:` extraction~~ Done
3. ~~Remove title fallback logic~~ Done
4. ~~Migrate `::intro::`, `::bullets::`, `::quote::` content to YAML frontmatter~~ Done

### Phase 2: Eliminate contentLayout and slideRegistry

1. **Audit all `contentLayout` usage** -- categorize each into: (a) can use `body` layout now, (b) needs `twoColumn`, (c) needs new capability.

2. ~~**Convert shared slides**~~ Done -- `whatIsMaterialize`, `challenge`, `integrate`, `transform`, `serve`, `solutionsGrid`, `solutionsGridCustomers` converted from `slideRegistry.define()` to `layoutRegistry.define()`. Markdown files use `layout:` to target them.

3. **Migrate TypeScript presentations** that use `contentLayout` to `body` layout where possible.

4. **Delete `contentLayout` and `twoColumnRawLayout`** when no consumers remain.

5. ~~**Remove `slideRegistry`**~~ Done -- deleted `SlideRegistry` class, `compileSlideRef()`, `slide:` routing, and related tests. Shared slides converted to layouts via `layoutRegistry.define()`.

### Phase 3: CLI

- `tycoslide build` command
- Theme resolution by package name
- Error messages with source line numbers
- File watching / live preview

### Phase 4: Enhanced table support (stretch)

1. **Per-cell styling in markdown tables** -- extend the GFM table compiler or add a `:::table` block directive with YAML-based cell definitions.

2. **Convert `solutionsGrid` family** to markdown (if table support is sufficient).
