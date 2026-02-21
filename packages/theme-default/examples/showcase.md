---
theme: tycoslide-theme-default
---

---
layout: title
title: tycoslide Authoring Guide
subtitle: A complete reference for markdown slide authoring
notes: This deck demonstrates every markdown authoring feature in tycoslide. Each slide teaches one concept. Read the speaker notes for syntax explanations.
---

---
layout: body
title: How This Deck Works
eyebrow: OVERVIEW
notes: This slide uses the body layout with title and eyebrow params. The body content below the frontmatter closing --- is rendered as markdown. Speaker notes (like this one) appear in presenter view only.
---

- Each slide demonstrates **one feature** of tycoslide's markdown system
- Speaker notes explain the syntax that produced each slide
- This file is both a buildable deck and a readable reference
- The default theme provides three layouts: **title**, **section**, and **body**

---
layout: section
title: Slide Structure
notes: The section layout takes a single required param (title) and renders it centered. No body content.
---

---
layout: body
title: Frontmatter
eyebrow: STRUCTURE
notes: Every slide starts with --- delimiters containing YAML frontmatter. Fields are layout (which template), title, subtitle, eyebrow, notes, and name. The body content follows the closing ---.
---

Every slide begins with YAML frontmatter between triple-dash delimiters.

| Field | Purpose |
|-------|---------|
| layout | Which template to use |
| title | Slide heading |
| subtitle | Secondary text (title layout only) |
| eyebrow | Small label above the title |
| notes | Speaker notes (not rendered) |
| name | Slide identifier for error messages |

---
layout: body
title: Built-in Layouts
eyebrow: LAYOUTS
notes: The default theme ships three layouts. The body layout is the default — you can omit layout:body from frontmatter and it will be used automatically.
---

| Layout | Params | Body Slot | Use For |
|--------|--------|-----------|---------|
| **title** | title, subtitle | No | Opening and closing slides |
| **section** | title | No | Section dividers |
| **body** | title, eyebrow | Yes | All content slides |

The **body** layout is the default. If you omit the layout field, body is used automatically.

---
layout: body
title: Speaker Notes
eyebrow: STRUCTURE
notes: This text appears only in the presenter view. Use notes for talking points, context, and delivery reminders. Notes are plain text — markdown formatting is not rendered in notes.
---

Add speaker notes to any slide with the **notes** field in frontmatter.

Notes appear in the presenter view when presenting. They are not rendered on the slide itself.

- Use notes for talking points and reminders
- Notes support plain text only
- Every slide in this deck has notes explaining its syntax

---
layout: section
title: Text Formatting
notes: Section dividers are simple — just a centered title. Great for organizing a long deck into chapters.
---

---
layout: body
title: Bold and Italic
eyebrow: TEXT
notes: Wrap text in double asterisks for bold, single asterisks for italic, triple for both. These are the standard markdown emphasis markers.
---

Use standard markdown emphasis for inline formatting:

- This is **bold text** using double asterisks
- This is *italic text* using single asterisks
- This is ***bold and italic*** using triple asterisks
- Mix them freely: **bold with *nested italic* inside**

---
layout: body
title: Accent Colors
eyebrow: TEXT
notes: The colon-bracket syntax :color[text] applies theme-defined accent colors. The default theme defines five accents (blue, green, red, yellow, purple). Colors can wrap bold or italic text.
---

Highlight text with theme-defined accent colors using the colon-bracket syntax:

- :blue[Blue] for emphasis and links
- :green[Green] for success and positive outcomes
- :red[Red] for warnings and critical items
- :yellow[Yellow] for caution and highlights
- :purple[Purple] for special or creative emphasis

Combine with formatting: :red[**bold red**] and :blue[*italic blue*]

---
layout: body
eyebrow: TEXT
notes: This slide has no title param — only the eyebrow. The body content starts with headings rendered at their natural size. Headings in the body use H2 through H4 styles.
---

## Heading 2

Body text below a heading flows naturally.

### Heading 3

A smaller heading for subsections.

#### Heading 4

The smallest heading level.

---
layout: body
title: Paragraphs
eyebrow: TEXT
notes: Separate paragraphs with a blank line. Consecutive lines without a blank line between them are joined into a single paragraph.
---

This is the first paragraph. It demonstrates that text flows naturally within a paragraph and wraps when it reaches the slide edge.

This is the second paragraph, separated by a blank line. Paragraph spacing is automatic.

---
layout: section
title: Lists and Tables
notes: Lists and tables are the primary structured content types in markdown slides.
---

---
layout: body
title: Bullet Lists
eyebrow: LISTS
notes: Unordered lists use the dash prefix. Each item can contain bold, italic, and accent color formatting. Nested lists are not supported in the current renderer.
---

- **Performance** matters more than features
- Operational databases need :blue[real-time] consistency
- Every query must complete in *under 100 milliseconds*
- Scale :green[horizontally] without sacrificing correctness
- The :red[**wrong architecture**] costs more than the right one

---
layout: body
title: Numbered Lists
eyebrow: LISTS
notes: Ordered lists use number-dot prefix. Numbering is automatic — you can use 1. for every item and tycoslide will number them correctly.
---

1. Define your **data sources** and ingestion patterns
1. Configure :blue[transformation logic] for each stream
1. Set up *materialized views* for query patterns
1. Deploy and monitor **end-to-end latency**
1. Iterate on :green[performance] and correctness

---
layout: body
title: Tables
eyebrow: TABLES
notes: GFM (GitHub Flavored Markdown) tables work in body content. The first row is always the header. Cells support bold and accent color formatting. Use pipes and dashes for alignment.
---

| Feature | Status | Notes |
|---------|--------|-------|
| **Bold text** | :green[Supported] | Double asterisks |
| *Italic text* | :green[Supported] | Single asterisks |
| :blue[Accent colors] | :green[Supported] | Five theme colors |
| Headings | :green[Supported] | H2 through H4 |
| Bullet lists | :green[Supported] | Unordered and ordered |

---
layout: section
title: Directives
notes: Directives are the escape hatch from plain markdown into rich components. They use the triple-colon syntax from the remark-directive ecosystem.
---

---
layout: body
title: What Are Directives?
eyebrow: COMPONENTS
notes: Directives use triple-colon delimiters with a component name. Attributes go in curly braces after the name. Body content goes between the opening and closing markers. Available directives are card, quote, table, and mermaid.
---

| Directive | Purpose |
|-----------|---------|
| **card** | Content card with optional background |
| **quote** | Quotation with attribution |
| **table** | Table with header columns and variants |
| **mermaid** | Auto-themed diagrams |
| **image** | Image from path or asset reference |
| **line** | Separator with optional arrows |

---
layout: body
title: Container Directives
eyebrow: COMPONENTS
notes: Container directives wrap other directives. They use fence-depth nesting — the outer directive uses more colons than inner ones (e.g. ::::row wraps :::card). This follows the standard remark-directive spec.
---

| Directive | Purpose |
|-----------|---------|
| **row** | Horizontal container for child directives |
| **column** | Vertical container for child directives |
| **stack** | Layered overlay of child directives |
| **grid** | Equal-sized grid of child directives |

---
layout: body
title: Cards
eyebrow: DIRECTIVE
notes: The card directive creates a styled content card. Use the title attribute for the card heading and put the description in the body. Cards automatically receive theme styling (background color, border radius, padding).
---

:::card{title="What is tycoslide?" height="hug"}
A build system for branded presentations. Compile markdown or TypeScript into measured, positioned, native PowerPoint files.
:::

---
layout: body
title: Multiple Cards
eyebrow: DIRECTIVE
notes: Place multiple card directives in sequence. Each card renders as a separate block. The background attribute controls whether the card has a colored background (default true). Set background=false for a clean outlined style.
---

:::card{title="Content as Code" height="fill"}
Presentations built in CI/CD pipelines, not manually in PowerPoint.
:::

:::card{title="Theme-Driven" height="fill" background="false"}
All visual decisions live in the theme file. Missing tokens fail the build.
:::

---
layout: body
title: Quotes
eyebrow: DIRECTIVE
notes: The quote directive renders a styled quotation. The body text is the quote itself. The attribution attribute names the source. Quotes receive theme styling with a visual treatment that distinguishes them from regular text.
---

:::quote{attribution="Every presentation framework"}
We promise pixel-perfect slides, then deliver approximate layouts with manual tweaking.
:::

---
layout: body
title: Table Directive
eyebrow: DIRECTIVE
notes: The table directive wraps a GFM table with extra controls. The headerColumns attribute makes the first N columns styled as headers (useful for row headers). The variant attribute changes the visual style (clean removes borders).
---

:::table{headerColumns="1"}
| Approach | Latency | Consistency |
|----------|---------|-------------|
| **Batch ETL** | Minutes to hours | Eventual |
| **Streaming** | Seconds | Eventual |
| **Materialized Views** | Milliseconds | Strong |
:::

---
layout: body
title: Mermaid Diagrams
eyebrow: DIRECTIVE
notes: The mermaid directive renders diagrams from text definitions. tycoslide auto-themes the diagram using your theme colors. The diagram below shows the tycoslide build pipeline — from markdown input to PowerPoint output.
---

:::mermaid
flowchart LR
    A[Markdown] --> B[Component Tree]
    B --> C[Primitive Nodes]
    C --> D[HTML Measurement]
    D --> E[Positioned Nodes]
    E --> F[.pptx File]
:::

---
layout: section
title: Advanced Features
notes: These features give you more control over slide composition and help you understand the boundaries of the markdown authoring system.
---

---
layout: body
title: Mixing Content
eyebrow: ADVANCED
notes: You can freely mix plain markdown and directives in the same slide body. Text, lists, tables, cards, and quotes all compose naturally. The slot compiler processes them in order, creating a vertical stack of content.
---

Directives and markdown **compose naturally** in the same slide.

:::card{title="Key Insight"}
You can mix paragraphs, lists, tables, and directives in any order within a single slide body.
:::

- This bullet list follows the card above
- Each content block stacks :blue[vertically]
- Keep total content modest to avoid overflow

---
layout: body
title: Row and Column
eyebrow: CONTAINER DIRECTIVES
notes: Row and column directives compose content horizontally or vertically. Nest any directives inside them. Attributes like gap control spacing.
---

:::::row
::::column
Left column with **bold text** and a list:

- Item one
- Item two
::::

::::column
:::card{title="Right Column Card"}
Cards compose naturally inside columns.
:::
::::
:::::

---
layout: body
title: Grid Layout
eyebrow: CONTAINER DIRECTIVES
notes: The grid directive arranges child directives into equal-sized rows. The columns attribute sets how many columns per row.
---

::::grid{columns=3}
:::card{title="Feature 1" height="fill"}
Fast queries
:::

:::card{title="Feature 2" height="fill"}
Real-time updates
:::

:::card{title="Feature 3" height="fill"}
Easy integration
:::
::::

---
layout: body
title: TypeScript-Only Features
eyebrow: REFERENCE
notes: A few features remain TypeScript-only. Most content can now be authored in markdown using directives.
---

These features require the **TypeScript DSL** (not available in markdown):

- **Stack overlays** for layered compositions
- **Programmatic slide generation** from data sources
- **Custom component registration** for new content types

---
layout: body
title: Tips for Authors
eyebrow: BEST PRACTICES
notes: These guidelines help produce clean, readable slides. Content density is the most common mistake — less is more on a slide. Use speaker notes for detail that would clutter the visual.
---

- **Less is more** — aim for 5 to 7 bullet items per slide maximum
- Use **bold** for key terms, :blue[color] for emphasis sparingly
- Put detail in **speaker notes**, not on the slide
- One idea per slide — split rather than cram
- Tables work best with 4 to 5 rows
- Directives are powerful but use them deliberately
- The **body** layout handles 90% of content slides

---
layout: title
title: tycoslide
subtitle: Build decks from markdown. Customize with code.
notes: End slide. The title layout centers content with no footer — ideal for opening and closing slides.
---
