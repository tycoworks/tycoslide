---
theme: tycoslide-theme-default
---

---
layout: title
title: tycoslide
subtitle: Build presentations like software.
notes: Opening slide introducing tycoslide.
---

---
layout: body
title: What is tycoslide?
eyebrow: FUNCTIONAL DESCRIPTION
notes: Lead with what it IS - a presentation build tool.
---

**tycoslide is a presentation build tool** that generates native PowerPoint decks from markdown and TypeScript, with enforced brand compliance through design tokens.

Key capabilities:

- **Markdown → PowerPoint** — Write slides like documentation, compile to .pptx
- **Theme system** — Layouts and components defined in TypeScript
- **Design tokens** — W3C DTCG-aligned tokens for colors, typography, spacing
- **Type-safe compilation** — Missing tokens and invalid layouts fail the build

---
layout: body
title: The Problem
eyebrow: PROBLEM FRAMING
notes: The false choice between brand compliance and developer velocity.
---

Other presentation tools force you to choose between **brand compliance** and **development velocity**:

::::grid{columns=2}
:::card{title="Design Tools" height="fill"}
PowerPoint and Keynote require manual enforcement of brand guidelines — slow, error-prone, breaks easily.
:::

:::card{title="Code-First Tools" height="fill"}
Slidev and Reveal.js produce web slides that don't work in corporate environments where PowerPoint is the standard.
:::
::::

**Markdown converters** like Marp and Pandoc are close, but produce non-editable PDFs or lack layout control.

---
layout: body
title: How tycoslide Solves This
eyebrow: VALUE FRAMING
notes: Solves both sides of the false choice.
---

tycoslide enforces **brand compliance at compile time** while generating **native PowerPoint files**.

You get the velocity of markdown and the safety of type-checked design tokens, **without sacrificing PowerPoint compatibility**.

::::grid{columns=3}
:::card{title="Presentations as Code" height="fill"}
Markdown authoring, CI/CD integration, version control, build-time validation.
:::

:::card{title="Brand Compliance" height="fill"}
Design tokens as single source of truth. Invalid designs fail the build.
:::

:::card{title="PowerPoint Output" height="fill"}
Editable .pptx files that work in PowerPoint, Keynote, LibreOffice.
:::
::::

---
layout: body
title: Presentations as Code
eyebrow: SUPPORTING ARGUMENT 1
notes: Treats presentations as code artifacts.
---

Unlike traditional presentation tools that require working in a GUI with manual processes, tycoslide treats presentations as code with full CI/CD integration:

- **Markdown authoring** — Write slides like documentation, version control in Git
- **TypeScript DSL** — Programmatic slide generation with full type safety
- **Automated pipelines** — Build decks in CI/CD with fail-fast validation

---
layout: body
title: Brand Compliance
eyebrow: SUPPORTING ARGUMENT 2
notes: Brand rules encoded in design tokens and theme files.
---

Unlike other tools that treat brand guidelines as documentation (easily ignored), tycoslide encodes brand rules in design tokens and theme files:

- **Design token system** — W3C DTCG-aligned tokens for colors, typography, spacing as single source of truth
- **Type-safe token resolution** — Missing or invalid tokens = compile error, not runtime surprises
- **Component boundaries** — Pre-approved layouts and components enforce persona separation

---
layout: body
title: PowerPoint Output
eyebrow: SUPPORTING ARGUMENT 3
notes: Real PowerPoint objects with precise control.
---

Unlike web-based tools (Slidev, Reveal.js) or converters (Marp) that embed images, tycoslide generates real PowerPoint objects:

- **Editable .pptx files** — Output works offline in PowerPoint, Keynote, LibreOffice
- **Measured layout engine** — CSS flexbox via Playwright for precise positioning
- **Native PowerPoint objects** — Real shapes, text, tables with component primitives for cards and grids

---
layout: section
title: Layouts
notes: Demonstrating the three current layouts.
---

---
layout: title
title: Title Layout
subtitle: Used for opening slides
notes: The title layout centers content with title and subtitle parameters. Used for opening slides.
---

---
layout: section
title: Section Layout
notes: The section layout creates chapter dividers with centered titles. No body content or eyebrow.
---

---
layout: body
title: Body Layout
eyebrow: LAYOUT DEMONSTRATION
notes: The body layout handles all content slides with title, optional eyebrow, and markdown body.
---

The **body** layout is the default for content slides. It supports:

- A **title** field for the heading
- An optional **eyebrow** field for small labels above the title
- Full **markdown** rendering in the body slot
- **Speaker notes** in the frontmatter

This layout handles 90% of presentation content with consistent styling.

---
layout: section
title: Markdown Capabilities
notes: Showing typography, colors, and tables in concise demos.
---

---
layout: body
title: Typography and Formatting
eyebrow: TEXT
notes: All text formatting in one slide - headings, emphasis, lists.
---

## Major Section Heading

Body text flows naturally below headings with automatic spacing and line height.

### Subsection Heading

Use **bold** for emphasis, *italic* for secondary emphasis, and ***bold italic*** for maximum weight.

**Text formatting examples:**

- Use :blue[inline colors] for emphasis
- Apply :green[semantic colors] to highlight outcomes
- Mark :red[important warnings] for visibility

---
layout: body
title: Accent Colors
eyebrow: TEXT
notes: All five accent colors shown in realistic use cases.
---

Highlight key terms with theme-defined accent colors:

- :blue[**Technical terms**] and brand emphasis (links, product names)
- :green[**Positive outcomes**] and success metrics (+15% growth, approved)
- :red[**Critical items**] and warnings (breaking changes, blockers)
- :yellow[**Pending status**] and caution (under review, waiting)
- :purple[**Special callouts**] and creative emphasis (new feature, beta)

Invalid color names fail the build — only theme-defined colors are allowed.

---
layout: body
title: Tables
eyebrow: MARKDOWN
notes: GitHub Flavored Markdown tables with inline formatting.
---

Standard markdown tables support bold, italic, and accent colors:

| Feature | tycoslide | Slidev | Marp | Reveal.js |
|---------|-----------|--------|------|-----------|
| **Output** | :green[PowerPoint] | HTML | PDF/HTML | HTML |
| **Type Safety** | :green[Full] | Partial | None | None |
| **Brand Tokens** | :green[Built-in] | Manual | Manual | Manual |
| **Editable** | :green[Yes] | No | No | No |

Keep tables to 4-6 rows and 3-4 columns for readability on slides.

---
layout: section
title: Components
notes: Directive-based components for structured content.
---

---
layout: body
title: Cards for Structured Content
eyebrow: COMPONENT
notes: Single slide showing card variants.
---

:::card{title="What is a Card?" height="hug"}
A styled content block with a title and body text. Use cards to visually separate concepts on a slide.
:::

:::card{title="Stacked Cards" height="fill"}
Multiple cards stack vertically with automatic spacing. The **height="fill"** attribute distributes remaining space equally.
:::

:::card{title="Outlined Variant" height="fill" background="false"}
Set **background="false"** for outlined cards without fill color. Useful for secondary information.
:::

---
layout: body
title: Feature Comparison
eyebrow: COMPONENT
notes: Card grids for side-by-side layouts.
---

::::grid{columns=3}
:::card{title="Fast" height="fill"}
Complete builds in seconds, not minutes. Watch mode rebuilds on save.
:::

:::card{title="Safe" height="fill"}
Type errors and brand violations fail the build before shipping.
:::

:::card{title="Native" height="fill"}
Output is real .pptx files that work everywhere PowerPoint works.
:::
::::

Use the **grid** directive to arrange cards in equal-width columns. Set **columns=2** or **columns=3** based on content.

---
layout: body
title: Customer Feedback
eyebrow: COMPONENT
notes: Quote directive for styled quotations.
---

:::quote{attribution="Sarah Chen, VP Marketing at Acme Corp"}
We spend more time fixing fonts and alignment than writing content. tycoslide solved that — change the theme once, rebuild every deck.
:::

:::quote{attribution="Dev team at TechStart"}
Brand compliance should be enforced by the compiler, not by a style guide PDF. That's exactly what tycoslide does.
:::

The **quote** directive styles quotations with attribution. Great for testimonials, pull quotes, and key statements.

---
layout: body
title: Table Directive
eyebrow: COMPONENT
notes: Table component with row headers and custom styling.
---

The **table** directive provides enhanced tables with row headers:

:::table{headerColumns="1"}
| Feature | tycoslide | Slidev | Marp |
|---------|-----------|--------|------|
| **PowerPoint Output** | :green[Native PPTX] | :red[No] | :yellow[Limited] |
| **Type Safety** | :green[Full TS] | :yellow[Partial] | :red[None] |
| **Design Tokens** | :green[W3C DTCG] | :red[Manual] | :red[Manual] |
:::

Set **headerColumns="1"** to style the first column as row headers.

---
layout: body
title: Mermaid Diagrams
eyebrow: COMPONENT
notes: Mermaid diagram component for flowcharts and diagrams.
---

The **mermaid** directive renders flowcharts, sequence diagrams, and other diagram types. Diagrams are auto-themed using design tokens.

**Example workflow:**

:::mermaid
flowchart LR
    A[Markdown] --> B[tycoslide build]
    B --> C[PowerPoint]
:::

Diagrams are rendered using Mermaid.js and automatically inherit theme styling where supported.

---
layout: section
title: Theming
notes: How themes control all visual styling.
---

---
layout: body
title: Theme as Single Source of Truth
eyebrow: DESIGN SYSTEM
notes: One slide showing how theme controls everything.
---

All visual styling comes from the theme:

::::grid{columns=2}
:::card{title="Design Tokens Define" height="fill"}
- Colors (primary, accent, semantic)
- Typography (fonts, sizes, weights)
- Spacing (padding, margins, gaps)
- Component styles (cards, tables, quotes)
:::

:::card{title="Authors Cannot" height="fill"}
- Override colors or fonts
- Set arbitrary sizes
- Break layout constraints
- Use undefined tokens
:::
::::

**Change the theme once, rebuild every deck.** Brand compliance becomes a build error, not a process problem.

---
layout: title
title: tycoslide
subtitle: Presentations as code. Brand compliance as build errors.
notes: Closing slide.
---
