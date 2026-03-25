---
theme: tycoslide-theme-default
---

---
layout: title
variant: default
title: "**tycoslide**"
subtitle: "Build slides like software.:purple[▌]"
notes: Opening slide. Clean centered title with cursor.
---

---
layout: agenda
variant: default
title: Agenda
image: $tycoworks.tycoslide
items:
  - tycoslide
  - Gallery
  - Design System
notes: "Agenda layout — three sections: the tool, the art of the possible, the visual identity."
---

---
layout: statement
variant: default
body: "tycoslide is a :purple[**presentation build tool**] that generates :purple[**editable PowerPoint slides from markdown**], with :purple[**TypeScript-based themes**] and :purple[**build-time validation**]."
notes: Positioning one-liner. Four anchors in one sentence.
---

---
layout: transform
variant: default
notes: Side-by-side showing markdown input on the left and the resulting slide output on the right.
---

::left::

review.md

```markdown
---
layout: body
---

# Q3 Infrastructure Review

The new pipeline *increased*
throughput by **40%** with
:purple[zero downtime].
```

::right::

review.pptx

:::card{title="Q3 Infrastructure Review" description="The new pipeline *increased* throughput by **40%** with :purple[zero downtime]."}
:::

::overlay::

![redo]($icons.redo)

---
layout: cards
variant: default
title: Capabilities
cards:
  - title: Editable PowerPoint Slides
    description: Native PowerPoint slides that can be edited in any presentation software.
    image: $icons.description
  - title: Pure TypeScript Themes
    description: Pure TypeScript for design tokens, components, and layouts — no CSS needed.
    image: $icons.palette
  - title: Build-Time Validation
    description: Catches layout overflows, missing tokens, and invalid parameters at build time.
    image: $icons.shield
notes: Three pillars from positioning framework. Each maps to one supporting argument.
---

---
layout: body
variant: centered
title: How It Compares
notes: Comparison table with tycoslide column highlighted. The audience sees "None" for build validation in every competitor.
---

:::table
| | :purple[**tycoslide**] | Slidev | Marp | Reveal.js |
|---|---|---|---|---|
| Output | :purple[.pptx (editable)] | HTML, PDF, .pptx (images) | PDF, HTML, .pptx (images) | HTML, PDF |
| Components | :purple[TypeScript] | Vue | Markdown-It | JavaScript |
| Design tokens | :purple[TypeScript] | CSS | CSS | CSS |
| Validation | :purple[Build-time] | None | None | None |
| Preview | :purple[Static] | Live | Live | Live |
:::

---
layout: body
variant: default
title: How It Works
notes: Mermaid diagram — the build process from markdown to PowerPoint. Vertical flow inside the Build Engine subgraph.
---

:::mermaid
flowchart LR
  MD["Markdown +<br/>YAML Frontmatter"] -.-> BUILD
  TS["TypeScript Theme<br/>(Tokens & Components)"] -.-> BUILD
  subgraph BUILD ["Build Engine"]
    direction TB
    PARSE["Parse<br/>Markdown"] --> EXPAND["Expand<br/>Components"] --> MEASURE["Measure Layout<br/>(Browser)"]
  end
  BUILD --> PPTX["Native, Editable<br/>PowerPoint"]
  class PARSE,EXPAND,MEASURE primary
:::

---
layout: section
variant: default
title: Gallery
notes: Section divider — transition from the pitch to art of the possible. Dark background.
---

---
layout: two-column
variant: default
title: Rich Markdown Authoring
notes: Two-column layout — left shows what you write, right shows what tycoslide supports. Demonstrates the two-column slot system.
---

::left::

### What You Write

Plain markdown with a few extensions. No custom syntax to learn — just headings, lists, bold, italic, and accent colors.

::right::

### What You Get

- **Bold** and *italic* text
- :purple[Accent colors] inline
- ++Underline++ and ~~strikethrough~~
- `Code spans` for monospace
- [Hyperlinks](https://example.com)
- Tables, diagrams, and code blocks

---
layout: stat
variant: default
value: "Zero"
label: Silent Failures
caption: Catch layout overflows, missing design tokens, and invalid parameters at build time. Presentations are finally treated with the same rigorous QA as production software.
notes: Stat layout — the proof point. Zero silent failures at build time.
---

---
layout: quote
variant: dark
quote: "Software is eating the world...especially presentations."
attribution: "— Marc Andreessen (probably)"
notes: Dark pull quote — emotional beat and visual contrast.
---

---
layout: cards
variant: flat
title: What You Can Build
cards:
  - title: Team Updates
    description: Weekly standups, sprint reviews, and quarterly business reviews.
    image: $icons.description
  - title: Technical Decks
    description: Architecture diagrams, API overviews, and infrastructure proposals.
    image: $icons.palette
  - title: Brand Presentations
    description: On-brand pitch decks with enforced design tokens and validated layouts.
    image: $icons.shield
notes: Flat cards variant — no background shape. Shows practical use cases for tycoslide.
---

---
layout: quote
variant: default
quote: "The best slide decks are the ones nobody had to manually format."
attribution: "— Every design team, eventually"
notes: Light quote variant — contrasts with the dark quote above. Softer emotional beat before the design system section.
---

---
layout: section
variant: default
title: Design System
notes: Section divider — the visual identity layer. Colors, typography, icons.
---

---
layout: shapes
variant: default
title: Color Palette
subtitle: Approved brand colors
notes: Four key palette colors rendered as swatches with role names and hex values.
---

---
layout: lines
variant: default
title: Line Styles
notes: Lines layout — solid, dashed, and dotted strokes. Visual verification of the unified Stroke type.
---

---
layout: body
variant: default
title: Typography
notes: Font hierarchy — Inter font family at different weights and sizes.
---

## Inter Bold — Display Heading

### Inter Bold — Section Heading

#### Inter Bold — Card Heading

The default body text is set in **Inter Regular** at 16pt. Inline styles include **bold**, *italic*, ++underline++, ~~strikethrough~~, and :purple[accent colors].

`Inter Light` is used for subtitles and captions, set at a lighter weight for visual hierarchy.

---
layout: end
variant: default
title: tycoslide
subtitle: Build presentations like software
notes: Closing slide. Mirrors the title. Light background contrasts with the dark quote.
---
